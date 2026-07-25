import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('renders palette and controls over one full-screen stage', () => {
  assert.match(experience, /<ColorPanel/)
  assert.match(experience, /palette=\{palette\}/)
  assert.match(experience, /<PixelCanvas[\s\S]*palette=\{palette\}/)
  assert.doesNotMatch(experience, /blank-sidebar|className="workspace"/)
})

test('uses overlay layers instead of separate layout columns', () => {
  assert.match(css, /\.experience-shell\s*\{[^}]*position:\s*relative[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s)
  assert.match(css, /\.visual-stage\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s)
  assert.match(css, /\.color-panel\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*3/s)
  assert.match(css, /\.control-deck\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*2/s)
  assert.doesNotMatch(css, /grid-template-columns:\s*clamp\(240px/)
})

test('turns the palette into a compact top overlay on phones', () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*800px\)[\s\S]*?\.color-panel\s*\{[^}]*bottom:\s*auto[^}]*width:\s*auto/s
  )
  assert.match(
    css,
    /@media\s*\(max-width:\s*800px\)[\s\S]*?\.palette-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s
  )
})
