'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { getVolume, setVolume, subscribeVolume } from '../../lib/stage-audio.mjs'

// The volume control beside cell 3, as a tachometer: a stack of horizontal bars whose left ends follow
// a curve, lit (red) from the foot up to the chosen volume, and a ruler of ticks and figures 0 to 9
// down the right edge.
// It does not move by itself: press or drag on it (up is louder), or use the arrow keys. The
// player follows the value through lib/stage-audio.mjs.
// Measured from the supplied picture (118 x 582): 37 bars, 13 high, every 15.6; the left end of
// each bar is in LEFTS; the ruler has a tick every 15.3.
const LEFTS = [6, 6, 6, 6, 7, 8, 8, 10, 11, 12, 14, 16, 18, 20, 23, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 56, 58, 60, 61, 63, 64, 65, 66, 67, 67, 68]
const PITCH = 15.62
const BAR = 13.2
const COUNT = LEFTS.length

// the ink: the red and its darks are the stage's own (--c-red, --c-red-deep, --c-red-dark), the
// teal and aqua its navy, teal and aqua
const INK = {
  ground: '#340406',
  unlit: '#4a0609',
  lit: '#a8080e',
  ruler: '#2c6470',
  tick: '#eae2c4',
}
// the long ticks and the figures 0 to 9: the foot to the top, a ninth of the height apart
const MAJORS = Array.from({ length: 10 }, (_, n) => 566 - n * 60)

const HI = 'rgba(255,255,255,0.7)'
const LO = 'rgba(0,0,0,0.35)'
// [x, y, width, height, fill] on the 118 x 582 plan (one unit is a little under half a pixel)
const EDGES = [
  [0, 0, 118, 2.5, LO],
  [0, 0, 2.5, 582, LO],
  [0, 579.5, 118, 2.5, HI],
  [115.5, 0, 2.5, 582, HI],
  [86, 2.5, 2.5, 577, LO],
  [88.5, 2.5, 2.5, 577, HI],
  [91, 2.5, 24.5, 2.5, HI],
  [91, 577, 24.5, 2.5, LO],
]

