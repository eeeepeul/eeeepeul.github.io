import { createElement as h } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// The colours of the stage, read off the supplied colour picture: a print in a few inks (a deep navy,
// a teal, a pale aqua, a cream paper and a red). Pictures, clips and pages of their own keep their
// drawing and only change their colours: each is shown through one of the "tone" filters below,
// which turns its light and dark into a ramp of these inks (a gradient map).
export const INKS = {
  black: [6, 8, 6],
  ink: [10, 29, 33],
  navy: [14, 48, 56],
  teal: [44, 100, 112],
  sea: [95, 156, 160],
  aqua: [157, 203, 200],
  cream: [234, 226, 196],
  peach: [226, 170, 150],
  red: [168, 8, 14],
  redBright: [208, 26, 28],
  redDeep: [115, 3, 9],
  redDark: [52, 4, 6],
}

// [where on the scale from dark (0) to light (1), ink]
const TONES = {
  // light paper with dark lines: the paper turns navy, the lines cream (cells 9, 10, 14)
  'tone-ink': [[0, 'cream'], [0.3, 'aqua'], [0.55, 'teal'], [0.8, 'navy'], [1, 'navy']],
  // as tone-ink, but the fine lines come out full cream (cells 9 and 10)
  'tone-line': [[0, 'cream'], [0.6, 'cream'], [0.8, 'sea'], [0.9, 'navy'], [1, 'navy']],
  // the same on black
  'tone-line-black': [[0, 'cream'], [0.6, 'cream'], [0.8, 'teal'], [0.9, 'black'], [1, 'black']],
  // keeps light light: dark to navy, light to cream
  'tone-paper': [[0, 'ink'], [0.45, 'teal'], [0.75, 'aqua'], [1, 'cream']],
  // a photograph seen from the air: navy shadows, teal and aqua middles, cream lights
  'tone-field': [[0, 'black'], [0.28, 'navy'], [0.5, 'teal'], [0.72, 'sea'], [0.88, 'aqua'], [1, 'cream']],
  // black and cream only
  'tone-mono': [[0, 'black'], [1, 'cream']],
  // in reds, up to cream (the scope, the line of letters)
  'tone-red': [[0, 'redDark'], [0.35, 'redDeep'], [0.6, 'red'], [0.85, 'peach'], [1, 'cream']],
  // the scope's photograph: reds, its light parts cream
  'tone-scope': [[0, 'redDark'], [0.25, 'redDeep'], [0.45, 'red'], [0.68, 'peach'], [0.9, 'cream'], [1, 'cream']],
  // the moving tiles of cell 16: navy and teal with red in their middle tones
  'tone-tiles': [[0, 'ink'], [0.3, 'navy'], [0.5, 'teal'], [0.65, 'red'], [1, 'cream']],
}

// Pictures with warm colours in them (orange houses, red boxes) are split in two: the warm parts
// take the warm ramp, everything else the cool one. [cool ramp, warm ramp]
const SPLITS = {
  // the scanned houses: the grey ground to the stage's black, the grid aqua and cream, the houses red
  // and cream
  'tone-houses': [
    [[0, 'black'], [0.42, 'black'], [0.48, 'teal'], [0.56, 'aqua'], [0.66, 'cream'], [1, 'cream']],
    [[0, 'redDeep'], [0.12, 'redBright'], [0.5, 'redBright'], [0.7, 'peach'], [0.85, 'cream'], [1, 'cream']],
  ],
  // the coloured picture of cell 15: its blues to navy and teal, its reds, oranges and yellows to red and cream
  'tone-chart': [
    [[0, 'black'], [0.25, 'navy'], [0.5, 'teal'], [0.8, 'aqua'], [1, 'cream']],
    [[0, 'redDark'], [0.25, 'red'], [0.6, 'peach'], [1, 'cream']],
  ],
}

