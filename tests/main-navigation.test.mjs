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

test('renders a silent square link to the CCTV page beside the empty right panel', async () => {
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
  assert.match(html, /<div class="sidebar-content"><\/div>/)
  assert.match(html, /<img class="sidebar-footer-mark"[^>]*alt=""/)
  assert.doesNotMatch(html, /character-spawn-button|palette-presets|settings-panel/)
})

test('renders the second page with six NPCs and a character-add control', async () => {
  const secondaryModule = await import('../components/site/SecondaryLanding.mjs').catch(() => ({}))

  assert.equal(typeof secondaryModule.SecondaryLanding, 'function')

  const html = renderToStaticMarkup(createElement(secondaryModule.SecondaryLanding))
  assert.match(html, /<main class="experience-shell landing-shell">/)
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
