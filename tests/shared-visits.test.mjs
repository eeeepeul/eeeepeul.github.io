import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSharedVisitStore,
  houseIdFromLocation,
  mergeVisitEvents,
  normalizeVisitRow,
  recordSharedPageVisit,
  SHARED_VISIT_EVENT,
  startSharedVisitFeed,
} from '../lib/shared-visits.mjs'

function createFakeSupabaseClient({ rows = [], insertedRow } = {}) {
  const state = {
    insertPayloads: [],
    loadQueries: [],
    removedChannels: [],
    realtime: null,
  }

  return {
    state,
    from(table) {
      return {
        insert(payload) {
          state.insertPayloads.push({ table, payload })
          return {
            select(columns) {
              return {
                async single() {
                  return {
                    data: insertedRow ?? {
                      id: 99,
                      visited_at: '2026-08-12T01:02:03.000Z',
                      house_id: payload.house_id,
                    },
                    error: null,
                    columns,
                  }
                },
              }
            },
          }
        },
        select(columns) {
          const query = { table, columns, since: null, afterId: null, limit: null }
          const builder = {
            gte(column, value) {
              query.since = { column, value }
              return builder
            },
            gt(column, value) {
              query.afterId = { column, value }
              return builder
            },
            order(column, options) {
              query.order = { column, options }
              return builder
            },
            limit(value) {
              query.limit = value
              return builder
            },
            then(resolve, reject) {
              state.loadQueries.push({ ...query })
              const afterId = Number(query.afterId?.value) || 0
              const sinceMs = Date.parse(query.since?.value)
              const data = rows
                .filter((row) => Number(row.id) > afterId && Date.parse(row.visited_at) >= sinceMs)
                .sort((left, right) => Number(left.id) - Number(right.id))
                .slice(0, query.limit)
              return Promise.resolve({ data, error: null }).then(resolve, reject)
            },
          }
          return builder
        },
      }
    },
    channel(name) {
      const channel = {
        name,
        callback: null,
        statusCallback: null,
        on(type, filter, callback) {
          state.realtime = { name, type, filter, callback }
          channel.callback = callback
          return channel
        },
        subscribe(callback) {
          channel.statusCallback = callback
          callback?.('SUBSCRIBED')
          return channel
        },
      }
      return channel
    },
    async removeChannel(channel) {
      state.removedChannels.push(channel)
    },
  }
}

test('normalizes a valid shared visit row into the application event shape', () => {
  assert.deepEqual(
    normalizeVisitRow({
      id: 7,
      visited_at: '2026-08-12T00:00:00.000Z',
      house_id: 'house2',
    }),
    {
      id: 7,
      visitedAt: Date.parse('2026-08-12T00:00:00.000Z'),
      houseId: 'house2',
    }
  )
})

test('rejects malformed shared rows instead of corrupting global totals', () => {
  assert.equal(normalizeVisitRow({ id: 1, visited_at: 'invalid', house_id: null }), null)
  assert.equal(
    normalizeVisitRow({ id: 2, visited_at: '2026-08-12T00:00:00.000Z', house_id: 'house9' }),
    null
  )
})

test('attaches a house only to a valid CCTV experience location', () => {
  assert.equal(houseIdFromLocation('/experience/', '?house=house4'), 'house4')
  assert.equal(houseIdFromLocation('/experience', '?house=house2'), 'house2')
  assert.equal(houseIdFromLocation('/', '?house=house4'), null)
  assert.equal(houseIdFromLocation('/experience/', '?house=unknown'), null)
})

test('records only a validated house value and leaves timestamp generation to the server', async () => {
  const client = createFakeSupabaseClient()
  const store = createSharedVisitStore(client)

  const visit = await store.recordVisit('house2')

  assert.deepEqual(client.state.insertPayloads, [
    { table: 'visit_events', payload: { house_id: 'house2' } },
  ])
  assert.deepEqual(visit, {
    id: 99,
    visitedAt: Date.parse('2026-08-12T01:02:03.000Z'),
    houseId: 'house2',
  })
  await assert.rejects(() => store.recordVisit('house9'), /Invalid house id/)
})

test('loads every shared visit with sequential keyset pagination', async () => {
  const rows = [
    { id: 1, visited_at: '2026-08-12T00:00:01.000Z', house_id: null },
    { id: 2, visited_at: '2026-08-12T00:00:02.000Z', house_id: 'house1' },
    { id: 3, visited_at: '2026-08-12T00:00:03.000Z', house_id: 'house3' },
  ]
  const client = createFakeSupabaseClient({ rows })
  const store = createSharedVisitStore(client)

  const visits = await store.loadVisits({
    sinceMs: Date.parse('2026-08-12T00:00:00.000Z'),
    pageSize: 2,
  })

  assert.deepEqual(visits, [
    { id: 1, visitedAt: Date.parse(rows[0].visited_at), houseId: null },
    { id: 2, visitedAt: Date.parse(rows[1].visited_at), houseId: 'house1' },
    { id: 3, visitedAt: Date.parse(rows[2].visited_at), houseId: 'house3' },
  ])
  assert.deepEqual(
    client.state.loadQueries.map((query) => ({
      afterId: query.afterId,
      limit: query.limit,
      order: query.order,
      since: query.since,
    })),
    [
      {
        afterId: { column: 'id', value: 0 },
        limit: 2,
        order: { column: 'id', options: { ascending: true } },
        since: { column: 'visited_at', value: '2026-08-12T00:00:00.000Z' },
      },
      {
        afterId: { column: 'id', value: 2 },
        limit: 2,
        order: { column: 'id', options: { ascending: true } },
        since: { column: 'visited_at', value: '2026-08-12T00:00:00.000Z' },
      },
    ]
  )
})

