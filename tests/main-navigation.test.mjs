import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExperienceFrame } from '../components/pixel-experience/ExperienceFrame.mjs'

test('turns the lower-left mark into a link back to the main page', () => {
  const html = renderToStaticMarkup(
    createElement(
      ExperienceFrame,
      {
        mark: createElement('span', null, 'mark'),
        panel: createElement('aside', null),
        homeHref: '/',
      },
      createElement('section', null, 'stage')
    )
  )

  assert.match(
    html,
    /<a[^>]*class="experience-home-link"[^>]*href="\/"[^>]*aria-label="메인 화면으로 이동"[^>]*>.*mark.*<\/a>/
  )
})

test('renders a silent square link to the CCTV page beside the Figma home panel', async () => {
  const landingModule = await import('../components/site/MainLanding.mjs').catch(() => ({}))

  assert.equal(typeof landingModule.MainLanding, 'function')

  const html = renderToStaticMarkup(createElement(landingModule.MainLanding))
  assert.match(html, /<main class="experience-shell landing-shell">/)
  assert.match(
    html,
    /<a class="landing-enter-link" href="\/experience\/" aria-label="CCTV 화면으로 이동"><\/a>/
  )
  assert.match(
    html,
    /<a class="house-link" href="\/second\/" aria-label="두 번째 화면으로 이동">.*<\/a>/
  )
  assert.match(html, /<aside[^>]*class="color-panel sidebar-panel landing-panel"[^>]*>/)
  assert.match(html, /<img class="sidebar-wordmark"[^>]*alt="M:MH"/)
  assert.match(html, /<div class="sidebar-content"><div class="figma-home-sidebar-content"[^>]*>/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-intro"/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-activity"/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-distance"/)
  assert.match(html, /class="figma-sidebar-card figma-sidebar-network figma-house-map"/)
  assert.doesNotMatch(html, /figma-home-sidebar-artwork|figma-home-sidebar\.png/)
  assert.match(html, /class="house-mark house-mark--figma"/)
  assert.match(html, /src="\/media\/figma-home-house\.svg"/)
  assert.match(html, /class="attention-heatmap"/)
  assert.doesNotMatch(html, /class="sidebar-footer-mark"/)
  assert.doesNotMatch(html, /character-spawn-button|palette-presets|settings-panel/)
})

test('renders the second page with six NPCs and the Figma custom input control', async () => {
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
  assert.match(html, /<aside[^>]*class="color-panel sidebar-panel landing-panel"[^>]*>.*<img class="sidebar-wordmark"[^>]*alt="M:MH".*<div class="[^"]*figma-custom-sidebar[^"]*".*<button[^>]*aria-label="input"[^>]*>input<\/button>.*<img class="sidebar-footer-mark"[^>]*alt="".*<\/aside>/)
  assert.match(
    html,
    /<img class="wandering-character" src="\/media\/page3-character.png"[^>]*>/
  )
  assert.equal((html.match(/class="wandering-character"/g) || []).length, 6)
  assert.equal((html.match(/data-character-role="npc"/g) || []).length, 6)
  assert.doesNotMatch(html, /landing-enter-link/)
  assert.match(html, /class="[^"]*pixel-custom-sidebar[^"]*"/)
  assert.match(html, />epeul\.<\/span>/)
})
