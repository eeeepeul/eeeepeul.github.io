import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { MainLanding } from '../components/site/MainLanding.mjs'
import { HouseMapCard } from '../components/site/HouseMapCard.mjs'

test('the main page renders the Figma sidebar as native UI instead of a flattened image', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))

  assert.match(html, /class="figma-home-scene"/)
  assert.match(html, /class="figma-home-grid"/)
  assert.match(html, /class="figma-home-map-clip"/)
  assert.match(html, /class="figma-home-map"/)
  assert.match(html, /class="figma-home-sidebar-content"/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-intro"/)
  assert.match(html, /Rather than the moment of radiant bloom/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-activity"/)
  assert.match(html, /class="figma-sidebar-status-chip figma-sidebar-time"/)
  assert.match(html, /class="figma-sidebar-status-chip figma-sidebar-active"/)
  assert.match(html, /class="figma-sidebar-status-chip figma-sidebar-period"/)
  assert.match(html, /aria-haspopup="listbox"/)
  assert.match(html, />2 day<img class="figma-sidebar-caret"/)
  assert.match(html, /data-activity-source="live"/)
  assert.match(html, /data-activity-progress="live"/)
  assert.match(html, /aria-live="polite"/)
  assert.match(html, /class="figma-sidebar-progress"/)
  assert.match(html, /--activity-x:/)
  assert.match(html, /--activity-width:/)
  assert.match(html, /--activity-tone:/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-distance"/)
  assert.match(html, /aria-label="이전 집 거리 보기"/)
  assert.match(html, /aria-label="다음 집 거리 보기"/)
  assert.match(html, /class="figma-distance-track[^"]*"[^>]*role="slider"/)
  assert.match(html, /aria-valuemin="1"/)
  assert.match(html, /aria-valuemax="4"/)
  assert.match(html, /data-house-from="house1"/)
  assert.match(html, /data-house-to="house2"/)
  assert.equal((html.match(/class="figma-distance-slide"/g) ?? []).length, 3)
  assert.match(html, /data-distance-slide="previous"/)
  assert.match(html, /data-distance-slide="current"/)
  assert.match(html, /data-distance-slide="next"/)
  assert.match(html, /class="figma-distance-value"[^>]*>13978<\/output>/)
  assert.match(html, /src="\/media\/figma-distance-ticks-left\.svg"/)
  assert.match(html, /src="\/media\/figma-distance-ticks-middle\.svg"/)
  assert.match(html, /src="\/media\/figma-distance-ticks-right\.svg"/)
  assert.match(html, /src="\/media\/figma-distance-segment-one\.svg"/)
  assert.match(html, /src="\/media\/figma-distance-segment-two\.svg"/)
  assert.match(html, /src="\/media\/figma-sidebar-caret\.svg"/)
  assert.match(html, /src="\/media\/figma-sidebar-minus\.svg"/)
  assert.match(html, /src="\/media\/figma-sidebar-plus\.svg"/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-network figma-house-map"/)
  assert.match(html, /viewBox="0 0 287 180"/)
  assert.equal((html.match(/data-map-house="house[1-4]"/g) ?? []).length, 4)
  assert.equal((html.match(/class="figma-house-map-ring/g) ?? []).length, 4)
  assert.match(
    html,
    /<img class="figma-sidebar-star" src="\/media\/figma-sidebar-star\.svg" alt="" draggable="false"\/?>/
  )
  assert.doesNotMatch(html, /figma-home-sidebar-artwork|figma-home-sidebar\.png/)
  assert.match(
    html,
    /<img class="house-mark house-mark--figma" src="\/media\/figma-home-house\.svg" alt="" draggable="false"\/?>/
  )
  assert.match(html, /href="\/experience\/"/)
})

test('each intro tag exposes its label through a keyboard-accessible tooltip', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))

  assert.equal((html.match(/class="figma-sidebar-tag"/g) ?? []).length, 3)
  assert.equal((html.match(/role="tooltip"/g) ?? []).length, 3)
  assert.equal((html.match(/class="figma-sidebar-tag" tabindex="0"/g) ?? []).length, 3)
  assert.match(html, /aria-describedby="figma-tag-tooltip-epeul-primary"/)
  assert.match(html, /aria-describedby="figma-tag-tooltip-mooeemee"/)
  assert.match(html, /aria-describedby="figma-tag-tooltip-epeul-secondary"/)
})

test('the distance carousel renders each shared house boundary only once', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))
  const houseLabels = Array.from(
    html.matchAll(/class="figma-distance-house[^"]*"[^>]*>(house[1-4])<\/span>/g),
    (match) => match[1]
  )

  assert.deepEqual(houseLabels, ['house4', 'house1', 'house2', 'house3'])
})

test('the simplified map renders four houses, synchronized routes, selection rings, and zoom controls', () => {
  const html = renderToStaticMarkup(
    createElement(HouseMapCard, {
      distances: [9_000, 11_000, 13_000, 15_000],
      houseIndex: 0,
      visitCounts: { house1: 0, house2: 1, house3: 4, house4: 9 },
    })
  )

  assert.match(html, /class="figma-sidebar-card figma-sidebar-network figma-house-map"/)
  assert.equal((html.match(/data-map-house="house[1-4]"/g) ?? []).length, 4)
  assert.equal((html.match(/data-map-route="house[1-4]-house[1-4]"/g) ?? []).length, 4)
  assert.equal((html.match(/class="figma-house-map-ring/g) ?? []).length, 4)
  assert.equal((html.match(/data-map-house-link="house[1-4]"/g) ?? []).length, 4)
  assert.match(html, /href="\/experience\/\?house=house1"/)
  assert.match(html, /href="\/experience\/\?house=house4"/)
  assert.match(html, /data-map-visit-count="9"/)
  assert.match(html, /class="figma-house-map-ring"[^>]*r="23\.4"/)
  assert.match(html, /class="figma-house-map-route is-selected"[^>]*data-map-route="house1-house2"/)
  assert.match(html, />9000<\/text>/)
  assert.match(html, /class="figma-house-map-distance is-selected"[^>]*font-size:8px/)
  assert.match(html, /aria-label="지도 축소"/)
  assert.match(html, /aria-label="지도 확대"/)
  assert.match(html, /aria-label="지도 축소" disabled=""/)
  assert.match(html, /data-map-zoom="1"/)
  assert.match(html, /data-map-pan-x="0"/)
  assert.match(html, /data-map-pan-y="0"/)
  assert.match(html, /data-map-dragging="false"/)
  assert.match(html, /data-map-pan-enabled="false"/)
  assert.match(html, /class="figma-house-map-canvas"/)
  assert.match(html, /<strong[^>]*>1%<\/strong>/)
})
