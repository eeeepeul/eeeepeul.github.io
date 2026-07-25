import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PIXEL_PALETTE_PRESETS,
  DEFAULT_PIXEL_PALETTE,
  getPixelPalettePreset,
  hexToUnitRgb,
  normalizeHexColor,
} from '../lib/pixel-palette.mjs'

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

test('resolves each palette button to its full color combination', () => {
  assert.equal(PIXEL_PALETTE_PRESETS.length, 4)
  assert.deepEqual(getPixelPalettePreset('peach-cobalt'), {
    background: '#FFF1E6',
    diagonal: '#FF9F68',
    circle: '#1746D1',
    solid: '#FF9F68',
  })
})

test('falls back to the original sky-red palette for an unknown preset', () => {
  assert.deepEqual(getPixelPalettePreset('unknown'), DEFAULT_PIXEL_PALETTE)
})
