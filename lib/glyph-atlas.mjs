export const GLYPH_ATLAS_CELL_WIDTH = 128
export const GLYPH_ATLAS_CELL_HEIGHT = 128
export const GLYPH_ATLAS_FONT_SIZE = 120
export const GLYPH_ATLAS_PADDING = 4
export const GLYPH_ATLAS_FONT_FAMILY =
  '"ITC Avant Garde Gothic Pro", "Avant Garde Gothic", "Century Gothic", Arial, sans-serif'

export function resolveGlyphAtlasLayout(glyphCount) {
  const count = Math.max(1, Math.min(32, Math.floor(Number(glyphCount) || 1)))
  const columns = 2 ** Math.ceil(Math.log2(count))

  return {
    glyphCount: count,
    columns,
    width: columns * GLYPH_ATLAS_CELL_WIDTH,
    height: GLYPH_ATLAS_CELL_HEIGHT,
  }
}

export function resolveGlyphHorizontalScale(
  measuredWidth,
  targetWidth = GLYPH_ATLAS_CELL_WIDTH - GLYPH_ATLAS_PADDING * 2
) {
  const width = Number(measuredWidth)
  if (!Number.isFinite(width) || width <= 0) return 1
  return targetWidth / width
}

export function resolveGlyphHorizontalOffset(left, right) {
  const safeLeft = Number.isFinite(Number(left)) ? Number(left) : 0
  const safeRight = Number.isFinite(Number(right)) ? Number(right) : 0
  return (safeLeft - safeRight) / 2
}

export function resolveGlyphBaseline(ascent, descent, cellHeight = GLYPH_ATLAS_CELL_HEIGHT) {
  const safeAscent = Math.max(0, Number(ascent) || 0)
  const safeDescent = Math.max(0, Number(descent) || 0)
  const safeCellHeight = Math.max(1, Number(cellHeight) || GLYPH_ATLAS_CELL_HEIGHT)
  return (safeCellHeight + safeAscent - safeDescent) / 2
}

export function resolveGlyphTextureFilter(columns, canvasWidth, mipmapThreshold = 32) {
  const safeColumns = Math.max(1, Number(columns) || 1)
  const safeCanvasWidth = Math.max(1, Number(canvasWidth) || 1)
  const safeThreshold = Math.max(1, Number(mipmapThreshold) || 32)
  return safeCanvasWidth / safeColumns >= safeThreshold ? 'linear' : 'mipmap'
}

export function resolveGlyphUvRange(cellSize = GLYPH_ATLAS_CELL_WIDTH) {
  const safeCellSize = Math.max(1, Number(cellSize) || GLYPH_ATLAS_CELL_WIDTH)
  const inset = 0.5 / safeCellSize
  return { minimum: inset, maximum: 1 - inset }
}

export function fitGlyphFontSize(
  measuredWidth,
  requestedSize = GLYPH_ATLAS_FONT_SIZE,
  cellWidth = GLYPH_ATLAS_CELL_WIDTH,
  padding = GLYPH_ATLAS_PADDING
) {
  const width = Number(measuredWidth)
  if (!Number.isFinite(width) || width <= 0) return requestedSize
  const availableWidth = Math.max(1, cellWidth - padding * 2)
  return Math.min(requestedSize, requestedSize * availableWidth / width)
}
