import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('the shared sidebar renders the reference branding with accessible open and close controls', async () => {
  const sidebarModule = await import('../components/site/ResponsiveSidebar.mjs').catch(() => ({}))

  assert.equal(typeof sidebarModule.ResponsiveSidebar, 'function')

  const html = renderToStaticMarkup(
    createElement(
      sidebarModule.ResponsiveSidebar,
      { label: '테스트 메뉴' },
      createElement('button', { type: 'button' }, '기존 기능')
    )
  )

  assert.match(html, /aria-label="메뉴 열기"[^>]*aria-expanded="false"/)
  assert.match(html, /class="sidebar-backdrop"[^>]*aria-hidden="true"/)
  assert.match(html, /<aside[^>]*class="color-panel sidebar-panel"[^>]*aria-label="테스트 메뉴"/)
  assert.match(html, /<img class="sidebar-wordmark"[^>]*alt="M:MH"/)
  assert.match(html, /aria-label="메뉴 닫기"/)
  assert.match(html, /<div class="sidebar-content"><button type="button">기존 기능<\/button><\/div>/)
  assert.match(html, /<img class="sidebar-footer-mark"[^>]*alt=""/)
})

test('sidebar state actions open, close, and toggle the drawer', async () => {
  const sidebarModule = await import('../components/site/ResponsiveSidebar.mjs').catch(() => ({}))

  assert.equal(typeof sidebarModule.nextSidebarOpenState, 'function')
  assert.equal(sidebarModule.nextSidebarOpenState(false, 'open'), true)
  assert.equal(sidebarModule.nextSidebarOpenState(true, 'close'), false)
  assert.equal(sidebarModule.nextSidebarOpenState(false, 'toggle'), true)
  assert.equal(sidebarModule.nextSidebarOpenState(true, 'toggle'), false)
})

test('the collapsed sidebar matches the compact reference control', () => {
  assert.match(
    css,
    /\.sidebar-menu-trigger\s*\{[^}]*width:\s*52px;[^}]*height:\s*46px;[^}]*border-radius:\s*8px;/s
  )
})

test('the desktop sidebar keeps a fixed width when the viewport grows', () => {
  assert.match(
    css,
    /\.experience-shell\s*\{[^}]*grid-template-columns:\s*64px\s+minmax\(0,\s*1fr\)\s+334px;/s
  )
})

test('the sidebar uses the approved subtle drop shadow', () => {
  assert.match(
    css,
    /\.color-panel\s*\{[^}]*box-shadow:\s*0\s+3px\s+30px\s+0\s+rgba\(0,\s*0,\s*0,\s*0\.05\);/s
  )
})

test('the sidebar panel clips into the compact control without resizing its layout box', () => {
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s*\{[^}]*width:\s*100%;[^}]*height:\s*calc\(100dvh\s*-\s*clamp\(48px,\s*4\.4vw,\s*84px\)\);[^}]*padding:\s*16px;[^}]*opacity:\s*1;[^}]*clip-path:\s*inset\(0 0 calc\(100%\s*-\s*46px\) calc\(100%\s*-\s*52px\) round 8px\);[^}]*transform:\s*none;/s
  )
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s+\.sidebar-close-button\s*\{[^}]*width:\s*52px;[^}]*height:\s*46px;[^}]*margin:\s*0;/s
  )
  assert.match(
    css,
    /\.sidebar-menu-trigger\.is-visible\s+\.sidebar-toggle-image\s*\{[^}]*opacity:\s*0;/s
  )
})

test('the sidebar stays right anchored while expanding from the compact control', () => {
  assert.match(
    css,
    /\.color-panel\s*\{[^}]*justify-self:\s*end;[^}]*width:\s*100%;/s
  )
})

test('sidebar contents wait for the panel to expand before fading in', () => {
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-open\s+\.sidebar-wordmark,[\s\S]*\.color-panel\.sidebar-panel\.is-open\s+\.sidebar-content,[\s\S]*\.color-panel\.sidebar-panel\.is-open\s+\.sidebar-footer-mark\s*\{[^}]*animation:\s*sidebar-panel-content-reveal\s+360ms/s
  )
  assert.match(
    css,
    /@keyframes\s+sidebar-panel-content-reveal\s*\{[\s\S]*0%,\s*55%\s*\{[^}]*visibility:\s*hidden;[^}]*opacity:\s*0;[^}]*\}[\s\S]*100%\s*\{[^}]*visibility:\s*visible;[^}]*opacity:\s*1;/s
  )
})

