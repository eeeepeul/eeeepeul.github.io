export const PIXEL_PALETTE_PRESETS = Object.freeze([
  Object.freeze({
    id: 'sky-red',
    label: '하늘과 흑백',
    palette: Object.freeze({
      background: '#8AC3ED',
      diagonal: '#111820',
      circle: '#7895AA',
      solid: '#FFFFFF',
      glyph: '#FFFFFF',
    }),
  }),
  Object.freeze({
    id: 'lime-violet',
    label: '라임과 보라',
    palette: Object.freeze({
      background: '#8AC3ED',
      diagonal: '#6F8C29',
      circle: '#5A28C9',
      solid: '#C9FF4A',
      glyph: '#FFFFFF',
    }),
  }),
  Object.freeze({
    id: 'peach-cobalt',
    label: '살구와 파랑',
    palette: Object.freeze({
      background: '#8AC3ED',
      diagonal: '#8C5739',
      circle: '#1746D1',
      solid: '#FF9F68',
      glyph: '#FFFFFF',
    }),
  }),
  Object.freeze({
    id: 'mint-forest',
    label: '민트와 짙은 초록',
    palette: Object.freeze({
      background: '#8AC3ED',
      diagonal: '#46735F',
      circle: '#173C2B',
      solid: '#7FD1AE',
      glyph: '#FFFFFF',
    }),
  }),
])

export const DEFAULT_PIXEL_PALETTE_ID = PIXEL_PALETTE_PRESETS[0].id
export const DEFAULT_PIXEL_PALETTE = PIXEL_PALETTE_PRESETS[0].palette

export function getPixelPalettePreset(id) {
  return PIXEL_PALETTE_PRESETS.find((preset) => preset.id === id)?.palette
    ?? DEFAULT_PIXEL_PALETTE
}

const HEX_COLOR = /^#[0-9A-F]{6}$/

export function normalizeHexColor(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return HEX_COLOR.test(normalized) ? normalized : fallback
}

export function hexToUnitRgb(value, fallback) {
  const normalized = normalizeHexColor(value, fallback)
  return new Float32Array([
    Number.parseInt(normalized.slice(1, 3), 16) / 255,
    Number.parseInt(normalized.slice(3, 5), 16) / 255,
    Number.parseInt(normalized.slice(5, 7), 16) / 255,
  ])
}
