import { createElement } from 'react'
import { HouseLink } from './HouseLink.mjs'
import { PageNavigation } from './PageNavigation.mjs'
import { ResponsiveSidebar } from './ResponsiveSidebar.mjs'

export function LandingFrame({
  children,
  houseAssetSrc,
  houseHref,
  houseLabel,
  panel,
  panelLabel = '빈 메인 패널',
  playfield,
  navigationCurrent = '',
  sidebarFooter,
}) {
  return createElement(
    'main',
    { className: 'experience-shell landing-shell' },
    createElement(PageNavigation, { current: navigationCurrent }),
    createElement(
      'div',
      { className: 'landing-space', 'aria-hidden': 'true' },
      playfield
    ),
    children,
    createElement(HouseLink, {
      assetSrc: houseAssetSrc,
      href: houseHref,
      label: houseLabel,
    }),
    createElement(
      ResponsiveSidebar,
      {
        className: 'landing-panel',
        label: panelLabel,
        footer: sidebarFooter,
      },
      panel
    )
  )
}
