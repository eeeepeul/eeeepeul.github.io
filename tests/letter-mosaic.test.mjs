import test from 'node:test'
import assert from 'node:assert/strict'
import { letterForLuminance } from '../lib/letter-mosaic.mjs'

test('fills every valid luminance cell with E, O, or M', () => {
  assert.deepEqual(
    [0, 0.339, 0.34, 0.659, 0.66, 1].map(letterForLuminance),
    ['E', 'E', 'O', 'O', 'M', 'M']
  )
})

test('keeps the background blank when luminance is invalid', () => {
  assert.equal(letterForLuminance(Number.NaN), null)
  assert.equal(letterForLuminance(undefined), null)
})
