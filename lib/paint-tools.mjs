// The shapes and the fill of the large Paint window (components/site/StagePaint.mjs), kept apart so they can be tested.
// Everything works on whole squares of the board (the drawing pad's 100 x 188 grid).

// The squares of a straight line from (x0, y0) to (x1, y1), both ends included (Bresenham).
export function lineCells(x0, y0, x1, y1) {
  const cells = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let error = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    cells.push([x, y])
    if (x === x1 && y === y1) break
    const doubled = 2 * error
    if (doubled >= dy) {
      error += dy
      x += sx
    }
    if (doubled <= dx) {
      error += dx
      y += sy
    }
  }
  return cells
}

// The squares of a rectangle between two corners: its edge, or all of it.
export function rectCells(x0, y0, x1, y1, filled = false) {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  const cells = []
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (filled || x === left || x === right || y === top || y === bottom) cells.push([x, y])
    }
  }
  return cells
}

// The squares of an ellipse that fits the rectangle between two corners: its edge, or all of it. A square is inside when
// its centre is; the edge is the inside squares that have an outside square (or the border of the rectangle) next to them.
export function ellipseCells(x0, y0, x1, y1, filled = false) {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const rx = (right - left + 1) / 2
  const ry = (bottom - top + 1) / 2
  const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
  const cells = []
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!inside(x, y)) continue
      if (filled || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) cells.push([x, y])
    }
  }
  return cells
}

// Fill the connected squares of one colour with another, in the RGBA data of an image `width` wide (4-neighbour). Returns
// how many squares were filled. The colour of a square is its four bytes; nothing is done when both colours are the same.
export function floodFill(data, width, height, x, y, rgba) {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0
  const at = (px, py) => (py * width + px) * 4
  const start = at(x, y)
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]]
  if (target.every((value, index) => value === rgba[index])) return 0
  const same = (index) =>
    data[index] === target[0] && data[index + 1] === target[1] && data[index + 2] === target[2] && data[index + 3] === target[3]
  const stack = [[x, y]]
  let count = 0
  while (stack.length) {
    const [px, py] = stack.pop()
    if (px < 0 || py < 0 || px >= width || py >= height) continue
    const index = at(px, py)
    if (!same(index)) continue
    data[index] = rgba[0]
    data[index + 1] = rgba[1]
    data[index + 2] = rgba[2]
    data[index + 3] = rgba[3]
    count += 1
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1])
  }
  return count
}

// "#1c1c1c" -> [28, 28, 28, 255]
export function hexToRgba(hex) {
  const value = String(hex).replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16), 255]
}

// The classic 28 colours of the palette of the window (two rows of fourteen).
export const PAINT_PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#4000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#80ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
]
