import test from 'node:test'
import assert from 'node:assert/strict'
import { HOUSE_INTERIOR_MAP } from '../lib/house-interior-map.mjs'
import {
  advanceWanderState,
  createInteriorNavigation,
  createWanderState,
} from '../lib/house-interior-navigation.mjs'

const navigation = createInteriorNavigation(HOUSE_INTERIOR_MAP)

test('rejects blue walls and furniture but allows the living-room spawn', () => {
  assert.equal(navigation.isWalkable(6, 10), false)
  assert.equal(navigation.isWalkable(28, 23), false)
  assert.equal(navigation.isWalkable(31, 27), true)
})

test('doorway cells connect the living room to the bedroom', () => {
  const path = navigation.findPath({ x: 31, y: 27 }, { x: 10, y: 13 })
  assert.ok(path.length > 0)
  assert.ok(path.some(({ x, y }) => x === 19 && y >= 15 && y < 19))
  assert.ok(path.every(({ x, y }) => navigation.isWalkable(x, y)))
})

test('a wall-separated target returns no path instead of tunnelling through blue tiles', () => {
  const isolated = createInteriorNavigation({ width: 3, height: 1, collision: [{ x: 1, y: 0 }] })
  assert.deepEqual(isolated.findPath({ x: 0, y: 0 }, { x: 2, y: 0 }), [])
})

test('wander state advances without entering a collision cell', () => {
  const state = createWanderState({ x: 31, y: 27 })
  const next = advanceWanderState(state, navigation, 0.5, () => 0)
  assert.ok(Number.isFinite(next.x))
  assert.ok(Number.isFinite(next.y))
  assert.equal(navigation.isWalkable(Math.round(next.x), Math.round(next.y)), true)
})
