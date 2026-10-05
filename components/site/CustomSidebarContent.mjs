'use client'

import { createElement, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  FLAME_ATTACH_OFFSETS,
  FLAME_COLOR_TONES,
  MATCH_BODY_TONE,
  MATCH_COLOR_TONES,
  SHOE_ATTACH_OFFSETS,
  SHOE_IMAGES,
  SHOE_TONES,
  SHOE_WIDTHS,
} from '../../lib/character-customization.mjs'

const SPOTS = [
  { id: 'spot-01', label: 'spot 01', tone: '#282828', union: 'union-one' },
  { id: 'spot-02', label: 'spot 02', tone: '#d7d7d7', union: 'union-two' },
  { id: 'spot-03', label: 'spot 03', tone: '#d7d7d7', union: 'union-three' },
  { id: 'spot-04', label: 'spot 04', tone: '#d7d7d7', union: 'union-four' },
]

const CUSTOM_PAGE_SIZE = 4
const MATCH_CHARACTER_SRC = assetPath('media/match-character.svg')
const MATCH_CHARACTER_HEAD_SRC = assetPath('media/match-character-head.svg')
const MATCH_CHARACTER_HEAD_AVATAR_SRC = assetPath('media/match-character-head-avatar.svg')
const CUSTOM_SHOE_SRCS = SHOE_IMAGES.map((source) => assetPath(source))
const CUSTOM_SECTIONS = [
  { key: 'match-color', label: '성냥색', itemCount: 4 },
  { key: 'expression', label: '표정', itemCount: 6 },
  { key: 'flame-color', label: '불 색', itemCount: 4 },
  { key: 'flame-shape', label: '불 형태', itemCount: 5 },
  { key: 'shoes', label: '신발', itemCount: 4 },
]

export function getCustomWindowStart(itemCount, page) {
  const maxStart = Math.max(0, itemCount - CUSTOM_PAGE_SIZE)
  return Math.min(maxStart, Math.max(0, page) * CUSTOM_PAGE_SIZE)
}

export function getCustomRowLayout(itemCount, page) {
  const safeItemCount = Math.max(0, Number(itemCount) || 0)
  const visibleItemCount = Math.min(CUSTOM_PAGE_SIZE, safeItemCount)
  const firstItemIndex = getCustomWindowStart(safeItemCount, page)
  const gapWidth = Math.max(0, visibleItemCount - 1) * 9
  const trackPercent = visibleItemCount ? (firstItemIndex / visibleItemCount) * 100 : 0
  const trackGapOffset = visibleItemCount
    ? firstItemIndex * 9 - (firstItemIndex / visibleItemCount) * gapWidth
    : 0
  const trackOffset = firstItemIndex
    ? `calc(-${trackPercent}% - ${trackGapOffset}px)`
    : '0%'

  return {
    firstItemIndex,
    trackWidth: '100%',
    trackOffset,
    swatchBasis: visibleItemCount
      ? `calc((100% - ${gapWidth}px) / ${visibleItemCount})`
      : '0px',
  }
}

export function hasCompleteCustomSelection(selection = {}) {
  return CUSTOM_SECTIONS.every(({ key }) => Number.isInteger(selection[key]))
}

function TopArtwork() {
  return createElement(
    'div',
    { className: 'custom-sidebar-artwork', 'aria-hidden': 'true' },
    createElement('span', { className: 'custom-sidebar-artwork-plane' }),
    createElement('span', { className: 'custom-sidebar-artwork-shadow' })
  )
}

function SpotGraphic({ variant }) {
  return createElement(
    'span',
    { className: `custom-sidebar-union ${variant}`, 'aria-hidden': 'true' },
    createElement('i', null),
    createElement('i', null),
    createElement('i', null)
  )
}

function SpotRow({ id, label, tone, union }) {
  return createElement(
    'div',
    { className: 'custom-sidebar-spot-row', 'data-spot': id },
    createElement('span', { className: 'custom-sidebar-spot-dot', style: { backgroundColor: tone } }),
    createElement('span', { className: 'custom-sidebar-spot-label' }, label),
    createElement(
      'span',
      { className: 'custom-sidebar-spot-bars', 'aria-hidden': 'true' },
      ...Array.from({ length: 8 }, (_, index) =>
        createElement('i', { key: `${id}-bar-${index}`, className: index < (id === 'spot-01' ? 6 : 0) ? 'is-active' : '' })
      )
    ),
    createElement(SpotGraphic, { variant: union })
  )
}

