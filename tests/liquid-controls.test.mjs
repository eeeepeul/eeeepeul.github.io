import test from 'node:test'
import assert from 'node:assert/strict'
import {
  liquidDetailFromPosition,
  resolveLiquidControls,
} from '../lib/liquid-controls.mjs'

test('maps the full drag rail from fine to bold liquid structures', () => {
  assert.equal(liquidDetailFromPosition(-1), 14)
  assert.equal(liquidDetailFromPosition(0.5), 9)
  assert.equal(liquidDetailFromPosition(2), 4)
})

test('scale increases the visible liquid deformation instead of reducing it', () => {
  const zero = resolveLiquidControls({ scale: 0, diffusion: 0 })
  const fine = resolveLiquidControls({ scale: 1, diffusion: 0 })
  const bold = resolveLiquidControls({ scale: 20, diffusion: 0 })

  assert.ok(fine.warpStrength > zero.warpStrength)
  assert.ok(fine.foldDisplacement > zero.foldDisplacement)
  assert.ok(bold.warpStrength > fine.warpStrength)
  assert.ok(bold.foldDisplacement > fine.foldDisplacement)
  assert.ok(bold.flowFrequency > fine.flowFrequency)
})

test('uses scale 0 as the default control value', () => {
  assert.deepEqual(resolveLiquidControls(), resolveLiquidControls({ scale: 0 }))
})

test('spacing increases the wavy deformation and lateral fan', () => {
  const tight = resolveLiquidControls({ scale: 5, diffusion: 0 })
  const wavy = resolveLiquidControls({ scale: 5, diffusion: 1 })

  assert.ok(wavy.warpStrength > tight.warpStrength)
  assert.ok(wavy.foldDisplacement > tight.foldDisplacement)
  assert.ok(wavy.tangentFan > tight.tangentFan)
  assert.ok(wavy.verticalSmear > tight.verticalSmear)
})

test('a kick increases displacement, smear, source reveal, and bloom', () => {
  const idle = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 0,
  })
  const kicked = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 1,
  })

  assert.ok(kicked.warpStrength > idle.warpStrength)
  assert.ok(kicked.verticalSmear > idle.verticalSmear)
  assert.ok(kicked.sourceMix > idle.sourceMix)
  assert.ok(kicked.bloom > idle.bloom)
  assert.ok(kicked.feedbackRetention < idle.feedbackRetention)
})

test('kick increases pigment transport without restoring large coordinate wobble', () => {
  const idle = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 0,
  })
  const kicked = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 1,
  })

  assert.ok(idle.foldDisplacement <= 0.018)
  assert.ok(kicked.foldDisplacement <= 0.022)
  assert.ok(kicked.sourceMix >= idle.sourceMix + 0.06)
  assert.ok(kicked.verticalSmear >= idle.verticalSmear + 0.025)
  assert.ok(kicked.foldVelocity > idle.foldVelocity)
  assert.ok(kicked.tangentFan <= idle.tangentFan + 0.08)
})

test('kick densifies tonal mass without washing the frame toward pearl', () => {
  const idle = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 0,
  })
  const kicked = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 1,
  })

  assert.ok(idle.historyColorRetention >= 0.94)
  assert.ok(idle.shadowMassStrength >= 0.25)
  assert.ok(idle.shadowMassStrength <= 0.40)
  assert.ok(kicked.shadowMassStrength > idle.shadowMassStrength)
  assert.ok(kicked.bloom - idle.bloom <= 0.05)
})

test('diffusion broadens the smear while every output stays finite and bounded', () => {
  const dry = resolveLiquidControls({ diffusion: 0 })
  const wet = resolveLiquidControls({ diffusion: 1 })
  const extreme = resolveLiquidControls({
    position: 99,
    scale: -5,
    diffusion: 9,
    pulse: 9,
  })

  assert.ok(wet.verticalSmear > dry.verticalSmear)
  assert.ok(wet.sourceMix > dry.sourceMix)
  assert.ok(wet.feedbackRetention < dry.feedbackRetention)
  for (const value of Object.values(extreme)) {
    assert.ok(Number.isFinite(value))
    assert.ok(value >= 0)
    assert.ok(value <= 14)
  }
})

test('the default view favors persistent pigment over a clearly exposed source frame', () => {
  const controls = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 0,
  })

  assert.ok(controls.feedbackRetention >= 0.965)
  assert.ok(controls.sourceMix <= 0.08)
  assert.ok(controls.verticalSmear >= 0.012)
})

test('the reference default favors luminous vertical bleed over deep warping', () => {
  const controls = resolveLiquidControls({
    position: 0.18,
    scale: 5,
    diffusion: 0,
    pulse: 0,
  })

  assert.ok(controls.warpStrength <= 0.006)
  assert.ok(controls.verticalSmear >= 0.012)
  assert.ok(controls.sourceMix >= 0.065)
  assert.ok(controls.bloom >= 0.16)
})
