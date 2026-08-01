import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHARACTER_SET_PRESETS,
  DEFAULT_MOSAIC_SETTINGS,
  getCharacterSetPreset,
  normalizeMosaicSettings,
  resolveMosaicColumns,
} from '../lib/mosaic-settings.mjs'

test('keeps the current mosaic unchanged at the approved defaults', () => {
  assert.equal(resolveMosaicColumns(89, DEFAULT_MOSAIC_SETTINGS), 89)
  assert.deepEqual(DEFAULT_MOSAIC_SETTINGS, {
    scale: 2,
    spacing: 0,
    outputWidth: 0,
    characterSet: 'eom',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    sharpness: 0,
    gamma: 1,
    colorMode: 'original',
    background: '#8AC3ED',
    intensity: 1,
  })
})

test('scale enlarges cells while a nonzero output width takes direct control', () => {
  assert.equal(resolveMosaicColumns(100, { ...DEFAULT_MOSAIC_SETTINGS, scale: 4 }), 50)
  assert.equal(
    resolveMosaicColumns(100, { ...DEFAULT_MOSAIC_SETTINGS, scale: 20 }),
    10
  )
  assert.equal(
    resolveMosaicColumns(100, { ...DEFAULT_MOSAIC_SETTINGS, scale: 20, outputWidth: 240 }),
    240
  )
})

test('normalizes every imported control to the Grainrad-compatible range', () => {
  assert.deepEqual(
    normalizeMosaicSettings({
      scale: 99,
      spacing: -1,
      outputWidth: 900,
      characterSet: 'missing',
      brightness: -150,
      contrast: 150,
      saturation: 250,
      hue: 500,
      sharpness: -20,
      gamma: 0,
      colorMode: 'mono',
      background: '#abcdef',
      intensity: 5,
    }),
    {
      scale: 20,
      spacing: 0,
      outputWidth: 500,
      characterSet: 'eom',
      brightness: -100,
      contrast: 100,
      saturation: 100,
      hue: 360,
      sharpness: 0,
      gamma: 0.1,
      colorMode: 'mono',
      background: '#ABCDEF',
      intensity: 2,
    }
  )
})

test('offers working character sets and falls back to the E O M identity', () => {
  assert.deepEqual(
    CHARACTER_SET_PRESETS.map(({ id }) => id),
    ['eom', 'standard', 'blocks', 'binary', 'detailed', 'minimal', 'alphabetic', 'numeric', 'math', 'symbols']
  )
  assert.equal(getCharacterSetPreset('binary').characters, '01')
  assert.equal(getCharacterSetPreset('binary').useAtlas, true)
  assert.equal(getCharacterSetPreset('unknown').id, 'eom')
  assert.equal(getCharacterSetPreset('unknown').useAtlas, true)
})
