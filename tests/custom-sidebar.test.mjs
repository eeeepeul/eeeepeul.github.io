import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CustomSidebar } from '../components/site/CustomSidebar.mjs'

test('renders the Figma custom sidebar structure without replacing the main page controls', () => {
  const html = renderToStaticMarkup(createElement(CustomSidebar))

  assert.match(html, /<aside[^>]*class="custom-sidebar"[^>]*aria-label="custom 사이드바"/)
  assert.match(html, /class="custom-sidebar-mood-input"[^>]*placeholder="오늘 어떤가요"/)
  assert.equal((html.match(/class="custom-sidebar-spot-row(?: is-selected)?"/g) || []).length, 4)
  assert.equal((html.match(/class="custom-sidebar-spot-slot"/g) || []).length, 16)
  assert.equal((html.match(/class="custom-sidebar-chevron"/g) || []).length, 8)
  assert.match(html, /class="custom-sidebar-footer-input"[^>]*placeholder="input"/)
  assert.doesNotMatch(html, /character-spawn-button/)
})
