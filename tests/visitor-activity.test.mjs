import test from 'node:test'
import assert from 'node:assert/strict'

import {
  VISITOR_TIMELINE_START_MS,
  VISITOR_STORAGE_KEY,
  VISITOR_WINDOW_MS,
  buildVisitorDayActivity,
  buildVisitorActivity,
  buildVisitorTimeline,
  filterVisitsForDay,
  filterRecentVisits,
  getVisitorDayNumber,
  loadVisitorVisits,
  recordLocalVisit,
  recordVisitorPageView,
} from '../lib/visitor-activity.mjs'

function createMemoryStorage(initialValue = null) {
  let value = initialValue

  return {
    getItem(key) {
      assert.equal(key, VISITOR_STORAGE_KEY)
      return value
    },
    setItem(key, nextValue) {
      assert.equal(key, VISITOR_STORAGE_KEY)
      value = nextValue
    },
  }
}

test('keeps repeated page visits as separate events inside the latest 24 hours', () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0)
  const visits = filterRecentVisits(
    [now, now, now - VISITOR_WINDOW_MS + 1, now - VISITOR_WINDOW_MS, now + 1],
    now
  )

  assert.deepEqual(visits, [now - VISITOR_WINDOW_MS + 1, now, now])
  assert.deepEqual(buildVisitorActivity(visits, now, 72), {
    activeCount: 3,
    visibleVisitCount: 3,
  })
})

test('labels the second 24-hour period as 2 day', () => {
  const secondDay = VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS + 1

  assert.equal(getVisitorDayNumber(VISITOR_TIMELINE_START_MS), 1)
  assert.equal(getVisitorDayNumber(secondDay), 2)
})

test('builds activity from only the selected historical day', () => {
  const visits = [
    VISITOR_TIMELINE_START_MS + 1_000,
    VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS - 1,
    VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS + 1_000,
  ]

  assert.deepEqual(filterVisitsForDay(visits, 1), visits.slice(0, 2))
  assert.deepEqual(filterVisitsForDay(visits, 2), visits.slice(2))
  assert.deepEqual(buildVisitorDayActivity(visits, 1, 72), {
    activeCount: 2,
    visibleVisitCount: 2,
  })
})

test('positions visit marks from their actual time inside the selected 24-hour day', () => {
  const hour = 60 * 60 * 1_000
  const visits = [
    VISITOR_TIMELINE_START_MS + 2 * hour,
    VISITOR_TIMELINE_START_MS + 10 * hour,
    VISITOR_TIMELINE_START_MS + 20 * hour,
  ]

  const timeline = buildVisitorTimeline(
    visits,
    1,
    VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS + hour
  )

  assert.deepEqual(timeline.visitBlocks, [
    { tone: '#282828', width: 2.292, x: 65.25, y: 0 },
    { tone: '#282828', width: 2.292, x: 65.25, y: 23 },
    { tone: '#282828', width: 2.292, x: 130.5, y: 46 },
  ])
})

test('moves the original-width recent-record range behind the live clock', () => {
  const hour = 60 * 60 * 1_000
  const now = VISITOR_TIMELINE_START_MS + 10 * hour

  assert.deepEqual(buildVisitorTimeline([], 1, now).progressBlocks, [
    { tone: '#ececec', width: 54.427, x: 10.823, y: 23 },
  ])

  assert.deepEqual(
    buildVisitorTimeline([], 1, VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS + hour)
      .progressBlocks,
    []
  )
})

test('colors only visits inside the moving recent-record range gray', () => {
  const hour = 60 * 60 * 1_000
  const now = VISITOR_TIMELINE_START_MS + 10 * hour
  const visits = [now - 2 * hour, now - hour]

  assert.deepEqual(buildVisitorTimeline(visits, 1, now).visitBlocks, [
    { tone: '#282828', width: 2.292, x: 0, y: 23 },
    { tone: '#c0c0c0', width: 2.292, x: 32.625, y: 23 },
  ])
})

test('keeps repeated visits at the same time on the exact same coordinate', () => {
  const hour = 60 * 60 * 1_000
  const repeatedVisit = VISITOR_TIMELINE_START_MS + 20 * hour
  const now = VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS + hour

  assert.deepEqual(
    buildVisitorTimeline([repeatedVisit, repeatedVisit, repeatedVisit], 1, now).visitBlocks,
    [
      { tone: '#282828', width: 2.292, x: 130.5, y: 46 },
      { tone: '#282828', width: 2.292, x: 130.5, y: 46 },
      { tone: '#282828', width: 2.292, x: 130.5, y: 46 },
    ]
  )
})

test('records every local page load without deduplicating the same timestamp', () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0)
  const storage = createMemoryStorage()

  assert.deepEqual(recordLocalVisit(storage, now), [now])
  assert.deepEqual(recordLocalVisit(storage, now), [now, now])
})

test('keeps completed-day visits available when recording on the next day', () => {
  const firstDayVisit = VISITOR_TIMELINE_START_MS + 1_000
  const secondDayVisit = VISITOR_TIMELINE_START_MS + VISITOR_WINDOW_MS + 1_000
  const storage = createMemoryStorage(JSON.stringify([firstDayVisit]))

  assert.deepEqual(recordLocalVisit(storage, secondDayVisit), [firstDayVisit, secondDayVisit])
})

test('uses the shared visitor endpoint and returns its rolling visit list', async () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0)
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      async json() {
        return {
          visits: [new Date(now - 10_000).toISOString(), new Date(now).toISOString()],
        }
      },
    }
  }

  const visits = await recordVisitorPageView({
    endpoint: 'https://activity.example.test/visits',
    fetchImpl,
    nowMs: now,
    storage: createMemoryStorage(),
  })

  assert.deepEqual(visits, [now - 10_000, now])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://activity.example.test/visits')
  assert.equal(calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    visitedAt: new Date(now).toISOString(),
  })
})

test('loads shared visits without recording another page view', async () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0)
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      async json() {
        return { visits: [now - 1_000] }
      },
    }
  }

  const visits = await loadVisitorVisits({
    endpoint: 'https://activity.example.test/visits?room=home',
    fetchImpl,
    nowMs: now,
    storage: createMemoryStorage(),
  })

  assert.deepEqual(visits, [now - 1_000])
  assert.equal(calls.length, 1)
  assert.equal(
    calls[0].url,
    `https://activity.example.test/visits?room=home&since=${encodeURIComponent(
      new Date(VISITOR_TIMELINE_START_MS).toISOString()
    )}`
  )
  assert.equal(calls[0].options.method, 'GET')
})

test('falls back to local recording when the shared endpoint is unavailable', async () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0)
  const storage = createMemoryStorage()

  const visits = await recordVisitorPageView({
    endpoint: 'https://activity.example.test/visits',
    fetchImpl: async () => {
      throw new Error('offline')
    },
    nowMs: now,
    storage,
  })

  assert.deepEqual(visits, [now])
})
