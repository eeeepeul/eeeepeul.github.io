'use client'

import { createElement, useRef } from 'react'
import { HOUSE_INTERIOR_MAP } from '../../lib/house-interior-map.mjs'
import { FollowingCharacterWorld } from './FollowingCharacterWorld.mjs'
import { HouseInteriorTilemap } from './HouseInteriorTilemap.mjs'

/**
 * Existing /second/ playfield with the interior map as its background.
 * The character world remains a separate layer so the existing follow-camera
 * and character-add interaction continue to work unchanged.
 */
export function HouseInteriorWorld({ activeCharacterId, characterIds, map = HOUSE_INTERIOR_MAP }) {
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
          'data-camera-focus': '31:24',
        },
        createElement(HouseInteriorTilemap, { map }),
        createElement(
          'div',
          { className: 'house-interior-character-layer' },
          createElement(FollowingCharacterWorld, {
            activeCharacterId,
            characterIds,
            map,
            cameraWorldRef,
            viewportRef,
          })
        )
      )
    )
  )
}
