// Makes the picture of the room of the second pages and the floor the matches walk on from the supplied plan of the house.
//   node scripts/generate-house-map.mjs <plan.png>
// - public/media/house-map-pixel.png: the plan in its own pixels (1024 x 800), laid in the middle of a 1200 x 900 sheet of the
//   plan's dark outside, so the picture is 4:3 as the room is and drawn 4800 / 1200 = 4 room pixels for each of its pixels
//   (hard squares: image-rendering: pixelated).
// - lib/house-map-walk.mjs: 200 x 150 cells of 6 x 6 pixels of that sheet. A cell is floor when it is nearly all white (or
//   the grey of a door); walls, the house's own walls and stairs, the plants and the dark outside are not. Only the largest
//   connected floor is kept (every place can be reached from every other, through the doors).
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'

const SOURCE = process.argv[2]
if (!SOURCE) throw new Error('usage: node scripts/generate-house-map.mjs <plan.png>')
const SHEET = { width: 1200, height: 900 }
const CELLS = { width: 200, height: 150 }
const CELL = SHEET.width / CELLS.width // 6
const FLOOR_SHARE = 0.75 // a cell is floor when this much of it is floor

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const offsetX = Math.round((SHEET.width - info.width) / 2)
const offsetY = Math.round((SHEET.height - info.height) / 2)
const at = (x, y) => {
  const px = x - offsetX
  const py = y - offsetY
  if (px < 0 || py < 0 || px >= info.width || py >= info.height) return null
  const i = (py * info.width + px) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}
const outside = at(offsetX + 5, offsetY + 5).slice(0, 3)

// ---- the picture ----
const sheet = await sharp({ create: { width: SHEET.width, height: SHEET.height, channels: 3, background: { r: outside[0], g: outside[1], b: outside[2] } } })
  .composite([{ input: await sharp(SOURCE).flatten({ background: { r: outside[0], g: outside[1], b: outside[2] } }).png().toBuffer(), left: offsetX, top: offsetY }])
  .png({ palette: false, compressionLevel: 9 })
  .toBuffer()
writeFileSync('public/media/house-map-pixel.png', sheet)

// ---- the floor ----
const isWhite = ([r, g, b, a]) => a >= 200 && r >= 245 && g >= 245 && b >= 240
// a door is drawn as a thin grey mark in the wall: a cell with some of it is a way through
const isDoor = ([r, g, b, a]) => a >= 200 && Math.abs(r - g) <= 3 && Math.abs(g - b) <= 3 && r >= 185 && r <= 220
const DOOR_SHARE = 0.1
let floor = []
for (let cy = 0; cy < CELLS.height; cy += 1) {
  const row = []
  for (let cx = 0; cx < CELLS.width; cx += 1) {
    let white = 0
    let door = 0
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const p = at(cx * CELL + x, cy * CELL + y)
        if (!p) continue
        if (isWhite(p)) white += 1
        else if (isDoor(p)) door += 1
      }
    }
    row.push((white + door) / (CELL * CELL) >= FLOOR_SHARE || door / (CELL * CELL) >= DOOR_SHARE)
  }
  floor.push(row)
}

// the largest connected floor
const seen = floor.map((row) => row.map(() => false))
let best = []
for (let y = 0; y < CELLS.height; y += 1) {
  for (let x = 0; x < CELLS.width; x += 1) {
    if (!floor[y][x] || seen[y][x]) continue
    const part = []
    const stack = [[x, y]]
    seen[y][x] = true
    while (stack.length) {
      const [px, py] = stack.pop()
      part.push([px, py])
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx
        const ny = py + dy
        if (nx >= 0 && ny >= 0 && nx < CELLS.width && ny < CELLS.height && floor[ny][nx] && !seen[ny][nx]) {
          seen[ny][nx] = true
          stack.push([nx, ny])
        }
      }
    }
    if (part.length > best.length) best = part
  }
}
const keep = floor.map((row) => row.map(() => false))
best.forEach(([x, y]) => {
  keep[y][x] = true
})

