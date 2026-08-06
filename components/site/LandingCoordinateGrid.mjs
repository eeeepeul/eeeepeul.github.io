import { createElement } from 'react'

const X_COORDINATES = [
  '-500 m',
  '-400 m',
  '-300 m',
  '-200 m',
  '-100 m',
  '0',
  '100 m',
  '200 m',
  '300 m',
  '400 m',
  '500 m',
]
const Y_COORDINATES = [
  '400 m',
  '300 m',
  '200 m',
  '100 m',
  '0',
  '-100 m',
  '-200 m',
  '-300 m',
  '-400 m',
]

function coordinatePosition(index, total) {
  return `${(index / (total - 1)) * 100}%`
}

function coordinateStyle(index, total) {
  return { '--coordinate-position': coordinatePosition(index, total) }
}

export function LandingCoordinateGrid() {
  return createElement(
    'div',
    { className: 'landing-coordinate-grid', 'aria-hidden': 'true' },
    createElement(
      'div',
      { className: 'coordinate-grid__plot' },
      X_COORDINATES.map((label, index) =>
        createElement('span', {
          key: `vertical-${label}`,
          className: 'coordinate-line coordinate-line--vertical',
          style: coordinateStyle(index, X_COORDINATES.length),
        })
      ),
      Y_COORDINATES.map((label, index) =>
        createElement('span', {
          key: `horizontal-${label}`,
          className: 'coordinate-line coordinate-line--horizontal',
          style: coordinateStyle(index, Y_COORDINATES.length),
        })
      ),
      X_COORDINATES.map((label, index) =>
        createElement(
          'span',
          {
            key: `x-label-${label}`,
            className: 'coordinate-label coordinate-label--x',
            style: coordinateStyle(index, X_COORDINATES.length),
          },
          label
        )
      ),
      Y_COORDINATES.map((label, index) =>
        createElement(
          'span',
          {
            key: `y-label-${label}`,
            className: 'coordinate-label coordinate-label--y',
            style: coordinateStyle(index, Y_COORDINATES.length),
          },
          label
        )
      )
    )
  )
}
