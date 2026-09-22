import { createElement } from 'react'
import {
  HOUSE_INTERIOR_LAYER_ORDER,
  HOUSE_INTERIOR_MAP,
} from '../../lib/house-interior-map.mjs'

const tileStyle = (tile, map) => ({
  left: `${((tile.x - map.view.x) / map.view.width) * 100}%`,
  top: `${((tile.y - map.view.y) / map.view.height) * 100}%`,
  width: `${((tile.width ?? 1) / map.view.width) * 100}%`,
  height: `${((tile.height ?? 1) / map.view.height) * 100}%`,
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
    if (
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    ) {
      tileId = region.tileId
    }
  })
  return tileId
}

const createFloorTiles = (map) => {
  const regions = map.layers.floor ?? []
  const tiles = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      tiles.push({ id: `floor-${x}-${y}`, tileId: tileAt(regions, x, y), x, y })
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

const renderDataLayer = (layerName, children) =>
  createElement(
    'div',
    { key: layerName, className: 'house-interior-data-layer', 'data-layer': layerName, hidden: true },
    children
  )

export function HouseInteriorTilemap({ map = HOUSE_INTERIOR_MAP }) {
  const layers = [
    renderLayer('floor', createFloorTiles(map), map),
    renderLayer('walls', map.layers.walls ?? [], map),
    renderLayer('doors_windows', map.layers.doors_windows ?? [], map),
    renderLayer('furniture', map.layers.furniture ?? [], map),
    renderLayer('decor', map.layers.decor ?? [], map),
    renderDataLayer(
      'collision',
      (map.collision ?? []).map(({ x, y }) =>
        createElement('span', { key: `${x}:${y}`, 'data-cell': `${x}:${y}` })
      )
    ),
    renderDataLayer(
      'spawn_points',
      (map.spawn_points ?? []).map(({ id, room, x, y }) =>
        createElement('span', { key: id, 'data-spawn-id': id, 'data-room': room, 'data-position': `${x}:${y}` })
      )
    ),
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
    layers
  )
}
