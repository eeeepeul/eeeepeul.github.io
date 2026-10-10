import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { MainLanding } from '../components/site/MainLanding.mjs'
import { SecondaryLanding } from '../components/site/SecondaryLanding.mjs'

test('the MAP page renders both viewport-edge rulers with coordinate labels', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))

  assert.match(html, /class="map-viewport-rulers"[^>]*aria-hidden="true"/)
  assert.match(html, /class="map-viewport-ruler map-viewport-ruler--top"/)
  assert.match(html, /class="map-viewport-ruler map-viewport-ruler--left"/)
  assert.equal((html.match(/data-ruler-axis="x"/g) ?? []).length, 20)
  assert.equal((html.match(/data-ruler-axis="y"/g) ?? []).length, 12)
})

test('the viewport rulers stay exclusive to the MAP page', () => {
  const html = renderToStaticMarkup(createElement(SecondaryLanding))

  assert.doesNotMatch(html, /map-viewport-rulers/)
})

test('the top ruler keeps coordinate text separate from its major tick marks', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))

  assert.equal(
    (html.match(/class="map-viewport-ruler__value map-viewport-ruler__value--top"/g) ?? [])
      .length,
    20
  )
  assert.equal(
    (html.match(/class="map-viewport-ruler__major-tick map-viewport-ruler__major-tick--top"/g) ?? [])
      .length,
    20
  )
  assert.match(
    html,
    /data-ruler-axis="x"[^>]*><span class="map-viewport-ruler__value map-viewport-ruler__value--top">0<\/span><span class="map-viewport-ruler__major-tick map-viewport-ruler__major-tick--top"><\/span><\/span>/
  )
})

test('the left ruler keeps coordinate text separate from its major tick marks', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))

  assert.equal((html.match(/class="map-viewport-ruler__value"/g) ?? []).length, 12)
  assert.equal((html.match(/class="map-viewport-ruler__major-tick"/g) ?? []).length, 12)
  assert.match(
    html,
    /data-ruler-axis="y"[^>]*><span class="map-viewport-ruler__value">700<\/span><span class="map-viewport-ruler__major-tick"><\/span><\/span>/
  )
})

test('the left ruler presents the reference 700-to-1250 scale in 50-unit steps', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))
  const labels = Array.from(
    html.matchAll(/data-ruler-axis="y"[^>]*><span class="map-viewport-ruler__value">(\d+)<\/span>/g),
    (match) => Number(match[1])
  )

  assert.deepEqual(labels, [700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250])
})
