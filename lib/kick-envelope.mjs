function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function bandEnergy(frequencyData, sampleRate, fftSize, minHz = 40, maxHz = 160) {
  if (!frequencyData?.length || sampleRate <= 0 || fftSize <= 0 || maxHz <= minHz) return 0

  const binWidth = sampleRate / fftSize
  const firstBin = Math.max(0, Math.ceil(minHz / binWidth))
  const endBin = Math.min(frequencyData.length, Math.ceil(maxHz / binWidth))
  if (endBin <= firstBin) return 0

  let total = 0
  for (let index = firstBin; index < endBin; index += 1) total += frequencyData[index]

  return clamp01(total / (endBin - firstBin) / 255)
}

export function nextKickEnvelope(state, energy, deltaMs) {
  const previousFloor = clamp01(state?.floor ?? 0.05)
  const previousEnvelope = clamp01(state?.envelope ?? 0)
  const safeEnergy = clamp01(energy)
  const safeDelta = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0)
  const floorBlend = 1 - Math.exp(-safeDelta / 2400)
  const floor = clamp01(previousFloor + (safeEnergy - previousFloor) * floorBlend)
  const threshold = floor + 0.08
  const target = safeEnergy > threshold ? clamp01((safeEnergy - threshold) / (1 - threshold)) : 0
  const timeConstant = target > previousEnvelope ? 8 : 160
  const blend = 1 - Math.exp(-safeDelta / timeConstant)
  const envelope = clamp01(previousEnvelope + (target - previousEnvelope) * blend)

  return { floor, envelope }
}

export function nextKickPulse(state, energy, deltaMs) {
  const previousFloor = clamp01(state?.floor ?? 0.05)
  const previousEnergy = clamp01(state?.previousEnergy ?? previousFloor)
  const previousPulse = clamp01(state?.pulse ?? 0)
  const previousCooldown = Math.max(0, Number.isFinite(state?.cooldown) ? state.cooldown : 0)
  const safeEnergy = clamp01(energy)
  const safeDelta = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0)
  const floorBlend = 1 - Math.exp(-safeDelta / 2400)
  const floor = clamp01(previousFloor + (safeEnergy - previousFloor) * floorBlend)
  const rise = safeEnergy - previousEnergy
  // Keep the onset gate close enough to the adaptive floor to catch quieter
  // kicks, while the positive rise guard still rejects a sustained bass note.
  const threshold = floor + 0.035
  const triggered = previousCooldown <= 0 && safeEnergy > threshold && rise > 0.014
  const cooldown = Math.max(0, previousCooldown - safeDelta) + (triggered ? 100 : 0)
  const decay = Math.exp(-safeDelta / 130)
  const pulse = triggered ? 1 : clamp01(previousPulse * decay)

  return { floor, previousEnergy: safeEnergy, pulse, cooldown }
}

export function kickEqualizerBands(kick, count = 12) {
  const safeKick = clamp01(kick)
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0))

  return Array.from({ length: safeCount }, (_, index) => {
    const position = safeCount <= 1 ? 0 : index / (safeCount - 1)
    const bassWeight = 1 - position * 0.62
    const harmonicVariation = 0.86 + Math.sin((index + 1) * 1.37) * 0.08
    return clamp01(safeKick * bassWeight * harmonicVariation)
  })
}
