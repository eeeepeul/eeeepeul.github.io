import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { HouseInteriorPage } from '../components/site/HouseInteriorPage.mjs'

test('renders the new house page without replacing the existing second-page component', () => {
  assert.equal(typeof HouseInteriorPage, 'function')
  const html = renderToStaticMarkup(createElement(HouseInteriorPage))

  assert.match(html, /class="house-interior-page"/)
  assert.match(html, /class="house-interior-viewport"/)
  assert.match(html, /class="house-interior-tilemap"/)

  const secondPageSource = readFileSync(new URL('../app/second/page.tsx', import.meta.url), 'utf8')
  assert.match(secondPageSource, /SecondaryLanding/)
})
