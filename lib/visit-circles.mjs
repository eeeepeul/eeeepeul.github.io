// The visits to the houses of cell 2's picture, shown as red circles in the pencil-drawn picture
// ('after'), as if the visits were being counted live. There are no real visits behind this: the
// numbers are made up, but they move the way a count does. A crowd of slots each carries a circle
// through its own life: a visit is counted and a small circle is born on or near a house, it swells
// to its size (small for most, large for a few), breathes bigger and smaller as the count there
// changes, then shrinks away; the slot then rests a little or starts over on another house. How
// many slots are in use rises and falls, and so does how popular each house is, so the thick parts
// move from house to house and the whole picture keeps filling and emptying. Everything is
// drawn only eight times a second (posterized time), and at each step every circle is also nudged
// a very little, so the picture moves in small jumps. Positions are fractions of the picture's
// width and height (1610 x 977).
export const VISIT_ASPECT = 977 / 1610

const HOUSES = [
  { x: 0.444, y: 0.281, weight: 0.17 },
  { x: 0.463, y: 0.502, weight: 0.3 },
  { x: 0.537, y: 0.527, weight: 0.33 },
  { x: 0.494, y: 0.655, weight: 0.2 },
]

export const POSTERIZE_FPS = 8 // the picture changes this many times a second
const COUNT = 520
const SHAKE = 1.2 // how far, in picture pixels, a circle is nudged at each step
const BREATHE = 0.045 // how much, as a share of its size, a circle swells or shrinks at each step

// a repeatable run of numbers, so a first picture can be the same on the server and in the browser
export function makeSeries(seed) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

function gaussian(next) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, next()))) * Math.cos(2 * Math.PI * next())
}

// which house the next visit is to, from the houses' own popularity at this moment
function pickHouse(next, time) {
  const weights = HOUSES.map((house, index) => house.weight * (0.65 + 0.35 * Math.sin(time * 0.11 + index * 1.9)))
  let roll = next() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let i = 0; i < HOUSES.length; i += 1) {
    roll -= weights[i]
    if (roll <= 0) return HOUSES[i]
  }
  return HOUSES[HOUSES.length - 1]
}

function visit(next, time) {
  const house = pickHouse(next, time)
  // mostly on the house, now and then wide of it
  const spread = next() < 0.12 ? 0.075 : 0.02
  // size, in the picture's own pixels (1610 wide): many small, a few very large
  const radius = 3 + 95 * Math.pow(next(), 3.4)
  return {
    x: house.x + gaussian(next) * spread,
    y: house.y + (gaussian(next) * spread) / VISIT_ASPECT * 0.6,
    radius,
    wake: next(), // whether this slot takes part in this round, against how busy it is
    rate: 0.7 + next() * 1.6, // how many times it swells and shrinks in its life
    turn: next() * 6.283,
  }
}

// the slots of the crowd: each has a life of its own length, started at its own moment
export function createVisits(seed = 4217) {
  const next = makeSeries(seed)
  return Array.from({ length: COUNT }, () => ({
    seed: Math.floor(next() * 1e9),
    period: 14 + next() * 34, // seconds from one circle's birth to the next
    offset: next() * 60,
    cycle: null, // the round whose circle is held here
    circle: null,
  }))
}

// a number between -1 and 1 that is the same for the same slot at the same step, and unrelated
// from one step to the next (so each step is a fresh small nudge)
function noise(seed, step, lane) {
  let h = Math.imul(seed ^ Math.imul(step + 1, 374761393) ^ Math.imul(lane + 1, 668265263), 2246822519)
  h = Math.imul(h ^ (h >>> 15), 3266489917)
  h ^= h >>> 13
  return ((h >>> 0) / 4294967296) * 2 - 1
}

// the step the picture is at: it holds still for an eighth of a second, then jumps to the next
export function stepAt(seconds) {
  return Math.floor(seconds * POSTERIZE_FPS)
}

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// how busy the count is as a whole at a moment, from 0 to 1: it swells and ebbs over a minute or so
function busyness(time) {
  return 0.62 + 0.25 * Math.sin(time * 0.09 + 0.4) + 0.12 * Math.sin(time * 0.23 + 2.2)
}

// the circles of the picture at a step: [x, y, radius, opacity] for each one that exists then
export function circlesAt(slots, step) {
  const time = step / POSTERIZE_FPS
  const busy = busyness(time)
  const out = []
  for (const slot of slots) {
    const t = time + slot.offset
    const cycle = Math.floor(t / slot.period)
    const life = t / slot.period - cycle
    if (slot.cycle !== cycle) {
      slot.cycle = cycle
      slot.circle = visit(makeSeries(slot.seed + Math.imul(cycle, 7919)), time)
    }
    const circle = slot.circle
    // a slot takes part in a round only while the count is busy enough for it
    if (circle.wake > busy + 0.15) continue
    // born small, swells to its size, breathes bigger and smaller, then shrinks away
    const grown = smooth(0, 0.12, life) * (1 - smooth(0.72, 1, life))
    const breathe = 0.7 + 0.3 * Math.sin(life * circle.rate * 6.283 * 1.6 + circle.turn)
    const radius = circle.radius * grown * breathe
    if (radius < 0.5) continue
    const shake = circle.radius > 40 ? 1.8 : circle.radius > 14 ? 1.2 : 0.8
    // the large circles are fainter, so they do not hide the small ones inside them
    const solid = circle.radius > 40 ? 0.62 : circle.radius > 14 ? 0.78 : 0.92
    out.push([
      circle.x + (noise(slot.seed, step, 0) * SHAKE * shake) / 1610,
      circle.y + (noise(slot.seed, step, 1) * SHAKE * shake) / 977,
      radius * (1 + noise(slot.seed, step, 2) * BREATHE),
      solid * Math.min(1, 0.4 + grown),
    ])
  }
  return out
}
