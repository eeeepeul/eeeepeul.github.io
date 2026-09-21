const freezeDeep = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(freezeDeep)
  return Object.freeze(value)
}

export const HOUSE_INTERIOR_MAP_WIDTH = 64
export const HOUSE_INTERIOR_MAP_HEIGHT = 48
export const HOUSE_INTERIOR_TILE_SIZE = 16

export const HOUSE_INTERIOR_LAYER_ORDER = [
  'floor',
  'walls',
  'doors_windows',
  'furniture',
  'decor',
  'collision',
  'spawn_points',
]

export const HOUSE_INTERIOR_ROOMS = freezeDeep({
  main_house: { x: 6, y: 4, width: 52, height: 37 },
  entrance_projection: { x: 24, y: 41, width: 16, height: 7 },
  living_room: { x: 20, y: 14, width: 23, height: 17 },
  bedroom: { x: 7, y: 6, width: 13, height: 13 },
  study_record_room: { x: 43, y: 6, width: 14, height: 13 },
  bathroom: { x: 7, y: 20, width: 10, height: 9 },
  kitchen_dining: { x: 43, y: 21, width: 14, height: 15 },
  quiet_room: { x: 7, y: 30, width: 13, height: 10 },
  entry_hall: { x: 20, y: 31, width: 23, height: 10 },
  entrance: { x: 25, y: 41, width: 14, height: 7 },
})

const roomFloor = (id, room, tileId = 'floor-ivory') => ({
  id,
  tileId,
  ...room,
})

export const HOUSE_INTERIOR_CONNECTIONS = freezeDeep([
  {
    id: 'living-to-bedroom',
    from: 'living_room',
    to: 'bedroom',
    orientation: 'vertical',
    x: 19,
    y: 15,
    width: 4,
    opening: { x: 19, y: 15, width: 2, height: 4 },
  },
  {
    id: 'living-to-study',
    from: 'living_room',
    to: 'study_record_room',
    orientation: 'vertical',
    x: 42,
    y: 15,
    width: 4,
    opening: { x: 42, y: 15, width: 2, height: 4 },
  },
  {
    id: 'living-to-bathroom',
    from: 'living_room',
    to: 'bathroom',
    orientation: 'horizontal',
    x: 17,
    y: 23,
    width: 4,
    opening: { x: 17, y: 23, width: 4, height: 2 },
    wallGaps: [
      { x: 16, y: 23, width: 1, height: 2 },
      { x: 20, y: 23, width: 1, height: 2 },
    ],
  },
  {
    id: 'living-to-kitchen',
    from: 'living_room',
    to: 'kitchen_dining',
    orientation: 'vertical',
    x: 42,
    y: 23,
    width: 4,
    opening: { x: 42, y: 23, width: 2, height: 4 },
  },
  {
    id: 'living-to-entry-hall',
    from: 'living_room',
    to: 'entry_hall',
    orientation: 'horizontal',
    x: 27,
    y: 30,
    width: 9,
    opening: { x: 27, y: 30, width: 9, height: 2 },
  },
  {
    id: 'entry-hall-to-entrance',
    from: 'entry_hall',
    to: 'entrance',
    orientation: 'horizontal',
    x: 29,
    y: 40,
    width: 6,
    opening: { x: 29, y: 40, width: 6, height: 2 },
  },
])

const createPerimeterTiles = (room, roomId) => {
  const tiles = []
  const right = room.x + room.width - 1
  const bottom = room.y + room.height - 1

  for (let x = room.x; x <= right; x += 1) {
    tiles.push({ id: `${roomId}-wall-top-${x}`, tileId: 'wall-horizontal', x, y: room.y, width: 1, height: 1 })
    tiles.push({ id: `${roomId}-wall-bottom-${x}`, tileId: 'wall-horizontal', x, y: bottom, width: 1, height: 1 })
  }
  for (let y = room.y + 1; y < bottom; y += 1) {
    tiles.push({ id: `${roomId}-wall-left-${y}`, tileId: 'wall-vertical', x: room.x, y, width: 1, height: 1 })
    tiles.push({ id: `${roomId}-wall-right-${y}`, tileId: 'wall-vertical', x: right, y, width: 1, height: 1 })
  }
  return tiles
}

const wallKey = (x, y) => `${x}:${y}`

