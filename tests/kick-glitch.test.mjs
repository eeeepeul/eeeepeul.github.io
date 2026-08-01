import test from 'node:test'
import assert from 'node:assert/strict'
import { nextKickGlitch } from '../lib/kick-glitch.mjs'

test('starts one strong glitch when a kick crosses the trigger level', () => {
  const next = nextKickGlitch(
    { previousKick: 0.2, pulse: 0, elapsedSinceTrigger: 1000 },
    0.7,
    16
  )

  assert.equal(next.pulse, 1)
  assert.equal(next.elapsedSinceTrigger, 0)
})

test('does not repeatedly glitch during one sustained kick', () => {
  const next = nextKickGlitch(
    { previousKick: 0.7, pulse: 1, elapsedSinceTrigger: 0 },
    0.8,
    32
  )

  assert.ok(next.pulse < 1)
  assert.ok(next.pulse > 0)
  assert.equal(next.elapsedSinceTrigger, 32)
})

test('ignores another kick until the sparse-trigger cooldown ends', () => {
  const blocked = nextKickGlitch(
    { previousKick: 0.1, pulse: 0, elapsedSinceTrigger: 200 },
    0.8,
    16
  )
  const ready = nextKickGlitch(
    { previousKick: 0.1, pulse: 0, elapsedSinceTrigger: 600 },
    0.8,
    16
  )

  assert.equal(blocked.pulse, 0)
  assert.equal(ready.pulse, 1)
})

test('returns to a clean image shortly after the kick', () => {
  const next = nextKickGlitch(
    { previousKick: 0.7, pulse: 0.4, elapsedSinceTrigger: 60 },
    0.1,
    80
  )

  assert.equal(next.pulse, 0)
})
