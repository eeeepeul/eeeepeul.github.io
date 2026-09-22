import test from 'node:test'
import assert from 'node:assert/strict'
import { frequencyBandsFromData } from '../lib/frequency-bands.mjs'

test('maps FFT magnitudes into twelve logarithmic frequency bands', () => {
  const data = new Uint8Array(1024)
  data[2] = 255
  data[30] = 200
  data[200] = 160

  const bands = frequencyBandsFromData(data, 48000, 2048, 12)

  assert.equal(bands.length, 12)
  assert.ok(bands[0] > 0)
  assert.ok(bands[6] > 0)
  assert.ok(bands[10] > 0)
  assert.ok(bands.every((level) => level >= 0 && level <= 1))
})

test('returns a stable zero-filled shape for invalid FFT input', () => {
  assert.deepEqual(frequencyBandsFromData(new Uint8Array(), 48000, 2048, 12), Array(12).fill(0))
})
