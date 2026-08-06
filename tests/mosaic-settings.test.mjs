import test from 'node:test'
import assert from 'node:assert/strict'
import * as mosaicSettings from '../lib/mosaic-settings.mjs'
import {
  CHARACTER_SET_PRESETS,
  DEFAULT_MOSAIC_SETTINGS,
  MOSAIC_SHAPE_PRESETS,
  getCharacterSetPreset,
  getMosaicShapePreset,
  normalizeMosaicSettings,
  resolveMosaicColumns,
} from '../lib/mosaic-settings.mjs'

test('resolves a geometric cell scale that renders equal physical width and height', () => {
  assert.equal(typeof mosaicSettings.resolveMosaicGrid, 'function')

  const columns = 100
  const width = 1920
  const height = 1080
  const { rows, shapeYScale } = mosaicSettings.resolveMosaicGrid(columns, width, height)
  const tileWidth = width / columns
  const tileHeight = height / rows
  const renderedWidth = tileWidth * 0.8
  const renderedHeight = tileHeight * (0.8 / shapeYScale)

  assert.ok(Math.abs(renderedWidth - renderedHeight) < 0.000001)
})

test('keeps the finest mosaic dense without collapsing glyphs into a subpixel square grid', () => {
  const columns = resolveMosaicColumns(249, { ...DEFAULT_MOSAIC_SETTINGS, scale: 1 })
  const { rows, shapeYScale } = mosaicSettings.resolveMosaicGrid(columns, 1920, 1080)

  assert.equal(columns, 240)
  assert.equal(rows, 135)
  assert.ok(Math.abs(shapeYScale - 1) < 0.01)
})

test('uses scale 5 and renders a detailed 125-column initial mosaic', () => {
  assert.equal(resolveMosaicColumns(89, DEFAULT_MOSAIC_SETTINGS), 45)
  assert.equal(resolveMosaicColumns(249, DEFAULT_MOSAIC_SETTINGS), 125)
  assert.deepEqual(DEFAULT_MOSAIC_SETTINGS, {
    scale: 5,
    spacing: 0,
    outputWidth: 0,
    characterSet: 'eom',
    shape: 'moe',
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
  assert.equal(resolveMosaicColumns(100, { ...DEFAULT_MOSAIC_SETTINGS, scale: 4 }), 63)
  assert.equal(
    resolveMosaicColumns(100, { ...DEFAULT_MOSAIC_SETTINGS, scale: 20 }),
    13
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
      shape: 'square',
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
      outputWidth: 240,
      characterSet: 'eom',
      shape: 'square',
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

test('offers the approved shape names and falls back to M O E', () => {
  assert.deepEqual(MOSAIC_SHAPE_PRESETS, [
    { id: 'moe', label: 'M·O·E', shaderMode: 0 },
    { id: 'circle', label: 'Circle', shaderMode: 1 },
    { id: 'square', label: 'Square', shaderMode: 2 },
  ])
  assert.equal(getMosaicShapePreset('circle').shaderMode, 1)
  assert.equal(getMosaicShapePreset('missing').id, 'moe')
  assert.equal(normalizeMosaicSettings({ shape: 'circle' }).shape, 'circle')
  assert.equal(normalizeMosaicSettings({ shape: 'missing' }).shape, 'moe')
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
