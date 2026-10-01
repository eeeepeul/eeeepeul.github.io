import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CharacterCustomizationSidebar } from '../components/site/CharacterCustomizationSidebar.mjs'

test('renders the custom character preview, shoe choices, and input controls', () => {
  const html = renderToStaticMarkup(createElement(CharacterCustomizationSidebar))

  assert.match(html, /class="character-custom-sidebar"[^>]*aria-label="캐릭터 커스터마이징 사이드바"/)
  assert.match(html, /class="character-custom-preview"/)
  assert.match(html, /class="character-custom-preview-image"/)
  assert.equal((html.match(/class="character-custom-shoe-option/g) || []).length, 4)
  assert.match(html, /aria-label="신발 1"/)
  assert.match(html, /class="character-custom-input"[^>]*placeholder="input"/)
})
