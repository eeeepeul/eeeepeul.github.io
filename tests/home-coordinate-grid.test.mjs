import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { MainLanding } from '../components/site/MainLanding.mjs'

test('the main page renders a responsive coordinate grid behind its controls', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))

  assert.match(html, /class="landing-coordinate-grid"/)
  assert.match(html, /class="coordinate-grid__plot"/)
  assert.equal((html.match(/class="coordinate-line coordinate-line--vertical"/g) || []).length, 11)
  assert.equal((html.match(/class="coordinate-line coordinate-line--horizontal"/g) || []).length, 9)
  assert.match(html, />-500 m</)
  assert.match(html, />0</)
  assert.match(html, />500 m</)
  assert.match(html, />400 m</)
  assert.match(html, />-400 m</)
})
