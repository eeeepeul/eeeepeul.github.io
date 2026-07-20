import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')

test('document declares the approved light interface palette', () => {
  assert.match(css, /color-scheme:\s*light/)
  assert.match(css, /--paper:\s*#EDECF1/i)
  assert.match(css, /--foreground:\s*#17161B/i)
  assert.match(css, /--muted:\s*#6C6873/i)
  assert.match(css, /--blue:\s*#9AC2F0/i)
  assert.match(css, /--red:\s*#B70000/i)
  assert.doesNotMatch(css, /color-scheme:\s*dark/)
})

test('stage and canvas fallback use the light background', () => {
  assert.match(css, /\.visual-stage\s*\{[^}]*background:\s*var\(--paper\)/s)
  assert.match(css, /\.pixel-canvas\s*\{[^}]*background:\s*var\(--paper\)/s)
})

test('browser viewport uses the light theme color', () => {
  assert.match(layout, /themeColor:\s*'#EDECF1'/)
})
