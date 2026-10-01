function clamp(value, minimum, maximum, fallback) {
  const numeric = Number(value)
  const safeValue = Number.isFinite(numeric) ? numeric : fallback
  return Math.min(maximum, Math.max(minimum, safeValue))
}

function clamp01(value, fallback = 0) {
  return clamp(value, 0, 1, fallback)
}

export function liquidDetailFromPosition(position) {
  return 14 - clamp01(position) * 10
}

export function resolveLiquidControls({
  position = 0.18,
  scale = 0,
  diffusion = 0,
  pulse = 0,
} = {}) {
  const safePosition = clamp01(position, 0.18)
  const scaleProgress = clamp(scale, 0, 20, 0) / 20
  const safeDiffusion = clamp01(diffusion)
  const safePulse = clamp01(pulse)
  const flowFrequency = liquidDetailFromPosition(safePosition)
    * (1.12 + scaleProgress * 0.18 + safeDiffusion * 0.55)

  return {
    flowFrequency,
    warpStrength: 0.002
      + scaleProgress * 0.0045
      + safeDiffusion * 0.004
      + safePulse * 0.002,
    foldDisplacement: 0.010
      + scaleProgress * 0.010
      + safeDiffusion * 0.010
      + safePulse * 0.004,
    foldVelocity: 0.32
      + scaleProgress * 0.10
      + safeDiffusion * 0.08
      + safePulse * 0.24,
    tangentFan: 0.08 + safeDiffusion * 0.30 + safePulse * 0.05,
    verticalSmear: 0.014 + safeDiffusion * 0.055 + safePulse * 0.045,
    feedbackRetention: clamp(
      0.980 - safeDiffusion * 0.08 - safePulse * 0.020,
      0.78,
      0.985,
      0.980
    ),
    historyColorRetention: 0.955 - safeDiffusion * 0.04 - safePulse * 0.006,
    shadowMassStrength: 0.29 + safeDiffusion * 0.10 + safePulse * 0.045,
    sourceMix: clamp(
      0.07 + safeDiffusion * 0.10 + safePulse * 0.075,
      0.055,
      0.22,
      0.07
    ),
    bloom: 0.16 + safePulse * 0.04,
  }
}
