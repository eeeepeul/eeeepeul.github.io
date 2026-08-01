import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PIXEL_PALETTE_PRESETS,
  DEFAULT_PIXEL_PALETTE,
  getPixelPalettePreset,
  hexToUnitRgb,
  normalizeHexColor,
} from '../lib/pixel-palette.mjs'

test('defines the reference image blue paper and dark-to-light E O M ink', () => {
  assert.deepEqual(DEFAULT_PIXEL_PALETTE, {
    background: '#8AC3ED',
    diagonal: '#111820',
    circle: '#7895AA',
    solid: '#FFFFFF',
    glyph: '#FFFFFF',
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
    background: '#8AC3ED',
    diagonal: '#8C5739',
    circle: '#1746D1',
    solid: '#FF9F68',
    glyph: '#FFFFFF',
  })
})

test('assigns distinct fixed colors to E, O, and M in every palette', () => {
  for (const { palette } of PIXEL_PALETTE_PRESETS) {
    assert.equal(new Set([palette.diagonal, palette.circle, palette.solid]).size, 3)
  }
})

test('uses the reference sky blue background for the default combination', () => {
  assert.equal(DEFAULT_PIXEL_PALETTE.background, '#8AC3ED')
  assert.equal(DEFAULT_PIXEL_PALETTE.diagonal, '#111820')
  assert.equal(DEFAULT_PIXEL_PALETTE.circle, '#7895AA')
  assert.equal(DEFAULT_PIXEL_PALETTE.solid, '#FFFFFF')
})

test('keeps the reference blue paper while switching E O M ink combinations', () => {
  assert.deepEqual(
    PIXEL_PALETTE_PRESETS.map(({ palette }) => palette.background),
    ['#8AC3ED', '#8AC3ED', '#8AC3ED', '#8AC3ED']
  )
})

test('uses a white atlas mask for every text combination', () => {
  assert.deepEqual(
    PIXEL_PALETTE_PRESETS.map(({ palette }) => palette.glyph),
    ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']
  )
})

test('falls back to the original sky-red palette for an unknown preset', () => {
  assert.deepEqual(getPixelPalettePreset('unknown'), DEFAULT_PIXEL_PALETTE)
})
