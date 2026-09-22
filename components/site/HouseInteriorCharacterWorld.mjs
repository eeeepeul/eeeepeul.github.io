'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { MATCH_COLOR_FILTERS, SHOE_TONES } from '../../lib/character-customization.mjs'
import {
  HOUSE_INTERIOR_MAP,
  HOUSE_INTERIOR_SPAWN_POINTS,
} from '../../lib/house-interior-map.mjs'
import {
  advanceInteriorNavigator,
  createInteriorNavigator,
} from '../../lib/house-interior-navigation.mjs'

const ACTIVE_CAMERA_SCALE = 2.15
const ACTIVE_START = HOUSE_INTERIOR_SPAWN_POINTS.find(({ id }) => id === 'living-center')

export function HouseInteriorCharacterWorld({
  activeCharacterId,
  characterIds,
  characterCustomizations = {},
}) {
  const activeCharacterRef = useRef(activeCharacterId)
  const characterNodesRef = useRef(new Map())
  const navigatorStatesRef = useRef(new Map())
  const worldRef = useRef(null)

  activeCharacterRef.current = activeCharacterId

  useEffect(() => {
    const world = worldRef.current
    const characterLayer = world?.parentElement
    const camera = characterLayer?.parentElement
    const viewport = camera?.parentElement
    if (!world || !camera || !viewport) return undefined

    let frameId = 0
    let previousTime = performance.now()

    const animate = (currentTime) => {
      const deltaSeconds = Math.min(0.05, Math.max(0, (currentTime - previousTime) / 1000))
      previousTime = currentTime

      const width = viewport.clientWidth
      const height = viewport.clientHeight
      const view = HOUSE_INTERIOR_MAP.view
      const cellWidth = width / view.width
      const cellHeight = height / view.height

      characterNodesRef.current.forEach((character, characterId) => {
        let state = navigatorStatesRef.current.get(characterId)
        if (!state) {
          const start = characterId === activeCharacterRef.current && ACTIVE_START
            ? { x: ACTIVE_START.x, y: ACTIVE_START.y }
            : { x: -1, y: -1 }
          state = createInteriorNavigator({ start, map: HOUSE_INTERIOR_MAP })
        }
        state = advanceInteriorNavigator(state, deltaSeconds, HOUSE_INTERIOR_MAP)
        navigatorStatesRef.current.set(characterId, state)
      })

      const activeId = activeCharacterRef.current
      const activeState = activeId ? navigatorStatesRef.current.get(activeId) : null
      // Before the user adds a character, keep a quiet fixed observation shot
      // on the living room. NPCs still navigate the house and pass through the
      // shot; adding a character switches the camera to follow that character.
      const cameraTarget = activeState ?? {
        x: ACTIVE_START.x + 0.5,
        y: ACTIVE_START.y + 0.5,
      }
      const cameraScale = ACTIVE_CAMERA_SCALE
      const activeX = ((cameraTarget.x - view.x) / view.width) * width
      const activeY = ((cameraTarget.y - view.y) / view.height) * height
      const cameraX = width / 2 - activeX * cameraScale
      const cameraY = height / 2 - activeY * cameraScale
      camera.style.transform = `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`

      characterNodesRef.current.forEach((character, characterId) => {
        const state = navigatorStatesRef.current.get(characterId)
        if (!state) return
        const x = ((state.x - view.x) / view.width) * width - character.offsetWidth / 2
        const y = ((state.y - view.y) / view.height) * height - character.offsetHeight / 2
        character.style.transform = `translate3d(${x}px, ${y}px, 0)`
      })

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return createElement(
    'div',
    {
      ref: worldRef,
      className: `character-world${activeCharacterId ? ' is-following' : ''}`,
      'data-active-character': activeCharacterId ?? '',
      'data-navigation': 'door-connected-interior',
    },
    characterIds.map((characterId) => {
      const customization = characterCustomizations[characterId]
      const matchColorIndex = customization?.['match-color']
      const shoeIndex = customization?.shoes
      const hasMatchColor = Number.isInteger(matchColorIndex)
      const hasShoe = Number.isInteger(shoeIndex)

      return createElement(
        'span',
        {
          key: characterId,
          ref: (node) => {
            if (node) characterNodesRef.current.set(characterId, node)
            else characterNodesRef.current.delete(characterId)
          },
          className: `wandering-character-entity${hasShoe ? ' has-shoe' : ''}`,
          style: {
            ...(hasMatchColor ? { '--character-filter': MATCH_COLOR_FILTERS[matchColorIndex] } : {}),
            ...(hasShoe ? { '--character-shoe-tone': SHOE_TONES[shoeIndex] } : {}),
          },
        },
        createElement('img', {
          className: 'wandering-character',
          src: assetPath('media/page3-character.png'),
          alt: '',
          draggable: false,
          'data-character-id': characterId,
          'data-character-role': characterId === activeCharacterId ? 'player' : 'npc',
        }),
        hasShoe
          ? createElement('i', { className: 'wandering-character-shoe', 'aria-hidden': 'true' })
          : null
      )
    })
  )
}
