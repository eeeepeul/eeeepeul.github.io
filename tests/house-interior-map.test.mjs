import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_INTERIOR_COLLISION_CELLS,
  HOUSE_INTERIOR_CONNECTIONS,
  HOUSE_INTERIOR_LAYER_ORDER,
  HOUSE_INTERIOR_MAP,
  HOUSE_INTERIOR_MAP_HEIGHT,
  HOUSE_INTERIOR_MAP_WIDTH,
  HOUSE_INTERIOR_OBJECTS,
  HOUSE_INTERIOR_ROOMS,
  HOUSE_INTERIOR_SPAWN_POINTS,
  HOUSE_INTERIOR_TILE_SIZE,
} from '../lib/house-interior-map.mjs'

test('exposes the requested 64 by 48 map contract', () => {
  assert.equal(HOUSE_INTERIOR_MAP_WIDTH, 64)
  assert.equal(HOUSE_INTERIOR_MAP_HEIGHT, 48)
  assert.equal(HOUSE_INTERIOR_TILE_SIZE, 16)
  assert.deepEqual(HOUSE_INTERIOR_LAYER_ORDER, [
    'floor',
    'walls',
    'doors_windows',
    'furniture',
    'decor',
    'collision',
    'spawn_points',
  ])
  assert.equal(HOUSE_INTERIOR_MAP.width, 64)
  assert.equal(HOUSE_INTERIOR_MAP.height, 48)
})

test('keeps every requested room inside the supplied tile bounds', () => {
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.main_house, { x: 6, y: 4, width: 52, height: 37 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.entrance_projection, { x: 24, y: 41, width: 16, height: 7 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.living_room, { x: 20, y: 14, width: 23, height: 17 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.bedroom, { x: 7, y: 6, width: 13, height: 13 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.study_record_room, { x: 43, y: 6, width: 14, height: 13 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.bathroom, { x: 7, y: 20, width: 10, height: 9 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.kitchen_dining, { x: 43, y: 21, width: 14, height: 15 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.quiet_room, { x: 7, y: 30, width: 13, height: 10 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.entry_hall, { x: 20, y: 31, width: 23, height: 10 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.entrance, { x: 25, y: 41, width: 14, height: 7 })
})

test('defines short direct openings between the hub and each adjacent room', () => {
  assert.deepEqual(
    HOUSE_INTERIOR_CONNECTIONS.map(({ from, to }) => `${from}->${to}`),
    [
      'living_room->bedroom',
      'living_room->study_record_room',
      'living_room->bathroom',
      'living_room->kitchen_dining',
      'living_room->entry_hall',
      'entry_hall->entrance',
    ]
  )
  assert.ok(
    HOUSE_INTERIOR_CONNECTIONS
      .filter(({ id }) => !['living-to-entry-hall', 'entry-hall-to-entrance'].includes(id))
      .every(({ width }) => width <= 5)
  )
  assert.equal(
    HOUSE_INTERIOR_CONNECTIONS.find(({ id }) => id === 'living-to-entry-hall').width,
    9
  )
  assert.equal(
    HOUSE_INTERIOR_CONNECTIONS.find(({ id }) => id === 'entry-hall-to-entrance').width,
    6
  )
})

test('keeps visual objects separate from collision and spawn data', () => {
  assert.ok(HOUSE_INTERIOR_OBJECTS.furniture.length > 0)
  assert.ok(HOUSE_INTERIOR_OBJECTS.decor.length > 0)
  assert.ok(Array.isArray(HOUSE_INTERIOR_COLLISION_CELLS))
  assert.ok(Array.isArray(HOUSE_INTERIOR_SPAWN_POINTS))
  assert.equal('collision' in HOUSE_INTERIOR_OBJECTS, false)
  assert.equal('spawn_points' in HOUSE_INTERIOR_OBJECTS, false)
})
