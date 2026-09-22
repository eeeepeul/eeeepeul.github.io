export const MATCH_COLOR_TONES = ['#4a4a4a', '#666666', '#858585', '#a3a3a3']

export const MATCH_COLOR_FILTERS = [
  'brightness(0) saturate(100%) invert(29%)',
  'brightness(0) saturate(100%) invert(40%)',
  'brightness(0) saturate(100%) invert(52%)',
  'brightness(0) saturate(100%) invert(64%)',
]

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
