'use client'

import { createElement, useEffect, useRef } from 'react'
import {
  HOUSE_INTERIOR_LAYER_ORDER,
  HOUSE_INTERIOR_MAP,
} from '../../lib/house-interior-map.mjs'
import {
  HOUSE_INTERIOR_PIXEL_HEIGHT,
  HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT,
  HOUSE_INTERIOR_PIXEL_PALETTE,
  HOUSE_INTERIOR_PIXEL_RUNS,
  HOUSE_INTERIOR_PIXEL_SCALE,
  HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH,
  HOUSE_INTERIOR_PIXEL_WIDTH,
  HOUSE_INTERIOR_WALL_THICKNESS,
} from '../../lib/house-interior-pixel-art.mjs'
import {
  HOUSE_INTERIOR_PATTERN_PERIOD,
  isHouseInteriorPatternPixel,
  resolveHouseInteriorPattern,
} from '../../lib/house-interior-patterns.mjs'

const tileStyle = (tile, map) => ({
  left: `${(tile.x / map.width) * 100}%`,
  top: `${(tile.y / map.height) * 100}%`,
  width: `${((tile.width ?? 1) / map.width) * 100}%`,
  height: `${((tile.height ?? 1) / map.height) * 100}%`,
})

const tileClassName = (tile) =>
  `house-interior-tile house-interior-tile--${String(tile.tileId ?? 'plain').replaceAll('_', '-')}`

const renderTile = (tile, map, layerName) =>
  createElement('div', {
    key: tile.id,
    className: tileClassName(tile),
    style: tileStyle(tile, map),
    'data-tile-id': tile.id,
    'data-tile-type': tile.tileId,
    ...(tile.room ? { 'data-room': tile.room } : {}),
    'data-layer': layerName,
    'aria-hidden': 'true',
  })

const tileAt = (regions, x, y) => {
  let tileId = 'floor-void'
  regions.forEach((region) => {
    const isInside =
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    if (isInside) tileId = region.tileId
  })
  return tileId
}

const createFloorTiles = (map) => {
  const regions = map.layers.floor ?? []
  const tiles = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tileId = tileAt(regions, x, y)
      tiles.push({ id: `floor-${x}-${y}`, tileId, x, y, width: 1, height: 1 })
    }
  }
  return tiles
}

const renderLayer = (layerName, tiles, map) =>
  createElement(
    'div',
    {
      key: layerName,
      className: `house-interior-map-layer house-interior-map-layer--${layerName}`,
      'data-layer': layerName,
      'aria-hidden': 'true',
    },
    tiles.map((tile) => renderTile(tile, map, layerName))
  )

const renderCollisionLayer = (map) =>
  createElement(
    'div',
    {
      key: 'collision',
      className: 'house-interior-data-layer',
      'data-layer': 'collision',
      hidden: true,
    },
    (map.collision ?? []).map(({ x, y }) =>
      createElement('span', {
        key: `${x}:${y}`,
        'data-cell': `${x}:${y}`,
      })
    )
  )

const renderSpawnLayer = (map) =>
  createElement(
    'div',
    {
      key: 'spawn_points',
      className: 'house-interior-data-layer',
      'data-layer': 'spawn_points',
      hidden: true,
    },
    (map.spawn_points ?? []).map(({ id, room, x, y }) =>
      createElement('span', {
        key: id,
        'data-spawn-id': id,
        'data-room': room,
        'data-position': `${x}:${y}`,
      })
    )
  )

const hasWallCell = (wallCells, x, y) => wallCells.has(`${x}:${y}`)

