'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  FLAME_COLOR_TONES,
  MATCH_COLOR_TONES,
  SHOE_TONES,
} from '../../lib/character-customization.mjs'
import { HOUSE_INTERIOR_MAP } from '../../lib/house-interior-map.mjs'
import {
  advanceWanderState,
  createInteriorNavigation,
  createWanderState,
} from '../../lib/house-interior-navigation.mjs'

const LIVING_ROOM_CAMERA_FOCUS = { x: 31, y: 24 }
const CUSTOM_MATCH_CHARACTER_SRC = assetPath('media/match-character.svg')
const CUSTOM_MATCH_HEAD_SRC = assetPath('media/match-character-head.svg')
const CUSTOM_SHOE_SRC = assetPath('media/custom-shoe.png')
const DEFAULT_CHARACTER_CELLS = [
  { x: 31, y: 27 },
  { x: 31, y: 35 },
  { x: 32, y: 45 },
  { x: 10, y: 13 },
  { x: 49, y: 16 },
  { x: 48, y: 26 },
]

const getMapPoint = (state, map) => ({
  x: (state.x / map.width) * 100,
  y: (state.y / map.height) * 100,
})

const applyCamera = (cameraWorld, viewport, target, map) => {
  const worldWidth = cameraWorld.clientWidth
  const worldHeight = cameraWorld.clientHeight
  const viewportWidth = viewport.clientWidth
  const viewportHeight = viewport.clientHeight
  if (!worldWidth || !worldHeight || !viewportWidth || !viewportHeight) return

  const targetX = (target.x / map.width) * worldWidth
  const targetY = (target.y / map.height) * worldHeight
  const minX = Math.min(0, viewportWidth - worldWidth)
  const minY = Math.min(0, viewportHeight - worldHeight)
  const x = Math.min(0, Math.max(minX, viewportWidth / 2 - targetX))
  const y = Math.min(0, Math.max(minY, viewportHeight / 2 - targetY))

  cameraWorld.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

export function FollowingCharacterWorld({
  activeCharacterId,
  characterIds,
  characterCustomizations = {},
  map = HOUSE_INTERIOR_MAP,
  cameraWorldRef,
  viewportRef,
}) {
  const activeCharacterRef = useRef(activeCharacterId)
  const characterNodesRef = useRef(new Map())
  const motionStatesRef = useRef(new Map())
  const worldRef = useRef(null)
  const navigationRef = useRef(null)

  activeCharacterRef.current = activeCharacterId

  useEffect(() => {
    navigationRef.current = createInteriorNavigation(map)
  }, [map])

  useEffect(() => {
    const characterWorld = worldRef.current
    const viewport = viewportRef?.current
    const cameraWorld = cameraWorldRef?.current
    if (!characterWorld || !viewport || !cameraWorld) return undefined

    const navigation = navigationRef.current ?? createInteriorNavigation(map)
    navigationRef.current = navigation
    let frameId = 0
    let previousTime = performance.now()

    const getInitialPosition = (characterId, index) => {
      if (characterId === activeCharacterRef.current) {
        return navigation.resolveWalkableCell(LIVING_ROOM_CAMERA_FOCUS)
      }
      return navigation.resolveWalkableCell(DEFAULT_CHARACTER_CELLS[index % DEFAULT_CHARACTER_CELLS.length])
    }

    const animate = (currentTime) => {
      const deltaSeconds = Math.min(0.05, Math.max(0, (currentTime - previousTime) / 1000))
      previousTime = currentTime

      characterNodesRef.current.forEach((character, characterId) => {
        const index = characterIds.indexOf(characterId)
        const existingState = motionStatesRef.current.get(characterId)
        const initialPosition = getInitialPosition(characterId, Math.max(0, index))
        const previousState =
          existingState ?? createWanderState(initialPosition, Math.random)
        const nextState = advanceWanderState(
          previousState,
          navigation,
          deltaSeconds,
          previousState.random ?? Math.random
        )

        motionStatesRef.current.set(characterId, nextState)
        const point = getMapPoint(nextState, map)
        character.style.left = `${point.x}%`
        character.style.top = `${point.y}%`
      })

      const activeId = activeCharacterRef.current
      const activeState = activeId ? motionStatesRef.current.get(activeId) : null
      const cameraTarget = activeState ?? LIVING_ROOM_CAMERA_FOCUS
      applyCamera(cameraWorld, viewport, cameraTarget, map)
      cameraWorld.dataset.cameraMode = activeState ? 'following' : 'living-room'

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [cameraWorldRef, characterIds, map, viewportRef])

  return createElement(
    'div',
    {
      ref: worldRef,
      className: `character-world${activeCharacterId ? ' is-following' : ''}`,
      'data-active-character': activeCharacterId ?? '',
    },
    characterIds.map((characterId) => {
      const customization = characterCustomizations[characterId]
      const matchColorIndex = customization?.['match-color']
      const flameColorIndex = customization?.['flame-color']
      const flameShapeIndex = customization?.['flame-shape']
      const shoeIndex = customization?.shoes
      const hasMatchColor = Number.isInteger(matchColorIndex)
      const hasFlameShape = Number.isInteger(flameShapeIndex)
      const hasFlameColor = Number.isInteger(flameColorIndex)
      const hasShoe = Number.isInteger(shoeIndex)
      const isCustomized = hasMatchColor || hasFlameShape || hasShoe
      const style = isCustomized
        ? {
            transform: 'translate3d(-50%, -50%, 0)',
            ...(hasShoe ? { '--character-shoe-tone': SHOE_TONES[shoeIndex] } : {}),
          }
        : undefined

      const flameSrc = hasFlameShape
        ? assetPath(`media/flame-shape-${String(flameShapeIndex + 1).padStart(2, '0')}.png`)
        : null
      const flame = flameSrc
        ? createElement('span', {
            className: 'wandering-character-flame',
            'data-flame-src': flameSrc,
            'aria-hidden': 'true',
            style: {
              '--character-flame-color':
                FLAME_COLOR_TONES[hasFlameColor ? flameColorIndex : 0] ?? FLAME_COLOR_TONES[0],
              '--character-flame-image': `url(${flameSrc})`,
            },
          })
        : null

      const image = createElement('img', {
        className: 'wandering-character',
        src: isCustomized ? CUSTOM_MATCH_CHARACTER_SRC : assetPath('media/page3-character.png'),
        alt: '',
        draggable: false,
        'data-character-id': characterId,
        'data-character-role': characterId === activeCharacterId ? 'player' : 'npc',
      })
      const head = createElement('i', {
        className: 'wandering-character-head',
        'aria-hidden': 'true',
        'data-head-src': CUSTOM_MATCH_HEAD_SRC,
        style: {
          '--character-head-tone':
            MATCH_COLOR_TONES[hasMatchColor ? matchColorIndex : 0] ?? MATCH_COLOR_TONES[0],
          '--character-head-image': `url(${CUSTOM_MATCH_HEAD_SRC})`,
        },
      })

      if (!isCustomized) {
        return createElement('img', {
          key: characterId,
          ref: (node) => {
            if (node) characterNodesRef.current.set(characterId, node)
            else characterNodesRef.current.delete(characterId)
          },
          ...image.props,
        })
      }

      return createElement(
        'span',
        {
          key: characterId,
          ref: (node) => {
            if (node) characterNodesRef.current.set(characterId, node)
            else characterNodesRef.current.delete(characterId)
          },
          className: `wandering-character-entity${hasFlameShape ? ' has-flame' : ''}${hasShoe ? ' has-shoe' : ''}`,
          style,
        },
        flame,
        image,
        head,
        hasShoe
          ? createElement('i', {
              className: 'wandering-character-shoe',
              'aria-hidden': 'true',
              'data-shoe-src': CUSTOM_SHOE_SRC,
              style: { '--character-shoe-image': `url(${CUSTOM_SHOE_SRC})` },
            })
          : null
      )
    })
  )
}