test('the compact morph is preserved on mobile and moves the icon smoothly', () => {
  assert.match(
    css,
    /\.sidebar-close-button\s*\{[^}]*position:\s*absolute;[^}]*top:\s*0;[^}]*right:\s*0;[^}]*width:\s*52px;[^}]*height:\s*46px;[^}]*transition:\s*none;/s
  )
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*\.sidebar-close-button\s*\{[^}]*position:\s*absolute;[^}]*top:\s*0;[^}]*right:\s*0;[^}]*width:\s*52px;[^}]*height:\s*46px;[^}]*margin:\s*0;/s
  )
})

test('the mobile panel grows from one fixed top-right anchor', () => {
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*\.color-panel\.sidebar-panel\s*\{[^}]*top:\s*max\(18px,\s*env\(safe-area-inset-top\)\);[^}]*right:\s*max\(18px,\s*env\(safe-area-inset-right\)\);[^}]*bottom:\s*auto;[^}]*width:\s*min\(334px,\s*calc\(100vw\s*-\s*36px\)\);[^}]*height:\s*calc\(100dvh\s*-\s*max\(18px,\s*env\(safe-area-inset-top\)\)\s*-\s*max\(18px,\s*env\(safe-area-inset-bottom\)\)\);/s
  )
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*\.color-panel\.sidebar-panel\s*\{[^}]*transition:\s*clip-path\s+360ms/s
  )
})

test('the compact panel stays anchored and keeps only the centered icon', () => {
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s*\{[^}]*top:\s*clamp\(24px,\s*2\.2vw,\s*42px\);[^}]*width:\s*100%;/s
  )
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s+\.sidebar-wordmark\s*\{[^}]*display:\s*none;/s
  )
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s+\.sidebar-close-button:focus-visible\s*\{[^}]*outline:\s*none;/s
  )
})

test('the collapsed sidebar uses one shadow layer without an afterimage', () => {
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s*\{[^}]*box-shadow:\s*none;/s
  )
  assert.match(
    css,
    /\.sidebar-menu-trigger\.is-visible\s*\{[^}]*box-shadow:\s*0\s+3px\s+30px\s+0\s+rgba\(0,\s*0,\s*0,\s*0\.05\);/s
  )
})

test('the mobile compact click target stays directly over the shrunken panel', () => {
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*\.sidebar-menu-trigger\.is-visible\s*\{[^}]*top:\s*max\(18px,\s*env\(safe-area-inset-top\)\);[^}]*right:\s*max\(18px,\s*env\(safe-area-inset-right\)\);/s
  )
})

test('mobile expansion reveals a fixed full-size panel from its top-right corner', () => {
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*\.color-panel\.sidebar-panel\s*\{[^}]*top:\s*max\(18px,\s*env\(safe-area-inset-top\)\);[^}]*right:\s*max\(18px,\s*env\(safe-area-inset-right\)\);[^}]*clip-path:\s*inset\(-55px round 8px\);[^}]*transition:\s*clip-path\s+360ms/s
  )
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*\.color-panel\.sidebar-panel\.is-dismissed\s*\{[^}]*width:\s*min\(334px,\s*calc\(100vw\s*-\s*36px\)\);[^}]*height:\s*calc\(100dvh\s*-\s*max\(18px,\s*env\(safe-area-inset-top\)\)\s*-\s*max\(18px,\s*env\(safe-area-inset-bottom\)\)\);[^}]*padding:\s*16px;[^}]*clip-path:\s*inset\(0 0 calc\(100%\s*-\s*46px\) calc\(100%\s*-\s*52px\) round 8px\);/s
  )
})

test('desktop expansion keeps one full-size box and uses a non-overshooting ease curve', () => {
  assert.match(
    css,
    /\.color-panel\s*\{[^}]*width:\s*100%;[^}]*height:\s*calc\(100dvh\s*-\s*clamp\(48px,\s*4\.4vw,\s*84px\)\);[^}]*padding:\s*16px;[^}]*clip-path:\s*inset\(-55px round 8px\);[^}]*transition:\s*clip-path\s+360ms\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/s
  )
  assert.match(
    css,
    /\.color-panel\.sidebar-panel\.is-dismissed\s*\{[^}]*width:\s*100%;[^}]*height:\s*calc\(100dvh\s*-\s*clamp\(48px,\s*4\.4vw,\s*84px\)\);[^}]*padding:\s*16px;[^}]*clip-path:\s*inset\(0 0 calc\(100%\s*-\s*46px\) calc\(100%\s*-\s*52px\) round 8px\);/s
  )
})
