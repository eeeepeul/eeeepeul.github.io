import { createElement } from 'react'

const TOP_RULER_LABELS = Array.from({ length: 20 }, (_, index) => index * 50)
const SIDE_RULER_LABELS = Array.from({ length: 12 }, (_, index) => 700 + index * 50)

function renderLabels(axis, labels) {
  return labels.map((label) =>
    createElement(
      'span',
      {
        key: `${axis}-${label}`,
        className: 'map-viewport-ruler__label',
        'data-ruler-axis': axis,
      },
      [
        createElement(
          'span',
          {
            key: 'value',
            className:
              axis === 'x'
                ? 'map-viewport-ruler__value map-viewport-ruler__value--top'
                : 'map-viewport-ruler__value',
          },
          label
        ),
        createElement('span', {
          key: 'tick',
          className:
            axis === 'x'
              ? 'map-viewport-ruler__major-tick map-viewport-ruler__major-tick--top'
              : 'map-viewport-ruler__major-tick',
        }),
      ]
    )
  )
}

export function MapViewportRulers() {
  return createElement(
    'div',
    { className: 'map-viewport-rulers', 'aria-hidden': 'true' },
    createElement(
      'div',
      { className: 'map-viewport-ruler map-viewport-ruler--top' },
      renderLabels('x', TOP_RULER_LABELS)
    ),
    createElement(
      'div',
      { className: 'map-viewport-ruler map-viewport-ruler--left' },
      renderLabels('y', SIDE_RULER_LABELS)
    ),
    createElement('span', { className: 'map-viewport-ruler__corner' })
  )
}
