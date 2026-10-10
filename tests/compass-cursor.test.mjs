import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCompassDirection } from '../lib/compass-cursor.mjs'

const component = readFileSync(
  new URL('../components/site/CompassCursor.tsx', import.meta.url),
  'utf8'
)
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('chooses the compass direction from the dominant pointer movement axis', () => {
  assert.equal(getCompassDirection({ x: 0, y: 0 }, { x: 12, y: 3 }), 'right')
  assert.equal(getCompassDirection({ x: 12, y: 3 }, { x: 0, y: 0 }), 'left')
  assert.equal(getCompassDirection({ x: 0, y: 0 }, { x: 3, y: 12 }), 'down')
  assert.equal(getCompassDirection({ x: 3, y: 12 }, { x: 0, y: 0 }), 'up')
})

test('renders a pointer-following compass cursor without intercepting interaction', () => {
  assert.match(component, /^'use client'/)
  assert.match(layout, /import \{ CompassCursor \} from ['"]\.\.\/components\/site\/CompassCursor['"]/)
  assert.match(layout, /<CompassCursor \/>/)
  assert.match(component, /pointermove/)
  assert.match(component, /cursor-mark-up\.svg/)
  assert.match(component, /cursor-mark-down\.svg/)
  assert.match(component, /cursor-mark-left\.svg/)
  assert.match(component, /cursor-mark-right\.svg/)
  assert.match(css, /\.compass-cursor-active\s*,\s*\.compass-cursor-active\s+\*\s*\{[^}]*cursor:\s*none\s*!important;/s)
  assert.match(css, /\.compass-cursor-mark\s*\{[^}]*position:\s*fixed;[^}]*pointer-events:\s*none;/s)
  assert.match(css, /\.compass-cursor-compass\s*\{[^}]*mask:\s*var\(--compass-cursor-image\)/s)
})

test('ships all four compass cursor assets', () => {
  for (const direction of ['up', 'down', 'left', 'right']) {
    const svg = readFileSync(
      new URL(`../public/static/images/epeul/cursor-mark-${direction}.svg`, import.meta.url),
      'utf8'
    )
    assert.match(svg, /<svg/)
    assert.match(svg, /<circle/)
  }
})
