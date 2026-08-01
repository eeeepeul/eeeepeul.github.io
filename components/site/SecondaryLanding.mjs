'use client'

import { createElement, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { FollowingCharacterWorld } from './FollowingCharacterWorld.mjs'
import { LandingFrame } from './LandingFrame.mjs'

const INITIAL_CHARACTER_IDS = Array.from({ length: 6 }, (_, index) => `npc-${index + 1}`)

export function SecondaryLanding() {
  const [activeCharacterId, setActiveCharacterId] = useState(null)
  const [characterIds, setCharacterIds] = useState(INITIAL_CHARACTER_IDS)
  const nextCharacterNumber = useRef(7)

  const addCharacter = () => {
    const characterId = `character-${nextCharacterNumber.current}`
    nextCharacterNumber.current += 1
    setCharacterIds((currentIds) => [...currentIds, characterId])
    setActiveCharacterId(characterId)
  }

  return createElement(LandingFrame, {
    houseHref: assetPath(''),
    houseLabel: '메인 화면으로 이동',
    playfield: createElement(FollowingCharacterWorld, {
      activeCharacterId,
      characterIds,
    }),
    panelLabel: '캐릭터 선택 패널',
    panel: createElement(
      'button',
      {
        type: 'button',
        className: 'character-spawn-button',
        'aria-label': '새 캐릭터 추가',
        onClick: addCharacter,
      },
      createElement('span', {
        className: 'character-spawn-icon',
        'aria-hidden': 'true',
      })
    ),
  })
}
