// The margins ('여백') of the home page: whatever part of the stage the boxes do not cover. They are
// filled with fine, ordered graphics in the manner of an instrument panel (rulers with ticks and
// small numbers, hairlines, rows of short bars, tiny codes, crosshairs where two margins meet), all in
// the greys of the page, so that the boxes read as parts of one screen and not as separate pictures.
//
// Where the margins are is worked out from the boxes themselves (the free part of the 2000 x 1126
// plan, cut into rectangles), so the filling follows the boxes if they are moved. Nothing is random
// in the sense of changing: a fixed series of numbers decides the small details, so the server and the
// browser draw the same thing.

const CELL = 2 // plan units per square of the free-space grid

function series(seed) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

// the free part of the stage, as rectangles [x, y, width, height] in plan units
export function freeRectangles(boxes, width, height) {
  const cols = Math.ceil(width / CELL)
  const rows = Math.ceil(height / CELL)
  const used = new Uint8Array(cols * rows)
  for (const [, left, top, right, bottom] of boxes) {
    const x0 = Math.max(0, Math.floor(left / CELL))
    const x1 = Math.min(cols, Math.ceil(right / CELL))
    const y0 = Math.max(0, Math.floor(top / CELL))
    const y1 = Math.min(rows, Math.ceil(bottom / CELL))
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) used[y * cols + x] = 1
  }
  // runs of free squares along each row, joined to the run above when they are exactly the same
  const finished = []
  let open = new Map()
  for (let y = 0; y <= rows; y += 1) {
    const runs = new Map()
    if (y < rows) {
      let x = 0
      while (x < cols) {
        if (used[y * cols + x]) {
          x += 1
          continue
        }
        const start = x
        while (x < cols && !used[y * cols + x]) x += 1
        runs.set(`${start}:${x}`, [start, x])
      }
    }
    const next = new Map()
    for (const [key, rect] of open) {
      if (runs.has(key)) next.set(key, rect)
      else finished.push(rect)
    }
    for (const [key, [a, b]] of runs) {
      if (!next.has(key)) next.set(key, [a, b, y])
      else next.get(key)[3] = y
    }
    // a rectangle is [x0, x1, y0]; its end is the row it was last seen in
    const merged = new Map()
    for (const [key, rect] of next) merged.set(key, rect)
    open = merged
    // close the rectangles that did not continue (handled above); remember the last row of the others
    for (const rect of open.values()) rect.last = y
  }
  const out = []
  for (const rect of finished) {
    const [x0, x1, y0] = rect
    const last = rect.last
    out.push([x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (last - y0 + 1) * CELL])
  }
  // the ones still open at the foot
  for (const rect of open.values()) {
    const [x0, x1, y0] = rect
    out.push([x0 * CELL, y0 * CELL, (x1 - x0) * CELL, (rect.last - y0 + 1) * CELL])
  }
  return out
}

const CODES = [
  'MMH-04', 'EPL-17', 'N09.01', 'E21.80', 'HSE-01', 'HSE-02', 'HSE-03', 'HSE-04', 'SYN-22', 'LOC-09',
  'RDR-36', 'SCN-80', 'VIS-12', 'TRK-04', 'AUD-48', 'FRQ-03', 'GRD-55', 'CAM-07', 'MAP-02', 'ARC-91',
]

const NUMBERS = ['0.000', '0.125', '0.250', '0.375', '0.500', '0.625', '0.750', '0.875', '1.000']

