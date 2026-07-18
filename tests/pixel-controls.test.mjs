import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyBand,
  effectiveTiles,
  manualTilesFromPosition,
  pointerPosition,
} from '../lib/pixel-controls.mjs'

test('drag position maps from small to large pixels', () => {
  assert.equal(manualTilesFromPosition(0), 180)
  assert.equal(manualTilesFromPosition(1), 12)
})

test('kick enlarges pixels by reducing tile count', () => {
  assert.equal(effectiveTiles(100, 0), 100)
  assert.equal(effectiveTiles(100, 1, 0.45), 55)
})

test('luminance maps into four stable bands', () => {
  assert.deepEqual(
    [0.1, 0.3, 0.6, 0.9].map((value) => classifyBand(value)),
    [0, 1, 2, 3]
  )
})

test('pointer coordinates clamp to the drag rail', () => {
  assert.equal(pointerPosition(100, 100, 200), 0)
  assert.equal(pointerPosition(200, 100, 200), 0.5)
  assert.equal(pointerPosition(400, 100, 200), 1)
})
