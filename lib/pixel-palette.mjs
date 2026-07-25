export const PIXEL_PALETTE_PRESETS = Object.freeze([
  Object.freeze({
    id: 'sky-red',
    label: '하늘과 빨강',
    palette: Object.freeze({
      background: '#EDECF1',
      diagonal: '#9AC2F0',
      circle: '#B70000',
      solid: '#9AC2F0',
    }),
  }),
  Object.freeze({
    id: 'lime-violet',
    label: '라임과 보라',
    palette: Object.freeze({
      background: '#F2F0E8',
      diagonal: '#C9FF4A',
      circle: '#5A28C9',
      solid: '#C9FF4A',
    }),
  }),
  Object.freeze({
    id: 'peach-cobalt',
    label: '살구와 파랑',
    palette: Object.freeze({
      background: '#FFF1E6',
      diagonal: '#FF9F68',
      circle: '#1746D1',
      solid: '#FF9F68',
    }),
  }),
  Object.freeze({
    id: 'mint-forest',
    label: '민트와 짙은 초록',
    palette: Object.freeze({
      background: '#E8F4EF',
      diagonal: '#7FD1AE',
      circle: '#173C2B',
      solid: '#7FD1AE',
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
