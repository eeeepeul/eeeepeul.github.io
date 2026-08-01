import { createElement } from 'react'
import { ResponsiveSidebar } from '../site/ResponsiveSidebar.mjs'

export function ExperienceFrame({
  children,
  homeHref,
  mark,
  panel,
  panelLabel = '색 조합과 이미지 설정',
}) {
  return createElement(
    'main',
    { className: 'experience-shell' },
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