const createWallPixelMask = (map) => {
  const scaleX = HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH / map.width
  const scaleY = HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT / map.height
  const paddingX = Math.ceil(scaleX)
  const paddingY = Math.ceil(scaleY)
  const mask = new Set()

  ;(map.layers.walls ?? []).forEach(({ x, y }) => {
    const left = Math.max(0, Math.floor(x * scaleX - paddingX))
    const top = Math.max(0, Math.floor(y * scaleY - paddingY))
    const right = Math.min(
      HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH,
      Math.ceil((x + 1) * scaleX + paddingX)
    )
    const bottom = Math.min(
      HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT,
      Math.ceil((y + 1) * scaleY + paddingY)
    )
    for (let pixelY = top; pixelY < bottom; pixelY += 1) {
      for (let pixelX = left; pixelX < right; pixelX += 1) {
        mask.add(`${pixelX}:${pixelY}`)
      }
    }
  })

  return mask
}

const drawPixelRuns = (context, map) => {
  const wallPixelMask = createWallPixelMask(map)
  const patternCells = createPatternCellMap(map)
  const scaleX = HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH / map.width
  const scaleY = HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT / map.height

  HOUSE_INTERIOR_PIXEL_RUNS.forEach(({ color, x, y, length }) => {
    const renderedColor = color === 'lightBlue' ? 'white' : color
    let segmentStart = null
    let segmentColor = null

    for (let offset = 0; offset <= length; offset += 1) {
      let nextColor = null
      if (offset < length) {
        const pixelX = x + offset
        const tileX = Math.min(map.width - 1, Math.floor(pixelX / scaleX))
        const tileY = Math.min(map.height - 1, Math.floor(y / scaleY))
        const pattern = patternCells[tileY * map.width + tileX]

        if (pattern) {
          nextColor = isHouseInteriorPatternPixel(pattern.motif, pixelX, y)
            ? HOUSE_INTERIOR_PIXEL_PALETTE[pattern.color]
            : HOUSE_INTERIOR_PIXEL_PALETTE.white
        } else if (color !== 'blue' || !wallPixelMask.has(`${pixelX}:${y}`)) {
          const sourceColor = color === 'blue' ? 'teal' : renderedColor
          nextColor = HOUSE_INTERIOR_PIXEL_PALETTE[sourceColor]
        }
      }

      if (nextColor !== segmentColor && segmentStart !== null) {
        context.fillStyle = segmentColor
        context.fillRect(x + segmentStart, y, offset - segmentStart, 1)
        segmentStart = null
      }
      if (nextColor !== null && segmentStart === null) segmentStart = offset
      segmentColor = nextColor
    }
  })
}

const fillPatternCellMap = (cellMap, tiles, map) => {
  tiles.forEach((tile) => {
    const pattern = resolveHouseInteriorPattern(tile.tileId)
    for (let tileY = tile.y; tileY < tile.y + (tile.height ?? 1); tileY += 1) {
      for (let tileX = tile.x; tileX < tile.x + (tile.width ?? 1); tileX += 1) {
        cellMap[tileY * map.width + tileX] = pattern
      }
    }
  })
}

const resolveRugVisualBounds = (rug) => {
  if (rug.id !== 'living-rug') return rug

  const visualHeight = 3
  return {
    ...rug,
    y: rug.y + (rug.height ?? 1) - visualHeight,
    height: visualHeight,
  }
}

const createPatternCellMap = (map) => {
  const cellMap = new Array(map.width * map.height).fill(null)
  const decor = map.layers.decor ?? []
  const rugs = decor
    .filter(({ tileId }) => String(tileId).startsWith('rug-'))
    .map(resolveRugVisualBounds)
  const foregroundDecor = decor.filter(({ tileId }) => !String(tileId).startsWith('rug-'))

  fillPatternCellMap(cellMap, rugs, map)
  fillPatternCellMap(cellMap, map.layers.furniture ?? [], map)
  fillPatternCellMap(cellMap, foregroundDecor, map)
  fillPatternCellMap(cellMap, map.layers.doors_windows ?? [], map)
  return cellMap
}

