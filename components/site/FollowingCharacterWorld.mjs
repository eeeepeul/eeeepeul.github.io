'use client'

import { getRoomZoom } from '../../lib/room-zoom.mjs'
import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  FLAME_ATTACH_OFFSETS,
  FLAME_COLOR_TONES,
  MATCH_COLOR_TONES,
  SHOE_ATTACH_OFFSETS,
  SHOE_IMAGES,
  SHOE_TONES,
  SHOE_WIDTHS,
} from '../../lib/character-customization.mjs'
import { HOUSE_INTERIOR_MAP } from '../../lib/house-interior-map.mjs'
import {
  advanceWanderState,
  createInteriorNavigation,
  createWanderState,
} from '../../lib/house-interior-navigation.mjs'

const LIVING_ROOM_CAMERA_FOCUS = { x: 31, y: 24 }
// Where the camera looks while no match is being followed: the part of the house picture of the supplied view (the
// dining room, the bedroom under it and the pond), in map cells. A match that is added still starts in the living room
// (LIVING_ROOM_CAMERA_FOCUS) and the camera follows it as before.
export const OVERVIEW_CAMERA_FOCUS = { x: 24, y: 37.4 }
const CUSTOM_MATCH_CHARACTER_SRC = assetPath('media/match-character.svg')
const CUSTOM_MATCH_HEAD_SRC = assetPath('media/match-character-head.svg')
const CUSTOM_SHOE_SRCS = SHOE_IMAGES.map((source) => assetPath(source))
const DEFAULT_CHARACTER_CELLS = [
  { x: 31, y: 27 },
  { x: 31, y: 35 },
  { x: 32, y: 45 },
  { x: 10, y: 13 },
  { x: 49, y: 16 },
  { x: 48, y: 26 },
]

// A map may ask for its matches to stand in the middle of their cells (cellCenter: 0.5); the earlier room has them at
// the corner, as before.
const getMapPoint = (state, map) => ({
  x: ((state.x + (map.cellCenter ?? 0)) / map.width) * 100,
  y: ((state.y + (map.cellCenter ?? 0)) / map.height) * 100,
})

