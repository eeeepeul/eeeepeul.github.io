import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('renders the map page as a stage of numbered cells with the map in cell 4', async () => {
  const landingModule = await import('../components/site/MainLanding.mjs').catch(() => ({}))

  assert.equal(typeof landingModule.MainLanding, 'function')

  const html = renderToStaticMarkup(createElement(landingModule.MainLanding))
  assert.match(html, /<main class="stage-shell">/)
  for (let cell = 1; cell <= 18; cell += 1) {
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
  // the page stands on the fixed-proportion stage (the left side, the bars and the room), as the supplied layout
  assert.match(html, /<main class="experience-shell landing-shell second-stage"><div class="second-stage__frame">/)
  assert.match(html, /second-stage__box--calendar/)
  assert.match(html, /second-stage__box--status-bar/)
  // every box shows its number: 1, 2, 3, 4-1, 4-2, 5, 6, 7 (the panels, 4, are in two: the upper two thirds and the lower third)
  assert.equal((html.match(/data-stage-box="[\d-]+"/g) || []).length, 8)
  assert.match(html, /data-stage-box="4-1"[^>]*><b class="second-stage__number">4-1<\/b>/)
  // 4-2 holds the shelf of saved drawings, and box 5 its input key, so these two show no number
  assert.match(html, /data-stage-box="4-2"[^>]*><div class="drawing-shelf"/)
  assert.match(html, /data-stage-box="5"[^>]*><button[^>]*class="drawing-shelf-input"/)
  assert.match(html, /data-stage-box="7"[^>]*><b class="second-stage__number">7<\/b>/)
  assert.match(html, /class="house-interior-world"/)
  assert.match(html, /class="house-interior-tilemap"/)
  // the house is the last key of the tool bar in box 3 (no box round it), not a button of its own in the room's corner
  assert.doesNotMatch(html, /class="house-link"/)
  // the right panel stays open: no button folds it away or brings it back
  assert.doesNotMatch(html, /sidebar-close-button|sidebar-menu-trigger|sidebar-backdrop/)
  // the tool bar has three keys (the last is the info key) and the house, with no box, under them
  assert.equal((html.match(/class="stage-tools__tool stage-tools__tool--/g) || []).length, 3)
  assert.match(html, /stage-tools__tool--three" aria-label="정보와 범례"[^>]*>.*<a class="stage-tools__house"/)
  assert.match(
    html,
    /<nav class="stage-tools" aria-label="도구">.*<a class="stage-tools__house" href="\/" aria-label="메인 화면으로 이동"[^>]*>.*<\/a><\/nav>/
  )
  assert.match(html, /<aside[^>]*class="color-panel sidebar-panel landing-panel is-fixed"[^>]*>.*<img class="sidebar-wordmark"[^>]*alt="M:MH".*<button[^>]*class="character-spawn-button"[^>]*aria-label="새 캐릭터 추가"[^>]*>.*<\/button>.*<img class="sidebar-footer-mark"[^>]*alt="".*<\/aside>/)
  assert.match(
    html,
    /<img class="wandering-character" src="\/media\/page3-character.png"[^>]*>/
  )
  assert.equal((html.match(/class="wandering-character"/g) || []).length, 6)
  assert.equal((html.match(/data-character-role="npc"/g) || []).length, 6)
  assert.doesNotMatch(html, /landing-enter-link/)
  assert.doesNotMatch(html, /<h[1-6]\b|<p\b/)
})
