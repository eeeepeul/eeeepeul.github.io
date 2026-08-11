import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { FigmaHomeScene } from './FigmaHomeScene.mjs'
import { FigmaHomeSidebarContent } from './FigmaHomeSidebarContent.mjs'
import { LandingFrame } from './LandingFrame.mjs'

export function MainLanding() {
  return createElement(
    LandingFrame,
    {
      houseAssetSrc: assetPath('media/figma-home-house.svg'),
      houseHref: `${assetPath('second')}/`,
      houseLabel: '두 번째 화면으로 이동',
      panel: createElement(FigmaHomeSidebarContent),
      panelLabel: '홈 정보 메뉴',
      playfield: createElement(FigmaHomeScene),
    },
    createElement('a', {
      className: 'landing-enter-link',
      href: `${assetPath('experience')}/`,
      'aria-label': 'CCTV 화면으로 이동',
    })
  )
}
