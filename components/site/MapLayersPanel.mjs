'use client'

import { createElement, useEffect, useState } from 'react'

const LAYERS = [
  { id: 'grid', label: 'Grid' },
  { id: 'aoi', label: 'Area of Interest' },
  { id: 'world', label: 'World' },
]

const layerKey = (id) => `mapLayer${id[0].toUpperCase()}${id.slice(1)}`

function LayerIcon({ id }) {
  const shared = {
    className: 'map-layers__icon',
    viewBox: '0 0 16 16',
    width: 16,
    height: 16,
    'aria-hidden': 'true',
    focusable: 'false',
  }
  if (id === 'grid') {
    return createElement(
      'svg',
      shared,
      createElement('rect', { x: 1.5, y: 1.5, width: 13, height: 13, fill: '#e4e4e4', stroke: '#8d8d8d' }),
      createElement('path', { d: 'M1.5 6h13M1.5 10h13M6 1.5v13M10 1.5v13', stroke: '#8d8d8d', strokeWidth: 0.8 })
    )
  }
  if (id === 'aoi') {
    return createElement(
      'svg',
      shared,
      createElement('circle', { cx: 8, cy: 8, r: 6.4, fill: '#d9d9d9', stroke: '#777' }),
      createElement('rect', { x: 5, y: 5.2, width: 6, height: 5.6, fill: 'none', stroke: '#444', strokeWidth: 1.2 })
    )
  }
  return createElement(
    'svg',
    shared,
    createElement('path', {
      d: 'M2.5 5.5c2-2.6 5-3.4 7.4-2.2 1.2.6 1.6 1.6.8 2.5-.6.7-1.7.8-2.5 1.4-1 .8-.6 2.2-1.8 2.8-1 .5-2.3-.2-3-1.3-.6-.9-.9-2-.9-3.2Z',
      fill: '#7a7a7a',
    }),
    createElement('path', { d: 'M10.5 9.5c1.4-.4 3 .2 3.4 1.6.3 1.2-.8 2.2-2.2 2.2-1.2 0-2.2-.8-2.2-1.8 0-.8.4-1.7 1-2Z', fill: '#7a7a7a' })
  )
}

export function MapLayersPanel() {
  const [layers, setLayers] = useState({ grid: true, aoi: true, world: true })

  useEffect(() => {
    LAYERS.forEach(({ id }) => {
      document.body.dataset[layerKey(id)] = layers[id] ? 'on' : 'off'
    })
    window.dispatchEvent(new CustomEvent('map:layers', { detail: layers }))
  }, [layers])

  return createElement(
    'section',
    { className: 'map-layers', 'aria-label': '레이어' },
    createElement(
      'ul',
      { className: 'map-layers__tree' },
      LAYERS.map(({ id, label }) =>
        createElement(
          'li',
          { key: id, className: 'map-layers__item' },
          createElement(
            'label',
            { className: 'map-layers__row' },
            createElement('input', {
              type: 'checkbox',
              className: 'map-layers__check',
              checked: layers[id],
              onChange: (event) =>
                setLayers((current) => ({ ...current, [id]: event.target.checked })),
            }),
            createElement(LayerIcon, { id }),
            createElement('span', { className: 'map-layers__label' }, label)
          )
        )
      )
    )
  )
}
