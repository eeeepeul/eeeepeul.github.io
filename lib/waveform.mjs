// Helpers of the CD Player window (components/site/StageCdPlayer.mjs).

// The picture of a song's sound: the loudest sample in each of `bins` equal parts of the song (0 to 1), read from the
// samples of one channel. Few parts and a long song are fine: each part is looked at in steps, so the work stays small.
export function computePeaks(samples, bins = 240) {
  const peaks = new Array(bins).fill(0)
  if (!samples || !samples.length || bins < 1) return peaks
  const size = samples.length / bins
  for (let bin = 0; bin < bins; bin += 1) {
    const from = Math.floor(bin * size)
    const to = Math.max(from + 1, Math.min(samples.length, Math.floor((bin + 1) * size)))
    const step = Math.max(1, Math.floor((to - from) / 400))
    let loudest = 0
    for (let at = from; at < to; at += step) {
      const value = Math.abs(samples[at])
      if (value > loudest) loudest = value
    }
    peaks[bin] = Math.min(1, loudest)
  }
  const top = Math.max(...peaks)
  return top > 0 ? peaks.map((value) => value / top) : peaks
}

// 3:35 -> "03:35"; a length that is not known yet shows as "--:--".
export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}
