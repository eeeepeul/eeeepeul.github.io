// The heat laid over the aerial picture of cell 2: a thermal-camera look like a density map (a dark
// blue edge, a wide green haze, yellow, then orange and red-orange cores that run together) over the
// four houses of the picture. Positions are fractions of the picture's width and height (the picture
// is 1610 x 977), so the heat always sits on the same houses however the picture is fitted and zoomed.
//
// The heat is a sum of soft round hot spots that flow about the houses: each house has a wide faint
// one and three cores, and two bigger warm patches roam up and down between the houses. Every one
// moves along a looping path of its own (two slow swings added together, so the path is never a
// plain circle), and swells and fades at its own pace, so the blobs drift, run into each other and
// part again, and at any moment only parts of the houses are hot.
export const HEAT_ASPECT = 977 / 1610

// the four houses, as the picture shows them (the small shed below them is left out)
const HOUSES = [
  [0.444, 0.281],
  [0.463, 0.502],
  [0.537, 0.527],
  [0.494, 0.655],
]

const series = (seed) => {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

const SPOTS = (() => {
  const next = series(7121)
  const spots = []
  HOUSES.forEach(([x, y]) => {
    spots.push({ x, y, sigma: 0.05, amp: 0.3, wanderX: 0.012, wanderY: 0.016, speed: 0.16, swell: 0.3, phase: next() * 6.28 })
    for (let k = 0; k < 3; k += 1) {
      spots.push({
        x: x + (next() - 0.5) * 0.03,
        y: y + (next() - 0.5) * 0.04,
        sigma: 0.016 + next() * 0.014,
        amp: 0.45 + next() * 0.55,
        wanderX: 0.012 + next() * 0.018,
        wanderY: 0.016 + next() * 0.026,
        speed: 0.2 + next() * 0.4,
        swell: 0.5 + next() * 0.45,
        phase: next() * 6.28,
      })
    }
  })
  // warm patches that roam up and down the row of houses
  spots.push({ x: 0.485, y: 0.47, sigma: 0.034, amp: 0.55, wanderX: 0.035, wanderY: 0.15, speed: 0.13, swell: 0.4, phase: 1.3 })
  spots.push({ x: 0.5, y: 0.5, sigma: 0.028, amp: 0.5, wanderX: 0.03, wanderY: 0.13, speed: 0.17, swell: 0.5, phase: 4.1 })
  return spots
})()

// how hot it is at a place and a moment, from 0 (cold) upwards; about 1 is the hottest
export function heatAt(x, y, time) {
  let total = 0
  for (let i = 0; i < SPOTS.length; i += 1) {
    const spot = SPOTS[i]
    const around = time * spot.speed + spot.phase
    // a looping path that is never a plain circle: two swings of different lengths added together
    const cx = spot.x + spot.wanderX * (Math.cos(around) + 0.5 * Math.cos(1.7 * around + 2.1))
    const cy = spot.y + spot.wanderY * (Math.sin(around * 0.83 + 1.1) + 0.5 * Math.sin(1.3 * around + 0.7))
    const dx = x - cx
    const dy = (y - cy) * HEAT_ASPECT
    const reach = spot.sigma * 3.4
    if (dx > reach || dx < -reach || dy > reach || dy < -reach) continue
    const breathe = 0.72 + 0.28 * Math.sin(around * 1.3 + spot.phase * 2)
    const strength = spot.amp * (1 - spot.swell * 0.5 + spot.swell * 0.5 * breathe)
    total += strength * Math.exp(-(dx * dx + dy * dy) / (2 * spot.sigma * spot.sigma))
  }
  // soften the top end so the hottest places are red but not everything round them
  return 1.05 * (1 - Math.exp(-total * 1.1))
}

// the colour of a heat: blue, cyan, green, yellow, orange, red, more solid as it gets hotter
const STOPS = [
  [0.0, 25, 40, 170],
  [0.14, 35, 80, 215],
  [0.28, 40, 150, 195],
  [0.42, 95, 200, 80],
  [0.55, 185, 225, 60],
  [0.68, 250, 220, 50],
  [0.83, 250, 140, 35],
  [1.0, 232, 55, 35],
]

export function heatColor(heat) {
  const t = Math.max(0, Math.min(1, heat))
  let r = STOPS[STOPS.length - 1][1]
  let g = STOPS[STOPS.length - 1][2]
  let b = STOPS[STOPS.length - 1][3]
  for (let i = 1; i < STOPS.length; i += 1) {
    if (t <= STOPS[i][0]) {
      const a = STOPS[i - 1]
      const c = STOPS[i]
      const f = (t - a[0]) / (c[0] - a[0])
      r = a[1] + (c[1] - a[1]) * f
      g = a[2] + (c[2] - a[2]) * f
      b = a[3] + (c[3] - a[3]) * f
      break
    }
  }
  const edge = Math.max(0, Math.min(1, (heat - 0.03) / 0.3))
  const alpha = edge * edge * (3 - 2 * edge) * 0.9
  return [r, g, b, alpha]
}
