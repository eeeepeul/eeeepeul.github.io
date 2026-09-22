import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_INTERIOR_MAP,
  HOUSE_INTERIOR_ROOMS,
} from '../lib/house-interior-map.mjs'
import {
  findInteriorPath,
  isWalkableCell,
} from '../lib/house-interior-navigation.mjs'

test('keeps the interior path on floor cells and uses the bedroom doorway', () => {
  const path = findInteriorPath(
    { x: 17, y: 17 },
    { x: 37, y: 27 },
    HOUSE_INTERIOR_MAP
  )

  assert.ok(path.length > 0)
  assert.ok(path.some(({ x, y }) => x === 19 && y >= 15 && y <= 18))
  assert.ok(path.every(({ x, y }) => isWalkableCell(x, y, HOUSE_INTERIOR_MAP)))
})

test('does not treat a wall cell as a walkable destination', () => {
  assert.equal(isWalkableCell(6, 10, HOUSE_INTERIOR_MAP), false)
  assert.equal(isWalkableCell(0, 0, HOUSE_INTERIOR_MAP), false)
  assert.equal(isWalkableCell(31, 27, HOUSE_INTERIOR_MAP), true)
})
