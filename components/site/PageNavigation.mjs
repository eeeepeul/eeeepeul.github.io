import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

const PAGE_ROUTES = [
  { id: 'map', label: 'map', href: assetPath('') },
  { id: 'cctv', label: 'cctv', href: `${assetPath('experience')}/` },
  { id: 'custom', label: 'custom', href: `${assetPath('second')}/?view=custom` },
]

export function PageNavigation({ current = '' }) {
  return createElement(
    'nav',
    { className: 'page-route-nav', 'aria-label': '페이지 이동' },
    PAGE_ROUTES.map((route) =>
      createElement(
        'a',
        {
          key: route.id,
          href: route.href,
          className: `page-route-link${current === route.id ? ' is-current' : ''}`,
          'aria-current': current === route.id ? 'page' : undefined,
        },
        route.label
      )
    )
  )
}
