import test from 'node:test'
import assert from 'node:assert/strict'

import { HOUSE_MAP_WALK, HOUSE_MAP_WALK_ROWS } from '../lib/house-map-walk.mjs'
import { advanceWanderState, createInteriorNavigation, createWanderState } from '../lib/house-interior-navigation.mjs'

const walkable = (x, y) => HOUSE_MAP_WALK_ROWS[y]?.[x] === '.'

test('the floor of the house picture is 200 x 150 cells, 4:3 as the picture', () => {
  assert.equal(HOUSE_MAP_WALK.width, 200)
  assert.equal(HOUSE_MAP_WALK.height, 150)
  assert.ok(HOUSE_MAP_WALK_ROWS.every((row) => row.length === 200))
})

test('every place a match may go can be reached from every other (one floor, through the doors)', () => {
  const navigation = createInteriorNavigation(HOUSE_MAP_WALK)
  const [first] = navigation.walkableCells
  const seen = new Set([`${first.x}:${first.y}`])
  const queue = [first]
  while (queue.length) {
    const { x, y } = queue.pop()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx}:${y + dy}`
      if (!seen.has(key) && navigation.isWalkable(x + dx, y + dy)) {
        seen.add(key)
        queue.push({ x: x + dx, y: y + dy })
      }
    }
  }
  assert.equal(seen.size, navigation.walkableCells.length)
  assert.ok(seen.size > 5000)
})

test('the walls and the outside are not floor, the rooms and the corridors are', () => {
  // the dark outside (the sheet's corner, the dark ground left of the house, above the V), the house's left wall (cell 43:66)
  // and the top wall of the room under it (cell 75:63)
  ;[[5, 5], [25, 100], [100, 20], [43, 66], [75, 63]].forEach(([x, y]) => assert.equal(walkable(x, y), false, `${x}:${y}`))
  // the middle hall (106:81), the room under the wall (75:66) and the corridor along the bottom (48:129, 125:129) are floor
  ;[[106, 81], [75, 66], [48, 129], [125, 129]].forEach(([x, y]) => assert.equal(walkable(x, y), true, `${x}:${y}`))
})

test('the doors are ways through: the room under 75:63 is joined to the rest of the floor', () => {
  // (the one connected floor test above holds for every cell, so a room whose door were closed would be left out of it)
  assert.equal(walkable(75, 66), true)
  assert.ok(HOUSE_MAP_WALK_ROWS.join('').split('.').length - 1 > 8000)
})

test('the matches start on the floor, in the open and spread over the house, and walk only on floor', () => {
  const navigation = createInteriorNavigation(HOUSE_MAP_WALK)
  const open = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dy]) => walkable(x + dx, y + dy))
  HOUSE_MAP_WALK.spawnCells.forEach(({ x, y }) => {
    assert.ok(walkable(x, y))
    assert.ok(open(x, y), `${x}:${y} is not in the open`)
  })
  assert.equal(HOUSE_MAP_WALK.spawnCells.length, 6)
  const spread = HOUSE_MAP_WALK.spawnCells.flatMap((a, i) => HOUSE_MAP_WALK.spawnCells.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y)))
  assert.ok(Math.min(...spread) > 20, 'the starting places are spread')
  let state = createWanderState(HOUSE_MAP_WALK.spawnCells[0], () => 0.37)
  let draw = 0.11
  for (let step = 0; step < 4000; step += 1) {
    draw = (draw * 9301 + 49297) % 233280 / 233280
    const random = () => draw
    state = advanceWanderState(state, navigation, 0.05, random, HOUSE_MAP_WALK.walkSpeed)
    // a match is always on, or between, two floor cells next to each other
    const cells = [[Math.floor(state.x), Math.floor(state.y)], [Math.ceil(state.x), Math.ceil(state.y)]]
    cells.forEach(([x, y]) => assert.ok(walkable(x, y), `stepped on ${x}:${y}`))
  }
})

test('a match walks as fast on the screen as on the earlier room', () => {
  const earlier = (2.2 * 3983) / 64 // screen pixels a second on the earlier room
  const now = HOUSE_MAP_WALK.walkSpeed * (4800 / 200)
  assert.ok(Math.abs(now - earlier) < 0.01)
})
