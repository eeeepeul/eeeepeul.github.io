export function loopedVideoTime(audioTime, videoDuration) {
  if (!Number.isFinite(audioTime) || !Number.isFinite(videoDuration) || videoDuration <= 0) return 0
  return ((audioTime % videoDuration) + videoDuration) % videoDuration
}

export function wrappedTimeDistance(actual, expected, duration) {
  if (![actual, expected, duration].every(Number.isFinite) || duration <= 0) return Infinity
  const direct = Math.abs(actual - expected) % duration
  return Math.min(direct, duration - direct)
}

export function shouldCorrectVideo(
  actual,
  expected,
  duration,
  seeking,
  nowMs,
  lastCorrectionMs,
  threshold = 0.12,
  cooldownMs = 750
) {
  if (seeking || nowMs - lastCorrectionMs < cooldownMs) return false
  return wrappedTimeDistance(actual, expected, duration) > threshold
}
