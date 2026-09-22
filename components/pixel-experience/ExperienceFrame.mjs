import { createElement } from 'react'
import { PageNavigation } from '../site/PageNavigation.mjs'
import { ResponsiveSidebar } from '../site/ResponsiveSidebar.mjs'

export function ExperienceFrame({
  children,
  homeHref,
  mark,
  panel,
  panelLabel = '색 조합과 이미지 설정',
  layoutClassName = '',
  navigationCurrent = '',
}) {
  return createElement(
    'main',
    { className: `experience-shell${layoutClassName ? ` ${layoutClassName}` : ''}` },
    createElement(PageNavigation, { current: navigationCurrent }),
    createElement(
      'div',
      { className: 'experience-mark' },
      homeHref
        ? createElement(
            'a',
            {
              className: 'experience-home-link',
              href: homeHref,
              'aria-label': '메인 화면으로 이동',
            },
            mark
          )
        : mark
    ),
    children,
    createElement(ResponsiveSidebar, { label: panelLabel }, panel)
  )
}
