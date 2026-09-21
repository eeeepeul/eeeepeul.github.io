'use client'

import { createElement } from 'react'
import { FollowingCharacterWorld } from './FollowingCharacterWorld.mjs'
import { HouseInteriorTilemap } from './HouseInteriorTilemap.mjs'

/**
 * Existing /second/ playfield with the interior map as its background.
 * The character world remains a separate layer so the existing follow-camera
 * and character-add interaction continue to work unchanged.
 */
export function HouseInteriorWorld({ activeCharacterId, characterIds }) {
  return createElement(
    'div',
    { className: 'house-interior-world' },
    createElement(HouseInteriorTilemap),
    createElement(
      'div',
      { className: 'house-interior-character-layer' },
      createElement(FollowingCharacterWorld, { activeCharacterId, characterIds })
    )
  )
}
