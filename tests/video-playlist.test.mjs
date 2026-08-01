import test from 'node:test'
import assert from 'node:assert/strict'
import { pickNextVideoIndex } from '../lib/video-playlist.mjs'

test('selects any clip for the first random playback', () => {
  assert.equal(pickNextVideoIndex(-1, 3, 0), 0)
  assert.equal(pickNextVideoIndex(-1, 3, 0.99), 2)
})

test('never immediately repeats the clip that just ended', () => {
  assert.equal(pickNextVideoIndex(1, 3, 0), 0)
  assert.equal(pickNextVideoIndex(1, 3, 0.99), 2)
})

test('handles empty and single-clip playlists safely', () => {
  assert.equal(pickNextVideoIndex(0, 0, 0.5), -1)
  assert.equal(pickNextVideoIndex(0, 1, 0.5), 0)
})
