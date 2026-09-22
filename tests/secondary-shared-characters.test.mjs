import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../components/site/SecondaryLanding.mjs', import.meta.url),
  'utf8'
)
const worldSource = readFileSync(
  new URL('../components/site/HouseInteriorCharacterWorld.mjs', import.meta.url),
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
