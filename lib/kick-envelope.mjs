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
