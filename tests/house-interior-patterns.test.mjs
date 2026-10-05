import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_INTERIOR_PATTERN_PERIOD,
  isHouseInteriorPatternPixel,
  resolveHouseInteriorPattern,
} from '../lib/house-interior-patterns.mjs'

test('assigns one stable motif to each patterned house object type', () => {
  assert.deepEqual(resolveHouseInteriorPattern('rug-blue'), {
    color: 'blue',
    motif: 'diagonal',
  })
  assert.deepEqual(resolveHouseInteriorPattern('rug-coral'), {
    color: 'coral',
    motif: 'diagonal',
  })
  assert.deepEqual(resolveHouseInteriorPattern('sofa-blue'), {
    color: 'blue',
    motif: 'crosshatch',
  })
  assert.deepEqual(resolveHouseInteriorPattern('bookcase'), {
    color: 'blue',
    motif: 'grid',
  })
  assert.equal(resolveHouseInteriorPattern('low-table'), null)
})

test('repeats every motif on one global eight-pixel grid', () => {
  assert.equal(HOUSE_INTERIOR_PATTERN_PERIOD, 8)

  for (const motif of ['diagonal', 'crosshatch', 'grid', 'plus']) {
    for (const [x, y] of [[0, 0], [3, 5], [7, 6], [11, 14]]) {
      const expected = isHouseInteriorPatternPixel(motif, x, y)
      assert.equal(isHouseInteriorPatternPixel(motif, x + 8, y), expected)
      assert.equal(isHouseInteriorPatternPixel(motif, x, y + 8), expected)
    }
  }
})

test('keeps regular pattern strokes separated by white cells', () => {
  assert.equal(isHouseInteriorPatternPixel('diagonal', 0, 0), true)
  assert.equal(isHouseInteriorPatternPixel('diagonal', 3, 0), false)
  assert.equal(isHouseInteriorPatternPixel('crosshatch', 0, 0), true)
  assert.equal(isHouseInteriorPatternPixel('crosshatch', 3, 0), false)
  assert.equal(isHouseInteriorPatternPixel('grid', 0, 3), true)
  assert.equal(isHouseInteriorPatternPixel('grid', 3, 3), false)
  assert.equal(isHouseInteriorPatternPixel('plus', 4, 2), true)
  assert.equal(isHouseInteriorPatternPixel('plus', 2, 2), false)
})
