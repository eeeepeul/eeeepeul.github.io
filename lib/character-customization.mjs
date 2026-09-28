export const MATCH_COLOR_TONES = ['#4a4a4a', '#666666', '#858585', '#a3a3a3']

export const MATCH_COLOR_FILTERS = [
  'brightness(0) saturate(100%) invert(29%)',
  'brightness(0) saturate(100%) invert(40%)',
  'brightness(0) saturate(100%) invert(52%)',
  'brightness(0) saturate(100%) invert(64%)',
]

// Flame artwork uses the same four grayscale color choices as the match body,
// but keeps its own semantic name so the selection remains attached to the
// shared character customization payload.
export const FLAME_COLOR_FILTERS = MATCH_COLOR_FILTERS

export const FLAME_COLOR_TONES = ['#00B9F6', '#C50011', '#FFD15D', '#EBAAD1']

export const SHOE_TONES = ['#4a4a4a', '#5f5f5f', '#747474', '#888888']

export function getCustomizationTone(customization = {}) {
  const matchColorIndex = customization['match-color']
  return MATCH_COLOR_TONES[Number.isInteger(matchColorIndex) ? matchColorIndex : 0]
}

export function getCustomizationFilter(customization = {}) {
  const matchColorIndex = customization['match-color']
  return MATCH_COLOR_FILTERS[Number.isInteger(matchColorIndex) ? matchColorIndex : 0]
}

export function getCustomizationShoeTone(customization = {}) {
  const shoeIndex = customization.shoes
  return SHOE_TONES[Number.isInteger(shoeIndex) ? shoeIndex : 0]
}
