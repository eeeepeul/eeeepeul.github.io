// The progress of the "Loading..." window that comes up when a character is put into the room: it fills toward 90% over
// MIN_MS (so even a quick job shows the window for a moment) and stays there until the job has finished, then goes to 100%.
// Pure, so it can be tested: elapsed milliseconds and whether the job has settled give the share done (0 to 1).
export const LOADING_MIN_MS = 1100
export const LOADING_BLOCKS = 12

export function getLoadingProgress(elapsedMs, settled) {
  const filling = Math.min(0.9, Math.max(0, elapsedMs / LOADING_MIN_MS) * 0.9)
  if (settled && elapsedMs >= LOADING_MIN_MS) return 1
  return filling
}

// How many of the blocks of the bar are lit for a share done.
export function getFilledBlocks(progress, blocks = LOADING_BLOCKS) {
  const share = Math.min(1, Math.max(0, progress))
  return share >= 1 ? blocks : Math.floor(share * blocks)
}
