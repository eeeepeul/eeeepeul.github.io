import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { LandingFrame } from './LandingFrame.mjs'

export function MainLanding() {
  return createElement(
    LandingFrame,
    {
      houseHref: `${assetPath('second')}/`,
      houseLabel: '두 번째 화면으로 이동',
    },
    createElement('a', {
      className: 'landing-enter-link',
      href: `${assetPath('experience')}/`,
      'aria-label': 'CCTV 화면으로 이동',
    })
  )
}