const drawPatternedRugs = (context, map) => {
  const scaleX = HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH / map.width
  const scaleY = HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT / map.height
  const inset = 2

  ;(map.layers.decor ?? [])
    .filter(({ tileId }) => String(tileId).startsWith('rug-'))
    .map(resolveRugVisualBounds)
    .forEach((rug) => {
      const pattern = resolveHouseInteriorPattern(rug.tileId)
      if (!pattern) return

      const left = Math.round(rug.x * scaleX) + inset
      const top = Math.round(rug.y * scaleY) + inset
      const right = Math.round((rug.x + (rug.width ?? 1)) * scaleX) - inset
      const bottom = Math.round((rug.y + (rug.height ?? 1)) * scaleY) - inset

      context.fillStyle = HOUSE_INTERIOR_PIXEL_PALETTE[pattern.color]
      for (let pixelY = top; pixelY < bottom; pixelY += 1) {
        let segmentStart = null
        for (let pixelX = left; pixelX <= right; pixelX += 1) {
          const isPatternPixel =
            pixelX < right &&
            isHouseInteriorPatternPixel(pattern.motif, pixelX, pixelY)
          if (isPatternPixel && segmentStart === null) segmentStart = pixelX
          if (!isPatternPixel && segmentStart !== null) {
            context.fillRect(segmentStart, pixelY, pixelX - segmentStart, 1)
            segmentStart = null
          }
        }
      }
    })
}

const drawRugInsets = (context, map) => {
  const scaleX = HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH / map.width
  const scaleY = HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT / map.height
  const inset = 2

  context.fillStyle = HOUSE_INTERIOR_PIXEL_PALETTE.white
  ;(map.layers.decor ?? [])
    .filter(({ tileId }) => String(tileId).startsWith('rug-'))
    .map(resolveRugVisualBounds)
    .forEach((rug) => {
      const left = Math.round(rug.x * scaleX)
      const top = Math.round(rug.y * scaleY)
      const right = Math.round((rug.x + (rug.width ?? 1)) * scaleX)
      const bottom = Math.round((rug.y + (rug.height ?? 1)) * scaleY)
      const width = right - left
      const height = bottom - top

      context.fillRect(left, top, width, inset)
      context.fillRect(left, bottom - inset, width, inset)
      context.fillRect(left, top, inset, height)
      context.fillRect(right - inset, top, inset, height)
    })
}

const firstPatternCenter = (start) => {
  const centerOffset = HOUSE_INTERIOR_PATTERN_PERIOD / 2
  return (
    Math.ceil((start - centerOffset) / HOUSE_INTERIOR_PATTERN_PERIOD) *
      HOUSE_INTERIOR_PATTERN_PERIOD +
    centerOffset
  )
}

const drawHorizontalWallSegment = (context, left, top, width, thickness) => {
  context.fillRect(left, top, width, thickness)
  for (
    let pixelX = firstPatternCenter(left);
    pixelX < left + width;
    pixelX += HOUSE_INTERIOR_PATTERN_PERIOD
  ) {
    context.fillRect(pixelX, Math.round(top) - 2, 1, 5)
  }
}

const drawVerticalWallSegment = (context, left, top, height, thickness) => {
  context.fillRect(left, top, thickness, height)
  for (
    let pixelY = firstPatternCenter(top);
    pixelY < top + height;
    pixelY += HOUSE_INTERIOR_PATTERN_PERIOD
  ) {
    context.fillRect(Math.round(left) - 2, pixelY, 5, 1)
  }
}

