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
  HOUSE_INTERIOR_PIXEL_RUNS.forEach(({ color, x, y, length }) => {
    context.fillStyle = HOUSE_INTERIOR_PIXEL_PALETTE[color]
    if (color !== 'blue') {
      context.fillRect(x, y, length, 1)
      return
    }

    let segmentStart = null
    for (let offset = 0; offset <= length; offset += 1) {
      const isMasked =
        offset === length || wallPixelMask.has(`${x + offset}:${y}`)
      if (!isMasked && segmentStart === null) segmentStart = offset
      if (isMasked && segmentStart !== null) {
        context.fillRect(x + segmentStart, y, offset - segmentStart, 1)
        segmentStart = null
      }
    }
  })
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
      context.fillRect(left, top, scaleX, thickness)
      if (!hasLeft) context.fillRect(left, top, thickness, scaleY)
      if (!hasRight) context.fillRect((x + 1) * scaleX - thickness, top, thickness, scaleY)
      return
    }

    if (isVerticalSegment) {
      context.fillRect(left, top, thickness, scaleY)
      if (!hasAbove) context.fillRect(left, top, scaleX, thickness)
      if (!hasBelow) context.fillRect(left, (y + 1) * scaleY - thickness, scaleX, thickness)
      return
    }

    if (!hasAbove) {
      context.fillRect(left, top, scaleX, thickness)
    }
    if (!hasBelow) {
      context.fillRect(left, (y + 1) * scaleY - thickness, scaleX, thickness)
    }
    if (!hasLeft) {
      context.fillRect(left, top, thickness, scaleY)
    }
    if (!hasRight) {
      context.fillRect((x + 1) * scaleX - thickness, top, thickness, scaleY)
    }
  })
}

export const drawPixelScene = (context, map = HOUSE_INTERIOR_MAP) => {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH, HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT)
  context.fillStyle = HOUSE_INTERIOR_PIXEL_PALETTE.white
  context.fillRect(0, 0, HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH, HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT)

  drawPixelRuns(context, map)

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
