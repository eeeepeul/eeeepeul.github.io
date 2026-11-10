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
  assert.ok(seen.size > 1500)
})

test('the walls and the outside are not floor, the corridors are, and the rooms are not entered', () => {
  // the dark outside (the sheet's corner, the dark ground left of the house, above the V), the house's left wall (cell 43:66)
  ;[[5, 5], [25, 100], [100, 20], [43, 66]].forEach(([x, y]) => assert.equal(walkable(x, y), false, `${x}:${y}`))
  // the rooms are walled boxes with a door each (a match keeps to the corridors): the middle hall (106:81), the room under the
  // wall at 75:63 (75:66), the room under the hall (100:100), the top left room (30:25) and a room of the right side (160:60)
  ;[[106, 81], [75, 66], [100, 100], [30, 25], [160, 60]].forEach(([x, y]) => assert.equal(walkable(x, y), false, `room ${x}:${y}`))
  // the corridor along the bottom of the house is floor
  ;[[100, 123], [75, 125], [50, 127]].forEach(([x, y]) => assert.equal(walkable(x, y), true, `${x}:${y}`))
})

test('the floor keeps away from the edge of the sheet and from the dark outside (the generator keeps a cell round every floor cell)', () => {
  HOUSE_MAP_WALK_ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== '.') continue
      assert.ok(x > 2 && y > 2 && x < row.length - 3 && y < HOUSE_MAP_WALK_ROWS.length - 3, `${x}:${y} is at the edge`)
      // the dark ground left of the house (cells 15 to 43 across, 42 to 141 down) is never reached
      assert.ok(!(x >= 15 && x <= 44 && y >= 42 && y <= 141), `${x}:${y} is on the dark ground`)
    }
  })
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
  assert.ok(Math.min(...spread) > 10, 'the starting places are spread')
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
