'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  advanceBouncingCharacter,
  createRandomBouncingCharacter,
} from '../../lib/bouncing-character.mjs'

export function WanderingCharacter({ npcIndex }) {
  const characterRef = useRef(null)

  useEffect(() => {
    const character = characterRef.current
    const playfield = character?.parentElement
    if (!character || !playfield) return undefined

    let frameId = 0
    let previousTime = performance.now()
    let state = createRandomBouncingCharacter({
      width: playfield.clientWidth,
      height: playfield.clientHeight,
      itemWidth: character.offsetWidth,
      itemHeight: character.offsetHeight,
    })

    const renderPosition = () => {
      character.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`
    }

    const animate = (currentTime) => {
      const deltaSeconds = Math.min(0.05, Math.max(0, (currentTime - previousTime) / 1000))
      previousTime = currentTime
      state = advanceBouncingCharacter(
        state,
        {
          width: playfield.clientWidth,
          height: playfield.clientHeight,
          itemWidth: character.offsetWidth,
          itemHeight: character.offsetHeight,
        },
        deltaSeconds
      )
      renderPosition()
      frameId = requestAnimationFrame(animate)
    }

    renderPosition()
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [])

  return createElement('img', {
    ref: characterRef,
    className: 'wandering-character',
    src: assetPath('media/page3-character.png'),
    alt: '',
    draggable: false,
    'data-npc-index': npcIndex,
  })
}
