import { createElement } from 'react'

// A cross-section of the ground with its layers, drawn as a small static chart.
const TERRAIN =
  'M0 60 L14 58 L26 50 L38 54 L52 40 L64 44 L78 30 L90 36 L104 24 L116 18 L126 26 L140 22 L152 34 L166 38 L180 31 L194 40 L208 48 L222 44 L236 52 L252 50 L272 56 L272 74 L0 74 Z'

export function MapElevationProfile() {
  return createElement(
    'section',
    { className: 'map-profile', 'aria-label': '지형 단면' },
    createElement(
      'svg',
      {
        className: 'map-profile__chart',
        viewBox: '0 0 272 120',
        role: 'img',
        'aria-label': '지형 단면 그래프',
        preserveAspectRatio: 'none',
      },
      createElement('rect', { x: 0, y: 0, width: 272, height: 120, fill: '#fbfbfb' }),
      createElement('path', { d: 'M0 14H272M0 34H272M0 54H272', stroke: '#e1e1e1', strokeWidth: 0.6 }),
      createElement('path', { d: TERRAIN, fill: '#cfcfcf', stroke: '#6f6f6f', strokeWidth: 0.9 }),
      createElement('path', { d: 'M0 74H272', stroke: '#6f6f6f', strokeWidth: 0.6 }),
      createElement('path', {
        d: 'M0 86 L40 84 L70 92 L110 82 L150 90 L190 84 L230 90 L272 86 L272 94 L0 94 Z',
        fill: '#f2b7a8',
        stroke: '#d7705a',
        strokeWidth: 0.6,
      }),
      createElement('path', { d: 'M116 18V86', stroke: '#c8372d', strokeWidth: 0.9, strokeDasharray: '2 2' }),
      createElement('circle', { cx: 116, cy: 18, r: 2.2, fill: '#c8372d' }),
      createElement('rect', { x: 0, y: 96, width: 272, height: 24, fill: '#f6f6f6' }),
      createElement('path', { d: 'M8 106H92M8 112H64M124 106H210M124 112H180', stroke: '#9b9b9b', strokeWidth: 1.4 }),
      createElement('rect', { x: 262, y: 98, width: 6, height: 20, fill: '#7c47a8' })
    )
  )
}