test('streams new inserts and removes the realtime channel during cleanup', async () => {
  const client = createFakeSupabaseClient()
  const store = createSharedVisitStore(client)
  const visits = []
  const statuses = []

  const unsubscribe = store.subscribe({
    onVisit: (visit) => visits.push(visit),
    onStatus: (status) => statuses.push(status),
  })
  client.state.realtime.callback({
    new: { id: 12, visited_at: '2026-08-12T02:00:00.000Z', house_id: 'house4' },
  })
  await unsubscribe()

  assert.deepEqual(client.state.realtime.filter, {
    event: 'INSERT',
    schema: 'public',
    table: 'visit_events',
  })
  assert.deepEqual(visits, [
    { id: 12, visitedAt: Date.parse('2026-08-12T02:00:00.000Z'), houseId: 'house4' },
  ])
  assert.deepEqual(statuses, ['shared'])
  assert.equal(client.state.removedChannels.length, 1)
})

test('merges realtime and loaded visits by database id in chronological order', () => {
  assert.deepEqual(
    mergeVisitEvents(
      [
        { id: 4, visitedAt: 40, houseId: 'house1' },
        { id: 2, visitedAt: 20, houseId: null },
      ],
      [
        { id: 4, visitedAt: 40, houseId: 'house1' },
        { id: 3, visitedAt: 30, houseId: 'house2' },
      ]
    ),
    [
      { id: 2, visitedAt: 20, houseId: null },
      { id: 3, visitedAt: 30, houseId: 'house2' },
      { id: 4, visitedAt: 40, houseId: 'house1' },
    ]
  )
})

test('records one page event and broadcasts the server-created row to the current tab', async () => {
  const calls = []
  const dispatched = []
  const expectedVisit = { id: 8, visitedAt: 80, houseId: 'house3' }

  const visit = await recordSharedPageVisit({
    store: {
      async recordVisit(houseId) {
        calls.push(houseId)
        return expectedVisit
      },
    },
    pathname: '/experience/',
    search: '?house=house3',
    dispatch: (eventName, detail) => dispatched.push({ eventName, detail }),
  })

  assert.equal(visit, expectedVisit)
  assert.deepEqual(calls, ['house3'])
  assert.deepEqual(dispatched, [
    { eventName: SHARED_VISIT_EVENT, detail: { visit: expectedVisit } },
  ])
})

test('feeds loaded, realtime, and same-tab visits into one deduplicated stream', async () => {
  const snapshots = []
  const statuses = []
  const listeners = new Map()
  const clearedIntervals = []
  let realtimeVisit
  let realtimeStatus
  let subscriptionCleaned = false

  const connection = startSharedVisitFeed({
    store: {
      async loadVisits() {
        return [{ id: 1, visitedAt: 10, houseId: null }]
      },
      subscribe({ onVisit, onStatus }) {
        realtimeVisit = onVisit
        realtimeStatus = onStatus
        return async () => {
          subscriptionCleaned = true
        }
      },
    },
    getSinceMs: () => 0,
    onVisits: (visits) => snapshots.push(visits),
    onStatus: (status) => statuses.push(status),
    eventTarget: {
      addEventListener(name, listener) {
        listeners.set(name, listener)
      },
      removeEventListener(name) {
        listeners.delete(name)
      },
    },
    setIntervalImpl: () => 51,
    clearIntervalImpl: (id) => clearedIntervals.push(id),
  })

  await connection.ready
  realtimeStatus('shared')
  realtimeVisit({ id: 2, visitedAt: 20, houseId: 'house2' })
  listeners.get(SHARED_VISIT_EVENT)({
    detail: { visit: { id: 2, visitedAt: 20, houseId: 'house2' } },
  })
  await connection.cleanup()

  assert.deepEqual(snapshots.at(-1), [
    { id: 1, visitedAt: 10, houseId: null },
    { id: 2, visitedAt: 20, houseId: 'house2' },
  ])
  assert.deepEqual(statuses, ['connecting', 'shared'])
  assert.deepEqual(clearedIntervals, [51])
  assert.equal(subscriptionCleaned, true)
  assert.equal(listeners.size, 0)
})
