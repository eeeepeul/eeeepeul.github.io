import { normalizeHouseId } from './house-visits.mjs'

export const SHARED_VISIT_TABLE = 'visit_events'
export const SHARED_VISIT_EVENT = 'epeul:shared-visit'

const VISIT_COLUMNS = 'id, visited_at, house_id'
const DEFAULT_PAGE_SIZE = 1_000
let realtimeChannelId = 0

/**
 * @typedef {{ id: number, visitedAt: number, houseId: string | null }} SharedVisit
 * @typedef {{
 *   recordVisit: (houseId?: string | null) => Promise<SharedVisit>,
 *   loadVisits: (options?: { sinceMs?: number, pageSize?: number }) => Promise<SharedVisit[]>,
 *   subscribe: (options?: {
 *     onVisit?: (visit: SharedVisit) => void,
 *     onStatus?: (status: 'connecting' | 'shared' | 'offline') => void,
 *   }) => (() => Promise<unknown>),
 * }} SharedVisitStore
 */

export function normalizeVisitRow(row) {
  const id = Number(row?.id)
  const visitedAt = Date.parse(row?.visited_at)
  const houseId = normalizeHouseId(row?.house_id)

  if (!Number.isSafeInteger(id) || id < 1 || !Number.isFinite(visitedAt)) return null
  if (row?.house_id != null && !houseId) return null

  return { id, visitedAt, houseId }
}

export function houseIdFromLocation(pathname = '', search = '') {
  const normalizedPath = String(pathname).replace(/\/+$/, '') || '/'
  if (normalizedPath !== '/experience') return null

  return normalizeHouseId(new URLSearchParams(search).get('house'))
}

function isSharedVisit(visit) {
  const houseId = normalizeHouseId(visit?.houseId)
  return (
    Number.isSafeInteger(visit?.id) &&
    visit.id > 0 &&
    Number.isFinite(visit?.visitedAt) &&
    (visit?.houseId == null || houseId)
  )
}

export function mergeVisitEvents(currentVisits, incomingVisits) {
  const byId = new Map()

  for (const visit of [...(currentVisits || []), ...(incomingVisits || [])]) {
    if (isSharedVisit(visit)) byId.set(visit.id, visit)
  }

  return [...byId.values()].sort(
    (left, right) => left.visitedAt - right.visitedAt || left.id - right.id
  )
}

/**
 * @param {{
 *   store?: SharedVisitStore | null,
 *   pathname?: string,
 *   search?: string,
 *   dispatch?: (eventName: string, detail: { visit: SharedVisit }) => void,
 * }} [options]
 * @returns {Promise<SharedVisit | null>}
 */
export async function recordSharedPageVisit({ store, pathname = '', search = '', dispatch } = {}) {
  if (!store || typeof store.recordVisit !== 'function') return null

  const visit = await store.recordVisit(houseIdFromLocation(pathname, search))
  dispatch?.(SHARED_VISIT_EVENT, { visit })
  return visit
}

/**
 * @param {{
 *   store?: SharedVisitStore | null,
 *   getSinceMs?: () => number,
 *   onVisits?: (visits: SharedVisit[]) => void,
 *   onStatus?: (status: 'connecting' | 'shared' | 'offline') => void,
 *   eventTarget?: any,
 *   setIntervalImpl?: any,
 *   clearIntervalImpl?: any,
 *   refreshMs?: number,
 * }} [options]
 */
