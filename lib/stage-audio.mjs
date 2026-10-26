// The sound analyser the player makes, shared with whatever draws the sound (cell 13).
let analyser = null

export function setAnalyser(next) {
  analyser = next
}

export function getAnalyser() {
  return analyser
}

// The volume the visitor set on the bars beside cell 3 (0..1); the player follows it.
let volume = 0.7
const listeners = new Set()

export function getVolume() {
  return volume
}

export function setVolume(next) {
  volume = Math.max(0, Math.min(1, next))
  listeners.forEach((listener) => listener(volume))
}

export function subscribeVolume(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
