import { createElement as h } from 'react'

// A side view of the main landmass: the height of the land along a west-to-east line
// through it (read from the globe's height map), drawn as a finely detailed section with
// its layers, faults and marked places, and a second strip below that follows the same
// line. Drawn in a large coordinate space so the hairlines and small type hold up when
// the panel is opened up.
const HEIGHTS = [
  0, 0.192, 0.403, 0.586, 0.731, 0.83, 0.902, 0.946, 0.956, 0.928, 0.869, 0.806, 0.765, 0.754, 0.785, 0.834, 0.883,
  0.914, 0.918, 0.903, 0.869, 0.836, 0.807, 0.778, 0.74, 0.708, 0.68, 0.659, 0.648, 0.643, 0.639, 0.632, 0.62, 0.606,
  0.597, 0.608, 0.635, 0.671, 0.695, 0.698, 0.679, 0.656, 0.648, 0.664, 0.697, 0.737, 0.774, 0.789, 0.787, 0.784,
  0.779, 0.783, 0.799, 0.817, 0.817, 0.788, 0.746, 0.692, 0.647, 0.626, 0.619, 0.623, 0.629, 0.628, 0.617, 0.595,
  0.574, 0.561, 0.56, 0.576, 0.597, 0.618, 0.628, 0.627, 0.622, 0.626, 0.644, 0.688, 0.752, 0.834, 0.904, 0.956,
  0.993, 1, 0.988, 0.982, 0.976, 0.971, 0.962, 0.951, 0.921, 0.867, 0.808, 0.748, 0.697, 0.673,
]

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const INK = '#1c1c1c'
const LEFT = 64
const RIGHT = 956
const TOP = 10
const BASE = 180 // floor of the section
const LOW_TOP = 192
const LOW_BASE = 268
const K = (LOW_BASE - LOW_TOP) / 104 // the lower strip is drawn for 104 units
const STEPS = 560
const LX = 330
const CUT = 566 // the section ends here; the eastern part is not shown

// ---- the ground ------------------------------------------------------------------------
// Catmull-Rom through the sampled heights, then fine, rougher detail on top of it.
function smooth(t) {
  const f = t * (HEIGHTS.length - 1)
  const i = Math.min(HEIGHTS.length - 2, Math.floor(f))
  const u = f - i
  const p0 = HEIGHTS[Math.max(0, i - 1)]
  const p1 = HEIGHTS[i]
  const p2 = HEIGHTS[i + 1]
  const p3 = HEIGHTS[Math.min(HEIGHTS.length - 1, i + 2)]
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
}
let seed = 7
const random = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}
const TERRAIN = []
{
  let wander = 0
  for (let k = 0; k <= STEPS; k += 1) {
    const t = k / STEPS
    const base = smooth(t)
    wander = wander * 0.82 + (random() - 0.5) * 0.02
    const detail =
      0.012 * Math.sin(t * 61 + 1.3) + 0.007 * Math.sin(t * 143 + 0.4) + 0.004 * Math.sin(t * 331) + wander * (0.4 + base)
    const v = Math.max(0.02, base + detail * (base > 0.15 ? 1 : 0.2))
    TERRAIN.push([LEFT + (RIGHT - LEFT) * t, altitudeToY(0.4 + Math.max(0, (v - 0.45) / 0.55) * 1.75), v])
  }
}
function altitudeToY(alt) {
  return BASE - ((alt - 0.4) / (3.2 - 0.4)) * (BASE - TOP)
}
const at = (t) => TERRAIN[Math.max(0, Math.min(STEPS, Math.round(t * STEPS)))]
const pathOf = (list) => list.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')
const peakIndex = TERRAIN.reduce((best, p, i) => (p[1] < TERRAIN[best][1] ? i : best), 0)

function text(x, y, value, props = {}) {
  const { size = 13, fill = INK, anchor = 'start', weight = 400, spacing = 0.25, ...rest } = props
  return h(
    'text',
    { x, y, fontSize: size, fill, textAnchor: anchor, fontWeight: weight, letterSpacing: spacing, fontFamily: FONT, ...rest },
    value
  )
}

