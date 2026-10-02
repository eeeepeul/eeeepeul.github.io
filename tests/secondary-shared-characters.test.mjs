import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import * as sharedCharacters from '../lib/shared-characters.mjs'

const source = readFileSync(
  new URL('../components/site/SecondaryLanding.mjs', import.meta.url),
  'utf8'
)
const worldSource = readFileSync(
  new URL('../components/site/FollowingCharacterWorld.mjs', import.meta.url),
  'utf8'
)

test('starts one shared 24-hour character feed for the house interior', () => {
  assert.match(source, /getSharedCharacterStore/)
  assert.match(source, /startSharedCharacterFeed/)
  assert.match(source, /SHARED_CHARACTER_WINDOW_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/)
  assert.match(source, /Date\.now\(\)\s*-\s*SHARED_CHARACTER_WINDOW_MS/)
  assert.match(source, /characterCustomizations/)
  assert.match(source, /characterIds/)
})

test('generates a complete random customization for a default NPC', () => {
  assert.equal(typeof sharedCharacters.createRandomCharacterCustomization, 'function')

  const customization = sharedCharacters.createRandomCharacterCustomization(() => 0.999999)

  assert.deepEqual(customization, {
    'match-color': 3,
    expression: 5,
    'flame-color': 3,
    'flame-shape': 4,
    shoes: 3,
  })
})

test('keeps randomized flame shapes within the five supplied assets', () => {
  assert.equal(
    sharedCharacters.normalizeCharacterCustomization({
      'match-color': 0,
      expression: 0,
      'flame-color': 0,
      'flame-shape': 5,
      shoes: 0,
    }),
    null
  )
})

test('assigns randomized customizations to the initial NPC set once per page load', () => {
  assert.match(source, /createRandomCharacterCustomization/)
  assert.match(source, /INITIAL_CHARACTER_IDS\.forEach/)
  assert.match(source, /if\s*\(!nextCustomizations\[id\]\)/)
})

test('records input selections and publishes them without replacing the interior renderer', () => {
  assert.match(source, /recordCharacter/)
  assert.match(source, /SHARED_CHARACTER_EVENT/)
  assert.match(source, /HouseInteriorWorld/)
  assert.match(source, /characterCustomizations/)
  assert.match(worldSource, /characterCustomizations/)
})

test('keeps remote characters from becoming the active camera target', () => {
  assert.match(source, /setActiveCharacterId\(localCharacterId\)/)
  assert.match(worldSource, /characterId === activeCharacterRef\.current/)
})
