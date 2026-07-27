import test from 'node:test'
import assert from 'node:assert/strict'
import { letterForLuminance } from '../lib/letter-mosaic.mjs'

test('maps every luminance to E, O, or M without a blank band', () => {
  assert.deepEqual(
    [0, 0.329, 0.33, 0.659, 0.66, 1].map(letterForLuminance),
    ['E', 'E', 'O', 'O', 'M', 'M']
  )
})

test('falls back to E when luminance is invalid', () => {
  assert.equal(letterForLuminance(Number.NaN), 'E')
  assert.equal(letterForLuminance(undefined), 'E')
})