function ColorCombination() {
  const colors = ['#8eb3cc', '#5630c9', '#2451cf', '#164631']

  return createElement(
    'section',
    { className: 'custom-sidebar-section custom-sidebar-color', 'aria-labelledby': 'custom-color-heading' },
    createElement('h2', { id: 'custom-color-heading' }, 'color combination'),
    createElement(
      'div',
      { className: 'custom-sidebar-swatches' },
      ...colors.map((color, index) =>
        createElement(
          'button',
          {
            type: 'button',
            className: `custom-sidebar-swatch${index === 0 ? ' is-selected' : ''}`,
            key: `swatch-${color}`,
            'aria-label': `색 조합 ${index + 1}`,
            style: { '--custom-swatch': color },
          },
          'MOME'[index]
        )
      )
    )
  )
}

function PatternSetting({ label, value, max = 10 }) {
  const fill = `${Math.min(100, (value / max) * 100)}%`
  return createElement(
    'label',
    { className: 'custom-sidebar-setting', style: { '--custom-setting-fill': fill } },
    createElement('span', { className: 'custom-sidebar-setting-fill', 'aria-hidden': 'true' }),
    createElement('span', null, label),
    createElement('output', null, value.toFixed(2)),
    createElement('input', { type: 'range', min: 0, max, step: 0.01, defaultValue: value, 'aria-label': label })
  )
}

