import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HOUSE_MAP_ZOOM_LEVELS,
  changeHouseMapZoom,
  clampHouseMapPan,
  getHouseMapContentBounds,
  getHouseMapLabelFontSize,
  getHouseMapPanBounds,
  getHouseMapRoutes,
  getHouseMapView,
} from '../lib/house-map.mjs'

const TEN_UNIT_VISIT_RADII = { house1: 10, house2: 10, house3: 10, house4: 10 }

test('moves through the approved zoom levels without leaving the 1 to 100 percent range', () => {
  assert.deepEqual(HOUSE_MAP_ZOOM_LEVELS, [1, 10, 25, 50, 75, 100])
  assert.equal(changeHouseMapZoom(1, -1), 1)
  assert.equal(changeHouseMapZoom(1, 1), 10)
  assert.equal(changeHouseMapZoom(75, 1), 100)
  assert.equal(changeHouseMapZoom(100, 1), 100)
})

test('centers zoom on the midpoint of the selected house pair', () => {
  assert.deepEqual(getHouseMapView(0, 1), {
    centerX: 148,
    centerY: 78.5,
    scale: 1,
    transform: 'translate(0 0)',
  })
  assert.deepEqual(getHouseMapView(0, 100), {
    centerX: 148,
    centerY: 78.5,
    scale: 4,
    transform: 'translate(143.5 90) scale(4) translate(-148 -78.5)',
  })
})

test('derives the map content envelope from the live outer ring edges', () => {
  assert.deepEqual(getHouseMapContentBounds(TEN_UNIT_VISIT_RADII), {
    minX: 34,
    maxX: 262,
    minY: 28,
    maxY: 153,
  })
})

test('lets enlarged content reach every edge and centers an axis that is smaller than the viewport', () => {
  assert.deepEqual(getHouseMapPanBounds(0, 100, TEN_UNIT_VISIT_RADII), {
    minX: -312.5,
    maxX: 312.5,
    minY: -208,
    maxY: 112,
  })
  assert.deepEqual(getHouseMapPanBounds(0, 10, TEN_UNIT_VISIT_RADII), {
    minX: -1.5878,
    maxX: 1.5878,
    minY: -15.2724,
    maxY: -15.2724,
  })
})

test('keeps the overview fixed and clamps enlarged map panning to live content bounds', () => {
  assert.deepEqual(clampHouseMapPan({ x: 80, y: -40 }, 0, 1, TEN_UNIT_VISIT_RADII), {
    x: 0,
    y: 0,
  })
  assert.deepEqual(
    clampHouseMapPan({ x: 1_000, y: -1_000 }, 0, 100, TEN_UNIT_VISIT_RADII),
    { x: 312.5, y: -208 }
  )
})

test('composes pan in screen space before the enlarged map scale', () => {
  assert.deepEqual(
    getHouseMapView(0, 100, { x: 1_000, y: -1_000 }, TEN_UNIT_VISIT_RADII),
    {
    centerX: 148,
    centerY: 78.5,
    scale: 4,
      transform: 'translate(456 -118) scale(4) translate(-148 -78.5)',
    }
  )
})

test('keeps distance labels at an eight-pixel visual size while the map zooms', () => {
  assert.equal(getHouseMapLabelFontSize(1), 8)
  assert.equal(getHouseMapLabelFontSize(100), 2)
  assert.equal(getHouseMapLabelFontSize(100) * getHouseMapView(0, 100).scale, 8)
})

test('keeps each route attached to the distance for the same house pair', () => {
  assert.deepEqual(getHouseMapRoutes([9_000, 11_000, 13_000, 15_000], 1), [
    {
      distance: 9_000,
      from: { id: 'house1', x: 44, y: 90 },
      id: 'house1-house2',
      isSelected: false,
      to: { id: 'house2', x: 252, y: 67 },
    },
    {
      distance: 11_000,
      from: { id: 'house2', x: 252, y: 67 },
      id: 'house2-house3',
      isSelected: true,
      to: { id: 'house3', x: 169, y: 38 },
    },
    {
      distance: 13_000,
      from: { id: 'house3', x: 169, y: 38 },
      id: 'house3-house4',
      isSelected: false,
      to: { id: 'house4', x: 86, y: 143 },
    },
    {
      distance: 15_000,
      from: { id: 'house4', x: 86, y: 143 },
      id: 'house4-house1',
      isSelected: false,
      to: { id: 'house1', x: 44, y: 90 },
    },
  ])
})
