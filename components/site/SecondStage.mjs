'use client'

import { createElement, useEffect, useState } from 'react'

// The frame of the second pages (second/ and second/custom/): a fixed-proportion stage of 2000 x 1125, as the
// supplied layout, fitted to the window and kept in its proportion (the room, the right panel and the rest
// grow and shrink together). The room, the page links, the house button, the drawing pad and the right panel are
// the ones the page always had, in the same places of the room; here they only take the new proportions.
// The left side (calendar, tools, panels, satellite, small map), the bar along the top and the bar along the
// bottom are plain boxes for now, each in its place, to be filled later.
export const SECOND_STAGE = { width: 2000, height: 1125 }

// the boxes, in stage pixels: [class, left, top, width, height]
export const SECOND_STAGE_BOXES = [
  ['top-bar', 0, 0, 2000, 24],
  ['calendar', 0, 24, 178, 373],
  ['tools', 178, 24, 52, 276],
  ['panels', 0, 398, 178, 492],
  ['satellite', 0, 890, 178, 27],
  ['small-map', 0, 917, 178, 208],
  ['status-bar', 178, 1082, 1412, 43],
]

export function SecondStage({ children }) {
  const [scale, setScale] = useState(null)

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / SECOND_STAGE.width, window.innerHeight / SECOND_STAGE.height))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return createElement(
    'div',
    {
      className: 'second-stage__frame',
      'data-ready': scale === null ? undefined : 'true',
      style: scale === null ? undefined : { '--stage-scale': scale },
    },
    createElement(
      'div',
      { className: 'second-stage__canvas' },
      SECOND_STAGE_BOXES.map(([name, left, top, width, height]) =>
        createElement('div', {
          key: name,
          className: `second-stage__box second-stage__box--${name}`,
          'aria-hidden': 'true',
          style: { left, top, width, height },
        })
      ),
      children
    )
  )
}