const drawWallSegments = (context, map) => {
  const scaleX = HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH / map.width
  const scaleY = HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT / map.height
  const wallCells = new Set((map.layers.walls ?? []).map(({ x, y }) => `${x}:${y}`))
  const thickness = HOUSE_INTERIOR_WALL_THICKNESS

  context.fillStyle = HOUSE_INTERIOR_PIXEL_PALETTE.wall
  ;(map.layers.walls ?? []).forEach(({ x, y }) => {
    const left = x * scaleX
    const top = y * scaleY
    const hasAbove = hasWallCell(wallCells, x, y - 1)
    const hasBelow = hasWallCell(wallCells, x, y + 1)
    const hasLeft = hasWallCell(wallCells, x - 1, y)
    const hasRight = hasWallCell(wallCells, x + 1, y)
    const isHorizontalSegment = (hasLeft || hasRight) && !hasAbove && !hasBelow
    const isVerticalSegment = (hasAbove || hasBelow) && !hasLeft && !hasRight

    if (isHorizontalSegment) {
      drawHorizontalWallSegment(context, left, top, scaleX, thickness)
      if (!hasLeft) drawVerticalWallSegment(context, left, top, scaleY, thickness)
      if (!hasRight) {
        drawVerticalWallSegment(
          context,
          (x + 1) * scaleX - thickness,
          top,
          scaleY,
          thickness
        )
      }
      return
    }

    if (isVerticalSegment) {
      drawVerticalWallSegment(context, left, top, scaleY, thickness)
      if (!hasAbove) drawHorizontalWallSegment(context, left, top, scaleX, thickness)
      if (!hasBelow) {
        drawHorizontalWallSegment(
          context,
          left,
          (y + 1) * scaleY - thickness,
          scaleX,
          thickness
        )
      }
      return
    }

    if (!hasAbove) {
      drawHorizontalWallSegment(context, left, top, scaleX, thickness)
    }
    if (!hasBelow) {
      drawHorizontalWallSegment(
        context,
        left,
        (y + 1) * scaleY - thickness,
        scaleX,
        thickness
      )
    }
    if (!hasLeft) {
      drawVerticalWallSegment(context, left, top, scaleY, thickness)
    }
    if (!hasRight) {
      drawVerticalWallSegment(
        context,
        (x + 1) * scaleX - thickness,
        top,
        scaleY,
        thickness
      )
    }
  })
}

export const drawPixelScene = (context, map = HOUSE_INTERIOR_MAP) => {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH, HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT)
  context.fillStyle = HOUSE_INTERIOR_PIXEL_PALETTE.white
  context.fillRect(0, 0, HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH, HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT)

  drawPatternedRugs(context, map)

  drawPixelRuns(context, map)

  drawRugInsets(context, map)

  drawWallSegments(context, map)
}

export function HouseInteriorTilemap({ map = HOUSE_INTERIOR_MAP }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const tilemap = canvas.closest('.house-interior-tilemap')
    const draw = () => {
      const context = canvas.getContext('2d')
      if (!context) return
      canvas.width = HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH
      canvas.height = HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT
      drawPixelScene(context, map)
      tilemap?.setAttribute('data-pixel-ready', 'true')
    }

    draw()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [map])

  const layers = [
    renderLayer('floor', createFloorTiles(map), map),
    renderLayer('walls', map.layers.walls ?? [], map),
    renderLayer('doors_windows', map.layers.doors_windows ?? [], map),
    renderLayer('furniture', map.layers.furniture ?? [], map),
    renderLayer('decor', map.layers.decor ?? [], map),
    renderCollisionLayer(map),
    renderSpawnLayer(map),
  ]

  return createElement(
    'div',
    {
      className: 'house-interior-tilemap',
      'data-map-width': map.width,
      'data-map-height': map.height,
      'data-tile-size': map.tileSize,
      'data-layer-order': HOUSE_INTERIOR_LAYER_ORDER.join(','),
      'aria-label': '미발화하우스 실내 배경',
      role: 'img',
    },
    createElement('canvas', {
      ref: canvasRef,
      className: 'house-interior-pixel-canvas',
      width: HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH,
      height: HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT,
      'data-pixel-width': HOUSE_INTERIOR_PIXEL_WIDTH,
      'data-pixel-height': HOUSE_INTERIOR_PIXEL_HEIGHT,
      'data-pixel-scale': HOUSE_INTERIOR_PIXEL_SCALE,
      draggable: false,
      'aria-hidden': 'true',
    }),
    layers
  )
}
