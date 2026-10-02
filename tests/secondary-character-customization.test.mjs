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
  assert.match(source, /wandering-character-expression/)
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
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*width:\s*125%/s)
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*height:\s*58%/s)
  assert.match(css, /\.wandering-character-flame\s*\{[^}]*mask-image:/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*position:\s*absolute;/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*bottom:\s*-20%;[^}]*width:\s*var\(--character-shoe-width,\s*73%\);[^}]*height:\s*31%/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*mask-image:\s*var\(--character-shoe-image\)/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*mask-position:\s*center top;/s)
  assert.match(css, /\.wandering-character-shoe\s*\{[^}]*transform:\s*translateX\(calc\(-50%\s*\+\s*var\(--character-shoe-offset-x/s)
  assert.match(css, /\.wandering-character-head\s*\{[^}]*mask-image:\s*var\(--character-head-image\)/s)
  assert.match(
    css,
    /\.wandering-character-expression,\s*\n\.wandering-character-expression-fill\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*3;[^}]*width:\s*33%;[^}]*height:\s*20%;[^}]*object-fit:\s*contain/s
  )
})

test('keeps only the first expression slightly smaller on moving characters', () => {
  assert.match(
    css,
    /\.wandering-character-expression\.wandering-character-expression-compact\s*\{[^}]*top:\s*2%;[^}]*width:\s*26%;[^}]*height:\s*16%/s
  )
})

test('renders the saved match color and shoe on the added character', () => {
  const html = renderToStaticMarkup(
    createElement(FollowingCharacterWorld, {
      activeCharacterId: 'character-7',
      characterIds: ['character-7'],
      characterCustomizations: {
        'character-7': {
          'match-color': 2,
          expression: 4,
          'flame-color': 1,
          'flame-shape': 2,
          shoes: 3,
        },
      },
    })
  )
  const greenHtml = renderToStaticMarkup(
    createElement(FollowingCharacterWorld, {
      activeCharacterId: 'character-8',
      characterIds: ['character-8'],
      characterCustomizations: {
        'character-8': { 'match-color': 2, shoes: 1 },
      },
    })
  )
  const wideSwirlHtml = renderToStaticMarkup(
    createElement(FollowingCharacterWorld, {
      activeCharacterId: 'character-9',
      characterIds: ['character-9'],
      characterCustomizations: {
        'character-9': { 'flame-color': 0, 'flame-shape': 3 },
      },
    })
  )

  assert.match(html, /class="wandering-character-entity has-flame has-shoe"/)
  assert.match(html, /--character-head-tone:#7B4D31/)
  assert.match(html, /class="wandering-character-flame"/)
  assert.match(html, /data-flame-src="\/media\/flame-shape-03\.png"/)
  assert.match(html, /--character-flame-color:#C50011/)
  assert.match(html, /--character-flame-offset-x:0%/)
  assert.match(wideSwirlHtml, /data-flame-src="\/media\/flame-shape-04\.png"/)
  assert.match(wideSwirlHtml, /--character-flame-offset-x:20%/)
  assert.match(html, /--character-shoe-tone:/)
  assert.match(html, /class="wandering-character-shoe"/)
  assert.match(html, /data-shoe-src="\/media\/custom-shoe-04\.png"/)
  assert.match(html, /data-shoe-index="3"/)
  assert.match(html, /--character-shoe-offset-x:-25%/)
  assert.match(html, /--character-shoe-width:59%/)
  assert.match(html, /--character-shoe-image:url\(\/media\/custom-shoe-04\.png\)/)
  assert.match(greenHtml, /data-shoe-src="\/media\/custom-shoe-02\.png"/)
  assert.match(greenHtml, /--character-shoe-offset-x:-16%/)
  assert.match(greenHtml, /--character-shoe-width:51%/)
  assert.match(html, /class="wandering-character-head"/)
  assert.match(html, /data-head-src="\/media\/match-character-head\.svg"/)
  assert.match(html, /--character-head-image:url\(\/media\/match-character-head\.svg\)/)
  assert.match(html, /class="wandering-character-expression[^\"]*"[^>]*data-expression-src="\/media\/expression-05\.png"/)
  assert.match(
    html,
    /<img class="wandering-character" src="\/media\/match-character\.svg"[^>]*data-character-id="character-7"/
  )
})

test('shrinks the angry expression on moving characters too', () => {
  const html = renderToStaticMarkup(
    createElement(FollowingCharacterWorld, {
      activeCharacterId: 'character-angry',
      characterIds: ['character-angry'],
      characterCustomizations: { 'character-angry': { expression: 4 } },
    })
  )

  assert.match(
    html,
    /class="wandering-character-expression wandering-character-expression-compact"[^>]*data-expression-src="\/media\/expression-05\.png"/
  )
})

test('shrinks the large smile expression on moving characters too', () => {
  const html = renderToStaticMarkup(
    createElement(FollowingCharacterWorld, {
      activeCharacterId: 'character-smile',
      characterIds: ['character-smile'],
      characterCustomizations: { 'character-smile': { expression: 5 } },
    })
  )

  assert.match(
    html,
    /class="wandering-character-expression wandering-character-expression-compact"[^>]*data-expression-src="\/media\/expression-06\.png"/
  )
})

test('uses the peach match body asset beneath the separate head color layer', () => {
  assert.match(matchCharacter, /fill="#E3C2A4"/)
})
