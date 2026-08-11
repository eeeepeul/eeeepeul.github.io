import test from 'node:test'
import assert from 'node:assert/strict'

const houseDistanceModule = await import('../lib/house-distance.mjs').catch(() => ({}))
const {
  advanceHouse,
  createHouseDistances,
  getHousePair,
  getHouseWindow,
  scrollHousePosition,
  settleHouseDrag,
  scaleHouseDistance,
} = houseDistanceModule

test('wraps forward from house4 to house1 and backward from house1 to house4', () => {
  assert.equal(typeof advanceHouse, 'function')
  assert.equal(advanceHouse(3, 1), 0)
  assert.equal(advanceHouse(0, -1), 3)
  assert.equal(advanceHouse(1, 1), 2)
})

test('returns the visible house pair including the house4 to house1 segment', () => {
  assert.equal(typeof getHousePair, 'function')
  assert.deepEqual(getHousePair(0), { from: 'house1', to: 'house2' })
  assert.deepEqual(getHousePair(3), { from: 'house4', to: 'house1' })
})

test('keeps previous current and next house routes adjacent across both loop seams', () => {
  assert.equal(typeof getHouseWindow, 'function')
  assert.deepEqual(getHouseWindow(0), { previous: 3, current: 0, next: 1 })
  assert.deepEqual(getHouseWindow(3), { previous: 2, current: 3, next: 0 })
})

test('keeps a partial drag at the exact released position instead of snapping', () => {
  assert.equal(typeof settleHouseDrag, 'function')
  assert.deepEqual(settleHouseDrag(0, -96), { houseIndex: 0, offset: -96 })
  assert.deepEqual(settleHouseDrag(2, 74.5), { houseIndex: 2, offset: 74.5 })
})

test('recenters only after a complete slide so dragging can continue around the loop', () => {
  assert.equal(typeof settleHouseDrag, 'function')
  assert.deepEqual(settleHouseDrag(0, -261), { houseIndex: 1, offset: 0 })
  assert.deepEqual(settleHouseDrag(3, -261), { houseIndex: 0, offset: 0 })
  assert.deepEqual(settleHouseDrag(0, 261), { houseIndex: 3, offset: 0 })
})

test('scrolling down moves the route left while scrolling up reverses it', () => {
  assert.equal(typeof scrollHousePosition, 'function')
  assert.deepEqual(scrollHousePosition(0, 0, 100), { houseIndex: 0, offset: -40 })
  assert.deepEqual(scrollHousePosition(0, 0, -100), { houseIndex: 0, offset: 40 })
})

test('wheel movement preserves its remainder across the house4 and house1 seam', () => {
  assert.equal(typeof scrollHousePosition, 'function')
  assert.deepEqual(scrollHousePosition(3, -250, 50), { houseIndex: 0, offset: -9 })
  assert.deepEqual(scrollHousePosition(0, 250, -50), { houseIndex: 3, offset: 9 })
})

test('creates four independently sampled integer distances within the approved range', () => {
  assert.equal(typeof createHouseDistances, 'function')
  const samples = [0, 0.25, 0.5, 1]
  let sampleIndex = 0

  assert.deepEqual(
    createHouseDistances(() => samples[sampleIndex++]),
    [8000, 10500, 13000, 18000]
  )
})

test('maps the shortest and longest route to the visible straight-line range', () => {
  assert.equal(typeof scaleHouseDistance, 'function')
  const distances = [8000, 10500, 13000, 18000]

  assert.equal(scaleHouseDistance(8000, distances), 0.68)
  assert.equal(scaleHouseDistance(18000, distances), 1)
  assert.equal(scaleHouseDistance(13000, distances), 0.84)
  assert.equal(scaleHouseDistance(12000, [12000, 12000, 12000, 12000]), 0.84)
})
