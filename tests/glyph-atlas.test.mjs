import test from 'node:test'
import assert from 'node:assert/strict'

const glyphAtlas = await import('../lib/glyph-atlas.mjs').catch(() => ({}))
const fitGlyphFontSize = glyphAtlas.fitGlyphFontSize ?? (() => Number.NaN)
const glyphAtlasCellWidth = glyphAtlas.GLYPH_ATLAS_CELL_WIDTH ?? Number.NaN
const glyphAtlasCellHeight = glyphAtlas.GLYPH_ATLAS_CELL_HEIGHT ?? Number.NaN
const resolveGlyphAtlasLayout = glyphAtlas.resolveGlyphAtlasLayout ?? (() => null)
const resolveGlyphHorizontalScale = glyphAtlas.resolveGlyphHorizontalScale ?? (() => Number.NaN)
const resolveGlyphUvRange = glyphAtlas.resolveGlyphUvRange ?? (() => null)
const resolveGlyphHorizontalOffset = glyphAtlas.resolveGlyphHorizontalOffset ?? (() => Number.NaN)
const resolveGlyphBaseline = glyphAtlas.resolveGlyphBaseline ?? (() => Number.NaN)
const resolveGlyphTextureFilter = glyphAtlas.resolveGlyphTextureFilter ?? (() => null)

test('preserves natural glyph proportions in the square mosaic grid', () => {
  const displayedWidthScale = glyphAtlasCellHeight / glyphAtlasCellWidth
  assert.ok(Math.abs(displayedWidthScale - 1) < 0.01)
})

test('keeps enough source resolution for clean small glyphs', () => {
  assert.equal(fitGlyphFontSize(120), 120)
})

test('packs E O M into a power-of-two atlas that supports mipmapped minification', () => {
  assert.deepEqual(resolveGlyphAtlasLayout(3), {
    glyphCount: 3,
    columns: 4,
    width: 512,
    height: 128,
  })
})

test('normalizes different visible letter widths into one evenly spaced cell width', () => {
  const targetWidth = 120
  const normalizedWidths = [60, 80, 120]
    .map((width) => width * resolveGlyphHorizontalScale(width, targetWidth))

  normalizedWidths.forEach((width) => assert.ok(Math.abs(width - targetWidth) < 0.000001))
})

test('keeps glyph padding visible while excluding neighboring atlas texels', () => {
  const { minimum, maximum } = resolveGlyphUvRange()
  const firstSampleTexel = minimum * glyphAtlasCellWidth
  const lastSampleTexel = maximum * glyphAtlasCellWidth

  assert.equal(firstSampleTexel, 0.5)
  assert.equal(lastSampleTexel, glyphAtlasCellWidth - 0.5)
})

test('centers asymmetric glyph bounds inside each atlas cell', () => {
  const left = 50
  const right = 40
  const offset = resolveGlyphHorizontalOffset(left, right)

  assert.equal(offset, 5)
  assert.equal(offset - left, -(offset + right))
})

test('centers the visible glyph height instead of the font em box', () => {
  const ascent = 90
  const descent = 10
  const baseline = resolveGlyphBaseline(ascent, descent, glyphAtlasCellHeight)
  const topMargin = baseline - ascent
  const bottomMargin = glyphAtlasCellHeight - (baseline + descent)

  assert.equal(baseline, 104)
  assert.equal(topMargin, bottomMargin)
})

test('uses seam-free linear sampling for enlarged glyphs and mipmaps for dense glyphs', () => {
  assert.equal(resolveGlyphTextureFilter(9, 1074), 'linear')
  assert.equal(resolveGlyphTextureFilter(125, 1074), 'mipmap')
})

test('shrinks a wide glyph enough to preserve atlas padding', () => {
  assert.equal(fitGlyphFontSize(60, 54, 64, 6), 46.8)
})

test('keeps the requested size when a glyph already fits', () => {
  assert.equal(fitGlyphFontSize(40, 54, 64, 6), 54)
})

test('keeps the requested size when no usable measurement exists', () => {
  assert.equal(fitGlyphFontSize(0, 54, 64, 6), 54)
})