// Light pictures turned navy whose chosen parts are printed in red instead of cream (the roof, the
// head, the match and the paths of cell 9; the meeting point of the lines in cell 10): the parts are
// marked white on a picture of the box's own shape. [mask, ramp elsewhere, ramp in the marked parts]
const MARKED = {
  'tone-clip': ['media/clip-9-red.png', 'tone-line', 'navy'],
  // cell 10 on the black of the stage
  'tone-graph': ['media/graph-10-red.png', 'tone-line-black', 'black'],
}
// the ink in red, the paper as in the plain ramp
const redInk = (paper) => [[0, 'red'], [0.64, 'red'], [0.82, 'redDeep'], [0.9, paper], [1, paper]]

const SAMPLES = 33

function channel(stops, k) {
  const values = []
  for (let i = 0; i < SAMPLES; i += 1) {
    const t = i / (SAMPLES - 1)
    let at = stops.length - 1
    for (let s = 1; s < stops.length; s += 1) {
      if (t <= stops[s][0]) {
        at = s
        break
      }
    }
    const [t0, a] = stops[Math.max(0, at - 1)]
    const [t1, b] = stops[at]
    const f = t1 > t0 ? Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) : 1
    values.push(((INKS[a][k] + (INKS[b][k] - INKS[a][k]) * f) / 255).toFixed(4))
  }
  return values.join(' ')
}

const GREY = '0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0'
// how warm a colour is (red over blue), as the strength of a mask
const WARM = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 6 0 -6 0 -0.15'

const ramp = (stops, input, result) =>
  h(
    'feComponentTransfer',
    { in: input, result },
    h('feFuncR', { type: 'table', tableValues: channel(stops, 0) }),
    h('feFuncG', { type: 'table', tableValues: channel(stops, 1) }),
    h('feFuncB', { type: 'table', tableValues: channel(stops, 2) })
  )

export function StagePalette() {
  return h(
    'svg',
    { className: 'stage-palette', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' },
    h(
      'defs',
      null,
      Object.entries(TONES).map(([id, stops]) =>
        h(
          'filter',
          { key: id, id, colorInterpolationFilters: 'sRGB', x: 0, y: 0, width: 1, height: 1 },
          h('feColorMatrix', { type: 'matrix', values: GREY, result: 'grey' }),
          ramp(stops, 'grey')
        )
      ),
      Object.entries(SPLITS).map(([id, [cool, warm]]) =>
        h(
          'filter',
          { key: id, id, colorInterpolationFilters: 'sRGB', x: 0, y: 0, width: 1, height: 1 },
          h('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: GREY, result: 'grey' }),
          ramp(cool, 'grey', 'cool'),
          ramp(warm, 'grey', 'warmInk'),
          h('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: WARM, result: 'warmth' }),
          h('feComposite', { in: 'warmInk', in2: 'warmth', operator: 'in', result: 'warm' }),
          h('feMerge', null, h('feMergeNode', { in: 'cool' }), h('feMergeNode', { in: 'warm' }))
        )
      ),
      Object.entries(MARKED).map(([id, [mask, tone, paper]]) =>
        h(
          'filter',
          { key: id, id, colorInterpolationFilters: 'sRGB', primitiveUnits: 'objectBoundingBox', x: 0, y: 0, width: 1, height: 1 },
          h('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: GREY, result: 'grey' }),
          ramp(TONES[tone], 'grey', 'plain'),
          ramp(redInk(paper), 'grey', 'redInk'),
          h('feImage', { href: assetPath(mask), x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: 'none', result: 'marks' }),
          h('feColorMatrix', { in: 'marks', type: 'luminanceToAlpha', result: 'where' }),
          h('feComposite', { in: 'redInk', in2: 'where', operator: 'in', result: 'red' }),
          h('feMerge', null, h('feMergeNode', { in: 'plain' }), h('feMergeNode', { in: 'red' }))
        )
      )
    )
  )
}
