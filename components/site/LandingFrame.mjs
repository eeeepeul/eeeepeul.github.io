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
  onRouteSelect,
  sidebarFooter,
  scaleSidebarToViewport = false,
  showNavigation = true,
  showHouseLink = true,
  showSidebar = true,
}) {
  return createElement(
    'main',
    { className: 'experience-shell landing-shell' },
    showNavigation ? createElement(PageNavigation, { current: navigationCurrent, onRouteSelect }) : null,
    createElement(
      'div',
      { className: 'landing-space', 'aria-hidden': 'true' },
      playfield
    ),
    children,
    showHouseLink
      ? createElement(HouseLink, {
          assetSrc: houseAssetSrc,
          href: houseHref,
          label: houseLabel,
        })
      : null,
    showSidebar
      ? createElement(
          ResponsiveSidebar,
          {
            className: 'landing-panel',
            label: panelLabel,
            footer: sidebarFooter,
            scaleToViewport: scaleSidebarToViewport,
          },
          panel
        )
      : null
  )
}
