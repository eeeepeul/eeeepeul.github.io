export const LETTER_THRESHOLDS = Object.freeze([0.33, 0.66])

export function letterForLuminance(value) {
  if (!Number.isFinite(value)) return 'E'
  if (value < LETTER_THRESHOLDS[0]) return 'E'
  if (value < LETTER_THRESHOLDS[1]) return 'O'
  return 'M'
}
