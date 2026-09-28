import { createElement } from 'react'

function Hotspot({ className }) {
  return createElement('span', {
    className: `attention-heatmap-hotspot ${className}`,
    'aria-hidden': 'true',
  })
}

export function AttentionHeatmap() {
  return createElement(
    'section',
    { className: 'attention-heatmap', 'aria-label': 'Attention heatmap' },
    createElement(
      'header',
      { className: 'attention-heatmap-header' },
      createElement('h2', null, 'ATTENTION HEATMAP'),
      createElement('p', null, 'in-frame visual attention')
    ),
    createElement(
      'div',
      { className: 'attention-heatmap-body' },
      createElement(
        'div',
        {
          className: 'attention-heatmap-frame',
          role: 'img',
          'aria-label': '시선 집중 영역을 색상으로 표시한 영상 프레임',
        },
        createElement(Hotspot, { className: 'attention-heatmap-hotspot--left' }),
        createElement(Hotspot, { className: 'attention-heatmap-hotspot--center' }),
        createElement(Hotspot, { className: 'attention-heatmap-hotspot--right' })
      ),
      createElement(
        'div',
        { className: 'attention-heatmap-legend', 'aria-label': '히트맵 강도 범례' },
        createElement(
          'span',
          { className: 'attention-heatmap-legend-label attention-heatmap-legend-label--high' },
          'High'
        ),
        createElement('span', { className: 'attention-heatmap-scale', 'aria-hidden': 'true' }),
        createElement(
          'span',
          { className: 'attention-heatmap-legend-label attention-heatmap-legend-label--low' },
          'Low'
        )
      )
    )
  )
}
