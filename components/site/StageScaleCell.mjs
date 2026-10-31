'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { StageHeat } from './StageHeat.mjs'
import { StageVisits } from './StageVisits.mjs'

// Cell 2: a High-to-Low scale down the left edge, the picture of the cell (an aerial view, 1610 x 977,
// laid in the space to fill the cell without being stretched), and a zoom control at the foot. The control sets the scale of that space (a CSS
// variable on the cell, and an event for anything that wants to follow), so whatever is put in
// the space is zoomed by it. The picture also zooms with the mouse wheel and with a pinch or a
// two-finger swipe on a trackpad over the cell: a turn of the wheel is a step, up to zoom in and
// down to zoom out.
//
// A bar stands upright in the cell with a round handle. Where the bar is, the picture changes: to its
// left is the aerial view with the heat, to its right the pencil-drawn version of the same view
// (the second picture is laid over the first and only shows right of the bar). That 'after' picture
// carries red circles, one for every visit to a house, in made-up numbers that rise and fall. Pull the handle (or
// press the arrow keys on it) to move the bar. Both pictures zoom together, and the bar does not.
// 1% (the picture just fills the cell), then 5%, 10%, 15% ... up to 100%, in steps of 5
export const SCALE_CELL_ZOOM_LEVELS = [1, ...Array.from({ length: 20 }, (_, step) => (step + 1) * 5)] // percent shown
export const SCALE_CELL_BASE_PERCENT = 1 // the percent at which the content is shown at its own size (the cell is just filled)

// The shown percent is only a name for the step. The picture grows by the same factor at every
// step (about 1.26 times, from 1 times at 1% to 100 times at 100%), so that every press looks like
// the same amount of growth; growing by the same amount each time would look big at the start and
// barely moving at the end.
export const SCALE_CELL_MAX_SCALE = 100
export function getScaleForPercent(percent) {
  const step = Math.max(0, SCALE_CELL_ZOOM_LEVELS.indexOf(percent))
  return Math.pow(SCALE_CELL_MAX_SCALE, step / (SCALE_CELL_ZOOM_LEVELS.length - 1))
}

const SPLIT_START = 0.5 // where the bar stands when the page opens, as a share of the cell's width
const WHEEL_STEP = 70 // wheel travel (pixels) that makes one step
const PINCH_STEP = 14 // the same for a trackpad pinch, which reports much smaller amounts

