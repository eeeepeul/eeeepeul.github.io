// The people coming to the houses, shared between the radar of cell 7 (where each is a star and MMH on
// a plan) and the aerial picture of cell 2 (where each is a person seen from above, walking to the same
// house). The radar makes them move and tells them here; the picture reads them from here.

// the four houses on the radar's plane (446 x 314 units), in the order of the picture's houses below
export const RADAR_HOUSES = [
  { x: 179, y: 165 },
  { x: 208.7, y: 212.7 },
  { x: 168.7, y: 243 },
  { x: 182.7, y: 258.7 },
]

// the same four houses in the aerial picture (1610 x 977), as fractions of its width and height
export const PICTURE_HOUSES = [
  [0.444, 0.281],
  [0.463, 0.502],
  [0.537, 0.527],
  [0.494, 0.655],
]

export const PICTURE_WIDTH = 1610
export const PICTURE_HEIGHT = 977
// how many pixels of the picture a unit of the radar's plane is: so a person who is 100 units from the
// house on the radar is 600 pixels from it in the picture (the same direction, north up)
export const PIXELS_PER_UNIT = 6

let people = []

export function publishPeople(list) {
  people = list
}

export function getPeople() {
  return people
}

// the houses are not to be walked over: a house is a disc of this radius (picture pixels) round its middle
// (they are about 110 pixels across); a person walks round the houses that are not their own, and is gone
// as they reach the edge of their own
export const HOUSE_RADIUS = 56
const HOUSE_MARGIN = 6 // the space kept between a person and a house they walk round
const ARRIVE_FADE = 14 // the last stretch before the roof, over which a person fades out

// where a person of the radar is in the picture (pixels), the way they face (radians, 0 = to the right,
// turning clockwise as the picture's y runs down) and how much of them is there (0 to 1)
export function inPicture(person) {
  const radarHouse = RADAR_HOUSES[person.house]
  const [hx, hy] = PICTURE_HOUSES[person.house]
  const houseX = hx * PICTURE_WIDTH
  const houseY = hy * PICTURE_HEIGHT
  const dx = (person.x - radarHouse.x) * PIXELS_PER_UNIT
  const dy = (person.y - radarHouse.y) * PIXELS_PER_UNIT
  let x = houseX + dx
  let y = houseY + dy
  let alpha = Math.max(0, Math.min(1, person.alpha))
  // go round the other houses (twice, for the places where two houses stand close)
  for (let pass = 0; pass < 2; pass += 1) {
    PICTURE_HOUSES.forEach(([ox, oy], k) => {
      if (k === person.house) return
      const cx = ox * PICTURE_WIDTH
      const cy = oy * PICTURE_HEIGHT
      const away = Math.hypot(x - cx, y - cy)
      const keep = HOUSE_RADIUS + HOUSE_MARGIN
      if (away < keep) {
        // pushed out to the edge along the line from the house's middle: a smooth way round
        const ux = away > 0.001 ? (x - cx) / away : 1
        const uy = away > 0.001 ? (y - cy) / away : 0
        x = cx + ux * keep
        y = cy + uy * keep
      }
    })
  }
  // and never over their own: they are gone as they come to its edge
  const own = Math.hypot(x - houseX, y - houseY)
  const reach = Math.max(0, Math.min(1, (own - HOUSE_RADIUS) / ARRIVE_FADE))
  alpha *= reach * reach * (3 - 2 * reach)
  return { x, y, heading: Math.atan2(-dy, -dx), alpha }
}

// ---- the walk, followed from frame to frame (shared by the two pictures of the people) ----
const STEP_LENGTH = 11 // the distance between two footprints of a walker, in picture pixels
const STEP_SIDE = 2.6 // how far a footprint lies to the side of the way, alternately left and right
const PRINT_LIFE = 9000 // how long a footprint stays, in ms; they go in the order they were made
const FADE_OUT = 1800 // the last part of that, over which a footprint fades
const MAX_PRINTS = 260

const tracks = new Map()
let places = []
let prints = []
let lastNow = -1

const turn = (from, to, amount) => {
  let difference = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  if (difference > Math.PI) difference -= Math.PI * 2
  return from + difference * amount
}

// call once a frame with the clock (more than once in the same frame does nothing)
export function trackPeople(now) {
  if (now === lastNow) return
  lastNow = now
  const seen = new Set()
  places = []
  getPeople().forEach((person) => {
    const place = inPicture(person)
    seen.add(person.id)
    let track = tracks.get(person.id)
    if (!track) {
      track = { x: place.x, y: place.y, heading: place.heading, travelled: STEP_LENGTH * 0.5, side: person.id % 2 ? 1 : -1 }
      tracks.set(person.id, track)
    }
    // face the way the person actually goes (round the houses too), not just to their own house
    const moved = Math.hypot(place.x - track.x, place.y - track.y)
    if (moved > 0.05) {
      track.heading = turn(track.heading, Math.atan2(place.y - track.y, place.x - track.x), 0.4)
      track.travelled += moved
      if (track.travelled >= STEP_LENGTH && place.alpha > 0.35) {
        track.travelled -= STEP_LENGTH
        track.side = -track.side
        // a footprint, to the left or right of the way (the walker faces `heading`)
        const sx = -Math.sin(track.heading) * STEP_SIDE * track.side
        const sy = Math.cos(track.heading) * STEP_SIDE * track.side
        prints.push({ x: place.x + sx, y: place.y + sy, heading: track.heading, born: now })
      }
    }
    track.x = place.x
    track.y = place.y
    places.push({ id: person.id, x: place.x, y: place.y, heading: track.heading, alpha: place.alpha })
  })
  tracks.forEach((_, id) => {
    if (!seen.has(id)) tracks.delete(id)
  })
  // the oldest footprints go first
  while (prints.length && (now - prints[0].born > PRINT_LIFE || prints.length > MAX_PRINTS)) prints.shift()
}

export function getPlaces() {
  return places
}

// the footprints, oldest first, each with how much of it is left (0 to 1)
export function getPrints(now) {
  return prints.map((print) => ({ ...print, alpha: Math.max(0, Math.min(1, (PRINT_LIFE - (now - print.born)) / FADE_OUT)) }))
}
