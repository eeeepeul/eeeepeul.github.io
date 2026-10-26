'use client'

import { createElement, useState } from 'react'

// Cell 2: a High-to-Low scale down the left edge, an empty space for the picture that will go
// in the cell, and a zoom control at the foot. The control sets the scale of that space (a CSS
// variable on the cell, and an event for anything that wants to follow), so whatever is put in
// the space is zoomed by it.
export const SCALE_CELL_ZOOM_LEVELS = [1, 2, 4, 8, 16, 32, 64] // percent shown
export const SCALE_CELL_BASE_PERCENT = 2 // the percent at which the content is shown at its own size

export function getScaleForPercent(percent) {
  return percent / SCALE_CELL_BASE_PERCENT
}

export function StageScaleCell() {
  const [index, setIndex] = useState(SCALE_CELL_ZOOM_LEVELS.indexOf(SCALE_CELL_BASE_PERCENT))
  const percent = SCALE_CELL_ZOOM_LEVELS[index]

  const change = (next) => {
    const clamped = Math.min(SCALE_CELL_ZOOM_LEVELS.length - 1, Math.max(0, next))
    if (clamped === index) return
    setIndex(clamped)
    const value = SCALE_CELL_ZOOM_LEVELS[clamped]
    window.dispatchEvent(
      new CustomEvent('stage:zoom', { detail: { cell: 2, percent: value, scale: getScaleForPercent(value) } })
    )
  }

  return createElement(
    'div',
    {
      className: 'scale-cell',
      style: { '--zoom-scale': getScaleForPercent(percent) },
      'data-zoom-percent': percent,
    },
    createElement('div', { className: 'scale-cell__content', 'data-zoom-target': 'cell-2' }),
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
