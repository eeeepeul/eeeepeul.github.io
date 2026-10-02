export const MATCH_BODY_TONE = '#E3C2A4'
export const MATCH_COLOR_TONES = ['#DBDCDC', '#D90000', '#7B4D31', '#9BDAD3']

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

// The wide swirl artwork has an intentional rightward reach. Align only that
// source's visual center to the match head; the other flame silhouettes stay centered.
export const FLAME_ATTACH_OFFSETS = ['0%', '0%', '0%', '20%', '0%']

export const SHOE_IMAGES = [
  'media/custom-shoe-01.png',
  'media/custom-shoe-02.png',
  'media/custom-shoe-03.png',
  'media/custom-shoe-04.png',
]

export const SHOE_TONES = ['#ED361E', '#90EC62', '#313D77', '#222222']

// The shoe artwork uses side profiles with different ankle/opening positions.
// Keep each mask aligned to the match stem instead of centering every source
// image by its full canvas bounds.
export const SHOE_ATTACH_OFFSETS = ['-17%', '-16%', '-16%', '-25%']
export const SHOE_WIDTHS = ['47%', '51%', '60%', '59%']

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
