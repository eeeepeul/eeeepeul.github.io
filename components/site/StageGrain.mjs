'use client'

import { createElement as h, useEffect, useRef } from 'react'

// The grain of the chart's dark bands, moving. The chart's drawing is a still picture, so its grain is
// made to move by an SVG filter: every grain of it is nudged a very little by a fine noise (a pixel or
// two), and the noise is a new one eight times a second (a new 'seed'), so the grain boils in small
// jumps, like posterized time, while the lines and the bands keep their places. The filter is applied
// to the chart's picture by the stylesheet (.clip-overlay).
const BOIL_FPS = 8
const BOIL_SIZE = 2.6 // how far, in pixels, a grain may be nudged

export function StageGrain() {
  const noiseRef = useRef(null)

  useEffect(() => {
    const noise = noiseRef.current
    if (!noise) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let step = -1
    let frame = 0
    const loop = (now) => {
      frame = window.requestAnimationFrame(loop)
      const next = Math.floor((now / 1000) * BOIL_FPS)
      if (next === step) return
      step = next
      noise.setAttribute('seed', String(next % 997))
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return h(
    'svg',
    { width: 0, height: 0, style: { position: 'absolute' }, 'aria-hidden': 'true', focusable: 'false' },
    h(
      'filter',
      { id: 'clip-boil', x: '0', y: '0', width: '1', height: '1', colorInterpolationFilters: 'sRGB' },
      h('feTurbulence', { ref: noiseRef, type: 'fractalNoise', baseFrequency: '0.85', numOctaves: '1', seed: '1', result: 'noise' }),
      h('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: String(BOIL_SIZE), xChannelSelector: 'R', yChannelSelector: 'G' })
    )
  )
}
