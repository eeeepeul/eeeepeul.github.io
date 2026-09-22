'use client'

import { createElement } from 'react'
import { HouseInteriorCharacterWorld } from './HouseInteriorCharacterWorld.mjs'
import { HouseInteriorTilemap } from './HouseInteriorTilemap.mjs'

export function HouseInteriorWorld({
  activeCharacterId,
  characterIds,
  characterCustomizations = {},
}) {
  return createElement(
    'div',
    { className: 'house-interior-world' },
    createElement(
      'div',
      { className: 'house-interior-camera' },
      createElement(HouseInteriorTilemap),
      createElement(
        'div',
        { className: 'house-interior-character-layer' },
        createElement(HouseInteriorCharacterWorld, {
          activeCharacterId,
          characterIds,
          characterCustomizations,
        })
      )
    )
  )
}
