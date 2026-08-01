'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  advanceBouncingCharacter,
  createCameraRelativeWorldPosition,
  createFollowCameraOffset,
  createRandomBouncingCharacter,
} from '../../lib/bouncing-character.mjs'

export function FollowingCharacterWorld({ activeCharacterId, characterIds }) {
  const activeCharacterRef = useRef(activeCharacterId)
  const characterNodesRef = useRef(new Map())
  const motionStatesRef = useRef(new Map())
  const screenMotionStatesRef = useRef(new Map())
  const worldRef = useRef(null)

  activeCharacterRef.current = activeCharacterId

  useEffect(() => {
    const world = worldRef.current
    const viewport = world?.parentElement
    if (!world || !viewport) return undefined

    let frameId = 0
    let previousTime = performance.now()

    const animate = (currentTime) => {
      const deltaSeconds = Math.min(0.05, Math.max(0, (currentTime - previousTime) / 1000))
      previousTime = currentTime

      characterNodesRef.current.forEach((character, characterId) => {
        const bounds = {
          width: world.clientWidth,
          height: world.clientHeight,
          itemWidth: character.offsetWidth,
          itemHeight: character.offsetHeight,
        }
        const previousState =
          motionStatesRef.current.get(characterId) ?? createRandomBouncingCharacter(bounds)
        const nextState = advanceBouncingCharacter(previousState, bounds, deltaSeconds)

        motionStatesRef.current.set(characterId, nextState)
      })

      const activeId = activeCharacterRef.current
      const activeCharacter = activeId ? characterNodesRef.current.get(activeId) : null
      const activeState = activeId ? motionStatesRef.current.get(activeId) : null

      if (activeCharacter && activeState) {
        const offset = createFollowCameraOffset(
          {
            ...activeState,
            itemWidth: activeCharacter.offsetWidth,
            itemHeight: activeCharacter.offsetHeight,
          },
          { width: viewport.clientWidth, height: viewport.clientHeight }
        )
        world.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`

        characterNodesRef.current.forEach((character, characterId) => {
          if (characterId === activeId) {
            character.style.transform = `translate3d(${activeState.x}px, ${activeState.y}px, 0)`
            return
          }

          const screenBounds = {
            width: viewport.clientWidth,
            height: viewport.clientHeight,
            itemWidth: character.offsetWidth,
            itemHeight: character.offsetHeight,
          }
          const previousScreenState =
            screenMotionStatesRef.current.get(characterId) ??
            createRandomBouncingCharacter(screenBounds)
          const nextScreenState = advanceBouncingCharacter(
            previousScreenState,
            screenBounds,
            deltaSeconds
          )
          const worldPosition = createCameraRelativeWorldPosition(nextScreenState, offset)

          screenMotionStatesRef.current.set(characterId, nextScreenState)
          character.style.transform = `translate3d(${worldPosition.x}px, ${worldPosition.y}px, 0)`
        })
      } else {
        world.style.transform = 'translate3d(0, 0, 0)'
        screenMotionStatesRef.current.clear()
        characterNodesRef.current.forEach((character, characterId) => {
          const state = motionStatesRef.current.get(characterId)
          if (state) {
            character.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`
          }
        })
      }

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
    },
    characterIds.map((characterId) =>
      createElement('img', {
        key: characterId,
        ref: (node) => {
          if (node) characterNodesRef.current.set(characterId, node)
          else characterNodesRef.current.delete(characterId)
        },
        className: 'wandering-character',
        src: assetPath('media/page3-character.png'),
        alt: '',
        draggable: false,
        'data-character-id': characterId,
        'data-character-role': characterId === activeCharacterId ? 'player' : 'npc',
      })
    )
  )
}