export function StageVolume() {
  const [level, setLevel] = useState(getVolume())
  const dragging = useRef(false)

  useEffect(() => subscribeVolume(setLevel), [])

  const fromPointer = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const fraction = 1 - (event.clientY - box.top) / box.height
    setVolume(Math.round(fraction * COUNT) / COUNT)
  }
  const onDown = (event) => {
    dragging.current = true
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // a synthetic pointer cannot be captured; dragging still works while it is over the bars
    }
    fromPointer(event)
  }
  const onMove = (event) => {
    if (dragging.current) fromPointer(event)
  }
  const onUp = () => {
    dragging.current = false
  }
  const onKey = (event) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    setVolume(Math.round(getVolume() * COUNT + step) / COUNT)
  }

  const lit = Math.round(level * COUNT)
  const isLit = (i) => i >= COUNT - lit
  const ticks = Array.from({ length: 38 }, (_, k) => k * 15.3)

  return createElement(
    'svg',
    {
      className: 'volume',
      viewBox: '0 0 118 582',
      preserveAspectRatio: 'none',
      role: 'slider',
      tabIndex: 0,
      'aria-label': '음량',
      'aria-orientation': 'vertical',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': Math.round(level * 100),
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
      onKeyDown: onKey,
    },
    // the gauge's lights and glass: gradients for the ground and the ruler, a bloom for what is lit, a grain
    createElement(
      'defs',
      null,
      createElement(
        'linearGradient',
        { id: 'vol-ground', x1: 0, y1: 0, x2: 0, y2: 1 },
        createElement('stop', { offset: 0, stopColor: '#2a0305' }),
        createElement('stop', { offset: 1, stopColor: '#3d0508' })
      ),
      createElement(
        'linearGradient',
        { id: 'vol-unlit', x1: 0, y1: 0, x2: 1, y2: 0 },
        createElement('stop', { offset: 0, stopColor: '#3a0508' }),
        createElement('stop', { offset: 1, stopColor: '#560609' })
      ),
      createElement(
        'linearGradient',
        { id: 'vol-lit', x1: 0, y1: 0, x2: 1, y2: 0 },
        createElement('stop', { offset: 0, stopColor: '#8f060c' }),
        createElement('stop', { offset: 0.55, stopColor: '#a8080e' }),
        createElement('stop', { offset: 1, stopColor: '#c20c13' })
      ),
      createElement(
        'linearGradient',
        { id: 'vol-ruler', x1: 0, y1: 0, x2: 1, y2: 0 },
        createElement('stop', { offset: 0, stopColor: '#3d7886' }),
        createElement('stop', { offset: 0.3, stopColor: '#2c6470' }),
        createElement('stop', { offset: 1, stopColor: '#1e4a54' })
      ),
      // the bloom: the lit part blurred and laid under itself, weakly, so the bars still read as bars
      createElement(
        'filter',
        { id: 'vol-bloom', x: '-30%', y: '-10%', width: '160%', height: '120%' },
        createElement('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 3, result: 'wideBlur' }),
        createElement(
          'feComponentTransfer',
          { in: 'wideBlur', result: 'wide' },
          createElement('feFuncA', { type: 'linear', slope: 0.5 })
        ),
        createElement('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 0.9, result: 'nearBlur' }),
        createElement(
          'feComponentTransfer',
          { in: 'nearBlur', result: 'near' },
          createElement('feFuncA', { type: 'linear', slope: 0.6 })
        ),
        createElement(
          'feMerge',
          null,
          createElement('feMergeNode', { in: 'wide' }),
          createElement('feMergeNode', { in: 'near' }),
          createElement('feMergeNode', { in: 'SourceGraphic' })
        )
      ),
      // a soft edge for the dark bars and the ticks
      createElement(
        'filter',
        { id: 'vol-soft', x: '-10%', y: '-10%', width: '120%', height: '120%' },
        createElement('feGaussianBlur', { stdDeviation: 0.9 })
      ),
      // the grain of the print
      createElement(
        'filter',
        { id: 'vol-grain', x: 0, y: 0, width: '100%', height: '100%' },
        createElement('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.85, numOctaves: 2, seed: 7, result: 'noise' }),
        createElement('feColorMatrix', { in: 'noise', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.3' })
      )
    ),
    createElement('rect', { width: 118, height: 582, fill: 'url(#vol-ground)' }),
    // the bars not yet lit: dark, a little soft, with a faint line between them
    createElement(
      'g',
      { filter: 'url(#vol-soft)' },
      LEFTS.map((left, i) =>
        !isLit(i)
          ? createElement('rect', { key: `dark${i}`, x: left, y: 1 + i * PITCH, width: 86 - left, height: BAR, fill: 'url(#vol-unlit)' })
          : null
      )
    ),
    // the lit bars, from the foot up to the volume, glowing
    createElement(
      'g',
      { filter: 'url(#vol-bloom)' },
      LEFTS.map((left, i) =>
        isLit(i)
          ? createElement('rect', { key: `lit${i}`, x: left, y: 1 + i * PITCH, width: 86 - left, height: BAR, fill: 'url(#vol-lit)' })
          : null
      )
    ),
    // the dark line between one lit bar and the next, laid back over the glow
    LEFTS.map((left, i) =>
      isLit(i) && i < COUNT - 1
        ? createElement('rect', {
            key: `gap${i}`,
            x: left,
            y: 1 + i * PITCH + BAR,
            width: 86 - left,
            height: PITCH - BAR,
            fill: '#2a0305',
            opacity: 0.85,
          })
        : null
    ),
    // the ruler: a lit edge, a short tick for every bar, a long one and a figure (0 at the foot to 9 at the top)
    // every ninth of the height
    createElement('rect', { x: 86, y: 0, width: 32, height: 582, fill: 'url(#vol-ruler)' }),
    createElement('rect', { x: 86, y: 0, width: 1.6, height: 582, fill: 'rgba(255,255,255,0.5)' }),
    createElement(
      'g',
      { filter: 'url(#vol-soft)', opacity: 0.95 },
      createElement('path', {
        d: ticks.map((y) => `M88 ${y + 0.8}H96`).join(''),
        stroke: INK.tick,
        strokeWidth: 1.4,
        fill: 'none',
      }),
      createElement('path', {
        d: MAJORS.map((y) => `M88 ${y}H101`).join(''),
        stroke: INK.tick,
        strokeWidth: 2,
        fill: 'none',
      }),
      MAJORS.map((y, n) =>
        createElement(
          'text',
          {
            key: `figure${n}`,
            transform: `rotate(-90 114 ${y})`,
            x: 114,
            y,
            textAnchor: 'middle',
            fill: INK.tick,
            fontSize: 12,
            style: { fontFamily: "'Nanum Gothic Coding', ui-monospace, Menlo, Consolas, monospace" },
            pointerEvents: 'none',
          },
          String(n)
        )
      )
    ),
    // the grain, over everything, very faint
    createElement('rect', { width: 118, height: 582, filter: 'url(#vol-grain)', opacity: 0.12, pointerEvents: 'none' }),
    // the edges of a rollout's control, drawn over the picture as veils (no colour of their own): the
    // whole bar sunk into its frame, and the strip of ticks standing out of it, raised
    EDGES.map(([x, y, width, height, fill], i) =>
      createElement('rect', { key: `edge${i}`, x, y, width, height, fill, pointerEvents: 'none' })
    )
  )
}
