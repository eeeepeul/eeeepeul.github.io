import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { StageHouse } from '../components/site/StageHouse.mjs'

test('the black house in cell 13 is the house button: it goes to the second page', () => {
  const html = renderToStaticMarkup(createElement(StageHouse))
  assert.match(html, /<a class="stage-house" href="\/second\/"/)
  assert.match(html, /aria-label="두 번째 화면으로 이동"/)
  assert.match(html, /<canvas class="stage-house__canvas"/)
})
