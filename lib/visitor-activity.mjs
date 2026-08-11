export const VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000
export const VISITOR_STORAGE_KEY = 'epeul.visits.v1'
export const VISITOR_TIMELINE_START_MS = Date.parse('2026-08-11T00:00:00+09:00')

const TIMELINE_WIDTH = 261
const TIMELINE_ROW_HEIGHT = 23
const TIMELINE_ROW_COUNT = 3
const VISIT_MARK_WIDTH = 2.292
const RECENT_RANGE_WIDTH = 54.427
const VISIT_TONE = '#282828'
const PROGRESS_TONE = '#ececec'
const CURRENT_TONE = '#c0c0c0'

function toTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return Date.parse(value)
  return Number.NaN
}

export function filterRecentVisits(visits, nowMs = Date.now()) {
  const lowerBound = nowMs - VISITOR_WINDOW_MS

  if (!Array.isArray(visits)) return []

  return visits
    .map(toTimestamp)
    .filter(
      (timestamp) => Number.isFinite(timestamp) && timestamp > lowerBound && timestamp <= nowMs
    )
    .sort((left, right) => left - right)
}

export function getVisitorDayNumber(
  nowMs = Date.now(),
  timelineStartMs = VISITOR_TIMELINE_START_MS
) {
  const safeNow = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now()
  const elapsed = Math.max(0, safeNow - timelineStartMs)

  return Math.floor(elapsed / VISITOR_WINDOW_MS) + 1
}

export function filterVisitsForDay(visits, dayNumber, timelineStartMs = VISITOR_TIMELINE_START_MS) {
  if (!Array.isArray(visits)) return []

  const safeDayNumber = Math.max(1, Math.floor(Number(dayNumber) || 1))
  const lowerBound = timelineStartMs + (safeDayNumber - 1) * VISITOR_WINDOW_MS
  const upperBound = lowerBound + VISITOR_WINDOW_MS

  return visits
    .map(toTimestamp)
    .filter(
      (timestamp) => Number.isFinite(timestamp) && timestamp >= lowerBound && timestamp < upperBound
    )
    .sort((left, right) => left - right)
}

export function filterTrackedVisits(
  visits,
  nowMs = Date.now(),
  timelineStartMs = VISITOR_TIMELINE_START_MS
) {
  if (!Array.isArray(visits)) return []

  return visits
    .map(toTimestamp)
    .filter(
      (timestamp) =>
        Number.isFinite(timestamp) && timestamp >= timelineStartMs && timestamp <= nowMs
    )
    .sort((left, right) => left - right)
}

export function buildVisitorActivity(visits, nowMs = Date.now(), slotCapacity = 72) {
  const recentVisits = filterRecentVisits(visits, nowMs)
  const safeCapacity = Math.max(0, Math.floor(Number(slotCapacity) || 0))

  return {
    activeCount: recentVisits.length,
    visibleVisitCount: Math.min(recentVisits.length, safeCapacity),
  }
}

export function buildVisitorDayActivity(visits, dayNumber, slotCapacity = 72) {
  const dayVisits = filterVisitsForDay(visits, dayNumber)
  const safeCapacity = Math.max(0, Math.floor(Number(slotCapacity) || 0))

  return {
    activeCount: dayVisits.length,
    visibleVisitCount: Math.min(dayVisits.length, safeCapacity),
  }
}

function roundTimelineValue(value) {
  return Math.round(value * 1_000) / 1_000
}

