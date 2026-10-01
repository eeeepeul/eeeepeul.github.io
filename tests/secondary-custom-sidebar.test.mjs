import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CustomSidebarContent, PixelSidebarPreview } from '../components/site/CustomSidebarContent.mjs'

const GLOBAL_STYLES = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('restores the previous character customization sidebar sections', () => {
  const html = renderToStaticMarkup(createElement(CustomSidebarContent))

  assert.match(html, /class="figma-custom-sidebar pixel-custom-sidebar"/)
  assert.match(html, />epeul\.<\/span>/)
  assert.match(html, /aria-label="오늘 어떤가요"/)
  assert.match(html, /class="pixel-sidebar-avatar-small"/)
  assert.match(html, /data-custom-label="성냥색" data-item-count="4"/)
  assert.match(html, /data-custom-label="표정" data-item-count="6"/)
  assert.match(html, /data-custom-label="불 색" data-item-count="4"/)
  assert.match(html, /data-custom-label="불 형태" data-item-count="5"/)
  assert.match(html, /data-custom-label="신발" data-item-count="4"/)
  assert.equal((html.match(/class="pixel-custom-row"/g) ?? []).length, 5)
  assert.equal((html.match(/class="pixel-custom-swatch pixel-shoe-swatch/g) ?? []).length, 4)
  assert.equal((html.match(/class="pixel-custom-swatch pixel-flame-swatch/g) ?? []).length, 5)
  assert.equal((html.match(/src="[^\"]*flame-shape-0[1-5]\.png"/g) ?? []).length, 5)
  assert.match(html, /class="custom-sidebar-input[^\"]*pixel-sidebar-input[^\"]*"/)
})

test('uses the requested flame color swatches in order', () => {
  const html = renderToStaticMarkup(createElement(CustomSidebarContent))

  assert.match(html, /--flame-tone:#00B9F6/)
  assert.match(html, /--flame-tone:#C50011/)
  assert.match(html, /--flame-tone:#FFD15D/)
  assert.match(html, /--flame-tone:#EBAAD1/)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-custom-row\[data-custom-label='불 색'\] \.pixel-custom-swatch\s*\{[^}]*background:\s*var\(--flame-tone/s
  )
  assert.doesNotMatch(
    GLOBAL_STYLES,
    /\.pixel-custom-row:nth-child\(3\)[\s\S]*?\.pixel-custom-swatch:nth-child\(2\)[\s\S]*?background:\s*#d5d5d5/
  )
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

test('fits every flame shape inside its swatch without clipping the source artwork', () => {
  assert.match(GLOBAL_STYLES, /\.pixel-flame-swatch\s*\{[^}]*overflow:\s*hidden/s)
  assert.match(GLOBAL_STYLES, /\.pixel-flame-shape\s*\{[^}]*object-fit:\s*contain/s)
  assert.match(GLOBAL_STYLES, /\.pixel-flame-shape\s*\{[^}]*max-height:\s*42px/s)
})

test('puts the selected flame artwork behind the preview head', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { flameShapeIndex: 2 }))
  const flameRule = GLOBAL_STYLES.match(/\.pixel-sidebar-character-flame\s*\{([^}]*)\}/s)?.[1] ?? ''

  assert.match(html, /class="pixel-sidebar-character-flame"/)
  assert.match(html, /data-flame-src="\/media\/flame-shape-03\.png"/)
  assert.match(html, /--character-flame-color:#00B9F6/)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-flame\s*\{[^}]*position:\s*absolute/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-flame\s*\{[^}]*z-index:\s*0/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-flame\s*\{[^}]*height:\s*84px/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-flame\s*\{[^}]*max-width:\s*84px/s)
  assert.match(flameRule, /mask-image:/)
  assert.match(flameRule, /bottom:\s*52px/)
  assert.doesNotMatch(flameRule, /top:/)
})

test('renders the approved slender match silhouette as one preview shape', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { matchColorIndex: 2 }))

  assert.match(html, /class="pixel-sidebar-character-silhouette"/)
  assert.match(html, /data-silhouette-src="\/media\/match-character\.svg"/)
  assert.match(html, /--match-character-image:url\(\/media\/match-character\.svg\)/)
  assert.match(html, /--character-tone:#858585/)
  assert.doesNotMatch(html, /pixel-sidebar-character-head|pixel-sidebar-character-body/)
})

test('uses the supplied shoe silhouette for the preview and shoe swatches', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { shoeIndex: 2 }))
  const sidebar = renderToStaticMarkup(createElement(CustomSidebarContent))

  assert.match(html, /class="pixel-sidebar-character-shoe"/)
  assert.match(html, /data-shoe-src="\/media\/custom-shoe\.png"/)
  assert.match(html, /--character-shoe-image:url\(\/media\/custom-shoe\.png\)/)
  assert.match(sidebar, /--shoe-image:url\(\/media\/custom-shoe\.png\)/)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-shoe\s*\{[^}]*mask-image:\s*var\(--character-shoe-image\)/s)
  assert.match(GLOBAL_STYLES, /\.pixel-shoe-swatch::before\s*\{[^}]*mask-image:\s*var\(--shoe-image\)/s)
})
