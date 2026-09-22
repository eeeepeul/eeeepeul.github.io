const cellKey = (x, y) => `${x}:${y}`

const normalizeCoordinate = (value, fallback = 0) =>
  Number.isFinite(value) ? Math.round(value) : fallback

const clampRandom = (random) => {
  const value = Number(random?.())
  if (!Number.isFinite(value)) return 0
  return Math.min(0.999999, Math.max(0, value))
}

const neighbors = (x, y) => [
  { x: x + 1, y },
  { x: x - 1, y },
  { x, y: y + 1 },
  { x, y: y - 1 },
]

const normalizeMapSize = (value, fallback) =>
  Number.isInteger(value) && value > 0 ? value : fallback

const findNearestWalkable = (navigation, point) => {
  if (navigation.isWalkable(point.x, point.y)) return point

  for (let radius = 1; radius <= Math.max(navigation.width, navigation.height); radius += 1) {
    for (const candidate of [
      { x: point.x - radius, y: point.y },
      { x: point.x + radius, y: point.y },
      { x: point.x, y: point.y - radius },
      { x: point.x, y: point.y + radius },
    ]) {
      if (navigation.isWalkable(candidate.x, candidate.y)) return candidate
    }
  }

  return { x: 0, y: 0 }
}

export function createInteriorNavigation(map = {}) {
  const width = normalizeMapSize(map.width, 1)
  const height = normalizeMapSize(map.height, 1)
  const blocked = new Set(
    (map.collision ?? [])
      .filter(({ x, y }) => Number.isInteger(x) && Number.isInteger(y))
      .map(({ x, y }) => cellKey(x, y))
  )
  const walkableCells = []

  const isInBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height
  const isWalkable = (x, y) =>
    Number.isInteger(x) && Number.isInteger(y) && isInBounds(x, y) && !blocked.has(cellKey(x, y))

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isWalkable(x, y)) walkableCells.push({ x, y })
    }
  }

  const findPath = (startPoint, goalPoint) => {
    const start = {
      x: normalizeCoordinate(startPoint?.x),
      y: normalizeCoordinate(startPoint?.y),
    }
    const goal = {
      x: normalizeCoordinate(goalPoint?.x),
      y: normalizeCoordinate(goalPoint?.y),
    }

    if (!isWalkable(start.x, start.y) || !isWalkable(goal.x, goal.y)) return []

    const startKey = cellKey(start.x, start.y)
    const goalKey = cellKey(goal.x, goal.y)
    const previous = new Map([[startKey, null]])
    const queue = [start]
    let queueIndex = 0

    while (queueIndex < queue.length) {
      const current = queue[queueIndex]
      queueIndex += 1
      const currentKey = cellKey(current.x, current.y)
      if (currentKey === goalKey) break

      for (const next of neighbors(current.x, current.y)) {
        const nextKey = cellKey(next.x, next.y)
        if (!isWalkable(next.x, next.y) || previous.has(nextKey)) continue
        previous.set(nextKey, currentKey)
        queue.push(next)
      }
    }

    if (!previous.has(goalKey)) return []

    const path = []
    let currentKey = goalKey
    while (currentKey) {
      const [x, y] = currentKey.split(':').map(Number)
      path.unshift({ x, y })
      currentKey = previous.get(currentKey)
    }
    return path
  }

  const resolveWalkableCell = (point = {}) =>
    findNearestWalkable(
      { width, height, isWalkable },
      {
        x: normalizeCoordinate(point.x),
        y: normalizeCoordinate(point.y),
      }
    )

  return {
    width,
    height,
    blocked,
    walkableCells,
    isWalkable,
    resolveWalkableCell,
    findPath,
  }
}

export function createWanderState(position = {}, random = Math.random) {
  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    y: Number.isFinite(position.y) ? position.y : 0,
    path: [],
    target: null,
    random,
  }
}

export function advanceWanderState(
  state,
  navigation,
  deltaSeconds,
  random = state?.random ?? Math.random,
  speed = 2.2
) {
  const nextState = {
    x: Number.isFinite(state?.x) ? state.x : 0,
    y: Number.isFinite(state?.y) ? state.y : 0,
    path: Array.isArray(state?.path) ? state.path.map(({ x, y }) => ({ x, y })) : [],
    target: state?.target ? { ...state.target } : null,
    random,
  }
  const currentCell = findNearestWalkable(navigation, {
    x: normalizeCoordinate(nextState.x),
    y: normalizeCoordinate(nextState.y),
  })

  if (!nextState.path.length) {
    const cells = navigation.walkableCells
    if (cells.length) {
      const target = cells[Math.floor(clampRandom(random) * cells.length)]
      nextState.target = { ...target }
      nextState.path = navigation.findPath(currentCell, target).slice(1)
    }
  }

  let remaining = Math.max(0, Number(deltaSeconds) || 0) * Math.max(0, speed)
  while (remaining > 0 && nextState.path.length) {
    const target = nextState.path[0]
    const dx = target.x - nextState.x
    const dy = target.y - nextState.y
    const distance = Math.hypot(dx, dy)

    if (distance < 0.0001) {
      nextState.x = target.x
      nextState.y = target.y
      nextState.path.shift()
      continue
    }

    const travel = Math.min(remaining, distance)
    nextState.x += (dx / distance) * travel
    nextState.y += (dy / distance) * travel
    remaining -= travel

    if (travel >= distance - 0.0001) {
      nextState.x = target.x
      nextState.y = target.y
      nextState.path.shift()
    }
  }

  if (!nextState.path.length) nextState.target = null
  return nextState
}
