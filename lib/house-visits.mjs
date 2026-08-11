export const HOUSE_IDS = ['house1', 'house2', 'house3', 'house4']
export const HOUSE_VISIT_WINDOW_MS = 24 * 60 * 60 * 1_000
export const HOUSE_VISIT_STORAGE_KEY = 'epeul.house-visits.v1'

const DEFAULT_MIN_RADIUS = 7
const DEFAULT_MAX_RADIUS = 23.4

function roundRadius(value) {
  return Math.round(value * 1_000) / 1_000
}

function toTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return Date.parse(value)
  return Number.NaN
}

export function normalizeHouseId(value) {
  return HOUSE_IDS.includes(value) ? value : null
}

export function filterRecentHouseVisits(visits, nowMs = Date.now()) {
  const safeNow = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now()
  const lowerBound = safeNow - HOUSE_VISIT_WINDOW_MS

  if (!Array.isArray(visits)) return []

  return visits
    .map((visit) => ({
      houseId: normalizeHouseId(visit?.houseId),
      visitedAt: toTimestamp(visit?.visitedAt),
    }))
    .filter(
      (visit) =>
        visit.houseId &&
        Number.isFinite(visit.visitedAt) &&
        visit.visitedAt > lowerBound &&
        visit.visitedAt <= safeNow
    )
    .sort((left, right) => left.visitedAt - right.visitedAt)
}

export function countRecentHouseVisits(visits, nowMs = Date.now()) {
  const counts = Object.fromEntries(HOUSE_IDS.map((houseId) => [houseId, 0]))

  for (const visit of filterRecentHouseVisits(visits, nowMs)) {
    counts[visit.houseId] += 1
  }

  return counts
}

export function getHouseVisitRadii(
  counts,
  minRadius = DEFAULT_MIN_RADIUS,
  maxRadius = DEFAULT_MAX_RADIUS
) {
  const safeMin = Number.isFinite(Number(minRadius)) ? Number(minRadius) : DEFAULT_MIN_RADIUS
  const safeMax = Math.max(
    safeMin,
    Number.isFinite(Number(maxRadius)) ? Number(maxRadius) : DEFAULT_MAX_RADIUS
  )
  const values = HOUSE_IDS.map((houseId) => Math.max(0, Number(counts?.[houseId]) || 0))
  const positiveValues = values.filter((value) => value > 0)
  const allPositiveCountsEqual =
    positiveValues.length === HOUSE_IDS.length && new Set(positiveValues).size === 1
  const maxCount = Math.max(0, ...values)

  if (allPositiveCountsEqual) {
    const middleRadius = roundRadius((safeMin + safeMax) / 2)
    return Object.fromEntries(HOUSE_IDS.map((houseId) => [houseId, middleRadius]))
  }

  return Object.fromEntries(
    HOUSE_IDS.map((houseId, index) => {
      const count = values[index]
      const ratio = count > 0 && maxCount > 0 ? Math.sqrt(count / maxCount) : 0
      return [houseId, roundRadius(safeMin + (safeMax - safeMin) * ratio)]
    })
  )
}

function parseStoredHouseVisits(storage) {
  if (!storage || typeof storage.getItem !== 'function') return []

  try {
    const value = storage.getItem(HOUSE_VISIT_STORAGE_KEY)
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

function saveStoredHouseVisits(storage, visits) {
  if (!storage || typeof storage.setItem !== 'function') return

  try {
    storage.setItem(HOUSE_VISIT_STORAGE_KEY, JSON.stringify(visits))
  } catch {
    // Storage quotas and private browsing must not block CCTV playback.
  }
}

export function readLocalHouseVisits(storage, nowMs = Date.now()) {
  const visits = filterRecentHouseVisits(parseStoredHouseVisits(storage), nowMs)
  saveStoredHouseVisits(storage, visits)
  return visits
}

export function recordLocalHouseVisit(storage, houseId, nowMs = Date.now()) {
  const normalizedHouseId = normalizeHouseId(houseId)
  if (!normalizedHouseId) return readLocalHouseVisits(storage, nowMs)

  const visits = filterRecentHouseVisits(
    [...parseStoredHouseVisits(storage), { houseId: normalizedHouseId, visitedAt: nowMs }],
    nowMs
  )
  saveStoredHouseVisits(storage, visits)
  return visits
}

function extractRemoteHouseVisits(payload, nowMs) {
  const values = payload?.houseVisits ?? payload?.visits
  if (!Array.isArray(values)) return null

  const visits = filterRecentHouseVisits(values, nowMs)
  return values.length === 0 || visits.length > 0 ? visits : null
}

async function readJson(response) {
  if (!response || response.ok === false) throw new Error('House visit request failed')
  if (typeof response.json !== 'function') return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function withSinceQuery(endpoint, nowMs) {
  const separator = endpoint.includes('?') ? '&' : '?'
  const since = new Date(nowMs - HOUSE_VISIT_WINDOW_MS).toISOString()
  return `${endpoint}${separator}since=${encodeURIComponent(since)}`
}

export async function loadHouseVisits({
  endpoint = '',
  fetchImpl = globalThis.fetch,
  storage,
  nowMs = Date.now(),
} = {}) {
  const normalizedEndpoint = typeof endpoint === 'string' ? endpoint.trim() : ''

  if (!normalizedEndpoint || typeof fetchImpl !== 'function') {
    return readLocalHouseVisits(storage, nowMs)
  }

  try {
    const response = await fetchImpl(withSinceQuery(normalizedEndpoint, nowMs), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const remoteVisits = extractRemoteHouseVisits(await readJson(response), nowMs)
    return remoteVisits ?? readLocalHouseVisits(storage, nowMs)
  } catch {
    return readLocalHouseVisits(storage, nowMs)
  }
}

export async function recordHouseVisit({
  endpoint = '',
  fetchImpl = globalThis.fetch,
  houseId,
  storage,
  nowMs = Date.now(),
} = {}) {
  const normalizedHouseId = normalizeHouseId(houseId)
  if (!normalizedHouseId) return readLocalHouseVisits(storage, nowMs)

  const localVisits = recordLocalHouseVisit(storage, normalizedHouseId, nowMs)
  const normalizedEndpoint = typeof endpoint === 'string' ? endpoint.trim() : ''
  if (!normalizedEndpoint || typeof fetchImpl !== 'function') return localVisits

  try {
    const response = await fetchImpl(normalizedEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        houseId: normalizedHouseId,
        visitedAt: new Date(nowMs).toISOString(),
      }),
    })
    const remoteVisits = extractRemoteHouseVisits(await readJson(response), nowMs)
    return remoteVisits ?? localVisits
  } catch {
    return localVisits
  }
}

/**
 * @param {{
 *   search?: string,
 *   endpoint?: string,
 *   fetchImpl?: typeof globalThis.fetch,
 *   storage?: Storage,
 *   nowMs?: number,
 * }} [options]
 */
export async function recordHouseVisitFromSearch({
  search = '',
  endpoint = '',
  fetchImpl = globalThis.fetch,
  storage,
  nowMs = Date.now(),
} = {}) {
  const houseId = normalizeHouseId(new URLSearchParams(search).get('house'))
  if (!houseId) return readLocalHouseVisits(storage, nowMs)
  return recordHouseVisit({ endpoint, fetchImpl, houseId, storage, nowMs })
}
