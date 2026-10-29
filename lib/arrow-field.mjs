import { ARROW_GRID } from './arrow-grid.mjs'

// The flow the arrows of cell 10 lie along: the direction at any place, as a smooth field made from
// the arrows of the supplied picture (lib/arrow-grid.mjs), each one pulling the field towards its
// own direction with a strength that falls off fast with distance. It is also given a slow, gentle
// drift in time, a little different from place to place, so the whole flow keeps moving and the
// arrows turn and bend with it. x and y are fractions of the picture's width and height; the
// answer is an angle in radians (0 is to the right, positive turns clockwise on screen).
const PULLS = ARROW_GRID.map(([x, y, angle]) => [x, y, Math.cos(angle), Math.sin(angle)])
const SOFTEN = 0.0012
const DRIFT = 0.32 // how far, in radians, the flow swings to either side of the picture's own
const SPEED = 0.75 // how fast it swings, in radians a second

export function arrowField(x, y, time) {
  let sx = 0
  let sy = 0
  for (let i = 0; i < PULLS.length; i += 1) {
    const dx = x - PULLS[i][0]
    const dy = y - PULLS[i][1]
    const d = dx * dx + dy * dy + SOFTEN
    const weight = 1 / (d * d)
    sx += PULLS[i][2] * weight
    sy += PULLS[i][3] * weight
  }
  return Math.atan2(sy, sx) + DRIFT * Math.sin(time * SPEED + 2.2 * x + 1.6 * y)
}

// Where the arrows of cell 10 stand. The supplied picture sets its arrows on an even grid; here they
// are scattered instead, so that some parts of the cell are thick with arrows and some are thin: a
// slow density field (a few overlapping waves) decides which of the picture's arrows stay, so the
// thin parts keep only a few, and in the thick parts a second arrow is set down beside the first.
// Every arrow is also moved a little and made a little longer or shorter. It is the same every time
// (a fixed series of numbers, not a random one), so the server and the browser draw the same cell.
const series = (seed) => {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

const density = (x, y) =>
  Math.max(0, Math.min(1, 0.5 + 0.3 * Math.sin(6.3 * x + 1.1) * Math.cos(4.1 * y - 0.6) + 0.22 * Math.sin(3.1 * x + 5.2 * y + 0.4)))

function scatter() {
  const next = series(20261029)
  const out = []
  ARROW_GRID.forEach(([x, y, angle, length]) => {
    const d = density(x, y)
    if (next() > 0.42 + 0.7 * d) return
    const jitter = () => (next() - 0.5) * 0.04
    out.push([Math.min(0.99, Math.max(0.01, x + jitter())), Math.min(0.99, Math.max(0.01, y + jitter())), angle, length * (0.8 + next() * 0.45)])
    if (d > 0.55 && next() < 0.85) {
      const away = next() * Math.PI * 2
      const gap = 0.025 + next() * 0.03
      out.push([Math.min(0.99, Math.max(0.01, x + Math.cos(away) * gap)), Math.min(0.99, Math.max(0.01, y + Math.sin(away) * gap)), angle, length * (0.7 + next() * 0.5)])
    }
  })
  return out
}

export const ARROW_SCATTER = scatter()
