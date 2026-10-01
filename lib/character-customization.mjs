export const MATCH_BODY_TONE = '#E9C1A0'
export const MATCH_COLOR_TONES = ['#DBDCDC', '#D90000', '#7B4D31', '#88DCD3']

export const MATCH_COLOR_FILTERS = [
  'brightness(0) saturate(100%) invert(29%)',
  'brightness(0) saturate(100%) invert(40%)',
  'brightness(0) saturate(100%) invert(52%)',
  'brightness(0) saturate(100%) invert(64%)',
]

// Legacy filter values remain available to older callers; the current custom
// character renderer applies MATCH_COLOR_TONES to the rounded head mask.
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
