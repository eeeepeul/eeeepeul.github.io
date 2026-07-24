import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_PIXEL_PALETTE,
  hexToUnitRgb,
  normalizeHexColor,
} from '../lib/pixel-palette.mjs'

const panelSource = readFileSync(
  new URL('../components/pixel-experience/ColorPanel.tsx', import.meta.url),
  'utf8'
)

test('defines four independent default palette roles', () => {
  assert.deepEqual(DEFAULT_PIXEL_PALETTE, {
    background: '#EDECF1',
    diagonal: '#9AC2F0',
    circle: '#B70000',
    solid: '#9AC2F0',
  })
})

test('normalizes valid colors and rejects invalid values', () => {
  assert.equal(normalizeHexColor('#abcdef', '#000000'), '#ABCDEF')
  assert.equal(normalizeHexColor('nope', '#123456'), '#123456')
  assert.equal(normalizeHexColor(null, '#123456'), '#123456')
})

test('converts a hex color into WebGL unit RGB values', () => {
  const [red, green, blue] = hexToUnitRgb('#FF8000', '#000000')
  assert.equal(red, 1)
  assert.ok(Math.abs(green - (128 / 255)) < 0.000001)
  assert.equal(blue, 0)
})

test('renders four labelled browser color inputs', () => {
  assert.match(panelSource, /type="color"/)
  assert.match(panelSource, /배경/)
  assert.match(panelSource, /사선/)
  assert.match(panelSource, /동그라미/)
  assert.match(panelSource, /네모/)
  assert.match(panelSource, /palette-grid/)
})
