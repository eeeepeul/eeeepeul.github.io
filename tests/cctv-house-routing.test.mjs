import test from 'node:test'
import assert from 'node:assert/strict'
import { CCTV_HOUSES, getCctvHouse, normalizeHouseId } from '../lib/cctv-houses.mjs'

test('defines four house-specific CCTV sources and labels', () => {
  assert.equal(CCTV_HOUSES.length, 4)
  assert.deepEqual(
    CCTV_HOUSES.map((house) => house.id),
    ['house1', 'house2', 'house3', 'house4']
  )
  assert.ok(CCTV_HOUSES.every((house) => house.videoSrc && house.label))
})

test('normalizes unknown house query values to house1', () => {
  assert.equal(normalizeHouseId('house3'), 'house3')
  assert.equal(normalizeHouseId('unknown'), 'house1')
  assert.equal(normalizeHouseId(null), 'house1')
  assert.equal(getCctvHouse('house4').id, 'house4')
})
