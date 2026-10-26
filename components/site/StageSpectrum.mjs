'use client'

import { createElement, useEffect, useRef } from 'react'
import { getAnalyser } from '../../lib/stage-audio.mjs'

// Cell 13: the sound as a grey watercolour wash (the supplied strip picture, enlarged). Marks of
// every width sit at fixed places along the strip, each following one pitch (low on the left,
// high on the right) with its own threshold. When its pitch is in the music a mark spreads out of
// the pale paper like wet ink: first a faint soft haze, then a soft grey wash that thins out smoothly to nothing, then a dark core with soft edges,
// often split into upright bands. It dissolves again when the sound goes. Nothing scrolls; how many marks show, how wide,
// how dark and how far apart follows the music. With no music the strip is blank.
const COLUMNS = 1400
const ROWS = 76
const SCALE = COLUMNS / 1000
const FRAME_MS = 33

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// the marks: fixed, scattered the same way every time. Each is only a wide, loose envelope; the
// free, ragged shape comes from noise (see below), so none of them is a circle.
function makeMarks() {
  let seed = 11
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const count = 38
  // uneven spacing: some marks sit close together, others are far apart
  const steps = Array.from({ length: count }, () => 2 + Math.pow(random(), 2.6) * 100)
  const total = steps.reduce((sum, step) => sum + step, 0)
  let run = 0
  const spots = steps.map((step) => {
    run += step
    return ((run - step / 2) / total) * COLUMNS
  })
  return Array.from({ length: count }, (_, i) => ({
    x: spots[i],
    y: ROWS * (0.3 + random() * 0.4),
    rx: (7 + Math.pow(random(), 1.7) * 55) * SCALE,
    ry: (9 + random() * 19) * SCALE,
    threshold: 0.03 + random() * 0.3,
    gain: 2.4 + random() * 2.6,
    phase: random() * 6.28,
    speed: 0.3 + random() * 0.9,
    roam: (10 + random() * 26) * SCALE, // how far it wanders sideways
    shiftX: Math.floor(random() * COLUMNS),
    shiftY: Math.floor(random() * ROWS),
    rest: 3 + random() * 9, // seconds for one round of being there and being gone
    open: 0,
  }))
}

// smooth value noise that wraps around, so it can slide past a mark without a seam
function makeNoise(cellX, cellY, seedStart) {
  let seed = seedStart
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const gx = COLUMNS / cellX
  const gy = ROWS / cellY
  const lattice = Array.from({ length: gx * gy }, () => random())
  const out = new Float32Array(COLUMNS * ROWS)
  for (let x = 0; x < COLUMNS; x += 1) {
    const fx = x / cellX
    const ix = Math.floor(fx)
    const tx = smooth(0, 1, fx - ix)
    for (let y = 0; y < ROWS; y += 1) {
      const fy = y / cellY
      const iy = Math.floor(fy)
      const ty = smooth(0, 1, fy - iy)
      const v = (cx, cy) => lattice[(cx % gx) * gy + (cy % gy)]
      const top = v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx
      const bottom = v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx
      out[x * ROWS + y] = top * (1 - ty) + bottom * ty
    }
  }
  return out
}

