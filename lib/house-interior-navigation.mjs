const walkableCache = new WeakMap()
const directions = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

const cellKey = (x, y) => `${x}:${y}`

const getWalkableCells = (map) => {
  const cached = walkableCache.get(map)
  if (cached) return cached

  const blocked = new Set((map.collision ?? []).map(({ x, y }) => cellKey(x, y)))
  const floorRegions = map.layers.floor ?? []
  const cells = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const hasFloor = floorRegions.some(
        (region) =>
          x >= region.x &&
          x < region.x + region.width &&
          y >= region.y &&
          y < region.y + region.height
      )
      if (hasFloor && !blocked.has(cellKey(x, y))) cells.push({ x, y })
    }
  }
  walkableCache.set(map, cells)
  return cells
}

export function isWalkableCell(x, y, map) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false
  return getWalkableCells(map).some((cell) => cell.x === x && cell.y === y)
}

const normalizeCell = (position) => ({
  x: Math.floor(position.x),
  y: Math.floor(position.y),
})

export function findInteriorPath(start, end, map) {
  const startCell = normalizeCell(start)
  const endCell = normalizeCell(end)
  if (!isWalkableCell(startCell.x, startCell.y, map)) return []
  if (!isWalkableCell(endCell.x, endCell.y, map)) return []

  const startKey = cellKey(startCell.x, startCell.y)
  const endKey = cellKey(endCell.x, endCell.y)
  const queue = [startCell]
  const visited = new Set([startKey])
  const previous = new Map()

  while (queue.length) {
    const current = queue.shift()
    const currentKey = cellKey(current.x, current.y)
    if (currentKey === endKey) {
      const path = []
      let cursor = currentKey
      while (cursor) {
        const [x, y] = cursor.split(':').map(Number)
        path.unshift({ x, y })
        cursor = previous.get(cursor)
      }
      return path
    }

    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      const nextKey = cellKey(next.x, next.y)
      if (visited.has(nextKey) || !isWalkableCell(next.x, next.y, map)) continue
      visited.add(nextKey)
      previous.set(nextKey, currentKey)
      queue.push(next)
    }
  }

  return []
}

const randomCell = (map, random) => {
  const cells = getWalkableCells(map)
  return cells[Math.floor(random() * cells.length)] ?? cells[0]
}

const createTargetPath = (position, map, random) => {
  const start = normalizeCell(position)
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const target = randomCell(map, random)
    if (!target || (target.x === start.x && target.y === start.y)) continue
    const fullPath = findInteriorPath(start, target, map)
    if (fullPath.length > 1) return fullPath.slice(1)
  }
  return []
}

const positionForCell = (cell) => ({ x: cell.x + 0.5, y: cell.y + 0.5 })

export function createInteriorNavigator({ start, map, random = Math.random }) {
  const startCell = isWalkableCell(Math.floor(start.x), Math.floor(start.y), map)
    ? normalizeCell(start)
    : randomCell(map, random)
  const position = positionForCell(startCell)
  return {
    x: position.x,
    y: position.y,
    path: createTargetPath(position, map, random),
    pathIndex: 0,
    speed: 1.8 + random() * 0.9,
    wait: 0,
  }
}

export function advanceInteriorNavigator(state, deltaSeconds, map, random = Math.random) {
  const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0
  const next = { ...state }
  let remaining = delta

  while (remaining > 0) {
    if (next.wait > 0) {
      const waitTime = Math.min(next.wait, remaining)
      next.wait -= waitTime
      remaining -= waitTime
      continue
    }

    if (next.pathIndex >= next.path.length) {
      next.path = createTargetPath({ x: next.x, y: next.y }, map, random)
      next.pathIndex = 0
      if (!next.path.length) {
        next.wait = 0.35 + random() * 0.65
        continue
      }
    }

    const waypoint = positionForCell(next.path[next.pathIndex])
    const dx = waypoint.x - next.x
    const dy = waypoint.y - next.y
    const distance = Math.hypot(dx, dy)
    const step = next.speed * remaining

    if (distance <= step) {
      next.x = waypoint.x
      next.y = waypoint.y
      next.pathIndex += 1
      remaining -= distance / next.speed
      if (next.pathIndex >= next.path.length) next.wait = 0.25 + random() * 0.75
      continue
    }

    next.x += (dx / distance) * step
    next.y += (dy / distance) * step
    remaining = 0
  }

  return next
}
