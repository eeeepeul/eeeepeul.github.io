import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bandEnergy,
  kickEqualizerBands,
  nextKickEnvelope,
  nextKickPulse,
} from '../lib/kick-envelope.mjs'

test('averages FFT magnitudes inside the kick band', () => {
  assert.equal(bandEnergy(new Uint8Array([0, 255, 255, 0]), 400, 8, 50, 150), 1)
})

test('attacks quickly when bass exceeds the noise floor', () => {
  assert.ok(nextKickEnvelope({ floor: 0.1, envelope: 0 }, 0.8, 16).envelope > 0.6)
})

test('releases smoothly after the transient', () => {
  assert.ok(nextKickEnvelope({ floor: 0.1, envelope: 1 }, 0.05, 160).envelope < 0.5)
})

test('maps the kick envelope into bass-weighted equalizer bars', () => {
  const quiet = kickEqualizerBands(0.05, 12)
  const hit = kickEqualizerBands(0.9, 12)

  assert.equal(quiet.length, 12)
  assert.ok(hit[0] > quiet[0])
  assert.ok(hit[0] > hit[11])
  assert.ok(hit.every((level) => level >= 0 && level <= 1))
})

test('turns a kick onset into a visible pulse that decays between beats', () => {
  const hit = nextKickPulse(
    { floor: 0.12, previousEnergy: 0.12, pulse: 0, cooldown: 0 },
    0.72,
    16
  )

  assert.ok(hit.pulse > 0.8)
  assert.ok(hit.cooldown > 0)

  const decay = nextKickPulse(hit, 0.18, 80)
  assert.ok(decay.pulse < hit.pulse)
  assert.ok(decay.pulse > 0.1)

  const rest = nextKickPulse(decay, 0.18, 400)
  assert.ok(rest.pulse < 0.1)
})

test('detects a quieter kick above the adaptive floor', () => {
  const quietHit = nextKickPulse(
    { floor: 0.2, previousEnergy: 0.2, pulse: 0, cooldown: 0 },
    0.24,
    16
  )

  assert.ok(quietHit.pulse > 0.8)
})
