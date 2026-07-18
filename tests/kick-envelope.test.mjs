import test from 'node:test'
import assert from 'node:assert/strict'
import { bandEnergy, nextKickEnvelope } from '../lib/kick-envelope.mjs'

test('averages FFT magnitudes inside the kick band', () => {
  assert.equal(bandEnergy(new Uint8Array([0, 255, 255, 0]), 400, 8, 50, 150), 1)
})

test('attacks quickly when bass exceeds the noise floor', () => {
  assert.ok(nextKickEnvelope({ floor: 0.1, envelope: 0 }, 0.8, 16).envelope > 0.6)
})

test('releases smoothly after the transient', () => {
  assert.ok(nextKickEnvelope({ floor: 0.1, envelope: 1 }, 0.05, 160).envelope < 0.5)
})
