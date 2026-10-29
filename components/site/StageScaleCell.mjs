'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { StageHeat } from './StageHeat.mjs'

// Cell 2: a High-to-Low scale down the left edge, the picture of the cell (an aerial view, 1610 x 977,
// laid in the space to fill the cell without being stretched), and a zoom control at the foot. The control sets the scale of that space (a CSS
// variable on the cell, and an event for anything that wants to follow), so whatever is put in
// the space is zoomed by it. The picture also zooms with the mouse wheel and with a pinch or a
// two-finger swipe on a trackpad over the cell: a turn of the wheel is a step, up to zoom in and
// down to zoom out.
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

const WHEEL_STEP = 70 // wheel travel (pixels) that makes one step
const PINCH_STEP = 14 // the same for a trackpad pinch, which reports much smaller amounts

export function StageScaleCell() {
  const [index, setIndex] = useState(SCALE_CELL_ZOOM_LEVELS.indexOf(SCALE_CELL_BASE_PERCENT))
  const percent = SCALE_CELL_ZOOM_LEVELS[index]
  const rootRef = useRef(null)
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
      style: { '--zoom-scale': getScaleForPercent(percent) },
      'data-zoom-percent': percent,
    },
    createElement(
      'div',
      { className: 'scale-cell__content', 'data-zoom-target': 'cell-2' },
      createElement('img', {
        className: 'scale-cell__picture',
        src: assetPath('media/cell-2-aerial.webp'),
        alt: '',
        draggable: false,
      }),
      // the heat over the houses, in the same box as the picture so that it zooms with it
      createElement(StageHeat)
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
