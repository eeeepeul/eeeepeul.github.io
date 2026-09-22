import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CHARACTER_WORLD_ID,
  SHARED_CHARACTER_EVENT,
  createSharedCharacterStore,
  mergeCharacterEvents,
  normalizeCharacterRow,
  startSharedCharacterFeed,
} from '../lib/shared-characters.mjs'

const VALID_ROW = {
  id: 7,
  created_at: '2026-09-22T00:00:00.000Z',
  world_id: CHARACTER_WORLD_ID,
  match_color: 2,
  expression: 4,
  flame_color: 1,
  flame_shape: 5,
  shoe: 3,
}

function createFakeSupabaseClient({ rows = [], insertedRow = VALID_ROW } = {}) {
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
                  return { data: insertedRow, error: null, columns }
                },
              }
            },
          }
        },
        select(columns) {
          const query = { table, columns, since: null, worldId: null, afterId: null, limit: null }
          const builder = {
            gte(column, value) {
              query.since = { column, value }
              return builder
            },
            eq(column, value) {
              query.worldId = { column, value }
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
                .filter(
                  (row) =>
                    Number(row.id) > afterId &&
                    Date.parse(row.created_at) >= sinceMs &&
                    (!query.worldId || row.world_id === query.worldId.value)
                )
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

test('normalizes a valid shared character row into the application customization shape', () => {
  assert.deepEqual(normalizeCharacterRow(VALID_ROW), {
    id: 7,
    createdAt: Date.parse(VALID_ROW.created_at),
    worldId: CHARACTER_WORLD_ID,
    customization: {
      'match-color': 2,
      expression: 4,
      'flame-color': 1,
      'flame-shape': 5,
      shoes: 3,
    },
  })
})

test('rejects malformed worlds, timestamps, ids, and option indexes', () => {
  assert.equal(normalizeCharacterRow({ ...VALID_ROW, world_id: 'other-world' }), null)
  assert.equal(normalizeCharacterRow({ ...VALID_ROW, created_at: 'invalid' }), null)
  assert.equal(normalizeCharacterRow({ ...VALID_ROW, id: 0 }), null)
  assert.equal(normalizeCharacterRow({ ...VALID_ROW, expression: 6 }), null)
  assert.equal(normalizeCharacterRow({ ...VALID_ROW, shoe: -1 }), null)
})

test('merges initial and realtime characters by server id in chronological order', () => {
  const first = normalizeCharacterRow(VALID_ROW)
  const second = normalizeCharacterRow({ ...VALID_ROW, id: 8, created_at: '2026-09-22T00:01:00.000Z' })
  assert.deepEqual(mergeCharacterEvents([second], [first, second]), [first, second])
})

test('records only validated selections and leaves created_at to the server', async () => {
  const client = createFakeSupabaseClient()
  const store = createSharedCharacterStore(client)
  const character = await store.recordCharacter({
    'match-color': 2,
    expression: 4,
    'flame-color': 1,
    'flame-shape': 5,
    shoes: 3,
  })

  assert.deepEqual(client.state.insertPayloads, [
    {
      table: 'character_events',
      payload: {
        world_id: CHARACTER_WORLD_ID,
        match_color: 2,
        expression: 4,
        flame_color: 1,
        flame_shape: 5,
        shoe: 3,
      },
    },
  ])
  assert.equal(character.id, 7)
  await assert.rejects(
    () => store.recordCharacter({ ...character.customization, expression: 6 }),
    /Invalid character customization/
  )
})

test('loads shared characters with sequential keyset pagination', async () => {
  const rows = [
    VALID_ROW,
    { ...VALID_ROW, id: 8, created_at: '2026-09-22T00:00:01.000Z' },
    { ...VALID_ROW, id: 9, created_at: '2026-09-22T00:00:02.000Z' },
  ]
  const client = createFakeSupabaseClient({ rows })
  const store = createSharedCharacterStore(client)
  const characters = await store.loadCharacters({
    sinceMs: Date.parse('2026-09-22T00:00:00.000Z'),
    pageSize: 2,
  })

  assert.deepEqual(characters.map(({ id }) => id), [7, 8, 9])
  assert.deepEqual(client.state.loadQueries.map(({ afterId, limit }) => ({ afterId, limit })), [
    { afterId: { column: 'id', value: 0 }, limit: 2 },
    { afterId: { column: 'id', value: 8 }, limit: 2 },
  ])
})

test('streams inserts and cleans up the Realtime channel', async () => {
  const client = createFakeSupabaseClient()
  const store = createSharedCharacterStore(client)
  const characters = []
  const statuses = []
  const unsubscribe = store.subscribe({
    onCharacter: (character) => characters.push(character),
    onStatus: (status) => statuses.push(status),
  })
  client.state.realtime.callback({ new: VALID_ROW })
  await unsubscribe()

  assert.deepEqual(client.state.realtime.filter, {
    event: 'INSERT',
    schema: 'public',
    table: 'character_events',
  })
  assert.deepEqual(characters.map(({ id }) => id), [7])
  assert.deepEqual(statuses, ['shared'])
  assert.equal(client.state.removedChannels.length, 1)
})

test('loads, subscribes, and publishes same-tab character events without duplicates', async () => {
  const client = createFakeSupabaseClient({ rows: [VALID_ROW] })
  const store = createSharedCharacterStore(client)
  const listeners = new Map()
  const eventTarget = {
    addEventListener(name, callback) {
      listeners.set(name, callback)
    },
    removeEventListener(name) {
      listeners.delete(name)
    },
  }
  const snapshots = []
  const feed = startSharedCharacterFeed({
    store,
    getSinceMs: () => Date.parse('2026-09-21T00:00:00.000Z'),
    onCharacters: (characters) => snapshots.push(characters.map(({ id }) => id)),
    eventTarget,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
  })

  await feed.ready
  listeners.get(SHARED_CHARACTER_EVENT)?.({ detail: { character: normalizeCharacterRow(VALID_ROW) } })
  await feed.cleanup()

  assert.deepEqual(snapshots.at(-1), [7])
  assert.equal(listeners.has(SHARED_CHARACTER_EVENT), false)
})
