// Where the subject of a fixed CCTV clip is at a given moment, from a track built
// by scripts/build-motion-track.mjs. Samples are [time, visible, x, y, w, h] with the
// box centre and size as fractions of the frame.
export const MOTION_TRACK_FALLBACK = Object.freeze({ visible: false, x: 0.5, y: 0.5, w: 0.1, h: 0.16 })

function lerp(from, to, amount) {
  return from + (to - from) * amount
}

// The box moves like stop-motion: it holds still and then jumps, this many times a
// second, instead of gliding with the video.
export const MOTION_STEP_FPS = 6

// Snap a time down to the start of its step.
export function stepTime(time, stepFps = MOTION_STEP_FPS) {
  if (!Number.isFinite(time) || !(stepFps > 0)) return time
  return Math.floor(time * stepFps + 1e-9) / stepFps
}

// `stepFps` set: stop-motion, the box is the last tracked position at or before the
// step, with no gliding. Left unset the box glides between tracked frames.
export function sampleMotionTrack(track, time, stepFps = 0) {
  const samples = track?.samples
  if (!Array.isArray(samples) || samples.length === 0 || !Number.isFinite(time)) {
    return MOTION_TRACK_FALLBACK
  }
  if (stepFps > 0) {
    const held = samples.findLast
      ? samples.findLast((sample) => sample[0] <= stepTime(time, stepFps) + 1e-9)
      : [...samples].reverse().find((sample) => sample[0] <= stepTime(time, stepFps) + 1e-9)
    const sample = held ?? samples[0]
    return sample[1]
      ? { visible: true, x: sample[2], y: sample[3], w: sample[4], h: sample[5] }
      : { ...MOTION_TRACK_FALLBACK, x: sample[2] || 0.5, y: sample[3] || 0.5 }
  }
  if (time <= samples[0][0]) return toBox(samples[0], samples[0], 0)
  const last = samples[samples.length - 1]
  if (time >= last[0]) return toBox(last, last, 0)

  // Binary search for the sample at or before `time`.
  let low = 0
  let high = samples.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (samples[middle][0] <= time) low = middle
    else high = middle
  }
  const before = samples[low]
  const after = samples[high]
  const amount = (time - before[0]) / (after[0] - before[0] || 1)
  return toBox(before, after, amount)
}

function toBox(before, after, amount) {
  // Only glide between two frames that both show the subject; otherwise the box is
  // shown or hidden as the earlier frame says, never dragged across the screen.
  if (!before[1] || !after[1]) {
    const shown = before[1] && amount < 0.5 ? before : after[1] && amount >= 0.5 ? after : null
    if (!shown) return { ...MOTION_TRACK_FALLBACK, x: before[2] || 0.5, y: before[3] || 0.5 }
    return { visible: true, x: shown[2], y: shown[3], w: shown[4], h: shown[5] }
  }
  return {
    visible: true,
    x: lerp(before[2], after[2], amount),
    y: lerp(before[3], after[3], amount),
    w: lerp(before[4], after[4], amount),
    h: lerp(before[5], after[5], amount),
  }
}
