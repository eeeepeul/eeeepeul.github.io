'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { getVolume, setVolume, subscribeVolume } from '../../lib/stage-audio.mjs'

// The volume control beside cell 3: a stack of horizontal bars whose left ends follow a curve,
// lit (dark) from the foot up to the chosen volume, and a ruler of ticks down the right edge.
// It does not move by itself: press or drag on it (up is louder), or use the arrow keys. The
// player follows the value through lib/stage-audio.mjs.
// Measured from the supplied picture (118 x 582): 37 bars, 13 high, every 15.6; the left end of
// each bar is in LEFTS; the ruler has a tick every 15.3.
const LEFTS = [6, 6, 6, 6, 7, 8, 8, 10, 11, 12, 14, 16, 18, 20, 23, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 56, 58, 60, 61, 63, 64, 65, 66, 67, 67, 68]
const PITCH = 15.62
const BAR = 13.2
const COUNT = LEFTS.length

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
    createElement('rect', { width: 118, height: 582, fill: '#cbcbcb' }),
    // the grey the bars stand on, following the curve
    LEFTS.map((left, i) =>
      createElement('rect', { key: `base${i}`, x: left, y: i * PITCH, width: 86 - left, height: PITCH + 0.4, fill: '#8a8a8a' })
    ),
    // the lines between the bars that are not lit
    LEFTS.map((left, i) =>
      !isLit(i)
        ? createElement('rect', { key: `line${i}`, x: left, y: 1 + i * PITCH + BAR - 0.4, width: 86 - left, height: 2.2, fill: '#ababab' })
        : null
    ),
    // the lit bars
    LEFTS.map((left, i) =>
      isLit(i)
        ? createElement('rect', { key: `bar${i}`, x: left, y: 1 + i * PITCH, width: 80 - (left - 6), height: BAR, fill: '#494949' })
        : null
    ),
    createElement('rect', { x: 86, y: 0, width: 32, height: 582, fill: '#747474' }),
    createElement('path', {
      d: ticks.map((y) => `M96 ${y + 0.8}H118`).join(''),
      stroke: '#f6f6f6',
      strokeWidth: 1.5,
      fill: 'none',
    })
  )
}
