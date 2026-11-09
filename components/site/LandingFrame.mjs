import { Fragment, createElement } from 'react'
import { HouseLink } from './HouseLink.mjs'
import { PageNavigation } from './PageNavigation.mjs'
import { ResponsiveSidebar } from './ResponsiveSidebar.mjs'
import { SecondStage } from './SecondStage.mjs'

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
  stage = false,
}) {
  const parts = [
    showNavigation ? createElement(PageNavigation, { current: navigationCurrent, onRouteSelect }) : null,
    createElement('div', { className: 'landing-space', 'aria-hidden': 'true' }, playfield),
    children,
    // on the stage the house is the last key of the tool bar (box 3, see StageToolBar), not a button of its own
    showHouseLink && !stage
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
            // on the stage the right panel stays open: it cannot be folded away
            fixed: stage,
          },
          panel
        )
      : null,
  ]
  const content = createElement(Fragment, null, ...parts)

  // `stage`: the parts stand on a fixed-proportion stage (see SecondStage) on wide screens
  return createElement(
    'main',
    { className: `experience-shell landing-shell${stage ? ' second-stage' : ''}` },
    stage ? createElement(SecondStage, { houseHref, houseLabel }, content) : content
  )
}
