export const DEFAULT_THRESHOLDS = [0.22, 0.46, 0.72]

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function manualTilesFromPosition(position) {
  return Math.round(180 - clamp(position, 0, 1) * 168)
}

export function effectiveTiles(baseTiles, kick, kickAmount = 0.45) {
  return Math.max(8, Math.round(baseTiles * (1 - clamp(kick, 0, 1) * kickAmount)))
}

export function classifyBand(luminance, thresholds = DEFAULT_THRESHOLDS) {
  if (luminance < thresholds[0]) return 0
  if (luminance < thresholds[1]) return 1
  if (luminance < thresholds[2]) return 2
  return 3
}

export function pointerPosition(clientX, left, width) {
  if (!Number.isFinite(width) || width <= 0) return 0
  return clamp((clientX - left) / width, 0, 1)
}