export function buildVisitorTimeline(visits, dayNumber, nowMs = Date.now(), visitLimit = 72) {
  const safeDayNumber = Math.max(1, Math.floor(Number(dayNumber) || 1))
  const dayStart = VISITOR_TIMELINE_START_MS + (safeDayNumber - 1) * VISITOR_WINDOW_MS
  const rowDuration = VISITOR_WINDOW_MS / TIMELINE_ROW_COUNT
  const isCurrentDay = safeDayNumber === getVisitorDayNumber(nowMs)
  const elapsed = Math.min(VISITOR_WINDOW_MS, Math.max(0, nowMs - dayStart))
  const linearNow = (elapsed / rowDuration) * TIMELINE_WIDTH
  const recentRangeStart = Math.max(0, linearNow - RECENT_RANGE_WIDTH)
  const recentStartMs = dayStart + (recentRangeStart / TIMELINE_WIDTH) * rowDuration
  const safeLimit = Math.max(0, Math.floor(Number(visitLimit) || 0))
  const dayVisits = filterVisitsForDay(visits, safeDayNumber).slice(-safeLimit)
  const visitBlocks = dayVisits.map((timestamp) => {
    const rowPosition = (timestamp - dayStart) / rowDuration
    const row = Math.min(TIMELINE_ROW_COUNT - 1, Math.floor(rowPosition))
    const x = roundTimelineValue((rowPosition - row) * TIMELINE_WIDTH)

    return {
      tone:
        isCurrentDay && timestamp >= recentStartMs && timestamp <= nowMs
          ? CURRENT_TONE
          : VISIT_TONE,
      width: VISIT_MARK_WIDTH,
      x,
      y: row * TIMELINE_ROW_HEIGHT,
    }
  })

  if (!isCurrentDay) {
    return { progressBlocks: [], visitBlocks }
  }

  const progressBlocks = []
  let cursor = recentRangeStart

  while (cursor < linearNow) {
    const row = Math.min(TIMELINE_ROW_COUNT - 1, Math.floor(cursor / TIMELINE_WIDTH))
    const rowEnd = Math.min(linearNow, (row + 1) * TIMELINE_WIDTH)

    progressBlocks.push({
      tone: PROGRESS_TONE,
      width: roundTimelineValue(rowEnd - cursor),
      x: roundTimelineValue(cursor - row * TIMELINE_WIDTH),
      y: row * TIMELINE_ROW_HEIGHT,
    })
    cursor = rowEnd
  }

  return { progressBlocks, visitBlocks }
}

function parseStoredVisits(storage) {
  if (!storage || typeof storage.getItem !== 'function') return []

  try {
    const value = storage.getItem(VISITOR_STORAGE_KEY)
    if (!value) return []
    return JSON.parse(value)
  } catch {
    return []
  }
}

function saveStoredVisits(storage, visits) {
  if (!storage || typeof storage.setItem !== 'function') return

  try {
    storage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(visits))
  } catch {
    // Private browsing and storage quotas must not prevent the page from rendering.
  }
}

export function readLocalVisits(storage, nowMs = Date.now()) {
  const visits = filterTrackedVisits(parseStoredVisits(storage), nowMs)
  saveStoredVisits(storage, visits)
  return visits
}

export function recordLocalVisit(storage, nowMs = Date.now()) {
  const visits = filterTrackedVisits([...parseStoredVisits(storage), nowMs], nowMs)
  saveStoredVisits(storage, visits)
  return visits
}

function extractRemoteVisits(payload, nowMs) {
  const values = payload?.visits ?? payload?.timestamps
  if (Array.isArray(values)) return filterTrackedVisits(values, nowMs)

  const activeCount = Math.max(0, Math.floor(Number(payload?.activeCount) || 0))
  if (activeCount === 0) return null

  return Array.from({ length: activeCount }, (_, index) => nowMs - index)
}

async function readJson(response) {
  if (!response || response.ok === false) throw new Error('Visitor activity request failed')
  if (typeof response.json !== 'function') return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function withSinceQuery(endpoint, nowMs) {
  const separator = endpoint.includes('?') ? '&' : '?'
  const since = new Date(Math.min(nowMs, VISITOR_TIMELINE_START_MS)).toISOString()
  return `${endpoint}${separator}since=${encodeURIComponent(since)}`
}

export async function loadVisitorVisits({
  endpoint = '',
  fetchImpl = globalThis.fetch,
  storage,
  nowMs = Date.now(),
} = {}) {
  const normalizedEndpoint = typeof endpoint === 'string' ? endpoint.trim() : ''

  if (!normalizedEndpoint || typeof fetchImpl !== 'function') {
    return readLocalVisits(storage, nowMs)
  }

  try {
    const response = await fetchImpl(withSinceQuery(normalizedEndpoint, nowMs), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const remoteVisits = extractRemoteVisits(await readJson(response), nowMs)
    return remoteVisits ?? []
  } catch {
    return readLocalVisits(storage, nowMs)
  }
}

export async function recordVisitorPageView({
  endpoint = '',
  fetchImpl = globalThis.fetch,
  storage,
  nowMs = Date.now(),
} = {}) {
  const normalizedEndpoint = typeof endpoint === 'string' ? endpoint.trim() : ''

  if (!normalizedEndpoint || typeof fetchImpl !== 'function') {
    return recordLocalVisit(storage, nowMs)
  }

  try {
    const response = await fetchImpl(normalizedEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visitedAt: new Date(nowMs).toISOString() }),
    })
    const remoteVisits = extractRemoteVisits(await readJson(response), nowMs)

    if (remoteVisits) return remoteVisits
    return loadVisitorVisits({ endpoint: normalizedEndpoint, fetchImpl, storage, nowMs })
  } catch {
    return recordLocalVisit(storage, nowMs)
  }
}
