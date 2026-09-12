export const HOUSE_MAP_ZOOM_LEVELS = [1, 10, 25, 50, 75, 100]

export const HOUSE_MAP_POINTS = [
  { id: 'house1', x: 159, y: 34 },
  { id: 'house2', x: 175, y: 41 },
  { id: 'house3', x: 164, y: 51 },
  { id: 'house4', x: 186, y: 58 },
]

export const HOUSE_MAP_FOCUS = { x: 171, y: 46 }

const MAP_CENTER_X = 143.5
const MAP_CENTER_Y = 90
const MAP_VIEWBOX_WIDTH = 287
const MAP_VIEWBOX_HEIGHT = 180

function roundMapValue(value) {
  const rounded = Number(Number(value).toFixed(4))
  return Object.is(rounded, -0) ? 0 : rounded
}

function normalizeHouseIndex(index) {
  const count = HOUSE_MAP_POINTS.length
  const numericIndex = Math.floor(Number(index) || 0)
  return ((numericIndex % count) + count) % count
}

function normalizeZoom(zoom) {
  const numericZoom = Number(zoom)
  if (!Number.isFinite(numericZoom)) return HOUSE_MAP_ZOOM_LEVELS[0]

  return HOUSE_MAP_ZOOM_LEVELS.reduce((closest, level) =>
    Math.abs(level - numericZoom) < Math.abs(closest - numericZoom) ? level : closest
  )
}

export function clampHouseMapZoom(zoom) {
  const numericZoom = Number(zoom)
  if (!Number.isFinite(numericZoom)) return HOUSE_MAP_ZOOM_LEVELS[0]

  return roundMapValue(Math.max(HOUSE_MAP_ZOOM_LEVELS[0], Math.min(100, numericZoom)))
}

export function changeHouseMapZoom(zoom, direction) {
  return clampHouseMapZoom(clampHouseMapZoom(zoom) + Math.sign(Number(direction) || 0) * 8)
}

export function changeHouseMapZoomByWheel(zoom, deltaY) {
  return changeHouseMapZoom(zoom, Math.sign(Number(deltaY) || 0))
}

export function getHouseMapRoutes(distances, houseIndex = 0) {
  const selectedIndex = normalizeHouseIndex(houseIndex)
  const safeDistances = Array.isArray(distances) ? distances : []

  return HOUSE_MAP_POINTS.map((from, index) => {
    const to = HOUSE_MAP_POINTS[(index + 1) % HOUSE_MAP_POINTS.length]

    return {
      distance: Number(safeDistances[index]) || 0,
      from,
      id: `${from.id}-${to.id}`,
      isSelected: index === selectedIndex,
      to,
    }
  })
}

export function getHouseMapContentBounds(visitRadii = {}) {
  return HOUSE_MAP_POINTS.reduce(
    (bounds, house) => {
      const numericRadius = Number(visitRadii?.[house.id])
      const radius = Number.isFinite(numericRadius) && numericRadius >= 0 ? numericRadius : 0

      return {
        minX: Math.min(bounds.minX, house.x - radius),
        maxX: Math.max(bounds.maxX, house.x + radius),
        minY: Math.min(bounds.minY, house.y - radius),
        maxY: Math.max(bounds.maxY, house.y + radius),
      }
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  )
}

function getHouseMapScale(zoom) {
  const normalizedZoom = clampHouseMapZoom(zoom)
  return roundMapValue(1 + ((normalizedZoom - 1) / 99) * 3)
}

function getAxisPanBounds({ contentMin, contentMax, focus, scale, viewportCenter, viewportSize }) {
  const transformedMin = viewportCenter + scale * (contentMin - focus)
  const transformedMax = viewportCenter + scale * (contentMax - focus)

  if (transformedMax - transformedMin <= viewportSize) {
    const centeredPan = roundMapValue(
      viewportSize / 2 - (transformedMin + transformedMax) / 2
    )
    return { min: centeredPan, max: centeredPan }
  }

  return {
    min: roundMapValue(viewportSize - transformedMax),
    max: roundMapValue(-transformedMin),
  }
}

export function getHouseMapPanBounds(houseIndex = 0, zoom = 1, visitRadii = {}) {
  const normalizedZoom = normalizeZoom(zoom)
  if (normalizedZoom === HOUSE_MAP_ZOOM_LEVELS[0]) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  const selectedIndex = normalizeHouseIndex(houseIndex)
  const from = HOUSE_MAP_POINTS[selectedIndex]
  const to = HOUSE_MAP_POINTS[(selectedIndex + 1) % HOUSE_MAP_POINTS.length]
  const focusX = (from.x + to.x) / 2
  const focusY = (from.y + to.y) / 2
  const scale = getHouseMapScale(normalizedZoom)
  const contentBounds = getHouseMapContentBounds(visitRadii)
  const xBounds = getAxisPanBounds({
    contentMin: contentBounds.minX,
    contentMax: contentBounds.maxX,
    focus: focusX,
    scale,
    viewportCenter: MAP_CENTER_X,
    viewportSize: MAP_VIEWBOX_WIDTH,
  })
  const yBounds = getAxisPanBounds({
    contentMin: contentBounds.minY,
    contentMax: contentBounds.maxY,
    focus: focusY,
    scale,
    viewportCenter: MAP_CENTER_Y,
    viewportSize: MAP_VIEWBOX_HEIGHT,
  })

  return {
    minX: xBounds.min,
    maxX: xBounds.max,
    minY: yBounds.min,
    maxY: yBounds.max,
  }
}

export function clampHouseMapPan(pan = {}, houseIndex = 0, zoom = 1, visitRadii = {}) {
  const bounds = getHouseMapPanBounds(houseIndex, zoom, visitRadii)

  const numericX = Number(pan?.x)
  const numericY = Number(pan?.y)
  const x = Number.isFinite(numericX) ? numericX : 0
  const y = Number.isFinite(numericY) ? numericY : 0

  return {
    x: roundMapValue(Math.max(bounds.minX, Math.min(bounds.maxX, x))),
    y: roundMapValue(Math.max(bounds.minY, Math.min(bounds.maxY, y))),
  }
}

export function getHouseMapView(
  zoom = 1,
) {
  const normalizedZoom = clampHouseMapZoom(zoom)
  const scale = getHouseMapScale(normalizedZoom)

  return {
    centerX: HOUSE_MAP_FOCUS.x,
    centerY: HOUSE_MAP_FOCUS.y,
    scale,
    transform:
      normalizedZoom === HOUSE_MAP_ZOOM_LEVELS[0]
        ? 'translate(0 0)'
        : `translate(${MAP_CENTER_X} ${MAP_CENTER_Y}) scale(${scale}) translate(${-HOUSE_MAP_FOCUS.x} ${-HOUSE_MAP_FOCUS.y})`,
  }
}

export function getHouseMapLabelFontSize(zoom = 1) {
  return Number((8 / getHouseMapView(zoom).scale).toFixed(4))
}
