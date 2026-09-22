'use client'

import { createElement, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

const SPOT_COUNT = 4
const SLOT_TONES = ['#e1e1e1', '#e1e1e1', '#c0c0c0', '#d7d7d7']

function ArrowButton({ direction, onClick }) {
  return createElement(
    'button',
    {
      type: 'button',
      className: 'custom-sidebar-chevron',
      'aria-label': `${direction === 'previous' ? '이전' : '다음'} custom`,
      onClick,
    },
    direction === 'previous' ? '‹' : '›'
  )
}

function SpotRow({ index, isSelected, onSelect }) {
  return createElement(
    'section',
    {
      className: `custom-sidebar-spot-row${isSelected ? ' is-selected' : ''}`,
      'aria-label': `custom ${index + 1}`,
    },
    createElement(
      'div',
      { className: 'custom-sidebar-spot-heading' },
      createElement('span', null, 'custom'),
      createElement(
        'div',
        { className: 'custom-sidebar-chevron-group' },
        createElement(ArrowButton, { direction: 'previous', onClick: () => onSelect(index) }),
        createElement(ArrowButton, { direction: 'next', onClick: () => onSelect(index) })
      )
    ),
    createElement(
      'div',
      { className: 'custom-sidebar-slot-row' },
      SLOT_TONES.map((tone, slotIndex) =>
        createElement('button', {
          key: `${index}-${slotIndex}`,
          type: 'button',
          className: 'custom-sidebar-spot-slot',
          'aria-label': `custom ${index + 1} 슬롯 ${slotIndex + 1}`,
          'aria-pressed': isSelected,
          style: { '--custom-sidebar-slot-tone': tone },
          onClick: () => onSelect(index),
        })
      )
    )
  )
}

export function CustomSidebar() {
  const [selectedSpot, setSelectedSpot] = useState(0)

  return createElement(
    'aside',
    {
      className: 'custom-sidebar',
      'aria-label': 'custom 사이드바',
      'data-node-id': '3702:2601',
    },
    createElement(
      'div',
      { className: 'custom-sidebar-brand', 'aria-hidden': 'true' },
      createElement('div', { className: 'custom-sidebar-brand-oval' }),
      createElement('img', {
        className: 'custom-sidebar-brand-mark',
        src: assetPath('media/figma-sidebar-wordmark.svg'),
        alt: '',
        draggable: false,
      })
    ),
    createElement(
      'section',
      { className: 'custom-sidebar-art-card', 'aria-label': 'custom 미리보기' },
      createElement('div', { className: 'custom-sidebar-art-surface' }),
      createElement('img', {
        className: 'custom-sidebar-artwork',
        src: assetPath('media/figma-cctv-artwork.svg'),
        alt: '',
        draggable: false,
      }),
      createElement('img', {
        className: 'custom-sidebar-artwork-shadow',
        src: assetPath('media/figma-cctv-artwork-shadow.svg'),
        alt: '',
        draggable: false,
      }),
      createElement('input', {
        className: 'custom-sidebar-mood-input',
        type: 'text',
        placeholder: '오늘 어떤가요',
        'aria-label': '오늘 어떤가요',
      }),
      createElement(
        'div',
        { className: 'custom-sidebar-art-slots', 'aria-hidden': 'true' },
        [0, 1, 2, 3].map((slotIndex) =>
          createElement('span', { key: slotIndex, className: 'custom-sidebar-art-slot' })
        )
      ),
      createElement('div', { className: 'custom-sidebar-art-symbol', 'aria-hidden': 'true' })
    ),
    createElement(
      'div',
      { className: 'custom-sidebar-spots' },
      Array.from({ length: SPOT_COUNT }, (_, index) =>
        createElement(SpotRow, {
          key: index,
          index,
          isSelected: selectedSpot === index,
          onSelect: setSelectedSpot,
        })
      )
    ),
    createElement(
      'div',
      { className: 'custom-sidebar-footer' },
      createElement('input', {
        className: 'custom-sidebar-footer-input',
        type: 'text',
        placeholder: 'input',
        'aria-label': 'input',
      })
    )
  )
}
