'use client'

import { createElement, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

const SHOE_OPTIONS = [
  { id: 'shoe-01', label: '신발 1', tone: '#202020', accent: '#f2f2f2' },
  { id: 'shoe-02', label: '신발 2', tone: '#d5d5d5', accent: '#202020' },
  { id: 'shoe-03', label: '신발 3', tone: '#7b7b7b', accent: '#f7f7f7' },
  { id: 'shoe-04', label: '신발 4', tone: '#b70000', accent: '#f5f5f5' },
]

function ShoeGlyph({ option }) {
  return createElement(
    'span',
    {
      className: 'character-custom-shoe-glyph',
      style: { '--shoe-tone': option.tone, '--shoe-accent': option.accent },
      'aria-hidden': 'true',
    },
    createElement('span', { className: 'character-custom-shoe-sole' })
  )
}

export function CharacterCustomizationSidebar() {
  const [selectedShoe, setSelectedShoe] = useState(0)
  const selectedOption = SHOE_OPTIONS[selectedShoe]

  return createElement(
    'aside',
    {
      className: 'character-custom-sidebar',
      'aria-label': '캐릭터 커스터마이징 사이드바',
      'data-selected-shoe': selectedOption.id,
    },
    createElement(
      'header',
      { className: 'character-custom-header' },
      createElement('span', { className: 'character-custom-kicker' }, 'CHARACTER'),
      createElement('span', { className: 'character-custom-title' }, 'CUSTOM')
    ),
    createElement(
      'section',
      { className: 'character-custom-preview', 'aria-label': '캐릭터 미리보기' },
      createElement(
        'div',
        { className: 'character-custom-preview-stage' },
        createElement('img', {
          className: 'character-custom-preview-image',
          src: assetPath('media/page3-character.png'),
          alt: '선택한 캐릭터 미리보기',
          draggable: false,
        }),
        createElement(
          'div',
          { className: 'character-custom-preview-shoe', 'aria-hidden': 'true' },
          createElement(ShoeGlyph, { option: selectedOption })
        )
      ),
      createElement(
        'div',
        { className: 'character-custom-preview-caption' },
        createElement('span', null, 'preview'),
        createElement('strong', null, selectedOption.label)
      )
    ),
    createElement(
      'section',
      { className: 'character-custom-shoes', 'aria-label': '신발 선택' },
      createElement(
        'div',
        { className: 'character-custom-section-heading' },
        createElement('span', null, 'SHOE'),
        createElement('span', null, `${String(selectedShoe + 1).padStart(2, '0')} / 04`)
      ),
      createElement(
        'div',
        { className: 'character-custom-shoe-list' },
        SHOE_OPTIONS.map((option, index) =>
          createElement(
            'button',
            {
              key: option.id,
              type: 'button',
              className: `character-custom-shoe-option${selectedShoe === index ? ' is-selected' : ''}`,
              'aria-label': option.label,
              'aria-pressed': selectedShoe === index,
              onClick: () => setSelectedShoe(index),
            },
            createElement(ShoeGlyph, { option })
          )
        )
      )
    ),
    createElement(
      'label',
      { className: 'character-custom-input-label' },
      createElement('span', null, 'INPUT'),
      createElement('input', {
        className: 'character-custom-input',
        type: 'text',
        placeholder: 'input',
        'aria-label': '캐릭터 input',
      })
    ),
    createElement(
      'div',
      { className: 'character-custom-footer' },
      createElement('span', null, 'SELECT A SHOE TO PREVIEW')
    )
  )
}
