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

test('the walls, the pond and the outside are not floor', () => {
  // the outside (the black round the house), the left outer wall (picture x 375), the pond (picture 950, 1100),
  // and the wall between the dining room and the bedroom under it (picture 550, 1095)
  ;[[5, 5], [100, 20], [37, 80], [95, 110], [55, 109]].forEach(([x, y]) => assert.equal(walkable(x, y), false, `${x}:${y}`))
  // the corridor in front of the pond room (picture 1000, 1225) and the dining room floor (picture 440, 1060) are floor
  ;[[100, 122], [44, 106]].forEach(([x, y]) => assert.equal(walkable(x, y), true, `${x}:${y}`))
})

test('the matches start on the floor, in the part of the house the camera shows first, and walk only on floor', () => {
  const navigation = createInteriorNavigation(HOUSE_MAP_WALK)
  HOUSE_MAP_WALK.spawnCells.forEach(({ x, y }) => {
    assert.ok(walkable(x, y))
    assert.ok(x >= 45 && x <= 104 && y >= 94 && y <= 139)
  })
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
