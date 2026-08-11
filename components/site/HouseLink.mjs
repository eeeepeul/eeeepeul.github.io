import { createElement } from 'react'
import { brandMarkSvg } from '../../lib/brand-mark.mjs'

export function HouseLink({ href, label, assetSrc }) {
  return createElement(
    'a',
    {
      className: 'house-link',
      href,
      'aria-label': label,
    },
    assetSrc
      ? createElement('img', {
          className: 'house-mark house-mark--figma',
          src: assetSrc,
          alt: '',
          draggable: false,
        })
      : createElement('span', {
          className: 'brand-mark house-mark',
          'aria-hidden': 'true',
          dangerouslySetInnerHTML: { __html: brandMarkSvg() },
        })
  )
}
