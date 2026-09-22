import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HouseInteriorCharacterWorld } from '../components/site/HouseInteriorCharacterWorld.mjs'

const source = readFileSync(
  new URL('../components/site/HouseInteriorCharacterWorld.mjs', import.meta.url),
  'utf8'
)
const worldSource = readFileSync(
  new URL('../components/site/HouseInteriorWorld.mjs', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('passes saved custom selections into the character rendered after input', () => {
  assert.match(worldSource, /characterCustomizations/)
  assert.match(worldSource, /HouseInteriorCharacterWorld,\s*\{[^}]*characterCustomizations/s)
  assert.match(source, /characterCustomizations/)
  assert.match(source, /MATCH_COLOR_FILTERS/)
  assert.match(source, /SHOE_TONES/)
  assert.match(source, /wandering-character-entity/)
  assert.match(source, /wandering-character-shoe/)
})

test('keeps custom shoe and color layers attached to the moving character', () => {
  assert.match(css, /\.wandering-character-entity\s*\{[^}]*position:\s*absolute;/s)
  assert.match(css, /\.wandering-character-entity\s*>\s*\.wandering-character\s*\{[^}]*filter:\s*var\(--character-filter/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*position:\s*absolute;/s)
})

test('renders the saved match color and shoe on the added character', () => {
  const html = renderToStaticMarkup(
    createElement(HouseInteriorCharacterWorld, {
      activeCharacterId: 'character-7',
      characterIds: ['character-7'],
      characterCustomizations: {
        'character-7': { 'match-color': 2, shoes: 3 },
      },
    })
  )

  assert.match(html, /class="wandering-character-entity has-shoe"/)
  assert.match(html, /--character-filter:/)
  assert.match(html, /--character-shoe-tone:/)
  assert.match(html, /class="wandering-character-shoe"/)
})