const connectionWallKeys = HOUSE_INTERIOR_CONNECTIONS.flatMap(({ opening, wallGaps = [] }) => {
  const cells = []
  for (const gap of [opening, ...wallGaps]) {
    for (let x = gap.x; x < gap.x + gap.width; x += 1) {
      for (let y = gap.y; y < gap.y + gap.height; y += 1) {
        cells.push(wallKey(x, y))
      }
    }
  }
  return cells
})

const connectionWallKeySet = new Set(connectionWallKeys)

const wallTiles = Object.entries(HOUSE_INTERIOR_ROOMS).flatMap(([roomId, room]) =>
  createPerimeterTiles(room, roomId)
)

export const HOUSE_INTERIOR_WALL_TILES = freezeDeep(
  wallTiles.filter(({ x, y }) => !connectionWallKeySet.has(wallKey(x, y)))
)

export const HOUSE_INTERIOR_FLOOR_TILES = freezeDeep([
  roomFloor('main-house-floor', HOUSE_INTERIOR_ROOMS.main_house, 'floor-ivory'),
  roomFloor('entrance-floor', HOUSE_INTERIOR_ROOMS.entrance_projection, 'floor-cool'),
  { id: 'bathroom-connector-floor', tileId: 'floor-cool', x: 17, y: 23, width: 4, height: 2 },
  { id: 'living-bedroom-threshold', tileId: 'floor-cool', x: 19, y: 15, width: 2, height: 4 },
  { id: 'living-study-threshold', tileId: 'floor-cool', x: 42, y: 15, width: 2, height: 4 },
  { id: 'living-kitchen-threshold', tileId: 'floor-cool', x: 42, y: 23, width: 2, height: 4 },
  { id: 'living-entry-threshold', tileId: 'floor-cool', x: 27, y: 30, width: 9, height: 2 },
  { id: 'entrance-threshold', tileId: 'floor-cool', x: 29, y: 40, width: 6, height: 2 },
])

export const HOUSE_INTERIOR_DOOR_WINDOW_TILES = freezeDeep([
  { id: 'bedroom-door', tileId: 'door-blue', x: 19, y: 15, width: 2, height: 4 },
  { id: 'study-door', tileId: 'door-blue', x: 42, y: 15, width: 2, height: 4 },
  { id: 'bathroom-door', tileId: 'door-coral', x: 17, y: 23, width: 4, height: 2 },
  { id: 'kitchen-door', tileId: 'door-blue', x: 42, y: 23, width: 2, height: 4 },
  { id: 'entry-hall-opening', tileId: 'door-blue', x: 27, y: 30, width: 9, height: 2 },
  { id: 'entrance-door', tileId: 'door-coral', x: 29, y: 40, width: 6, height: 2 },
  { id: 'bedroom-window', tileId: 'window-blue', x: 11, y: 5, width: 5, height: 1 },
  { id: 'study-window', tileId: 'window-blue', x: 47, y: 5, width: 6, height: 1 },
  { id: 'quiet-room-window', tileId: 'window-blue', x: 11, y: 39, width: 5, height: 1 },
])

