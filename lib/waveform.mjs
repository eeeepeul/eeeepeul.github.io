function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1)
}

function interpolatedBand(bands, position) {
  if (!bands.length) return 0
  const left = Math.floor(position)
  const right = Math.min(bands.length - 1, left + 1)
  const fraction = position - left
  return bands[left] * (1 - fraction) + bands[right] * fraction
}

function interpolatedSample(samples, position) {
  if (!samples.length) return 0.5
  const left = Math.floor(position)
  const right = Math.min(samples.length - 1, left + 1)
  const fraction = position - left
  return samples[left] * (1 - fraction) + samples[right] * fraction
}

/**
 * Convert a time-domain analyser frame into one compact, filled waveform.
 * The closed path keeps quiet sections as a thin center line while louder
 * samples expand into the irregular silhouette used by the CCTV footer.
 */
export function waveformPathFromSamples(samples, sampleCount = 240) {
  const safeSampleCount = Math.max(2, Math.floor(Number.isFinite(sampleCount) ? sampleCount : 240))
  const normalizedSamples = Array.from(samples ?? [], (value) => clamp01(Number(value)))
  const width = 240
  const height = 72
  const baseline = height / 2
  const upperPoints = []
  const lowerPoints = []

  for (let index = 0; index <= safeSampleCount; index += 1) {
    const progress = index / safeSampleCount
    const samplePosition = normalizedSamples.length
      ? progress * (normalizedSamples.length - 1)
      : 0
    const sample = interpolatedSample(normalizedSamples, samplePosition)
    const centered = sample - 0.5
    const magnitude = Math.min(1, Math.abs(centered) * 2)
    const envelope = Math.pow(magnitude, 0.72)
    const thickness = clamp(0.65 + envelope * 20, 0.65, 15.5)
    const offset = clamp(centered * 5.5, -5.5, 5.5)
    const upper = clamp(baseline + offset - thickness, 0.5, height - 0.5)
    const lower = clamp(baseline + offset + thickness, 0.5, height - 0.5)
    const x = progress * width
    upperPoints.push(`${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${upper.toFixed(2)}`)
    lowerPoints.push(`L ${x.toFixed(2)} ${lower.toFixed(2)}`)
  }

  return [...upperPoints, ...lowerPoints.reverse(), 'Z'].join(' ')
}

/**
 * Convert the analyser's logarithmic bands into several dense, animated
 * waveform paths. The phase is driven by playback time so the geometry keeps
 * moving even when adjacent FFT frames are similar.
 */
export function waveformPathsFromBands(
  bands,
  trackCount = 6,
  sampleCount = 96,
  phase = 0
) {
  const safeTrackCount = Math.max(1, Math.floor(Number.isFinite(trackCount) ? trackCount : 6))
  const safeSampleCount = Math.max(2, Math.floor(Number.isFinite(sampleCount) ? sampleCount : 96))
  const normalizedBands = Array.from(bands ?? [], (value) => clamp01(Number(value)))
  const width = 240
  const height = 72

  return Array.from({ length: safeTrackCount }, (_, track) => {
    const baseline = ((track + 0.5) / safeTrackCount) * height
    const phaseOffset = Number.isFinite(phase) ? phase * (1 + track * 0.035) + track * 1.43 : track * 1.43
    const trackShift = normalizedBands.length ? (track * 1.7) % normalizedBands.length : 0
    const upperPoints = []
    const lowerPoints = []

    for (let index = 0; index <= safeSampleCount; index += 1) {
      const progress = index / safeSampleCount
      const bandPosition = normalizedBands.length
        ? (progress * (normalizedBands.length - 1) + trackShift) % normalizedBands.length
        : 0
      const energy = interpolatedBand(normalizedBands, bandPosition)
      const carrier = Math.sin(index * 2.78 + phaseOffset)
      const detail = Math.sin(index * 6.15 - phaseOffset * 1.7) * 0.38
      const drift = Math.sin(index * 0.62 + phaseOffset * 0.42) * 0.24
      const amplitude = 0.8 + energy * (5.2 + track * 0.26)
      const signal = amplitude * (carrier + detail + drift)
      const center = clamp(baseline + signal * 0.48, baseline - 4.35, baseline + 4.35)
      const thickness = clamp(0.65 + Math.abs(signal) * 0.26, 0.65, 3.15)
      const upper = clamp(center - thickness, baseline - 5.7, baseline + 5.7)
      const lower = clamp(center + thickness, baseline - 5.7, baseline + 5.7)
      const x = progress * width
      upperPoints.push(`${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${upper.toFixed(2)}`)
      lowerPoints.push(`L ${x.toFixed(2)} ${lower.toFixed(2)}`)
    }

    return [...upperPoints, ...lowerPoints.reverse(), 'Z'].join(' ')
  })
}
