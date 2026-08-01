import { createElement } from 'react'
import { brandMarkSvg } from '../../lib/brand-mark.mjs'

export function HouseLink({ href, label }) {
  return createElement(
    'a',
    {
      className: 'house-link',
      href,
      'aria-label': label,
    },
    createElement('span', {
      className: 'brand-mark house-mark',
      'aria-hidden': 'true',
      dangerouslySetInnerHTML: { __html: brandMarkSvg() },
    })
  )
}
