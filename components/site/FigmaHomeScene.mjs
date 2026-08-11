import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

const TOP_LABELS = Array.from({ length: 18 }, (_, index) => index)
const SIDE_LABELS = Array.from({ length: 12 }, (_, index) => index)

export function FigmaHomeScene() {
  return createElement(
    'div',
    { className: 'figma-home-scene', 'aria-hidden': 'true' },
    createElement('div', { className: 'figma-home-grid' }),
    createElement(
      'div',
      { className: 'figma-home-top-labels' },
      TOP_LABELS.map((index) =>
        createElement('span', { key: `top-${index}` }, '2,24’')
      )
    ),
    createElement(
      'div',
      { className: 'figma-home-side-labels' },
      SIDE_LABELS.map((index) =>
        createElement('span', { key: `side-${index}` }, '2,24’')
      )
    ),
    createElement(
      'div',
      { className: 'figma-home-map-clip' },
      createElement('img', {
        className: 'figma-home-map',
        src: assetPath('media/figma-home-map.png'),
        alt: '',
        draggable: false,
      })
    )
  )
}
