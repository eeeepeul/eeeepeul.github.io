import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const skin = readFileSync(new URL('../app/cctv-skin.css', import.meta.url), 'utf8')

import {
  MOTION_STEP_FPS,
  MOTION_TRACK_FALLBACK,
  sampleMotionTrack,
  stepTime,
} from '../lib/motion-track.mjs'

const track = {
  fps: 10,
  samples: [
    [0, 1, 0.2, 0.3, 0.1, 0.2],
    [0.1, 1, 0.4, 0.5, 0.1, 0.2],
    [0.2, 0, 0, 0, 0, 0],
    [0.3, 0, 0, 0, 0, 0],
    [0.4, 1, 0.8, 0.7, 0.2, 0.3],
  ],
}

test('glides the box between two frames that both show the subject', () => {
  const box = sampleMotionTrack(track, 0.05)

  assert.equal(box.visible, true)
  assert.ok(Math.abs(box.x - 0.3) < 1e-9)
  assert.ok(Math.abs(box.y - 0.4) < 1e-9)
})

test('hides the box while the subject is out of sight and never drags it across', () => {
  assert.equal(sampleMotionTrack(track, 0.25).visible, false)
  // Between a visible and a hidden frame it shows or hides, it does not slide.
  const nearVisible = sampleMotionTrack(track, 0.12)
  assert.equal(nearVisible.visible, true)
  assert.equal(nearVisible.x, 0.4)
  assert.equal(sampleMotionTrack(track, 0.18).visible, false)
  // Reappearing: the box is placed on the subject, not slid in from where it left.
  const back = sampleMotionTrack(track, 0.39)
  assert.equal(back.visible, true)
  assert.equal(back.x, 0.8)
})

test('clamps to the first and last sample and tolerates a missing track', () => {
  assert.equal(sampleMotionTrack(track, -5).x, 0.2)
  assert.equal(sampleMotionTrack(track, 99).x, 0.8)
  assert.deepEqual(sampleMotionTrack(null, 1), MOTION_TRACK_FALLBACK)
  assert.deepEqual(sampleMotionTrack({ samples: [] }, 1), MOTION_TRACK_FALLBACK)
  assert.deepEqual(sampleMotionTrack(track, Number.NaN), MOTION_TRACK_FALLBACK)
})

test('ships a track for house 1 that stays inside the frame', () => {
  const file = new URL('../public/media/tracks/house1.json', import.meta.url)
  assert.ok(existsSync(file))
  const data = JSON.parse(readFileSync(file, 'utf8'))

  assert.deepEqual(data.columns, ['time', 'visible', 'x', 'y', 'w', 'h'])
  assert.ok(data.samples.length > 100)
  let previous = -1
  for (const [time, visible, x, y, w, h] of data.samples) {
    assert.ok(time > previous)
    previous = time
    assert.ok(visible === 0 || visible === 1)
    if (visible) {
      assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1)
      assert.ok(w > 0 && w < 0.5 && h > 0 && h < 0.7)
    }
  }
})

test('moves like stop-motion: it holds a position and jumps, never glides', () => {
  const dense = {
    samples: Array.from({ length: 30 }, (_, index) => [index / 10, 1, index / 40, 0.5, 0.1, 0.2]),
  }
  const positions = []
  for (let time = 0; time < 2.9; time += 0.01) {
    positions.push(sampleMotionTrack(dense, time, MOTION_STEP_FPS).x)
  }
  const distinct = new Set(positions)
  // About MOTION_STEP_FPS different positions per second, not one per tick.
  assert.ok(distinct.size <= Math.ceil(2.9 * MOTION_STEP_FPS) + 1)
  assert.ok(distinct.size >= Math.floor(2.9 * MOTION_STEP_FPS) - 3)
  // Within one step the box does not move at all.
  const stepStart = 1 / MOTION_STEP_FPS
  assert.equal(
    sampleMotionTrack(dense, stepStart + 0.001, MOTION_STEP_FPS).x,
    sampleMotionTrack(dense, stepStart + 1 / MOTION_STEP_FPS - 0.001, MOTION_STEP_FPS).x
  )
})

test('stop-motion shows and hides the box in steps too', () => {
  assert.equal(sampleMotionTrack(track, 0.35, MOTION_STEP_FPS).visible, false)
  assert.equal(sampleMotionTrack(track, 0.05, MOTION_STEP_FPS).visible, true)
})

test('snaps a time down to the start of its step', () => {
  assert.equal(stepTime(0.5, 4), 0.5)
  assert.equal(stepTime(0.74, 4), 0.5)
  assert.equal(stepTime(0.75, 4), 0.75)
  assert.ok(Number.isNaN(stepTime(Number.NaN, 4)))
})

test('the target box keeps one fixed size while its position follows the subject', () => {
  assert.match(experience, /target\.style\.left = /)
  assert.match(experience, /target\.style\.top = /)
  assert.doesNotMatch(experience, /target\.style\.(width|height)/)
  assert.match(skin, /\.cctv-hud-target\s*\{[^}]*width:\s*13\.94%;[^}]*height:\s*25\.2%;/s)
})
