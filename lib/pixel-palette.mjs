export const DEFAULT_PIXEL_PALETTE = Object.freeze({
  background: '#EDECF1',
  diagonal: '#9AC2F0',
  circle: '#B70000',
  solid: '#9AC2F0',
})

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
