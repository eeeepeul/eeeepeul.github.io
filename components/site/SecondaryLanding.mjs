'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { CustomSidebarContent } from './CustomSidebarContent.mjs'
import { HouseInteriorWorld } from './HouseInteriorWorld.mjs'
import { LandingFrame } from './LandingFrame.mjs'

const INITIAL_CHARACTER_IDS = Array.from({ length: 6 }, (_, index) => `npc-${index + 1}`)

export function SecondaryLanding() {
  // The custom page keeps the same house interior world built for /second/;
  // only the sidebar changes to the Figma character custom controls.
  const [isCustomView, setIsCustomView] = useState(false)
  const [activeCharacterId, setActiveCharacterId] = useState(null)
  const [characterIds, setCharacterIds] = useState(INITIAL_CHARACTER_IDS)
  const [characterCustomizations, setCharacterCustomizations] = useState({})
  const nextCharacterNumber = useRef(7)

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view')
    setIsCustomView(view === 'custom')
  }, [])

  const addCharacter = (customization) => {
    const characterId = `character-${nextCharacterNumber.current}`
    nextCharacterNumber.current += 1
    setCharacterIds((currentIds) => [...currentIds, characterId])
    setCharacterCustomizations((currentCustomizations) => ({
      ...currentCustomizations,
      [characterId]: customization,
    }))
    setActiveCharacterId(characterId)
  }

  return createElement(LandingFrame, {
    houseHref: assetPath(''),
    houseLabel: '메인 화면으로 이동',
    navigationCurrent: isCustomView ? 'custom' : '',
    playfield: createElement(HouseInteriorWorld, {
      activeCharacterId,
      characterIds,
      characterCustomizations,
    }),
    panelLabel: isCustomView ? '캐릭터 커스터마이징 사이드바' : '캐릭터 선택 패널',
    panel: isCustomView
      ? createElement(CustomSidebarContent, { onInput: addCharacter })
      : createElement(
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