// `zoom` is how much the room is enlarged about the view (see lib/room-zoom.mjs); the middle of the view, in cells of the
// map, is left on the world for the status bar to read
const applyCamera = (cameraWorld, viewport, target, map, zoom = 1) => {
  const worldWidth = cameraWorld.clientWidth
  const worldHeight = cameraWorld.clientHeight
  const viewportWidth = viewport.clientWidth
  const viewportHeight = viewport.clientHeight
  if (!worldWidth || !worldHeight || !viewportWidth || !viewportHeight) return

  const shownWidth = worldWidth * zoom
  const shownHeight = worldHeight * zoom
  const targetX = (target.x / map.width) * shownWidth
  const targetY = (target.y / map.height) * shownHeight
  const minX = Math.min(0, viewportWidth - shownWidth)
  const minY = Math.min(0, viewportHeight - shownHeight)
  const x = Math.min(0, Math.max(minX, viewportWidth / 2 - targetX))
  const y = Math.min(0, Math.max(minY, viewportHeight / 2 - targetY))

  cameraWorld.style.transformOrigin = '0 0'
  cameraWorld.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`
  cameraWorld.dataset.viewX = (((viewportWidth / 2 - x) / shownWidth) * map.width).toFixed(1)
  cameraWorld.dataset.viewY = (((viewportHeight / 2 - y) / shownHeight) * map.height).toFixed(1)
}

export function FollowingCharacterWorld({
  activeCharacterId,
  characterIds,
  characterCustomizations = {},
  characterAccessories = {},
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
    let zoomNow = getRoomZoom()

    const getInitialPosition = (characterId, index) => {
      // a map may give its own places to start (the house picture does); the earlier room keeps its own
      if (characterId === activeCharacterRef.current) {
        return navigation.resolveWalkableCell(map.startCell ?? LIVING_ROOM_CAMERA_FOCUS)
      }
      const cells = map.spawnCells ?? DEFAULT_CHARACTER_CELLS
      return navigation.resolveWalkableCell(cells[index % cells.length])
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
          previousState.random ?? Math.random,
          map.walkSpeed
        )

        motionStatesRef.current.set(characterId, nextState)
        const point = getMapPoint(nextState, map)
        character.style.left = `${point.x}%`
        character.style.top = `${point.y}%`
      })

      const activeId = activeCharacterRef.current
      const activeState = activeId ? motionStatesRef.current.get(activeId) : null
      const cameraTarget = activeState ?? map.overviewFocus ?? OVERVIEW_CAMERA_FOCUS
      // the zoom the keys ask for is reached smoothly, not in one jump
      const wanted = getRoomZoom()
      zoomNow += (wanted - zoomNow) * (1 - Math.exp(-deltaSeconds / 0.1))
      if (Math.abs(wanted - zoomNow) < 0.0005) zoomNow = wanted
      applyCamera(cameraWorld, viewport, cameraTarget, map, zoomNow)
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
      const expressionIndex = customization?.expression
      const flameColorIndex = customization?.['flame-color']
      const flameShapeIndex = customization?.['flame-shape']
      const shoeIndex = customization?.shoes
      const hasMatchColor = Number.isInteger(matchColorIndex)
      const hasExpression = Number.isInteger(expressionIndex)
      const hasFlameShape = Number.isInteger(flameShapeIndex)
      const hasFlameColor = Number.isInteger(flameColorIndex)
      const hasShoe = Number.isInteger(shoeIndex)
      const shoeSrc = CUSTOM_SHOE_SRCS[hasShoe ? shoeIndex : 0]
      const isCustomized = hasMatchColor || hasExpression || hasFlameShape || hasShoe
      const style = isCustomized
        ? {
            transform: 'translate3d(-50%, -50%, 0)',
            ...(hasShoe ? { '--character-shoe-tone': SHOE_TONES[shoeIndex] } : {}),
          }
        : undefined

      const flameSrc = hasFlameShape
        ? assetPath(`media/flame-shape-${String(flameShapeIndex + 1).padStart(2, '0')}.png`)
        : null
      const expressionSrc = hasExpression
        ? assetPath(`media/expression-${String(expressionIndex + 1).padStart(2, '0')}.png`)
        : null
      const expressionIsCompact = expressionIndex === 0 || expressionIndex === 4 || expressionIndex === 5
      const expressionFillSrc = expressionIndex === 1 ? assetPath('media/expression-02-fill.svg') : null
      const flame = flameSrc
        ? createElement('span', {
            className: 'wandering-character-flame',
            'data-flame-src': flameSrc,
            'aria-hidden': 'true',
            style: {
              '--character-flame-color':
                FLAME_COLOR_TONES[hasFlameColor ? flameColorIndex : 0] ?? FLAME_COLOR_TONES[0],
              '--character-flame-image': `url(${flameSrc})`,
              '--character-flame-offset-x': FLAME_ATTACH_OFFSETS[flameShapeIndex] ?? '0%',
            },
          })
        : null
      const expressionFill = expressionFillSrc
        ? createElement('img', {
            className: 'wandering-character-expression-fill',
            src: expressionFillSrc,
            'data-expression-fill-src': expressionFillSrc,
            alt: '',
            draggable: false,
          })
        : null
      const expression = expressionSrc
        ? createElement('img', {
            className: `wandering-character-expression${expressionIsCompact ? ' wandering-character-expression-compact' : ''}`,
            src: expressionSrc,
            'data-expression-src': expressionSrc,
            alt: '',
            draggable: false,
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
        expressionFill,
        expression,
        hasShoe
          ? createElement('i', {
              className: 'wandering-character-shoe',
              'aria-hidden': 'true',
              'data-shoe-src': shoeSrc,
              'data-shoe-index': String(shoeIndex),
              style: {
                '--character-shoe-image': `url(${shoeSrc})`,
                '--character-shoe-offset-x': SHOE_ATTACH_OFFSETS[shoeIndex] ?? '0%',
                '--character-shoe-width': SHOE_WIDTHS[shoeIndex] ?? '73%',
              },
            })
          : null,
        characterAccessories[characterId]?.length
          ? createElement(
              'span',
              { className: 'wandering-character-accessories', 'aria-hidden': 'true' },
              characterAccessories[characterId].map((item) =>
                createElement('img', {
                  key: item.id,
                  className: 'wandering-character-accessory',
                  src: item.src,
                  alt: '',
                  draggable: false,
                  style: {
                    left: `${item.x * 100}%`,
                    top: `${item.y * 100}%`,
                    width: `${item.width * 100}%`,
                    aspectRatio: String(item.aspect),
                  },
                })
              )
            )
          : null
      )
    })
  )
}
