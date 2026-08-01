import { normalizeHexColor } from './pixel-palette.mjs'

export const CHARACTER_SET_PRESETS = Object.freeze([
  Object.freeze({ id: 'eom', label: 'E / O / M', characters: 'EOM', useAtlas: true }),
  Object.freeze({ id: 'standard', label: 'STANDARD', characters: '.:-=+*#%@', useAtlas: true }),
  Object.freeze({ id: 'blocks', label: 'BLOCKS', characters: '░▒▓█', useAtlas: true }),
  Object.freeze({ id: 'binary', label: 'BINARY', characters: '01', useAtlas: true }),
  Object.freeze({ id: 'detailed', label: 'DETAILED', characters: '.,:;i1tfLCG08@', useAtlas: true }),
  Object.freeze({ id: 'minimal', label: 'MINIMAL', characters: '.oO@', useAtlas: true }),
  Object.freeze({ id: 'alphabetic', label: 'ALPHABETIC', characters: 'ETANRISHDLFCMUGYPWBVKXJQZ', useAtlas: true }),
  Object.freeze({ id: 'numeric', label: 'NUMERIC', characters: '1234567890', useAtlas: true }),
  Object.freeze({ id: 'math', label: 'MATH', characters: '+-×÷=<>∞∑√', useAtlas: true }),
  Object.freeze({ id: 'symbols', label: 'SYMBOLS', characters: '!@#$%^&*?', useAtlas: true }),
])

export const DEFAULT_MOSAIC_SETTINGS = Object.freeze({
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

function clamp(value, minimum, maximum, fallback) {
  const numeric = Number(value)
  return Math.min(maximum, Math.max(minimum, Number.isFinite(numeric) ? numeric : fallback))
}

export function getCharacterSetPreset(id) {
  return CHARACTER_SET_PRESETS.find((preset) => preset.id === id) ?? CHARACTER_SET_PRESETS[0]
}

export function normalizeMosaicSettings(value = {}) {
  return {
    scale: Math.round(clamp(value.scale, 1, 20, DEFAULT_MOSAIC_SETTINGS.scale)),
    spacing: clamp(value.spacing, 0, 1, DEFAULT_MOSAIC_SETTINGS.spacing),
    outputWidth: Math.round(clamp(value.outputWidth, 0, 500, DEFAULT_MOSAIC_SETTINGS.outputWidth)),
    characterSet: getCharacterSetPreset(value.characterSet).id,
    brightness: Math.round(clamp(value.brightness, -100, 100, DEFAULT_MOSAIC_SETTINGS.brightness)),
    contrast: Math.round(clamp(value.contrast, -100, 100, DEFAULT_MOSAIC_SETTINGS.contrast)),
    saturation: Math.round(clamp(value.saturation, -100, 100, DEFAULT_MOSAIC_SETTINGS.saturation)),
    hue: Math.round(clamp(value.hue, 0, 360, DEFAULT_MOSAIC_SETTINGS.hue)),
    sharpness: Math.round(clamp(value.sharpness, 0, 100, DEFAULT_MOSAIC_SETTINGS.sharpness)),
    gamma: clamp(value.gamma, 0.1, 3, DEFAULT_MOSAIC_SETTINGS.gamma),
    colorMode: value.colorMode === 'mono' ? 'mono' : 'original',
    background: normalizeHexColor(value.background, DEFAULT_MOSAIC_SETTINGS.background),
    intensity: clamp(value.intensity, 0, 2, DEFAULT_MOSAIC_SETTINGS.intensity),
  }
}

export function resolveMosaicColumns(baseColumns, settings) {
  const normalized = normalizeMosaicSettings(settings)
  if (normalized.outputWidth > 0) return normalized.outputWidth
  const base = clamp(baseColumns, 8, 500, 89)
  return Math.max(8, Math.min(500, Math.round(base * (2 / normalized.scale))))
}
