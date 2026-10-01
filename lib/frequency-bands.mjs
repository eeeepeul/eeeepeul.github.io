function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function frequencyBandsFromData(
  frequencyData,
  sampleRate,
  fftSize,
  count = 12,
  minHz = 40,
  maxHz = 8000
) {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0))
  if (!safeCount) return []
  if (!frequencyData?.length || sampleRate <= 0 || fftSize <= 0 || minHz <= 0 || maxHz <= minHz) {
    return Array(safeCount).fill(0)
  }

  const binWidth = sampleRate / fftSize
  const topHz = Math.min(sampleRate / 2, maxHz)
  const ratio = topHz / minHz

  return Array.from({ length: safeCount }, (_, index) => {
    const startHz = minHz * Math.pow(ratio, index / safeCount)
    const endHz = minHz * Math.pow(ratio, (index + 1) / safeCount)
    const startBin = Math.max(0, Math.floor(startHz / binWidth))
    const endBin = Math.min(
      frequencyData.length,
      Math.max(startBin + 1, Math.ceil(endHz / binWidth))
    )
    if (endBin <= startBin) return 0

    let total = 0
    for (let bin = startBin; bin < endBin; bin += 1) total += frequencyData[bin] ?? 0
    // A square-root curve keeps quieter upper bands visible without
    // flattening loud low-frequency content.
    return Math.sqrt(clamp01(total / (endBin - startBin) / 255))
  })
}
