'use client'

import { createElement, useRef } from 'react'
import { HOUSE_INTERIOR_MAP } from '../../lib/house-interior-map.mjs'
import { HOUSE_MAP_WALK } from '../../lib/house-map-walk.mjs'
import { FollowingCharacterWorld } from './FollowingCharacterWorld.mjs'
import { HouseInteriorTilemap } from './HouseInteriorTilemap.mjs'

/**
 * Existing /second/ playfield with the interior map as its background.
 * The character world remains a separate layer so the existing follow-camera
 * and character-add interaction continue to work unchanged.
 */
export function HouseInteriorWorld({
  activeCharacterId,
  characterIds,
  characterCustomizations = {},
  characterAccessories = {},
  map = HOUSE_INTERIOR_MAP,
  // the floor the matches walk on: the walls, doors and furniture of the house picture (lib/house-map-walk.mjs)
  walkMap = HOUSE_MAP_WALK,
}) {
  const viewportRef = useRef(null)
  const cameraWorldRef = useRef(null)

  return createElement(
    'div',
    { className: 'house-interior-world' },
    createElement(
      'div',
      {
        ref: viewportRef,
        className: 'house-interior-camera-viewport',
        'data-camera-viewport': 'true',
      },
      createElement(
        'div',
        {
          ref: cameraWorldRef,
          className: 'house-interior-camera-world',
          'data-camera-mode': activeCharacterId ? 'following' : 'living-room',
          'data-camera-focus': '24:37.4',
        },
        createElement(HouseInteriorTilemap, { map }),
        createElement(
          'div',
          { className: 'house-interior-character-layer' },
          createElement(FollowingCharacterWorld, {
            activeCharacterId,
            characterIds,
            characterCustomizations,
            characterAccessories,
            map: walkMap,
            cameraWorldRef,
            viewportRef,
          })
        )
      )
    )
  )
}
