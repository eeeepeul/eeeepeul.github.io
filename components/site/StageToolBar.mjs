'use client'

import { createElement, useEffect, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { brandMarkSvg } from '../../lib/brand-mark.mjs'

// Box 3 of the second pages: the tool bar of the map, as in the supplied picture: a dark head with its fold box, the
// mooeemee mark, and the three keys (the first, the second, the info key), with the house under them. It is drawn 73 x 363
// (the supplied bar, 296 high, and one more place for the house) and made to fit its box (see .stage-tools in globals.css).
// The house is the 2D house of the page (the one that stood in the corner of the room), drawn with no box round it: it
// goes to the main page. The second key is the music key (it opens the CD Player window); the first and the info key, and the fold box, only stand there for now.
function Icon({ children }) {
  return createElement(
    'svg',
    {
      className: 'stage-tools__icon',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.9,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    children
  )
}

const RESET = [
  createElement('path', { key: 'a', d: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5' }),
  createElement('path', { key: 'b', d: 'M4 4.5v4h4' }),
]
const INFO = [
  createElement('circle', { key: 'a', cx: 12, cy: 12, r: 8.5 }),
  createElement('path', { key: 'b', d: 'M12 11v5.5M12 7.6v.2' }),
]
// the music key: two eighth notes joined by a beam
const MUSIC = [
  createElement('path', { key: 'a', d: 'M9 18V6l10-2v12' }),
  createElement('circle', { key: 'b', cx: 6.5, cy: 18, r: 2.5 }),
  createElement('circle', { key: 'c', cx: 16.5, cy: 16, r: 2.5 }),
]

export function StageToolBar({ houseHref = '/', houseLabel = '메인 화면으로 이동' }) {
  // the music key shows pressed while the CD Player window is open (StageCdPlayer tells it)
  const [musicOpen, setMusicOpen] = useState(false)
  useEffect(() => {
    const onState = (event) => setMusicOpen(Boolean(event.detail && event.detail.open))
    window.addEventListener('stage:cd-player-state', onState)
    return () => window.removeEventListener('stage:cd-player-state', onState)
  }, [])

  return createElement(
    'nav',
    { className: 'stage-tools', 'aria-label': '도구' },
    createElement(
      'div',
      { className: 'stage-tools__head' },
      createElement('span', { className: 'stage-tools__fold', 'aria-hidden': 'true' }, createElement('i'))
    ),
    createElement('span', {
      className: 'stage-tools__logo',
      role: 'img',
      'aria-label': 'mooeemee',
      style: { '--logo': `url(${assetPath('media/map-toolbar-logo.png')})` },
    }),
    createElement(
      'button',
      { type: 'button', className: 'stage-tools__tool stage-tools__tool--one', 'aria-label': '시점 초기화', title: '시점 초기화' },
      createElement(Icon, null, RESET)
    ),
    createElement(
      'button',
      {
        type: 'button',
        className: `stage-tools__tool stage-tools__tool--two${musicOpen ? ' is-pressed' : ''}`,
        'aria-pressed': musicOpen,
        'aria-label': '음악 플레이어',
        title: '음악 플레이어',
        // the CD Player window (StageCdPlayer) opens in the room, and closes when the key is pressed again
        onClick: () => window.dispatchEvent(new CustomEvent('stage:toggle-cd-player')),
      },
      createElement(Icon, null, MUSIC)
    ),
    createElement(
      'button',
      { type: 'button', className: 'stage-tools__tool stage-tools__tool--three', 'aria-label': '정보와 범례', title: '정보와 범례' },
      createElement(Icon, null, INFO)
    ),
    createElement(
      'a',
      { className: 'stage-tools__house', href: houseHref, 'aria-label': houseLabel, title: houseLabel },
      createElement('span', {
        className: 'brand-mark house-mark',
        'aria-hidden': 'true',
        dangerouslySetInnerHTML: { __html: brandMarkSvg() },
      })
    )
  )
}
