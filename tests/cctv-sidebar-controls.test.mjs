import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const colorPanel = readFileSync(
  new URL('../components/pixel-experience/ColorPanel.tsx', import.meta.url),
  'utf8'
)
const settingsPanel = readFileSync(
  new URL('../components/pixel-experience/SettingsPanel.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('shows four background and main-color combination cards', () => {
  assert.match(colorPanel, />color combination</)
  assert.match(colorPanel, /--preset-background[^\n]*preset\.palette\.background/)
  assert.match(colorPanel, /--preset-main[^\n]*preset\.palette\.circle/)
  assert.match(colorPanel, /className="palette-main-swatch"/)
  assert.match(colorPanel, /className="palette-preset-name">SKY BLUE</)
  assert.doesNotMatch(colorPanel, /preset-letter|--preset-diagonal|--preset-solid|--preset-glyph/)
})

test('shows only shape, scale, and spacing pattern controls', () => {
  const renderedControls = settingsPanel.slice(
    settingsPanel.indexOf('export function SettingsPanel')
  )

  assert.match(settingsPanel, />pattern</)
  assert.match(settingsPanel, /MOSAIC_SHAPE_PRESETS\.map/)
  assert.match(settingsPanel, /value=\{settings\.shape\}/)
  assert.match(settingsPanel, /label="scale"/)
  assert.match(settingsPanel, /label="spacing"/)
  assert.doesNotMatch(
    renderedControls,
    />\s*(?:SETTINGS|RESET|Output Width|Character Set|ADJUSTMENTS|Brightness|Contrast|Saturation|Hue Rotation|Sharpness|Gamma|COLOR|Background|Intensity)\s*</
  )
})

test('styles the reference card and square-cornered filled-row controls', () => {
  assert.match(css, /\.palette-preset-preview\s*\{[^}]*aspect-ratio:\s*1;[^}]*background:\s*var\(--preset-background\);/s)
  assert.match(css, /\.palette-main-swatch\s*\{[^}]*border-radius:\s*50%;[^}]*background:\s*var\(--preset-main\);/s)
  assert.match(css, /\.compact-setting-row\s*\{[^}]*border-radius:\s*0;/s)
  assert.match(css, /\.compact-setting-fill\s*\{[^}]*width:\s*var\(--setting-fill\);/s)
})