export function StageSpectrum() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    canvas.width = COLUMNS
    canvas.height = ROWS
    const context = canvas.getContext('2d')
    const image = context.createImageData(COLUMNS, ROWS)
    const marks = makeMarks()
    const level = new Float32Array(COLUMNS) // how strongly each pitch is sounding right now
    const average = new Float32Array(COLUMNS) // what it usually holds, so only the changes stand out
    const heard = new Float32Array(COLUMNS)
    let pulse = 0 // the low end of the music as a whole, so every mark can swell on the beat
    const wash = new Float32Array(COLUMNS * ROWS) // the spread of ink: a halo thinning outwards
    const core = new Float32Array(COLUMNS * ROWS) // the dark part, with its bands
    const washSoft = new Float32Array(COLUMNS * ROWS)
    const coreSoft = new Float32Array(COLUMNS * ROWS)
    // nothing reaches the edge of the strip: everything thins out to nothing before the border
    const edge = new Float32Array(COLUMNS * ROWS)
    for (let x = 0; x < COLUMNS; x += 1) {
      for (let y = 0; y < ROWS; y += 1) {
        edge[x * ROWS + y] = smooth(0, 22, Math.min(x, COLUMNS - 1 - x)) * smooth(0, 11, Math.min(y, ROWS - 1 - y))
      }
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let lastTick = 0
    let bins = null

    // which analyser bin feeds each column, spread on a log scale from low to high notes
    const columnBins = (count, sampleRate) => {
      const low = 50
      const high = Math.min(14000, sampleRate / 2)
      return Array.from({ length: COLUMNS }, (_, x) => {
        const hz = low * Math.pow(high / low, (x + 0.5) / COLUMNS)
        return Math.min(count - 1, Math.round((hz / (sampleRate / 2)) * count))
      })
    }

    const listen = (dt) => {
      const analyser = getAnalyser()
      const raw = new Float32Array(COLUMNS)
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        if (!bins) bins = columnBins(data.length, analyser.context.sampleRate)
        for (let x = 0; x < COLUMNS; x += 1) {
          // the quiet high end gets a lift, and a curve so only strong parts count
          const lift = 0.9 + 1.1 * (x / COLUMNS)
          raw[x] = Math.pow(data[bins[x]] / 255, 1.8) * lift * 1.2
        }
      }
      for (let x = 0; x < COLUMNS; x += 1) {
        let sum = 0
        let weight = 0
        for (let k = -5; k <= 5; k += 1) {
          const at = x + k
          if (at < 0 || at >= COLUMNS) continue
          const w = 6 - Math.abs(k)
          sum += raw[at] * w
          weight += w
        }
        const near = sum / weight
        // smooth in time so nothing flickers
        heard[x] += (near - heard[x]) * (1 - Math.exp(-dt / 0.12))
        average[x] += (heard[x] - average[x]) * 0.01
        level[x] = Math.max(0, heard[x] - average[x] * 0.75) * 2.0
      }
      let low = 0
      for (let x = 0; x < 240; x += 1) low += level[x]
      pulse += (Math.min(1, (low / 240) * 2.2) - pulse) * (1 - Math.exp(-dt / 0.09))
    }

    // streaky noise (narrow, tall) gives the upright tendrils and bands; looser noise the lumps
    const streaks = makeNoise(5, 38, 7)
    const lumps = makeNoise(14, 19, 13)

    const compose = (now, dt) => {
      const t = now / 1000
      wash.fill(0)
      core.fill(0)
      for (let i = 0; i < marks.length; i += 1) {
        const mark = marks[i]
        const from = Math.max(0, Math.floor(mark.x - mark.rx))
        const to = Math.min(COLUMNS - 1, Math.ceil(mark.x + mark.rx))
        let sum = 0
        for (let x = from; x <= to; x += 1) sum += level[x]
        const heardNow = sum / (to - from + 1)
        // each mark also goes away completely now and then, on its own slow cycle, however loud it is
        const here = smooth(0.38, 0.62, 0.5 + 0.5 * Math.sin((t / mark.rest) * 6.283 + mark.phase))
        const target = Math.max(0, Math.min(1, (heardNow - mark.threshold) * mark.gain * (1 + pulse * 0.5))) * here
        // opens at a steady pace and dissolves slowly, so it never jumps
        mark.open += (target - mark.open) * (1 - Math.exp(-dt / (target > mark.open ? 0.28 : 1.1)))
        const a = mark.open
        if (a < 0.03) continue
        // each mark wanders sideways and up and down at its own pace, so the gaps keep changing
        const cx = mark.x + Math.sin(t * mark.speed * 0.45 + mark.phase) * mark.roam + Math.sin(t * mark.speed * 0.2 + mark.phase * 1.7) * mark.roam * 0.5
        const cy = mark.y + Math.cos(t * mark.speed * 0.6 + mark.phase) * 7 * SCALE
        const swell = 1 + 0.22 * pulse
        const rx = mark.rx * (0.95 + 0.1 * a) * 1.15 * swell
        const ry = mark.ry * (0.95 + 0.1 * a) * 1.05 * (1 + 0.1 * pulse)
        // the noise slides past slowly, so the edge keeps changing shape like paint moving
        const driftX = mark.shiftX + Math.floor(t * mark.speed * 7)
        const driftY = mark.shiftY + Math.floor(Math.sin(t * mark.speed * 0.3 + mark.phase) * 6)
        const strength = Math.max(0, a - 0.15) * 1.5
        for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(COLUMNS - 1, Math.ceil(cx + rx)); x += 1) {
          const dx = (x - cx) / rx
          // no wipe and no growing: the shape stays put and only its strength rises and falls, so
          // the thin outer edge is the first to go and the last to come
          const reveal = 1
          const nx = (x + driftX) % COLUMNS
          for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(ROWS - 1, Math.ceil(cy + ry)); y += 1) {
            const dy = (y - cy) / ry
            const d = dx * dx + dy * dy
            if (d >= 1) continue
            const env = 1 - d
            const ny = (((y + driftY) % ROWS) + ROWS) % ROWS
            const n1 = streaks[nx * ROWS + ny]
            const n2 = lumps[nx * ROWS + ny]
            const at = x * ROWS + y
            // the free shape: the envelope pushed and pulled by the noise, fading out at its rim
            const shape = (env * 1.3 + (n2 - 0.5) * 0.7 + (n1 - 0.5) * 0.6) * smooth(0, 0.6, env)
            if (shape > 0) wash[at] = Math.max(wash[at], a * shape * reveal)
            // the dark part: the same noise, cut higher, so it breaks into soft upright patches
            if (strength > 0) {
              const dark = env * 1.4 + (n1 - 0.5) * 1.5 + (n2 - 0.5) * 0.5 - 0.8
              if (dark > 0) core[at] = Math.max(core[at], strength * Math.min(1, dark) * reveal)
            }
          }
        }
      }
    }

    // a box blur, sideways then up and down, run over the field: the edges melt like wet paint
    const temp = new Float32Array(COLUMNS * ROWS)
    const boxBlur = (from, to, rx, ry) => {
      for (let x = 0; x < COLUMNS; x += 1) {
        for (let y = 0; y < ROWS; y += 1) {
          let sum = 0
          for (let k = -rx; k <= rx; k += 1) sum += from[Math.max(0, Math.min(COLUMNS - 1, x + k)) * ROWS + y]
          temp[x * ROWS + y] = sum / (2 * rx + 1)
        }
      }
      for (let x = 0; x < COLUMNS; x += 1) {
        for (let y = 0; y < ROWS; y += 1) {
          let sum = 0
          for (let k = -ry; k <= ry; k += 1) sum += temp[x * ROWS + Math.max(0, Math.min(ROWS - 1, y + k))]
          to[x * ROWS + y] = sum / (2 * ry + 1)
        }
      }
    }
    const blur = () => {
      boxBlur(wash, washSoft, 6, 2)
      wash.set(washSoft)
      boxBlur(wash, washSoft, 6, 2)
      boxBlur(core, coreSoft, 4, 2)
      boxBlur(coreSoft, core, 4, 2)
      coreSoft.set(core)
    }

    const paint = () => {
      blur()
      const data = image.data
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLUMNS; x += 1) {
          const at = x * ROWS + y
          const e = washSoft[at] * edge[at]
          const heart = coreSoft[at] * edge[at]
          // no hard edge and no texture: the wash thins out to nothing in one long, even slope
          let gray = 246 - 36 * (1 - Math.exp(-e * 5.5))
          // the dark core, with feathered edges
          gray -= 105 * smooth(0.06, 0.7, heart)
          gray = Math.max(78, Math.min(246, gray))
          const i = (y * COLUMNS + x) * 4
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
          data[i + 3] = 255
        }
      }
      context.putImageData(image, 0, 0)
    }

    const loop = (now) => {
      frame = window.requestAnimationFrame(loop)
      if (now - lastTick < FRAME_MS) return
      const dt = Math.min(0.1, (now - lastTick) / 1000)
      lastTick = now
      listen(dt)
      compose(now, dt)
      paint()
    }

    paint()
    if (!reduced) frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return createElement('canvas', { ref: canvasRef, className: 'spectrum', role: 'img', 'aria-label': '음악의 주파수' })
}