// how far each floor cell is from the nearest cell that is not floor (4-neighbour), to put the matches in the open
const far = keep.map((row) => row.map((v) => (v ? Infinity : 0)))
const queue = []
keep.forEach((row, y) => row.forEach((v, x) => { if (!v) queue.push([x, y]) }))
for (let head = 0; head < queue.length; head += 1) {
  const [x, y] = queue[head]
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx
    const ny = y + dy
    if (nx >= 0 && ny >= 0 && nx < CELLS.width && ny < CELLS.height && far[ny][nx] === Infinity) {
      far[ny][nx] = far[y][x] + 1
      queue.push([nx, ny])
    }
  }
}
// the starting places: in the open (4 cells or more from a wall), the first the most open cell of the middle of the house, the
// others as far from the ones before as they can be
const open = []
far.forEach((row, y) => row.forEach((d, x) => { if (d >= 4) open.push({ x, y, d }) }))
const centre = { x: CELLS.width / 2, y: CELLS.height * 0.6 }
const first = open.reduce((a, b) => (b.d - 0.05 * Math.hypot(b.x - centre.x, b.y - centre.y) > a.d - 0.05 * Math.hypot(a.x - centre.x, a.y - centre.y) ? b : a))
const spawn = [first]
while (spawn.length < 6) {
  spawn.push(open.reduce((a, b) => (Math.min(...spawn.map((s) => Math.hypot(s.x - b.x, s.y - b.y))) > Math.min(...spawn.map((s) => Math.hypot(s.x - a.x, s.y - a.y))) ? b : a)))
}

const rows = keep.map((row) => row.map((v) => (v ? '.' : '#')).join(''))
const text = `// GENERATED by scripts/generate-house-map.mjs from the supplied plan of the house (public/media/house-map-pixel.png is the plan
// laid in a 1200 x 900 sheet): the floor is what is white (or the grey of a door) in it; its walls, the house's own walls and
// stairs, its plants and the dark outside are not; then kept to one connected floor, so that every place a match may go can be
// reached from every other, through the doors. One cell is 6 x 6 pixels of the picture: 200 x 150 cells.
// '.' is floor a match may walk on, '#' is not.
export const HOUSE_MAP_WALK_ROWS = [
${rows.map((row) => `  '${row}',`).join('\n')}
]

// where the matches start (in the open, spread over the house), in cells
export const HOUSE_MAP_SPAWN_CELLS = [${spawn.map(({ x, y }) => `{ x: ${x}, y: ${y} }`).join(', ')}]

export const HOUSE_MAP_WALK_WIDTH = HOUSE_MAP_WALK_ROWS[0].length
export const HOUSE_MAP_WALK_HEIGHT = HOUSE_MAP_WALK_ROWS.length

// The map the matches walk on in the room of the second pages, in the shape the room's code reads (see
// createInteriorNavigation): its size in cells and the cells that are not floor. Besides:
// - cellCenter: a match stands in the middle of its cell (the cells are small, so this keeps it off the walls),
// - walkSpeed: cells a second, so a match walks as fast on the screen as it did on the earlier room (2.2 of its
//   64 cells a second, there 3983 pixels wide; here 200 cells over 4800 pixels),
// - spawnCells: where the matches of the room start; startCell: where a match that is added starts;
// - overviewFocus: what the camera looks at while it follows no match (the first starting place, in the open middle of the house).
const collision = []
HOUSE_MAP_WALK_ROWS.forEach((row, y) => {
  for (let x = 0; x < row.length; x += 1) if (row[x] !== '.') collision.push({ x, y })
})

export const HOUSE_MAP_WALK = Object.freeze({
  width: HOUSE_MAP_WALK_WIDTH,
  height: HOUSE_MAP_WALK_HEIGHT,
  collision,
  cellCenter: 0.5,
  walkSpeed: (2.2 * 3983) / 64 / (4800 / HOUSE_MAP_WALK_WIDTH),
  spawnCells: HOUSE_MAP_SPAWN_CELLS,
  startCell: HOUSE_MAP_SPAWN_CELLS[0],
  overviewFocus: { x: ${first.x}, y: ${first.y} },
})
`
writeFileSync('lib/house-map-walk.mjs', text)
console.log('sheet', SHEET.width, 'x', SHEET.height, 'offset', offsetX, offsetY, 'outside', outside)
console.log('floor cells', floor.flat().filter(Boolean).length, 'kept (largest connected)', best.length)
console.log('spawn', spawn.map(({ x, y, d }) => `${x}:${y}(d${d})`).join(' '))
