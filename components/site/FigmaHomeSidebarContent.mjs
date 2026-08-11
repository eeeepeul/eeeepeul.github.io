import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { HouseMapSection } from './HouseMapSection.mjs'
import { VisitorActivityCard } from './VisitorActivityCard.mjs'

function SidebarTag({ id, label }) {
  return createElement(
    'span',
    {
      className: 'figma-sidebar-tag',
      tabIndex: 0,
      'aria-describedby': id,
    },
    label,
    createElement(
      'span',
      {
        id,
        className: 'figma-sidebar-tooltip',
        role: 'tooltip',
      },
      label
    )
  )
}

function IntroCard() {
  return createElement(
    'section',
    { className: 'figma-sidebar-card figma-sidebar-intro', 'aria-label': 'EPEUL 소개' },
    createElement(
      'p',
      null,
      'Rather than the moment of radiant bloom, EPEUL stands closer to what endures beneath it and remains.'
    ),
    createElement(
      'div',
      { className: 'figma-sidebar-tags', 'aria-label': '태그' },
      createElement(SidebarTag, {
        id: 'figma-tag-tooltip-epeul-primary',
        label: 'epeul',
      }),
      createElement(SidebarTag, {
        id: 'figma-tag-tooltip-mooeemee',
        label: 'mooeemee',
      }),
      createElement(SidebarTag, {
        id: 'figma-tag-tooltip-epeul-secondary',
        label: 'epeul',
      })
    )
  )
}

export function FigmaHomeSidebarContent() {
  return createElement(
    'div',
    { className: 'figma-home-sidebar-content' },
    createElement('img', {
      className: 'figma-sidebar-star',
      src: assetPath('media/figma-sidebar-star.svg'),
      alt: '',
      draggable: false,
    }),
    createElement(IntroCard),
    createElement(VisitorActivityCard),
    createElement(HouseMapSection)
  )
}
