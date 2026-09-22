import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CustomSidebarContent } from '../components/site/CustomSidebarContent.mjs'

test('restores the previous character customization sidebar sections', () => {
  const html = renderToStaticMarkup(createElement(CustomSidebarContent))

  assert.match(html, /class="figma-custom-sidebar pixel-custom-sidebar"/)
  assert.match(html, />epeul\.<\/span>/)
  assert.match(html, /aria-label="오늘 어떤가요"/)
  assert.match(html, /class="pixel-sidebar-avatar-small"/)
  assert.match(html, /data-custom-label="성냥색" data-item-count="4"/)
  assert.match(html, /data-custom-label="표정" data-item-count="6"/)
  assert.match(html, /data-custom-label="불 색" data-item-count="4"/)
  assert.match(html, /data-custom-label="불 형태" data-item-count="6"/)
  assert.match(html, /data-custom-label="신발" data-item-count="4"/)
  assert.equal((html.match(/class="pixel-custom-row"/g) ?? []).length, 5)
  assert.equal((html.match(/class="pixel-custom-swatch pixel-shoe-swatch/g) ?? []).length, 4)
  assert.match(html, /class="custom-sidebar-input[^\"]*pixel-sidebar-input[^\"]*"/)
})

test('keeps the input disabled until all custom sections are selected', async () => {
  const { hasCompleteCustomSelection } = await import('../components/site/CustomSidebarContent.mjs')

  assert.equal(hasCompleteCustomSelection({}), false)
  assert.equal(
    hasCompleteCustomSelection({
      'match-color': 0,
      expression: 1,
      'flame-color': 2,
      'flame-shape': 3,
      shoes: 0,
    }),
    true
  )
})
