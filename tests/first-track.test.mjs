import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FIRST_TRACK, TRACKS } from '../lib/tracks.mjs'

const player = readFileSync(new URL('../components/site/StagePlayer.mjs', import.meta.url), 'utf8')
const about = readFileSync(new URL('../components/site/StageAbout.mjs', import.meta.url), 'utf8')

test('the page opens on the 2nd song, which can be played', () => {
  assert.equal(FIRST_TRACK, 1)
  assert.equal(TRACKS[FIRST_TRACK].title, 'if and only if')
  assert.ok(TRACKS[FIRST_TRACK].src)
})

test('the player starts the opening song on its own', () => {
  assert.match(player, /load\(playable\.includes\(FIRST_TRACK\) \? FIRST_TRACK : playable\[0\]\)/)
})

test('the tree in cell 3 opens on the same song as the player', () => {
  assert.match(about, /TREE\.kids\[0\]\.kids\[FIRST_TRACK\]/)
  assert.doesNotMatch(about, /useState\('a1'\)/)
})
