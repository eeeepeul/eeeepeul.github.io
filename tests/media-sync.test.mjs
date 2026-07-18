import test from 'node:test'
import assert from 'node:assert/strict'
import { loopedVideoTime, shouldCorrectVideo, wrappedTimeDistance } from '../lib/media-sync.mjs'

test('maps the audio master clock into looping video time', () => {
  assert.equal(loopedVideoTime(12.5, 5), 2.5)
})

test('measures drift across the video loop seam', () => {
  assert.ok(wrappedTimeDistance(0.05, 4.95, 5) < 0.11)
})

test('does not issue repeated seeks while decoding or inside the correction cooldown', () => {
  assert.equal(shouldCorrectVideo(0, 0.3, 5, false, 2000, 0), true)
  assert.equal(shouldCorrectVideo(0, 0.3, 5, true, 2000, 0), false)
  assert.equal(shouldCorrectVideo(0, 0.3, 5, false, 2200, 2000), false)
})
