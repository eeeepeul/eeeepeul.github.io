const TRIGGER_LEVEL = 0.58
const COOLDOWN_MS = 520
const PULSE_DURATION_MS = 120

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function nextKickGlitch(state, kick, deltaMs) {
  const previousKick = clamp01(state?.previousKick ?? 0)
  const previousPulse = clamp01(state?.pulse ?? 0)
  const elapsedSinceTrigger = Math.max(
    0,
    Number.isFinite(state?.elapsedSinceTrigger) ? state.elapsedSinceTrigger : COOLDOWN_MS
  )
  const safeKick = clamp01(kick)
  const safeDelta = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0)
  const crossedTrigger = previousKick < TRIGGER_LEVEL && safeKick >= TRIGGER_LEVEL
  const triggered = crossedTrigger && elapsedSinceTrigger >= COOLDOWN_MS

  return {
    previousKick: safeKick,
    pulse: triggered ? 1 : Math.max(0, previousPulse - safeDelta / PULSE_DURATION_MS),
    elapsedSinceTrigger: triggered ? 0 : elapsedSinceTrigger + safeDelta,
  }
}
