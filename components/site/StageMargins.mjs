import { createElement as h } from 'react'
import { buildFiller } from '../../lib/stage-filler.mjs'

// The margins of the home page, filled (lib/stage-filler.mjs). It lies under the boxes, over the whole
// stage, and the boxes cover it everywhere except the margins. Drawn once, with fixed numbers, so it
// is the same on the server and in the browser. Sizes are in plan units (the stage is 2000 x 1126).
export function StageMargins({ boxes, width, height }) {
  const art = buildFiller(boxes, width, height)
  return h(
    'svg',
    {
      className: 'stage-margins',
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    h('path', { d: art.pale, fill: '#c4c4c2' }),
    h('path', { d: art.hair, fill: 'none', stroke: '#8d8d8b', strokeWidth: 0.55 }),
    h('path', { d: art.cross, fill: 'none', stroke: '#8d8d8b', strokeWidth: 0.55 }),
    h('path', { d: art.heavy, fill: '#8d8d8b' }),
    h('path', { d: art.dark, fill: '#494949' }),
    art.texts.map((t, index) =>
      h(
        'text',
        {
          key: index,
          x: t.x,
          y: t.y,
          transform: t.vertical ? `rotate(90 ${t.x} ${t.y})` : undefined,
          fontSize: 4.6,
          letterSpacing: 0.35,
          fill: '#858583',
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        },
        t.text
      )
    )
  )
}
