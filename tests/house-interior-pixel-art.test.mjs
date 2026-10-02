import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_INTERIOR_PIXEL_HEIGHT,
  HOUSE_INTERIOR_PIXEL_PALETTE,
  HOUSE_INTERIOR_PIXEL_RUNS,
  HOUSE_INTERIOR_PIXEL_SCENE,
  HOUSE_INTERIOR_PIXEL_WIDTH,
  HOUSE_INTERIOR_WALL_THICKNESS,
} from '../lib/house-interior-pixel-art.mjs'
import {
  HOUSE_INTERIOR_COLLISION_CELLS,
  HOUSE_INTERIOR_MAP,
} from '../lib/house-interior-map.mjs'

test('exposes a bounded pixel canvas and approved palette', () => {
  assert.equal(HOUSE_INTERIOR_PIXEL_WIDTH, 256)
  assert.equal(HOUSE_INTERIOR_PIXEL_HEIGHT, 192)
  assert.deepEqual(Object.keys(HOUSE_INTERIOR_PIXEL_PALETTE).sort(), [
    'blue',
    'coral',
    'ivory',
    'lightBlue',
    'wall',
    'white',
  ].sort())
  assert.ok(Object.isFrozen(HOUSE_INTERIOR_PIXEL_PALETTE))
  assert.ok(Object.isFrozen(HOUSE_INTERIOR_PIXEL_RUNS))
  assert.ok(Object.isFrozen(HOUSE_INTERIOR_PIXEL_SCENE))
  assert.ok(HOUSE_INTERIOR_WALL_THICKNESS > 0)
  assert.ok(HOUSE_INTERIOR_WALL_THICKNESS <= 1)
  assert.ok(HOUSE_INTERIOR_WALL_THICKNESS < 16)
})

test('keeps every pixel run inside the canvas', () => {
  for (const run of HOUSE_INTERIOR_PIXEL_RUNS) {
    assert.ok(Object.hasOwn(HOUSE_INTERIOR_PIXEL_PALETTE, run.color))
    assert.ok(Number.isInteger(run.x) && run.x >= 0)
    assert.ok(Number.isInteger(run.y) && run.y >= 0)
    assert.ok(Number.isInteger(run.length) && run.length > 0)
    assert.ok(run.x + run.length <= HOUSE_INTERIOR_PIXEL_WIDTH)
    assert.ok(run.y < HOUSE_INTERIOR_PIXEL_HEIGHT)
  }
})

test('keeps the visual wall thickness separate from collision geometry', () => {
  assert.strictEqual(HOUSE_INTERIOR_MAP.collision, HOUSE_INTERIOR_COLLISION_CELLS)
  assert.ok(HOUSE_INTERIOR_PIXEL_SCENE.some(({ kind }) => kind === 'furniture'))
  assert.ok(HOUSE_INTERIOR_PIXEL_SCENE.some(({ kind }) => kind === 'decor'))
})