const arrowHead = (x, y, angle, size = 5, fill = INK) => {
  const a = (angle * Math.PI) / 180
  const p = (da, d) => `${(x - Math.cos(a + da) * d).toFixed(1)} ${(y - Math.sin(a + da) * d).toFixed(1)}`
  return h('path', { d: `M${x.toFixed(1)} ${y.toFixed(1)} L${p(0.4, size)} L${p(-0.4, size)} Z`, fill })
}

// A fault: a thin line down through the ground with a pair of half arrows at its middle.
function fault(t, lean = 0.16, key) {
  const [x, y] = at(t)
  const bottom = BASE
  const x2 = x + (bottom - y) * lean
  const angle = (Math.atan2(bottom - y, x2 - x) * 180) / Math.PI
  const mx = x + (x2 - x) * 0.55
  const my = y + (bottom - y) * 0.55
  const nx = Math.cos(((angle + 90) * Math.PI) / 180)
  const ny = Math.sin(((angle + 90) * Math.PI) / 180)
  const along = (d, off) => [mx + Math.cos((angle * Math.PI) / 180) * d + nx * off, my + Math.sin((angle * Math.PI) / 180) * d + ny * off]
  const [ax, ay] = along(-12, -6)
  const [bx, by] = along(12, -6)
  const [cx, cy] = along(12, 6)
  const [dx, dy] = along(-12, 6)
  return h(
    'g',
    { key },
    h('path', { d: `M${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${bottom}`, stroke: INK, strokeWidth: 0.9, fill: 'none' }),
    h('path', { d: `M${ax} ${ay} L${bx} ${by}M${cx} ${cy} L${dx} ${dy}`, stroke: INK, strokeWidth: 0.9, fill: 'none' }),
    arrowHead(bx, by, angle, 5),
    arrowHead(dx, dy, angle + 180, 5)
  )
}

// A drilled well: a red line down from the ground with a short cap.
const well = (t, depth, key) => {
  const [x, y] = at(t)
  return h('path', { key, d: `M${x.toFixed(1)} ${(y + 1).toFixed(1)}V${(y + depth).toFixed(1)}M${(x - 5).toFixed(1)} ${(y + depth).toFixed(1)}H${(x + 5).toFixed(1)}`, stroke: '#d9262c', strokeWidth: 2.2, fill: 'none' })
}

// ---- the strip below -------------------------------------------------------------------
const LOW = []
{
  const anchors = [[0, 14], [0.2, 18], [0.3, 24], [0.335, 30], [0.345, 70], [0.36, 90], [0.4, 92], [0.43, 70], [0.45, 62], [0.55, 60], [0.66, 64], [0.68, 52], [0.72, 50], [0.76, 56], [0.8, 48], [0.9, 38], [1, 34]]
  let drift = 0
  for (let k = 0; k <= STEPS; k += 1) {
    const t = k / STEPS
    let j = 1
    while (j < anchors.length - 1 && anchors[j][0] < t) j += 1
    const [t0, y0] = anchors[j - 1]
    const [t1, y1] = anchors[j]
    const u = (t - t0) / (t1 - t0)
    drift = drift * 0.85 + (random() - 0.5) * 1.6
    LOW.push([LEFT + (RIGHT - LEFT) * t, LOW_TOP + (y0 + (y1 - y0) * u) * K + drift * K])
  }
}

const superscript = (x, y, base, power, props = {}) =>
  h(
    'text',
    { x, y, fontSize: 13, fill: INK, textAnchor: 'end', fontFamily: FONT, letterSpacing: 0.2, ...props },
    base,
    h('tspan', { dy: -5, fontSize: 9 }, power)
  )

