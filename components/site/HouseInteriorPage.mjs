import { createElement } from 'react'
import { HouseInteriorTilemap } from './HouseInteriorTilemap.mjs'

export function HouseInteriorPage() {
  return createElement(
    'main',
    { className: 'house-interior-page' },
    createElement(
      'div',
      { className: 'house-interior-viewport' },
      createElement(HouseInteriorTilemap)
    )
  )
}
