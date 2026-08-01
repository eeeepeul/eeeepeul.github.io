export const MOSAIC_VIDEO_FILES = [
  'media/mosaic-01.mp4',
  'media/mosaic-02.mp4',
  'media/mosaic-03.mp4',
]

function randomSlot(randomValue, count) {
  const normalized = Number.isFinite(randomValue) ? randomValue : 0
  return Math.floor(Math.min(0.999999999999, Math.max(0, normalized)) * count)
}

export function pickNextVideoIndex(currentIndex, count, randomValue = Math.random()) {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0))
  if (safeCount === 0) return -1
  if (safeCount === 1) return 0

  if (currentIndex < 0 || currentIndex >= safeCount) {
    return randomSlot(randomValue, safeCount)
  }

  const candidate = randomSlot(randomValue, safeCount - 1)
  return candidate >= currentIndex ? candidate + 1 : candidate
}
