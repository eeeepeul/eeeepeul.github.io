'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  CHARACTER_WORLD_ID,
  SHARED_CHARACTER_EVENT,
  createRandomCharacterCustomization,
  normalizeCharacterCustomization,
  startSharedCharacterFeed,
} from '../../lib/shared-characters.mjs'
import { getSharedCharacterStore } from '../../lib/supabase-browser.mjs'
import { CustomSidebarContent } from './CustomSidebarContent.mjs'
import { HouseInteriorWorld } from './HouseInteriorWorld.mjs'
import { LandingFrame } from './LandingFrame.mjs'

const INITIAL_CHARACTER_IDS = Array.from({ length: 6 }, (_, index) => `npc-${index + 1}`)
const SHARED_CHARACTER_PREFIX = 'shared-character-'
const DEFAULT_CUSTOMIZATION = {
  'match-color': 0,
  expression: 0,
  'flame-color': 0,
  'flame-shape': 0,
  shoes: 0,
}
const SHARED_CHARACTER_WINDOW_MS = 24 * 60 * 60 * 1000

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

  useEffect(() => {
    setCharacterCustomizations((currentCustomizations) => {
      const nextCustomizations = { ...currentCustomizations }
      INITIAL_CHARACTER_IDS.forEach((id) => {
        if (!nextCustomizations[id]) {
          nextCustomizations[id] = createRandomCharacterCustomization()
        }
      })
      return nextCustomizations
    })
  }, [])

  useEffect(() => {
    const feed = startSharedCharacterFeed({
      store: getSharedCharacterStore(),
      getSinceMs: () => Date.now() - SHARED_CHARACTER_WINDOW_MS,
      onCharacters: (characters) => {
        const remoteIds = characters.map(({ id }) => `${SHARED_CHARACTER_PREFIX}${id}`)
        setCharacterIds((currentIds) => [
          ...currentIds.filter((id) => !id.startsWith(SHARED_CHARACTER_PREFIX)),
          ...remoteIds,
        ])
        setCharacterCustomizations((currentCustomizations) => {
          const nextCustomizations = { ...currentCustomizations }
          characters.forEach(({ id, customization }) => {
            nextCustomizations[`${SHARED_CHARACTER_PREFIX}${id}`] = customization
          })
          Object.keys(nextCustomizations).forEach((id) => {
            if (id.startsWith(SHARED_CHARACTER_PREFIX) && !remoteIds.includes(id)) {
              delete nextCustomizations[id]
            }
          })
          return nextCustomizations
        })
      },
    })

    return () => {
      void feed.cleanup()
    }
  }, [])

  const addCharacter = (customization) => {
    const selectedCustomization = normalizeCharacterCustomization(customization) ?? {
      ...DEFAULT_CUSTOMIZATION,
    }
    const localCharacterId = `character-${nextCharacterNumber.current}`
    nextCharacterNumber.current += 1
    setCharacterIds((currentIds) => [...currentIds, localCharacterId])
    setCharacterCustomizations((currentCustomizations) => ({
      ...currentCustomizations,
      [localCharacterId]: selectedCustomization,
    }))
    setActiveCharacterId(localCharacterId)

    const store = getSharedCharacterStore()
    if (!store) return

    void store
      .recordCharacter(selectedCustomization, CHARACTER_WORLD_ID)
      .then((character) => {
        const sharedCharacterId = `${SHARED_CHARACTER_PREFIX}${character.id}`
        setCharacterIds((currentIds) => [
          ...currentIds.filter((id) => id !== localCharacterId),
          ...(currentIds.includes(sharedCharacterId) ? [] : [sharedCharacterId]),
        ])
        setCharacterCustomizations((currentCustomizations) => {
          const nextCustomizations = { ...currentCustomizations, [sharedCharacterId]: character.customization }
          delete nextCustomizations[localCharacterId]
          return nextCustomizations
        })
        setActiveCharacterId(sharedCharacterId)
        window.dispatchEvent(new CustomEvent(SHARED_CHARACTER_EVENT, { detail: { character } }))
      })
      .catch(() => {
        // The local character stays visible when shared storage is unavailable.
      })
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