export function PixelSidebarPreview({ matchColorIndex, expressionIndex, shoeIndex, flameColorIndex, flameShapeIndex }) {
  const matchTone = MATCH_COLOR_TONES[Number.isInteger(matchColorIndex) ? matchColorIndex : 0]
  const expressionSrc = Number.isInteger(expressionIndex)
    ? assetPath(`media/expression-${String(expressionIndex + 1).padStart(2, '0')}.png`)
    : null
  const expressionIsCompact = expressionIndex === 0 || expressionIndex === 4 || expressionIndex === 5
  const expressionAvatarIsAngry = expressionIndex === 4
  const expressionFillSrc = expressionIndex === 1 ? assetPath('media/expression-02-fill.svg') : null
  const shoeTone = SHOE_TONES[Number.isInteger(shoeIndex) ? shoeIndex : 0]
  const shoeSrc = CUSTOM_SHOE_SRCS[Number.isInteger(shoeIndex) ? shoeIndex : 0]
  const flameTone = FLAME_COLOR_TONES[Number.isInteger(flameColorIndex) ? flameColorIndex : 0]
  const flameShapeSrc = Number.isInteger(flameShapeIndex)
    ? assetPath(`media/flame-shape-${String(flameShapeIndex + 1).padStart(2, '0')}.png`)
    : null
  const toolExpressionSrc = expressionSrc ?? assetPath('media/expression-01.png')

  return createElement(
    'section',
    { className: 'pixel-sidebar-preview', 'aria-label': '오늘 어떤가요' },
    createElement(
      'div',
      { className: 'pixel-sidebar-question' },
      createElement('span', null, '오늘 어떤가요'),
      createElement('i', { 'aria-hidden': 'true' })
    ),
    createElement(
      'div',
      { className: 'pixel-sidebar-preview-frame' },
      createElement(
        'span',
        {
          className: 'pixel-sidebar-character',
          'aria-hidden': 'true',
          style: { '--character-tone': MATCH_BODY_TONE, '--shoe-tone': shoeTone },
        },
        flameShapeSrc
          ? createElement('span', {
              className: 'pixel-sidebar-character-flame',
              'data-flame-src': flameShapeSrc,
              'aria-hidden': 'true',
              style: {
                '--character-flame-color': flameTone,
                '--character-flame-image': `url(${flameShapeSrc})`,
                '--character-flame-offset-x': FLAME_ATTACH_OFFSETS[flameShapeIndex] ?? '0%',
              },
            })
          : null,
        createElement('i', {
          className: 'pixel-sidebar-character-silhouette',
          'data-silhouette-src': MATCH_CHARACTER_SRC,
          style: { '--match-character-image': `url(${MATCH_CHARACTER_SRC})` },
        }),
        createElement('i', {
          className: 'pixel-sidebar-character-head',
          'data-head-src': MATCH_CHARACTER_HEAD_SRC,
          style: {
            '--character-head-tone': matchTone,
            '--match-character-head-image': `url(${MATCH_CHARACTER_HEAD_SRC})`,
          },
        }),
        expressionFillSrc
          ? createElement('img', {
              className: 'pixel-sidebar-character-expression-fill',
              src: expressionFillSrc,
              'data-expression-fill-src': expressionFillSrc,
              alt: '',
              draggable: false,
            })
          : null,
        expressionSrc
          ? createElement('img', {
              className: `pixel-sidebar-character-expression${expressionIsCompact ? ' pixel-sidebar-expression-compact' : ''}`,
              src: expressionSrc,
              'data-expression-src': expressionSrc,
              alt: '',
              draggable: false,
            })
          : null,
        Number.isInteger(shoeIndex)
          ? createElement('i', {
              className: 'pixel-sidebar-character-shoe',
              'data-shoe-src': shoeSrc,
              'data-shoe-index': String(shoeIndex),
              style: {
                '--character-shoe-image': `url(${shoeSrc})`,
                '--character-shoe-offset-x': SHOE_ATTACH_OFFSETS[shoeIndex] ?? '0%',
                '--character-shoe-width': SHOE_WIDTHS[shoeIndex] ?? '73%',
              },
            })
          : null
      ),
      createElement(
        'div',
        { className: 'pixel-sidebar-tool-stack', 'aria-hidden': 'true' },
        createElement(
          'span',
          {
            className: 'pixel-sidebar-tool-expression',
            'data-preview-tool': 'expression',
            'data-expression-src': toolExpressionSrc,
            style: {
              '--tool-head-tone': matchTone,
              '--tool-head-image': `url(${MATCH_CHARACTER_HEAD_AVATAR_SRC})`,
            },
          },
          createElement(
            'i',
            { className: 'pixel-sidebar-tool-head' },
            createElement('img', {
              className: 'pixel-sidebar-tool-expression-art',
              src: toolExpressionSrc,
              alt: '',
              draggable: false,
            })
          )
        ),
        createElement(
          'span',
          {
            className: 'pixel-sidebar-tool-colors',
            'data-preview-tool': 'match-flame-colors',
            style: { '--tool-match-tone': matchTone, '--tool-flame-tone': flameTone },
          },
          createElement('i', { className: 'pixel-sidebar-tool-match-color' }),
          createElement('i', { className: 'pixel-sidebar-tool-flame-color' })
        ),
        createElement('span', {
          className: 'pixel-sidebar-tool-shoes',
          'data-preview-tool': 'shoes',
          'data-shoe-src': shoeSrc,
          style: {
            '--tool-shoe-tone': shoeTone,
            '--tool-shoe-image': `url(${shoeSrc})`,
          },
        })
      ),
      createElement(
        'span',
        {
          className: 'pixel-sidebar-avatar-small',
          'aria-hidden': 'true',
          style: {
            '--avatar-head-tone': matchTone,
            '--avatar-body-tone': MATCH_BODY_TONE,
            '--avatar-head-image': `url(${MATCH_CHARACTER_HEAD_AVATAR_SRC})`,
          },
        },
        flameShapeSrc
          ? createElement('i', {
              className: 'pixel-sidebar-avatar-flame',
              'data-flame-src': flameShapeSrc,
              style: {
                '--avatar-flame-color': flameTone,
                '--avatar-flame-image': `url(${flameShapeSrc})`,
                '--avatar-flame-offset-x': FLAME_ATTACH_OFFSETS[flameShapeIndex] ?? '0%',
              },
            })
          : null,
        createElement('i', {
          className: 'pixel-sidebar-avatar-face',
          'data-avatar-head-src': MATCH_CHARACTER_HEAD_AVATAR_SRC,
        }),
        expressionFillSrc
          ? createElement('img', {
              className: 'pixel-sidebar-avatar-expression-fill',
              src: expressionFillSrc,
              'data-expression-fill-src': expressionFillSrc,
              alt: '',
              draggable: false,
            })
          : null,
        expressionSrc
          ? createElement('img', {
          className: `pixel-sidebar-avatar-expression${expressionIsCompact ? ' pixel-sidebar-expression-compact' : ''}${expressionAvatarIsAngry ? ' pixel-sidebar-expression-angry' : ''}`,
              src: expressionSrc,
              'data-expression-src': expressionSrc,
              alt: '',
              draggable: false,
            })
          : null,
        createElement('i', { className: 'pixel-sidebar-avatar-body' })
      )
    )
  )
}

