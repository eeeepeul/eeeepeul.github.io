import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('renders the map page as a stage of numbered cells with the map in cell 4', async () => {
  const landingModule = await import('../components/site/MainLanding.mjs').catch(() => ({}))

  assert.equal(typeof landingModule.MainLanding, 'function')

  const html = renderToStaticMarkup(createElement(landingModule.MainLanding))
  assert.match(html, /<main class="stage-shell">/)
  for (let cell = 1; cell <= 13; cell += 1) {
    assert.match(html, new RegExp(`data-stage-cell="${cell}"`))
  }
  // The map (and its tools) live in cell 4 alone.
  const mapCell = html.match(/<section[^>]*data-stage-cell="4"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.match(mapCell, /figma-deep-zoom-map/)
  assert.match(mapCell, /map-gis-toolbar/)
  assert.doesNotMatch(html, /class="house-link"|<aside|landing-enter-link|\/experience\//)
})

test('renders the second page with six NPCs and a character-add control', async () => {
  const secondaryModule = await import('../components/site/SecondaryLanding.mjs').catch(() => ({}))

  assert.equal(typeof secondaryModule.SecondaryLanding, 'function')

  const html = renderToStaticMarkup(createElement(secondaryModule.SecondaryLanding))
  assert.match(html, /<main class="experience-shell landing-shell">/)
  assert.match(html, /class="house-interior-world"/)
  assert.match(html, /class="house-interior-tilemap"/)
  assert.match(
    html,
    /<a class="house-link" href="\/" aria-label="메인 화면으로 이동">.*<\/a>/
  )
  assert.match(html, /<aside[^>]*class="color-panel sidebar-panel landing-panel"[^>]*>.*<img class="sidebar-wordmark"[^>]*alt="M:MH".*<button[^>]*class="character-spawn-button"[^>]*aria-label="새 캐릭터 추가"[^>]*>.*<\/button>.*<img class="sidebar-footer-mark"[^>]*alt="".*<\/aside>/)
  assert.match(
    html,
    /<img class="wandering-character" src="\/media\/page3-character.png"[^>]*>/
  )
  assert.equal((html.match(/class="wandering-character"/g) || []).length, 6)
  assert.equal((html.match(/data-character-role="npc"/g) || []).length, 6)
  assert.doesNotMatch(html, /landing-enter-link/)
  assert.doesNotMatch(html, /<h[1-6]\b|<p\b/)
})