export const HOUSE_INTERIOR_OBJECTS = freezeDeep({
  furniture: [
    { id: 'bedroom-bed', tileId: 'bed', room: 'bedroom', x: 9, y: 8, width: 6, height: 4 },
    { id: 'bedroom-nightstand', tileId: 'nightstand', room: 'bedroom', x: 16, y: 8, width: 2, height: 2 },
    { id: 'living-sofa-a', tileId: 'sofa-blue', room: 'living_room', x: 22, y: 18, width: 7, height: 2 },
    { id: 'living-sofa-b', tileId: 'sofa-blue', room: 'living_room', x: 34, y: 18, width: 7, height: 2 },
    { id: 'living-table', tileId: 'low-table', room: 'living_room', x: 28, y: 22, width: 8, height: 4 },
    { id: 'study-desk', tileId: 'desk', room: 'study_record_room', x: 47, y: 10, width: 7, height: 3 },
    { id: 'study-chair', tileId: 'chair', room: 'study_record_room', x: 49, y: 14, width: 3, height: 2 },
    { id: 'study-bookcase-a', tileId: 'bookcase', room: 'study_record_room', x: 44, y: 8, width: 2, height: 7 },
    { id: 'study-bookcase-b', tileId: 'bookcase', room: 'study_record_room', x: 54, y: 8, width: 2, height: 7 },
    { id: 'bathroom-tub', tileId: 'tub', room: 'bathroom', x: 9, y: 22, width: 5, height: 3 },
    { id: 'bathroom-sink', tileId: 'sink', room: 'bathroom', x: 14, y: 26, width: 2, height: 2 },
    { id: 'kitchen-counter', tileId: 'counter', room: 'kitchen_dining', x: 46, y: 23, width: 9, height: 2 },
    { id: 'kitchen-table', tileId: 'dining-table', room: 'kitchen_dining', x: 47, y: 28, width: 7, height: 4 },
    { id: 'kitchen-chair-a', tileId: 'chair', room: 'kitchen_dining', x: 44, y: 29, width: 2, height: 2 },
    { id: 'kitchen-chair-b', tileId: 'chair', room: 'kitchen_dining', x: 55, y: 29, width: 2, height: 2 },
    { id: 'quiet-sofa', tileId: 'sofa-slate', room: 'quiet_room', x: 9, y: 33, width: 6, height: 2 },
    { id: 'quiet-table', tileId: 'low-table', room: 'quiet_room', x: 15, y: 35, width: 3, height: 2 },
    { id: 'entry-console', tileId: 'console', room: 'entry_hall', x: 36, y: 34, width: 4, height: 2 },
  ],
  decor: [
    { id: 'bedroom-rug', tileId: 'rug-coral', room: 'bedroom', x: 9, y: 14, width: 7, height: 3 },
    { id: 'living-rug', tileId: 'rug-blue', room: 'living_room', x: 25, y: 20, width: 14, height: 9 },
    { id: 'living-lamp', tileId: 'lamp-coral', room: 'living_room', x: 21, y: 25, width: 2, height: 3 },
    { id: 'living-plant', tileId: 'plant', room: 'living_room', x: 39, y: 26, width: 2, height: 3 },
    { id: 'study-lamp', tileId: 'lamp-coral', room: 'study_record_room', x: 52, y: 10, width: 2, height: 2 },
    { id: 'bathroom-mat', tileId: 'rug-blue', room: 'bathroom', x: 8, y: 26, width: 4, height: 2 },
    { id: 'quiet-rug', tileId: 'rug-blue', room: 'quiet_room', x: 10, y: 36, width: 7, height: 2 },
    { id: 'quiet-plant', tileId: 'plant', room: 'quiet_room', x: 8, y: 31, width: 2, height: 3 },
    { id: 'entry-mat', tileId: 'rug-coral', room: 'entry_hall', x: 27, y: 36, width: 7, height: 2 },
    { id: 'entrance-mat', tileId: 'rug-coral', room: 'entrance', x: 28, y: 44, width: 8, height: 2 },
  ],
})

const toCellKey = (x, y) => `${x}:${y}`

const collisionCells = new Set()

HOUSE_INTERIOR_WALL_TILES.forEach(({ x, y }) => collisionCells.add(toCellKey(x, y)))
HOUSE_INTERIOR_OBJECTS.furniture.forEach(({ x, y, width, height }) => {
  for (let tileX = x; tileX < x + width; tileX += 1) {
    for (let tileY = y; tileY < y + height; tileY += 1) {
      collisionCells.add(toCellKey(tileX, tileY))
    }
  }
})

export const HOUSE_INTERIOR_COLLISION_CELLS = freezeDeep(
  [...collisionCells].map((cell) => {
    const [x, y] = cell.split(':').map(Number)
    return { x, y }
  })
)

export const HOUSE_INTERIOR_SPAWN_POINTS = freezeDeep([
  { id: 'living-center', room: 'living_room', x: 31, y: 24 },
  { id: 'entry-hall-center', room: 'entry_hall', x: 31, y: 35 },
  { id: 'entrance-center', room: 'entrance', x: 32, y: 45 },
])

export const HOUSE_INTERIOR_MAP = freezeDeep({
  width: HOUSE_INTERIOR_MAP_WIDTH,
  height: HOUSE_INTERIOR_MAP_HEIGHT,
  tileSize: HOUSE_INTERIOR_TILE_SIZE,
  rooms: HOUSE_INTERIOR_ROOMS,
  connections: HOUSE_INTERIOR_CONNECTIONS,
  layers: {
    floor: HOUSE_INTERIOR_FLOOR_TILES,
    walls: HOUSE_INTERIOR_WALL_TILES,
    doors_windows: HOUSE_INTERIOR_DOOR_WINDOW_TILES,
    furniture: HOUSE_INTERIOR_OBJECTS.furniture,
    decor: HOUSE_INTERIOR_OBJECTS.decor,
  },
  collision: HOUSE_INTERIOR_COLLISION_CELLS,
  spawn_points: HOUSE_INTERIOR_SPAWN_POINTS,
})