function PixelCustomRow({ section, selectedIndex, onSelect }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(section.itemCount / CUSTOM_PAGE_SIZE)
  const { firstItemIndex, trackWidth, trackOffset, swatchBasis } = getCustomRowLayout(
    section.itemCount,
    page
  )

  return createElement(
    'section',
    {
      className: 'pixel-custom-row',
      'aria-label': section.label,
      'data-custom-label': section.label,
      'data-item-count': section.itemCount,
      'data-page-count': pageCount,
    },
    createElement(
      'div',
      { className: 'pixel-custom-row-header' },
      createElement('span', null, section.label),
      pageCount > 1
        ? createElement(
            'span',
            { className: 'pixel-custom-row-arrows' },
            createElement(
              'button',
              {
                type: 'button',
                className: 'pixel-custom-row-arrow',
                'aria-label': `${section.label} 이전 항목`,
                disabled: page === 0,
                onClick: () => setPage((currentPage) => Math.max(0, currentPage - 1)),
              },
              '‹'
            ),
            createElement(
              'button',
              {
                type: 'button',
                className: 'pixel-custom-row-arrow',
                'aria-label': `${section.label} 다음 항목`,
                disabled: page >= pageCount - 1,
                onClick: () => setPage((currentPage) => Math.min(pageCount - 1, currentPage + 1)),
              },
              '›'
            )
          )
        : null
    ),
    createElement(
      'div',
      { className: 'pixel-custom-swatches' },
      createElement(
        'div',
        {
          className: 'pixel-custom-swatch-track',
          'data-page': page,
          style: { width: trackWidth, transform: `translate3d(${trackOffset}, 0, 0)` },
        },
        ...Array.from({ length: section.itemCount }, (_, itemIndex) => {
          const isSelected = selectedIndex === itemIndex
          const isExpression = section.key === 'expression'
          const isFlameShape = section.key === 'flame-shape'
          const style = {
            flexBasis: swatchBasis,
            ...(section.key === 'shoes'
              ? { '--shoe-tone': SHOE_TONES[itemIndex], '--shoe-image': `url(${CUSTOM_SHOE_SRCS[itemIndex]})` }
              : {}),
            ...(section.key === 'match-color' ? { '--match-tone': MATCH_COLOR_TONES[itemIndex] } : {}),
            ...(section.key === 'flame-color' ? { '--flame-tone': FLAME_COLOR_TONES[itemIndex] } : {}),
          }

          return createElement(
            'button',
            {
              key: `${section.key}-${itemIndex}`,
              type: 'button',
              className: `pixel-custom-swatch${section.key === 'shoes' ? ' pixel-shoe-swatch' : ''}${isExpression ? ' pixel-expression-swatch' : ''}${isFlameShape ? ' pixel-flame-swatch' : ''}${isSelected ? ' is-selected' : ''}`,
              'data-item-index': itemIndex + 1,
              'aria-label': `${section.label} ${itemIndex + 1}번`,
              'aria-pressed': isSelected,
              onClick: () => onSelect(section.key, itemIndex),
              style,
            },
            isExpression
              ? createElement('img', {
                  className: `pixel-expression-shape${itemIndex === 5 ? ' pixel-expression-shape-compact' : ''}`,
                  src: assetPath(`media/expression-${String(itemIndex + 1).padStart(2, '0')}.png`),
                  alt: '',
                  draggable: false,
                })
              : isFlameShape
              ? createElement('img', {
                  className: 'pixel-flame-shape',
                  src: assetPath(`media/flame-shape-${String(itemIndex + 1).padStart(2, '0')}.png`),
                  alt: '',
                  draggable: false,
                })
              : null
          )
        })
      )
    )
  )
}

export function CustomSidebarContent({ onInput }) {
  const [selectedOptions, setSelectedOptions] = useState({})
  const isReady = hasCompleteCustomSelection(selectedOptions)
  const handleCustomSelect = (sectionKey, itemIndex) => {
    setSelectedOptions((current) => ({ ...current, [sectionKey]: itemIndex }))
  }
  const handleInput = () => onInput?.(selectedOptions)

  return createElement(
    'div',
    { className: 'figma-custom-sidebar pixel-custom-sidebar' },
    createElement(
      'div',
      { className: 'pixel-sidebar-logo', 'aria-label': 'EPEUL' },
      createElement('span', null, 'epeul.')
    ),
    createElement(PixelSidebarPreview, {
      matchColorIndex: selectedOptions['match-color'],
      expressionIndex: selectedOptions.expression,
      shoeIndex: selectedOptions.shoes,
      flameColorIndex: selectedOptions['flame-color'],
      flameShapeIndex: selectedOptions['flame-shape'],
    }),
    createElement(
      'div',
      { className: 'pixel-sidebar-custom-list' },
      ...CUSTOM_SECTIONS.map((section) =>
        createElement(PixelCustomRow, {
          key: section.key,
          section,
          selectedIndex: selectedOptions[section.key],
          onSelect: handleCustomSelect,
        })
      )
    ),
    createElement(
      'button',
      {
        type: 'button',
        className: 'custom-sidebar-input character-spawn-button pixel-sidebar-input',
        'aria-label': 'input',
        'aria-disabled': !isReady,
        disabled: !isReady,
        onClick: handleInput,
      },
      'input'
    )
  )
}
