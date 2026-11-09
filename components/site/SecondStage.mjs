'use client'

import { createElement, useEffect, useState } from 'react'
import { StageCalendar } from './StageCalendar.mjs'
import { StageDrawingShelf, StageShelfInput } from './StageDrawingShelf.mjs'
import { StageModel } from './StageModel.mjs'
import { StageToolBar } from './StageToolBar.mjs'

// The frame of the second pages (second/ and second/custom/): a fixed-proportion stage of 2000 x 1125, as the
// supplied layout, fitted to the window and kept in its proportion (the room, the right panel and the rest
// grow and shrink together). The room, the page links, the house button, the drawing pad and the right panel are
// the ones the page always had, in the same places of the room; here they only take the new proportions.
// The left side (calendar, tools, panels, satellite, small map), the bar along the top and the bar along the
// bottom are plain boxes for now, each in its place, to be filled later.
export const SECOND_STAGE = { width: 2000, height: 1125 }

// the boxes, in stage pixels: [class, left, top, width, height, number]. Each shows its number so it can be talked
// about: 1 top bar, 2 calendar, 3 tools (the map's tool bar with the house under it, 259 high at its width of 52), 4-1 and 4-2 the panels (the upper two thirds and the lower third), 5 satellite,
// 6 the turning house of red particles (StageModel), 7 bottom bar. The calendar (2) ends where its last row of days ends (329 high); the space that was left
// under it belongs to the panels (4), which now start there and run down to the satellite bar (537 high in all).
export const SECOND_STAGE_BOXES = [
  ['top-bar', 0, 0, 2000, 24, '1'],
  ['calendar', 0, 24, 178, 329, '2'],
  ['tools', 178, 24, 52, 259, '3'],
  ['panels-upper', 0, 353, 178, 358, '4-1'],
  ['panels-lower', 0, 711, 178, 179, '4-2'],
  ['satellite', 0, 890, 178, 27, '5'],
  ['small-map', 0, 917, 178, 208, '6'],
  ['status-bar', 178, 1082, 1412, 43, '7'],
]

export function SecondStage({ children, houseHref, houseLabel }) {
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
      SECOND_STAGE_BOXES.map(([name, left, top, width, height, number]) =>
        createElement(
          'div',
          {
            key: name,
            className: `second-stage__box second-stage__box--${name}`,
            'data-stage-box': number,
            'aria-hidden': 'true',
            style: { left, top, width, height },
          },
          // the calendar (2), the tool bar (3), the shelf of drawings (4-2), its input key (5) and the turning house (6) are
          // filled; the others show their number
          name === 'calendar'
            ? createElement(StageCalendar)
            : name === 'tools'
            ? createElement(StageToolBar, { houseHref, houseLabel })
            : name === 'small-map'
            ? createElement(StageModel)
            : name === 'panels-lower'
            ? createElement(StageDrawingShelf)
            : name === 'satellite'
            ? createElement(StageShelfInput)
            : createElement('b', { className: 'second-stage__number' }, number)
        )
      ),
      children
    )
  )
}