export function MapElevationProfile() {
  const peak = TERRAIN[peakIndex]
  const peakT = peakIndex / STEPS
  const river1 = at(0.355)
  const river2 = at(0.775)
  const LA = Math.max(0, Math.round((peakT - 0.22) * STEPS))
  const LB = Math.min(STEPS, Math.round((peakT + 0.17) * STEPS))
  const ticks = []
  for (let a = 0.4; a <= 3.21; a += 0.2) {
    const major = Math.round((a - 0.4) / 0.2) % 2 === 0
    const y = altitudeToY(a)
    ticks.push(
      h(
        'g',
        { key: `a${a.toFixed(1)}` },
        h('path', { d: `M${LEFT} ${y.toFixed(1)}h${major ? 9 : 5}M${RIGHT} ${y.toFixed(1)}h-${major ? 9 : 5}`, stroke: INK, strokeWidth: major ? 0.8 : 0.6 }),
        major ? text(LEFT - 8, y + 4.5, a.toFixed(1).replace(/\.0$/, ''), { anchor: 'end', size: 14 }) : null
      )
    )
  }
  const longitudes = ['18.0°W', '12.0', '6.0', '0.0']
  const lows = []
  for (let n = 4; n <= 7; n += 1) {
    const y = LOW_BASE - 8 - ((n - 3.7) / 3.6) * (LOW_BASE - LOW_TOP - 24)
    lows.push(
      h('g', { key: `n${n}` }, h('path', { d: `M${LEFT} ${y.toFixed(1)}h9M${RIGHT} ${y.toFixed(1)}h-9`, stroke: INK, strokeWidth: 0.8 }), superscript(LEFT - 8, y + 4.5, '10', n))
    )
  }
  // dotted layer boundaries
  const dot = { fill: 'none', stroke: '#3d3d3d', strokeWidth: 0.9, strokeDasharray: '2.2 2.2' }

  return h(
    'section',
    { className: 'map-profile', 'aria-label': 'Terrain section' },
    h(
      'svg',
      {
        className: 'map-profile__chart',
        viewBox: '0 0 568 300',
        role: 'img',
        'aria-label': 'West-to-east section through the main land',
      },
      h('defs', null,
        h('linearGradient', { id: 'profile-band', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: 0, stopColor: '#f4a99a', stopOpacity: 0 }),
          h('stop', { offset: 0.5, stopColor: '#f4a99a', stopOpacity: 0.85 }),
          h('stop', { offset: 1, stopColor: '#f4a99a', stopOpacity: 0 })
        ),
        h('clipPath', { id: 'profile-cut' }, h('rect', { x: 0, y: 0, width: CUT, height: 352 })),
        h('clipPath', { id: 'profile-ground' }, h('path', { d: `M${pathOf(TERRAIN)} L${RIGHT} ${BASE} L${LEFT} ${BASE} Z` }))
      ),
      h('rect', { width: 1000, height: 352, fill: '#fbfbfb' }),
      h('g', { clipPath: 'url(#profile-cut)' },

      // ground, then the pale body of the high ground inside it
      h('path', { d: `M${pathOf(TERRAIN)} L${RIGHT} ${BASE} L${LEFT} ${BASE} Z`, fill: '#c2c2c2' }),
      h('g', { clipPath: 'url(#profile-ground)' },
        h('path', { d: `M${pathOf(TERRAIN.slice(LA, LB + 1))} C${(TERRAIN[LB][0] - 50).toFixed(1)} ${BASE + 50} ${(TERRAIN[LA][0] + 50).toFixed(1)} ${BASE + 50} ${TERRAIN[LA][0].toFixed(1)} ${TERRAIN[LA][1].toFixed(1)} Z`, fill: '#e7e7e7' }),
        // pale shoreline deposit by the first river
        h('path', { d: `M${river1[0] - 70} ${river1[1] + 6} L${river1[0] + 52} ${river1[1] + 4} L${river1[0] + 18} ${river1[1] + 40} L${river1[0] - 36} ${river1[1] + 34} Z`, fill: '#f7f0b3' })
      ),
      // layer boundaries, dotted
      h('path', { d: `M${TERRAIN[LB][0].toFixed(1)} ${TERRAIN[LB][1].toFixed(1)} C${(TERRAIN[LB][0] - 50).toFixed(1)} ${BASE + 50} ${(TERRAIN[LA][0] + 50).toFixed(1)} ${BASE + 50} ${TERRAIN[LA][0].toFixed(1)} ${TERRAIN[LA][1].toFixed(1)}`, ...dot, clipPath: 'url(#profile-ground)' }),
      h('path', { d: `M${LEFT + 20} ${at(0.03)[1] + 22} Q${LEFT + 110} ${BASE - 40} ${LEFT + 250} ${BASE}`, ...dot }),
      h('path', { d: `M${(peak[0] + 20).toFixed(1)} ${(peak[1] + 22).toFixed(1)} Q${(peak[0] + 200).toFixed(1)} ${BASE - 30} ${RIGHT - 36} ${at(0.93)[1] + 4}`, ...dot }),
      h('path', { d: `M${(peak[0] - 130).toFixed(1)} ${(at(peakT - 0.1)[1] + 16).toFixed(1)} Q${(peak[0] - 20).toFixed(1)} ${BASE - 20} ${(peak[0] + 150).toFixed(1)} ${BASE - 6}`, ...dot }),
      // faults
      [0.15, 0.255, 0.43, 0.68, 0.745, 0.87].map((t, k) => fault(t, k % 2 ? -0.14 : 0.18, `f${k}`)),
      // outline of the ground
      h('path', { d: `M${pathOf(TERRAIN)}`, fill: 'none', stroke: '#5f5d35', strokeWidth: 1.3, strokeLinejoin: 'round' }),
      // the frame and its ticks
      h('rect', { x: LEFT, y: TOP, width: RIGHT - LEFT, height: BASE - TOP, fill: 'none', stroke: INK, strokeWidth: 1 }),
      ticks,
      Array.from({ length: 8 }, (_, k) => {
        const x = LEFT + ((RIGHT - LEFT) * k) / 7
        return h('path', { key: `tx${k}`, d: `M${x} ${TOP}v9M${x} ${BASE}v-9`, stroke: INK, strokeWidth: 0.8 })
      }),
      // rivers
      h('ellipse', { cx: river1[0], cy: river1[1] + 2, rx: 14, ry: 5, fill: '#3a56b7' }),
      text(river1[0] + 62, river1[1] - 70, 'Mibal', { fill: '#3a56b7', anchor: 'middle', size: 15 }),
      text(river1[0] + 62, river1[1] - 53, 'River', { fill: '#3a56b7', anchor: 'middle', size: 15 }),
      h('path', { d: `M${river1[0] + 64} ${river1[1] - 44} C${river1[0] + 66} ${river1[1] - 22} ${river1[0] + 36} ${river1[1] - 6} ${river1[0] + 16} ${river1[1] - 1}`, fill: 'none', stroke: '#3a56b7', strokeWidth: 1 }),
      arrowHead(river1[0] + 14, river1[1] - 1, 150, 6, '#3a56b7'),
      h('ellipse', { cx: river2[0], cy: river2[1] + 2, rx: 12, ry: 4.5, fill: '#3a56b7' }),
      text(river2[0] - 8, river2[1] - 40, 'Hearth', { fill: '#3a56b7', anchor: 'middle', size: 15 }),
      text(river2[0] - 8, river2[1] - 23, 'River', { fill: '#3a56b7', anchor: 'middle', size: 15 }),
      // wells and their names
      well(0.188, 26, 'w1'),
      well(0.222, 22, 'w2'),
      well(0.325, 30, 'w3'),
      well(0.372, 84, 'w4'),
      well(peakT, 140, 'w5'),
      well(0.905, 18, 'w6'),
      text(at(0.372)[0] + 70, at(0.372)[1] + 62, 'EH-1', { size: 15 }),
      h('path', { d: `M${at(0.372)[0] + 64} ${at(0.372)[1] + 58} C${at(0.372)[0] + 44} ${at(0.372)[1] + 62} ${at(0.372)[0] + 24} ${at(0.372)[1] + 56} ${at(0.372)[0] + 12} ${at(0.372)[1] + 48}`, fill: 'none', stroke: INK, strokeWidth: 0.9 }),
      arrowHead(at(0.372)[0] + 11, at(0.372)[1] + 47, 215, 6),
      text(peak[0], peak[1] - 10, 'MH 77-24', { anchor: 'middle', size: 16 }),
      // stations
      [[peakT - 0.1, 'SMF', -2], [peakT + 0.05, 'BLC', 8]].map(([t, label], k) => {
        const [x, y] = at(t)
        return h('g', { key: `s${k}` },
          h('path', { d: `M${(x - 9).toFixed(1)} ${(y + 7).toFixed(1)} L${x.toFixed(1)} ${(y - 9).toFixed(1)} L${(x + 9).toFixed(1)} ${(y + 7).toFixed(1)} Z`, fill: '#111' }),
          text(x + (k ? 14 : -6), y + (k ? -2 : -14), label, { size: 16, anchor: k ? 'start' : 'end' })
        )
      }),
      // legend and scale, kept to the few things that matter
      h('g', null,
        h('rect', { x: 96, y: TOP + 12, width: 16, height: 16, fill: '#e7e7e7', stroke: '#8a8a8a', strokeWidth: 0.8 }),
        text(120, TOP + 25, 'Highland', { size: 15 }),
        h('rect', { x: 236, y: TOP + 12, width: 16, height: 16, fill: '#a7a7a7', stroke: '#8a8a8a', strokeWidth: 0.8 }),
        text(260, TOP + 25, 'Lowland', { size: 15 }),
        h('path', { d: `M366 ${TOP + 20}h22`, stroke: '#d9262c', strokeWidth: 2.4 }),
        text(396, TOP + 25, 'Visit point', { size: 15 }),
        h('path', { d: `M96 ${TOP + 52}H176`, stroke: '#111', strokeWidth: 3 }),
        text(186, TOP + 57, '1,000 km', { size: 15 })
      ),

      // ---- the strip below
      h('rect', { x: LEFT, y: LOW_TOP, width: RIGHT - LEFT, height: LOW_BASE - LOW_TOP, fill: '#fbfbfb', stroke: INK, strokeWidth: 1 }),
      h('rect', { x: LEFT + 1, y: LOW_TOP + 27, width: RIGHT - LEFT - 2, height: 28, fill: 'url(#profile-band)' }),
      h('path', { d: `M${pathOf(LOW)}`, fill: 'none', stroke: '#2e7b4d', strokeWidth: 1.7, strokeLinejoin: 'round' }),
      lows,
      Array.from({ length: 8 }, (_, k) => {
        const x = LEFT + ((RIGHT - LEFT) * k) / 7
        return h('path', { key: `bx${k}`, d: `M${x} ${LOW_TOP}v9M${x} ${LOW_BASE}v-9`, stroke: INK, strokeWidth: 0.8 })
      }),
      text(LEFT + 20, LOW_TOP + 46, 'West Coast', { size: 19, weight: 500 }),
      text(LEFT + (RIGHT - LEFT) * 0.25, LOW_TOP + 69, 'State shift', { size: 17, fill: '#cf5a2b', anchor: 'middle' }),
      h('path', { d: `M${LEFT + (RIGHT - LEFT) * 0.3} ${LOW_TOP + 60} L${LEFT + (RIGHT - LEFT) * 0.335} ${LOW_TOP + 30}`, stroke: '#cf3a35', strokeWidth: 1 }),
      arrowHead(LEFT + (RIGHT - LEFT) * 0.335, LOW_TOP + 30, -85, 6, '#cf3a35'),
      text(LEFT + (RIGHT - LEFT) * 0.8, LOW_TOP + 70, 'State shift', { size: 17, fill: '#cf5a2b', anchor: 'middle' }),
      h('path', { d: `M${LEFT + (RIGHT - LEFT) * 0.75} ${LOW_TOP + 60} L${LEFT + (RIGHT - LEFT) * 0.69} ${LOW_TOP + 45}`, stroke: '#cf3a35', strokeWidth: 1 }),
      arrowHead(LEFT + (RIGHT - LEFT) * 0.69, LOW_TOP + 45, -110, 6, '#cf3a35'),
      h('path', { d: `M${LEFT + (RIGHT - LEFT) * 0.85} ${LOW_TOP + 60} L${LEFT + (RIGHT - LEFT) * 0.87} ${LOW_TOP + 44}`, stroke: '#cf3a35', strokeWidth: 1 }),
      arrowHead(LEFT + (RIGHT - LEFT) * 0.87, LOW_TOP + 44, -78, 6, '#cf3a35'),
      // longitude
      longitudes.map((label, k) =>
        text(LEFT + ((RIGHT - LEFT) * k) / 7, LOW_BASE + 20, label, { anchor: k === 0 ? 'start' : k === 7 ? 'end' : 'middle', size: 14, key: `lon${k}` })
      ),
      ),
      h('path', { d: `M${CUT} ${TOP}V${BASE}M${CUT} ${LOW_TOP}V${LOW_BASE}`, stroke: INK, strokeWidth: 1 })
    )
  )
}
