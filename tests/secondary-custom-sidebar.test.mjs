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

test('renders the six supplied expression artworks in order', () => {
  const html = renderToStaticMarkup(createElement(CustomSidebarContent))
  const expressionSources = [...html.matchAll(/class="pixel-expression-shape" src="([^"]+)"/g)].map(
    ([, source]) => source
  )

  assert.deepEqual(expressionSources, [
    '/media/expression-01.png',
    '/media/expression-02.png',
    '/media/expression-03.png',
    '/media/expression-04.png',
    '/media/expression-05.png',
    '/media/expression-06.png',
  ])
  assert.match(GLOBAL_STYLES, /\.pixel-expression-swatch\s*\{[^}]*display:\s*grid/s)
  assert.match(GLOBAL_STYLES, /\.pixel-expression-shape\s*\{[^}]*object-fit:\s*contain/s)
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
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-flame\s*\{[^}]*height:\s*96px/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-flame\s*\{[^}]*max-width:\s*96px/s)
  assert.match(flameRule, /mask-image:/)
  assert.match(flameRule, /bottom:\s*52px/)
  assert.doesNotMatch(flameRule, /top:/)
})

test('renders the approved slender match body with a separate rounded head layer', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { matchColorIndex: 2 }))

  assert.match(html, /class="pixel-sidebar-character-silhouette"/)
  assert.match(html, /data-silhouette-src="\/media\/match-character\.svg"/)
  assert.match(html, /--match-character-image:url\(\/media\/match-character\.svg\)/)
  assert.match(html, /--character-tone:#E9C1A0/)
  assert.match(html, /class="pixel-sidebar-character-head"/)
  assert.match(html, /data-head-src="\/media\/match-character-head\.svg"/)
  assert.match(html, /--character-head-tone:#7B4D31/)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-head\s*\{[^}]*mask-image:\s*var\(--match-character-head-image\)/s)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-character\s*>\s*\.pixel-sidebar-character-silhouette\s*\{[^}]*width:\s*42px;[^}]*left:\s*50%;[^}]*transform:\s*translateX\(-50%\)/s
  )
})

test('puts the selected expression artwork inside both match heads', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { expressionIndex: 4 }))

  assert.match(html, /class="pixel-sidebar-character-expression"[^>]*data-expression-src="\/media\/expression-05\.png"/)
  assert.match(html, /class="pixel-sidebar-avatar-expression"[^>]*data-expression-src="\/media\/expression-05\.png"/)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-character-expression\s*\{[^}]*position:\s*absolute;[^}]*top:\s*1px;[^}]*z-index:\s*3;[^}]*width:\s*16px;[^}]*height:\s*20px;[^}]*object-fit:\s*contain/s
  )
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-avatar-expression\s*\{[^}]*position:\s*absolute;[^}]*top:\s*13px;[^}]*z-index:\s*3;[^}]*width:\s*23px;[^}]*height:\s*22px;[^}]*object-fit:\s*contain/s
  )
  assert.match(GLOBAL_STYLES, /\.pixel-expression-shape\s*\{[^}]*max-height:\s*38px/s)
})

test('keeps the round-eyed expression uncut and fills its eye interiors white', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { expressionIndex: 1 }))

  assert.match(html, /class="pixel-sidebar-character-expression-fill"[^>]*data-expression-fill-src="\/media\/expression-02-fill\.svg"/)
  assert.match(html, /class="pixel-sidebar-avatar-expression-fill"[^>]*data-expression-fill-src="\/media\/expression-02-fill\.svg"/)
  assert.doesNotMatch(GLOBAL_STYLES, /\.pixel-sidebar-character-expression\s*\{[^}]*mask-image:/s)
  assert.doesNotMatch(GLOBAL_STYLES, /\.pixel-sidebar-avatar-expression\s*\{[^}]*mask-image:/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-character-expression-fill\s*\{[^}]*z-index:\s*3/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-avatar-expression-fill\s*\{[^}]*z-index:\s*3/s)
})

test('shrinks only the first expression inside the match heads', () => {
  const compactHtml = renderToStaticMarkup(createElement(PixelSidebarPreview, { expressionIndex: 0 }))
  const regularHtml = renderToStaticMarkup(createElement(PixelSidebarPreview, { expressionIndex: 4 }))

  assert.match(compactHtml, /class="pixel-sidebar-character-expression pixel-sidebar-expression-compact"/)
  assert.match(compactHtml, /class="pixel-sidebar-avatar-expression pixel-sidebar-expression-compact"/)
  assert.doesNotMatch(regularHtml, /pixel-sidebar-expression-compact/)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-character-expression\.pixel-sidebar-expression-compact\s*\{[^}]*top:\s*2px;[^}]*width:\s*14px;[^}]*height:\s*18px/s
  )
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-avatar-expression\.pixel-sidebar-expression-compact\s*\{[^}]*top:\s*15px;[^}]*width:\s*20px;[^}]*height:\s*18px/s
  )
})

test('keeps match body peach while match-color swatches recolor only the rounded head', () => {
  const html = renderToStaticMarkup(createElement(CustomSidebarContent))

  for (const tone of ['#DBDCDC', '#D90000', '#7B4D31', '#88DCD3']) {
    assert.match(html, new RegExp(`--match-tone:${tone}`))
  }
  assert.match(html, /--character-tone:#E9C1A0/)
})

test('enlarges the current match head in the avatar card with the selected head and body colors', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { matchColorIndex: 1 }))

  assert.match(html, /class="pixel-sidebar-avatar-small"[^>]*--avatar-head-tone:#D90000/)
  assert.match(html, /--avatar-body-tone:#E9C1A0/)
  assert.match(html, /class="pixel-sidebar-avatar-face"[^>]*data-avatar-head-src="\/media\/match-character-head-avatar\.svg"/)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-avatar-face\s*\{[^}]*mask-image:\s*var\(--avatar-head-image\)/s)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-avatar-face\s*\{[^}]*position:\s*absolute;[^}]*top:\s*7px;[^}]*width:\s*33px;[^}]*height:\s*35px/s
  )
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-avatar-body\s*\{[^}]*background:\s*var\(--avatar-body-tone/s)
  assert.match(GLOBAL_STYLES, /\.pixel-sidebar-avatar-body\s*\{[^}]*width:\s*18px;[^}]*height:\s*29px/s)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-avatar-body\s*\{[^}]*clip-path:\s*polygon\(0\.5px\s+0,\s*calc\(100%\s*-\s*0\.5px\)\s+0,\s*100%\s+100%,\s*0\s+100%\)/s
  )
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

test('renders the supplied shoe silhouette in white to match the reference flame set', () => {
  const html = renderToStaticMarkup(createElement(PixelSidebarPreview, { shoeIndex: 0 }))
  const sidebar = renderToStaticMarkup(createElement(CustomSidebarContent))

  assert.match(html, /--shoe-tone:#FFFFFF/)
  assert.equal((sidebar.match(/--shoe-tone:#FFFFFF/g) ?? []).length, 5)
  assert.match(
    GLOBAL_STYLES,
    /\.pixel-sidebar-character-shoe\s*\{[^}]*bottom:\s*-1px;[^}]*z-index:\s*3/s
  )
})
