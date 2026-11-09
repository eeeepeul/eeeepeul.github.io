import test from 'node:test'
import assert from 'node:assert/strict'
import { computePeaks, formatClock } from '../lib/waveform.mjs'

test('the peaks are the loudest sample of each equal part, scaled so the loudest part is 1', () => {
  const samples = new Float32Array(1000)
  samples[10] = 0.2
  samples[510] = -0.5
  const peaks = computePeaks(samples, 2)
  assert.equal(peaks.length, 2)
  assert.equal(peaks[1], 1)
  assert.ok(Math.abs(peaks[0] - 0.4) < 1e-6)
})

test('silence and empty sound give flat peaks', () => {
  assert.deepEqual(computePeaks(new Float32Array(100), 4), [0, 0, 0, 0])
  assert.deepEqual(computePeaks(null, 3), [0, 0, 0])
})

test('the clock shows minutes and seconds, and dashes when the length is not known', () => {
  assert.equal(formatClock(215), '03:35')
  assert.equal(formatClock(0), '00:00')
  assert.equal(formatClock(3599), '59:59')
  assert.equal(formatClock(NaN), '--:--')
  assert.equal(formatClock(Infinity), '--:--')
})