// what to draw: paths (strings of drawing commands) by style, and small texts
export function buildFiller(boxes, width, height) {
  const next = series(55021)
  const rects = freeRectangles(boxes, width, height)
  const hair = [] // thin lines
  const heavy = [] // short bars, stronger
  const dark = [] // the odd dark block
  const pale = [] // pale bars
  const texts = []
  const cross = []

  const line = (list, x1, y1, x2, y2) => list.push(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`)
  const bar = (list, x, y, w, h) => list.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`)

  // a strip is drawn along its length; for a vertical one the drawing is turned on its side
  function strip(rect, vertical) {
    const [rx, ry, rw, rh] = rect
    const length = vertical ? rh : rw
    const thick = vertical ? rw : rh
    // to a place on the strip: a is along it, b is across it (0 at the near edge)
    const at = (a, b) => (vertical ? [rx + b, ry + a] : [rx + a, ry + b])
    const seg = (list, a1, b1, a2, b2) => {
      const [x1, y1] = at(a1, b1)
      const [x2, y2] = at(a2, b2)
      line(list, x1, y1, x2, y2)
    }
    const block = (list, a, b, la, lb) => {
      const [x, y] = at(a, b)
      if (vertical) bar(list, x, y, lb, la)
      else bar(list, x, y, la, lb)
    }
    const mid = thick / 2
    // the ruler: a hairline down the middle with a tick every 6 units, a longer one every 30
    seg(hair, 1.5, mid, length - 1.5, mid)
    const tickSize = Math.min(3.2, thick * 0.3)
    for (let a = 3; a < length - 2; a += 6) {
      const major = Math.round((a - 3) / 6) % 5 === 0
      const t = major ? tickSize * 1.9 : tickSize
      seg(hair, a, mid - t, a, mid + t)
    }
    // small figures at every fifth long tick, on strips with room for them
    if (thick >= 11) {
      let n = 0
      for (let a = 3; a < length - 24; a += 30 * 4) {
        const [x, y] = at(a + 2, mid + tickSize * 1.9 + 4.3)
        texts.push({ x, y, text: NUMBERS[n % NUMBERS.length], vertical })
        n += 1
      }
    }
    // a second row of short bars on the wider strips, like a row of readings
    if (thick >= 15) {
      let a = 4 + next() * 20
      const row = mid + thick * 0.27
      while (a < length - 14) {
        const run = 5 + next() * 34
        const gap = 4 + next() * 26
        const big = next() < 0.12
        if (big) block(dark, a, row - 1, Math.min(run, length - a - 3), 2.6)
        else if (next() < 0.55) block(heavy, a, row - 0.9, Math.min(run, length - a - 3), 1.8)
        else block(pale, a, row - 0.9, Math.min(run, length - a - 3), 1.8)
        a += run + gap
      }
      // and a row of codes on the other side
      const codeRow = mid - thick * 0.3
      let c = 6 + next() * 30
      while (c < length - 40) {
        const [x, y] = at(c, codeRow + 2)
        texts.push({ x, y, text: CODES[Math.floor(next() * CODES.length)], vertical })
        c += 70 + next() * 90
      }
    }
    // an end cap at both ends: a short bar across the strip
    seg(hair, 1.5, mid - thick * 0.28, 1.5, mid + thick * 0.28)
    seg(hair, length - 1.5, mid - thick * 0.28, length - 1.5, mid + thick * 0.28)
  }

  for (const rect of rects) {
    const [x, y, w, h] = rect
    // only the band between the upper and the lower boxes at the bottom keeps its ruler
    if (!(y > 985 && y < 1010 && h < 20)) continue
    const shortSide = Math.min(w, h)
    const longSide = Math.max(w, h)
    if (shortSide < 5) continue
    if (shortSide <= 40 && longSide >= 36) {
      strip(rect, h > w)
    } else if (longSide < 36) {
      // a small square where margins meet: a crosshair with corner brackets
      const cx = x + w / 2
      const cy = y + h / 2
      const r = Math.min(w, h) / 2 - 1
      line(cross, cx - r, cy, cx + r, cy)
      line(cross, cx, cy - r, cx, cy + r)
      const k = Math.min(3, r * 0.6)
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const px = cx + sx * (r - 0.5)
        const py = cy + sy * (r - 0.5)
        line(cross, px, py, px - sx * k, py)
        line(cross, px, py, px, py - sy * k)
      }
    } else {
      // a wide open place: a field of fine dots on a grid, with a few marks
      for (let gy = y + 4; gy < y + h - 2; gy += 6) for (let gx = x + 4; gx < x + w - 2; gx += 6) bar(pale, gx, gy, 0.9, 0.9)
      bar(dark, x + 4, y + 4, 8, 2)
    }
  }
  return { hair: hair.join(''), heavy: heavy.join(''), dark: dark.join(''), pale: pale.join(''), cross: cross.join(''), texts, rects }
}