export function startSharedVisitFeed({
  store,
  getSinceMs = () => 0,
  onVisits,
  onStatus,
  eventTarget = globalThis.window,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  refreshMs = 30_000,
} = {}) {
  let active = true
  let visits = []
  let unsubscribe = async () => {}
  let refreshTimer

  const publish = (incomingVisits) => {
    if (!active) return
    visits = mergeVisitEvents(visits, incomingVisits)
    onVisits?.(visits)
  }
  const handleSameTabVisit = (event) => publish([event?.detail?.visit])

  onStatus?.('connecting')

  if (!store) {
    onStatus?.('offline')
    return {
      ready: Promise.resolve([]),
      async cleanup() {
        active = false
      },
    }
  }

  eventTarget?.addEventListener?.(SHARED_VISIT_EVENT, handleSameTabVisit)

  try {
    unsubscribe = store.subscribe({
      onVisit: (visit) => publish([visit]),
      onStatus: (status) => {
        if (active) onStatus?.(status)
      },
    })
  } catch {
    onStatus?.('offline')
  }

  const refresh = async () => {
    try {
      const loadedVisits = await store.loadVisits({ sinceMs: getSinceMs() })
      publish(loadedVisits)
      return loadedVisits
    } catch {
      if (active) onStatus?.('offline')
      return []
    }
  }
  const ready = refresh()
  refreshTimer = setIntervalImpl?.(() => void refresh(), refreshMs)

  return {
    ready,
    async cleanup() {
      active = false
      if (refreshTimer !== undefined) clearIntervalImpl?.(refreshTimer)
      eventTarget?.removeEventListener?.(SHARED_VISIT_EVENT, handleSameTabVisit)
      await unsubscribe?.()
    },
  }
}

function throwSupabaseError(error, fallbackMessage) {
  if (!error) return
  if (error instanceof Error) throw error
  throw new Error(error.message || fallbackMessage)
}

function realtimeStatus(status) {
  if (status === 'SUBSCRIBED') return 'shared'
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') return 'offline'
  return 'connecting'
}

export function createSharedVisitStore(client) {
  if (!client || typeof client.from !== 'function' || typeof client.channel !== 'function') {
    throw new TypeError('A Supabase client is required')
  }

  return {
    async recordVisit(houseId = null) {
      const normalizedHouseId = normalizeHouseId(houseId)
      if (houseId != null && !normalizedHouseId) throw new TypeError('Invalid house id')

      const { data, error } = await client
        .from(SHARED_VISIT_TABLE)
        .insert({ house_id: normalizedHouseId })
        .select(VISIT_COLUMNS)
        .single()
      throwSupabaseError(error, 'Unable to record shared visit')

      const visit = normalizeVisitRow(data)
      if (!visit) throw new Error('Supabase returned an invalid visit event')
      return visit
    },

    async loadVisits({ sinceMs = 0, pageSize = DEFAULT_PAGE_SIZE } = {}) {
      const safeSince = Number(sinceMs)
      if (!Number.isFinite(safeSince)) throw new TypeError('Invalid visit start time')

      const safePageSize = Math.min(
        DEFAULT_PAGE_SIZE,
        Math.max(1, Math.floor(Number(pageSize) || DEFAULT_PAGE_SIZE))
      )
      const sinceIso = new Date(safeSince).toISOString()
      const visits = []
      let afterId = 0

      while (true) {
        const { data, error } = await client
          .from(SHARED_VISIT_TABLE)
          .select(VISIT_COLUMNS)
          .gte('visited_at', sinceIso)
          .gt('id', afterId)
          .order('id', { ascending: true })
          .limit(safePageSize)
        throwSupabaseError(error, 'Unable to load shared visits')

        const rows = Array.isArray(data) ? data : []
        for (const row of rows) {
          const visit = normalizeVisitRow(row)
          if (visit) visits.push(visit)
        }

        if (rows.length < safePageSize) break
        const nextAfterId = Number(rows.at(-1)?.id)
        if (!Number.isSafeInteger(nextAfterId) || nextAfterId <= afterId) {
          throw new Error('Shared visit pagination did not advance')
        }
        afterId = nextAfterId
      }

      return visits
    },

    subscribe({ onVisit, onStatus } = {}) {
      const channel = client
        .channel(`visit-events-${++realtimeChannelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: SHARED_VISIT_TABLE },
          (payload) => {
            const visit = normalizeVisitRow(payload?.new)
            if (visit) onVisit?.(visit)
          }
        )
        .subscribe((status) => onStatus?.(realtimeStatus(status)))

      return async () => {
        await client.removeChannel(channel)
      }
    },
  }
}
