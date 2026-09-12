import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_MAP_ZOOM_LEVELS,
  clampHouseMapZoom,
  changeHouseMapZoom,
  changeHouseMapZoomByWheel,
  clampHouseMapPan,
  getHouseMapContentBounds,
  getHouseMapLabelFontSize,
  getHouseMapPanBounds,
  getHouseMapRoutes,
  getHouseMapView,
} from '../lib/house-map.mjs'

const TEN_UNIT_VISIT_RADII = { house1: 10, house2: 10, house3: 10, house4: 10 }

test('moves controls through the fixed-focus zoom range without leaving 1 to 100 percent', () => {
  assert.deepEqual(HOUSE_MAP_ZOOM_LEVELS, [1, 10, 25, 50, 75, 100])
  assert.equal(changeHouseMapZoom(1, -1), 1)
  assert.equal(changeHouseMapZoom(1, 1), 9)
  assert.equal(changeHouseMapZoom(75, 1), 83)
  assert.equal(changeHouseMapZoom(100, 1), 100)
})

test('keeps fixed-focus zoom within the 1 to 100 percent range', () => {
  assert.equal(clampHouseMapZoom(-4), 1)
  assert.equal(clampHouseMapZoom(108), 100)
  assert.equal(changeHouseMapZoomByWheel(50, 120), 58)
  assert.equal(changeHouseMapZoomByWheel(50, -120), 42)
})

test('always centers zoom on the black house cluster', () => {
  assert.deepEqual(getHouseMapView(1), {
    centerX: 171,
    centerY: 46,
    scale: 1,
    transform: 'translate(0 0)',
  })
  assert.deepEqual(getHouseMapView(100), {
    centerX: 171,
    centerY: 46,
    scale: 4,
    transform: 'translate(143.5 90) scale(4) translate(-171 -46)',
  })
})

test('derives the map content envelope from the live outer ring edges', () => {
  assert.deepEqual(getHouseMapContentBounds(TEN_UNIT_VISIT_RADII), {
    minX: 149,
    maxX: 196,
    minY: 24,
    maxY: 68,
  })
})

test('keeps distance labels at an eight-pixel visual size while the map zooms', () => {
  assert.equal(getHouseMapLabelFontSize(1), 8)
  assert.equal(getHouseMapLabelFontSize(100), 2)
  assert.equal(getHouseMapLabelFontSize(100) * getHouseMapView(100).scale, 8)
})

test('keeps each route attached to the distance for the same house pair', () => {
  assert.deepEqual(getHouseMapRoutes([9_000, 11_000, 13_000, 15_000], 1), [
    {
      distance: 9_000,
      from: { id: 'house1', x: 159, y: 34 },
      id: 'house1-house2',
      isSelected: false,
      to: { id: 'house2', x: 175, y: 41 },
    },
    {
      distance: 11_000,
      from: { id: 'house2', x: 175, y: 41 },
      id: 'house2-house3',
      isSelected: true,
      to: { id: 'house3', x: 164, y: 51 },
    },
    {
      distance: 13_000,
      from: { id: 'house3', x: 164, y: 51 },
      id: 'house3-house4',
      isSelected: false,
      to: { id: 'house4', x: 186, y: 58 },
    },
    {
      distance: 15_000,
      from: { id: 'house4', x: 186, y: 58 },
      id: 'house4-house1',
      isSelected: false,
      to: { id: 'house1', x: 159, y: 34 },
    },
  ])
})
