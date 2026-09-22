import { createElement } from 'react'
import { CUSTOM_WIREFRAME_SCREENSHOT } from './custom-wireframe-assets.mjs'

export function CustomWireframeWorld() {
  return createElement(
    'div',
    {
      className: 'custom-wireframe-world is-local-export',
      'data-node-id': '3706:924',
    },
    createElement('img', {
      className: 'custom-wireframe-background',
      src: CUSTOM_WIREFRAME_SCREENSHOT,
      alt: '',
      draggable: false,
      'data-node-id': '3706:925',
    })
  )
}
