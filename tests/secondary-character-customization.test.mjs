import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FollowingCharacterWorld } from '../components/site/FollowingCharacterWorld.mjs'

const source = readFileSync(
  new URL('../components/site/FollowingCharacterWorld.mjs', import.meta.url),
  'utf8'
)
const worldSource = readFileSync(
  new URL('../components/site/HouseInteriorWorld.mjs', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const matchCharacter = readFileSync(new URL('../public/media/match-character.svg', import.meta.url), 'utf8')

test('passes saved custom selections into the character rendered after input', () => {
  assert.match(worldSource, /characterCustomizations/)
  assert.match(worldSource, /FollowingCharacterWorld,\s*\{[^}]*characterCustomizations/s)
  assert.match(source, /characterCustomizations/)
  assert.match(source, /MATCH_COLOR_TONES/)
  assert.match(source, /FLAME_COLOR_TONES/)
  assert.match(source, /SHOE_TONES/)
  assert.match(source, /wandering-character-entity/)
  assert.match(source, /wandering-character-flame/)
  assert.match(source, /wandering-character-shoe/)
})

test('keeps custom shoe and color layers attached to the moving character', () => {
  assert.match(css, /\.wandering-character-entity\s*\{[^}]*position:\s*absolute;/s)
  assert.match(
    css,
    /\.wandering-character-entity\s*>\s*\.wandering-character\s*\{[^}]*transform:\s*none;[^}]*filter:\s*var\(--character-filter/s
  )
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*position:\s*absolute;/s)
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*bottom:\s*69%/s)
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*width:\s*68%/s)
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*height:\s*58%/s)
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*mask-image:/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*position:\s*absolute;/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*mask-image:\s*var\(--character-shoe-image\)/s)
  assert.match(css, /\.wandering-character-head\s*\{[^}]*mask-image:\s*var\(--character-head-image\)/s)
})

test('renders the saved match color and shoe on the added character', () => {
  const html = renderToStaticMarkup(
    createElement(FollowingCharacterWorld, {
      activeCharacterId: 'character-7',
      characterIds: ['character-7'],
      characterCustomizations: {
        'character-7': { 'match-color': 2, 'flame-color': 1, 'flame-shape': 2, shoes: 3 },
      },
    })
  )

  assert.match(html, /class="wandering-character-entity has-flame has-shoe"/)
  assert.match(html, /--character-head-tone:#7B4D31/)
  assert.match(html, /class="wandering-character-flame"/)
  assert.match(html, /data-flame-src="\/media\/flame-shape-03\.png"/)
  assert.match(html, /--character-flame-color:#C50011/)
  assert.match(html, /--character-shoe-tone:/)
  assert.match(html, /class="wandering-character-shoe"/)
  assert.match(html, /data-shoe-src="\/media\/custom-shoe\.png"/)
  assert.match(html, /--character-shoe-image:url\(\/media\/custom-shoe\.png\)/)
  assert.match(html, /class="wandering-character-head"/)
  assert.match(html, /data-head-src="\/media\/match-character-head\.svg"/)
  assert.match(html, /--character-head-image:url\(\/media\/match-character-head\.svg\)/)
  assert.match(
    html,
    /<img class="wandering-character" src="\/media\/match-character\.svg"[^>]*data-character-id="character-7"/
  )
})

test('uses the peach match body asset beneath the separate head color layer', () => {
  assert.match(matchCharacter, /fill="#E9C1A0"/)
})
