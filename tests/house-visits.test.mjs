import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_VISIT_STORAGE_KEY,
  HOUSE_VISIT_WINDOW_MS,
  countRecentHouseVisits,
  getHouseVisitRadii,
  loadHouseVisits,
  normalizeHouseId,
  readLocalHouseVisits,
  recordHouseVisit,
  recordHouseVisitFromSearch,
  recordLocalHouseVisit,
} from '../lib/house-visits.mjs'

function createMemoryStorage(initialValue = null) {
  let value = initialValue

  return {
    getItem(key) {
      assert.equal(key, HOUSE_VISIT_STORAGE_KEY)
      return value
    },
    setItem(key, nextValue) {
      assert.equal(key, HOUSE_VISIT_STORAGE_KEY)
      value = nextValue
    },
  }
}

test('accepts only the four house identifiers used by CCTV routes', () => {
  assert.equal(normalizeHouseId('house1'), 'house1')
  assert.equal(normalizeHouseId('house4'), 'house4')
  assert.equal(normalizeHouseId('house5'), null)
  assert.equal(normalizeHouseId(null), null)
})

test('counts each house visit only inside the latest rolling 24 hours', () => {
  const now = Date.UTC(2026, 7, 12, 12, 0, 0)
  const visits = [
    { houseId: 'house1', visitedAt: now - 1_000 },
    { houseId: 'house1', visitedAt: new Date(now).toISOString() },
    { houseId: 'house2', visitedAt: now - HOUSE_VISIT_WINDOW_MS + 1 },
    { houseId: 'house3', visitedAt: now - HOUSE_VISIT_WINDOW_MS },
    { houseId: 'house4', visitedAt: now + 1 },
    { houseId: 'house8', visitedAt: now },
  ]

  assert.deepEqual(countRecentHouseVisits(visits, now), {
    house1: 2,
    house2: 1,
    house3: 0,
    house4: 0,
  })
})

test('keeps visit rings between seven and 23.4 units with square-root growth', () => {
  const radii = getHouseVisitRadii({ house1: 0, house2: 1, house3: 4, house4: 9 })

  assert.deepEqual(radii, {
    house1: 7,
    house2: 12.467,
    house3: 17.933,
    house4: 23.4,
  })
})

test('uses an equal middle-sized ring when every house has the same positive count', () => {
  assert.deepEqual(getHouseVisitRadii({ house1: 2, house2: 2, house3: 2, house4: 2 }), {
    house1: 15.2,
    house2: 15.2,
    house3: 15.2,
    house4: 15.2,
  })
})

test('records every valid local house visit and ignores invalid stored records', () => {
  const now = Date.UTC(2026, 7, 12, 12, 0, 0)
  const storage = createMemoryStorage(
    JSON.stringify([
      { houseId: 'house2', visitedAt: now - HOUSE_VISIT_WINDOW_MS },
      { houseId: 'house9', visitedAt: now },
    ])
  )

  assert.deepEqual(recordLocalHouseVisit(storage, 'house2', now), [
    { houseId: 'house2', visitedAt: now },
  ])
  assert.deepEqual(recordLocalHouseVisit(storage, 'house2', now), [
    { houseId: 'house2', visitedAt: now },
    { houseId: 'house2', visitedAt: now },
  ])
  assert.deepEqual(readLocalHouseVisits(storage, now), [
    { houseId: 'house2', visitedAt: now },
    { houseId: 'house2', visitedAt: now },
  ])
})

test('records the house selected by the CCTV query string', async () => {
  const now = Date.UTC(2026, 7, 12, 12, 0, 0)
  const storage = createMemoryStorage()

  await recordHouseVisitFromSearch({ search: '?house=house3', storage, nowMs: now })

  assert.deepEqual(readLocalHouseVisits(storage, now), [{ houseId: 'house3', visitedAt: now }])
})

test('sends the house identifier to the shared endpoint and reads house visit records', async () => {
  const now = Date.UTC(2026, 7, 12, 12, 0, 0)
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      async json() {
        return {
          houseVisits: [
            { houseId: 'house1', visitedAt: new Date(now - 1_000).toISOString() },
            { houseId: 'house4', visitedAt: new Date(now).toISOString() },
          ],
        }
      },
    }
  }

  const visits = await recordHouseVisit({
    endpoint: 'https://activity.example.test/visits',
    fetchImpl,
    houseId: 'house4',
    nowMs: now,
    storage: createMemoryStorage(),
  })

  assert.deepEqual(visits, [
    { houseId: 'house1', visitedAt: now - 1_000 },
    { houseId: 'house4', visitedAt: now },
  ])
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    houseId: 'house4',
    visitedAt: new Date(now).toISOString(),
  })
})

test('loads shared house visits without recording another visit', async () => {
  const now = Date.UTC(2026, 7, 12, 12, 0, 0)
  const calls = []
  const visits = await loadHouseVisits({
    endpoint: 'https://activity.example.test/visits?room=home',
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return {
        ok: true,
        async json() {
          return { visits: [{ houseId: 'house1', visitedAt: now }] }
        },
      }
    },
    nowMs: now,
    storage: createMemoryStorage(),
  })

  assert.deepEqual(visits, [{ houseId: 'house1', visitedAt: now }])
  assert.equal(calls[0].options.method, 'GET')
  assert.match(calls[0].url, /[?&]since=/)
})