export function StageScaleCell() {
  const [index, setIndex] = useState(SCALE_CELL_ZOOM_LEVELS.indexOf(SCALE_CELL_BASE_PERCENT))
  const percent = SCALE_CELL_ZOOM_LEVELS[index]
  const rootRef = useRef(null)
  const [split, setSplit] = useState(SPLIT_START)
  const dragging = useRef(false)
  const indexRef = useRef(index)
  indexRef.current = index

  const change = (next) => {
    const clamped = Math.min(SCALE_CELL_ZOOM_LEVELS.length - 1, Math.max(0, next))
    if (clamped === indexRef.current) return
    indexRef.current = clamped
    setIndex(clamped)
    const value = SCALE_CELL_ZOOM_LEVELS[clamped]
    window.dispatchEvent(
      new CustomEvent('stage:zoom', { detail: { cell: 2, percent: value, scale: getScaleForPercent(value) } })
    )
  }

  const moveBar = (event) => {
    const root = rootRef.current
    if (!root) return
    const box = root.getBoundingClientRect()
    setSplit(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)))
  }
  const onBarDown = (event) => {
    dragging.current = true
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // a synthetic pointer cannot be captured; the bar still follows the pointer events
    }
    moveBar(event)
    event.preventDefault()
  }
  const onBarMove = (event) => {
    if (dragging.current) moveBar(event)
  }
  const onBarUp = () => {
    dragging.current = false
  }
  const onBarKey = (event) => {
    const step = { ArrowLeft: -0.03, ArrowRight: 0.03, Home: -1, End: 1 }[event.key]
    if (!step) return
    event.preventDefault()
    setSplit((value) => Math.min(1, Math.max(0, Math.abs(step) === 1 ? (step < 0 ? 0 : 1) : value + step)))
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    let travelled = 0
    let lastWheel = 0
    const onWheel = (event) => {
      // the page must not scroll, and a pinch must not zoom the whole page, while the pointer is here
      event.preventDefault()
      const now = performance.now()
      if (now - lastWheel > 250) travelled = 0
      lastWheel = now
      // lines and pages (a mouse wheel in some browsers) are counted in pixels too
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
      travelled += event.deltaY * unit
      const limit = event.ctrlKey ? PINCH_STEP : WHEEL_STEP
      while (Math.abs(travelled) >= limit) {
        change(indexRef.current + (travelled < 0 ? 1 : -1))
        travelled -= Math.sign(travelled) * limit
      }
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [])

  return createElement(
    'div',
    {
      ref: rootRef,
      className: 'scale-cell',
      style: { '--zoom-scale': getScaleForPercent(percent), '--split': `${(split * 100).toFixed(2)}%` },
      'data-zoom-percent': percent,
    },
    createElement(
      'div',
      { className: 'scale-cell__content', 'data-zoom-target': 'cell-2' },
      // The aerial picture and the heat on it are one layer, set into the same frame as the pencil
      // picture (see .scale-cell__aerial): so the two pictures are a match cut, every house, road
      // and tree in the same place at the same size, however the bar is moved.
      createElement(
        'div',
        { className: 'scale-cell__aerial' },
        createElement('img', {
          className: 'scale-cell__picture',
          src: assetPath('media/cell-2-aerial.webp'),
          alt: '',
          draggable: false,
        }),
        // the heat over the houses, in the same box as the picture so that it zooms with it
        createElement(StageHeat)
      )
    ),
    // the pencil-drawn version, shown only to the right of the bar; it zooms like the first picture
    createElement(
      'div',
      { className: 'scale-cell__reveal', 'aria-hidden': 'true' },
      createElement(
        'div',
        { className: 'scale-cell__content' },
        createElement('img', {
          className: 'scale-cell__picture',
          src: assetPath('media/cell-2-sketch.webp'),
          alt: '',
          draggable: false,
        }),
        // red circles for the visits to the houses, counted as if live; only seen where this picture is.
        // They are placed by the houses of the aerial picture, so they sit in its frame as well.
        createElement('div', { className: 'scale-cell__aerial' }, createElement(StageVisits))
      )
    ),
    createElement(
      'div',
      {
        className: 'scale-cell__divider',
        role: 'slider',
        tabIndex: 0,
        'aria-label': '사진 비교 바',
        'aria-orientation': 'horizontal',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': Math.round(split * 100),
        onPointerDown: onBarDown,
        onPointerMove: onBarMove,
        onPointerUp: onBarUp,
        onPointerCancel: onBarUp,
        onKeyDown: onBarKey,
      },
      createElement('span', { className: 'scale-cell__divider-line' }),
      createElement(
        'span',
        { className: 'scale-cell__divider-handle' },
        createElement('i', { className: 'scale-cell__divider-left' }),
        createElement('i', { className: 'scale-cell__divider-right' })
      )
    ),
    createElement('span', { className: 'scale-cell__bar', 'aria-hidden': 'true' }),
    createElement('span', { className: 'scale-cell__label scale-cell__label--high' }, 'High'),
    createElement('span', { className: 'scale-cell__label scale-cell__label--low' }, 'Low'),
    createElement(
      'div',
      { className: 'scale-cell__zoom', role: 'group', 'aria-label': '확대 축소' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'scale-cell__step',
          'aria-label': '축소',
          disabled: index === 0,
          onClick: () => change(index - 1),
        },
        createElement('i', { className: 'scale-cell__minus' })
      ),
      createElement('output', { className: 'scale-cell__percent', 'aria-live': 'polite' }, `${percent}%`),
      createElement(
        'button',
        {
          type: 'button',
          className: 'scale-cell__step',
          'aria-label': '확대',
          disabled: index === SCALE_CELL_ZOOM_LEVELS.length - 1,
          onClick: () => change(index + 1),
        },
        createElement('i', { className: 'scale-cell__plus' })
      )
    )
  )
}
