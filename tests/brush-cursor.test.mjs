import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { BRUSH_HOT_SPOT, brushCursor } from '../lib/brush-cursor.mjs'

const decode = (cursor) => decodeURIComponent(cursor.match(/url\("data:image\/svg\+xml,([^"]+)"\)/)[1])

test('the cursor over the board is a brush whose tip has the colour that is chosen', () => {
  const red = brushCursor('#d9392b')
  assert.match(red, /^url\("data:image\/svg\+xml,/)
  assert.match(decode(red), /fill="#d9392b"/)
  assert.match(decode(brushCursor('#4aa3b4')), /fill="#4aa3b4"/)
})

test('the hot spot is at the tip of the bristles, with a crosshair as the fallback', () => {
  const cursor = brushCursor('#1c1c1c')
  assert.ok(cursor.endsWith(`") ${BRUSH_HOT_SPOT.x} ${BRUSH_HOT_SPOT.y}, crosshair`))
  // the tip of the bristles is drawn at that point
  assert.match(decode(cursor), new RegExp(`${BRUSH_HOT_SPOT.x} 28\\.2`))
})

test('the eraser is shown as an eraser, not as a white brush', () => {
  const svg = decode(brushCursor('#ffffff', { eraser: true }))
  assert.match(svg, /#f4b6bd/)
  assert.doesNotMatch(svg, /#5e4a42/)
})

test('a colour that is not a colour is not put into the picture', () => {
  const svg = decode(brushCursor('red"/><script>'))
  assert.doesNotMatch(svg, /script/)
})

test('the board takes the brush over the compass mark', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  assert.match(css, /\.compass-cursor-active \.drawing-pad__canvas\s*\{[^}]*cursor:\s*var\(--brush-cursor, crosshair\) !important/)
  assert.match(css, /body:has\(\.drawing-pad__canvas:hover\) \.compass-cursor-mark\s*\{[^}]*opacity:\s*0/)
})
