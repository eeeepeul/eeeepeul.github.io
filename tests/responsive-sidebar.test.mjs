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
  assert.match(html, /src="\/media\/figma-sidebar-wordmark\.svg"/)
  assert.match(html, /aria-label="메뉴 닫기"/)
  assert.match(
    html,
    /<div class="sidebar-content"><button type="button">기존 기능<\/button><\/div>/
  )
  assert.match(html, /<img class="sidebar-footer-mark"[^>]*alt=""/)
  assert.match(html, /src="\/media\/figma-sidebar-footer\.svg"/)
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
  assert.match(css, /\.color-panel\s*\{[^}]*justify-self:\s*end;[^}]*width:\s*100%;/s)
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
  assert.match(css, /\.color-panel\.sidebar-panel\.is-dismissed\s*\{[^}]*box-shadow:\s*none;/s)
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

test('the native Figma home sidebar uses the exact 319 by 664 geometry', () => {
  assert.match(
    css,
    /\.experience-shell:has\(\.figma-home-sidebar-content\)\s*\{[^}]*position:\s*relative;[^}]*display:\s*block;[^}]*padding:\s*0;[^}]*overflow:\s*hidden;/s
  )
  assert.match(
    css,
    /\.color-panel:has\(\.figma-home-sidebar-content\)\s*\{[^}]*position:\s*fixed;[^}]*top:\s*clamp\(24px,\s*2\.2vw,\s*42px\);[^}]*right:\s*clamp\(24px,\s*2\.2vw,\s*42px\);[^}]*width:\s*319px;[^}]*height:\s*calc\(100dvh\s*-\s*clamp\(48px,\s*4\.4vw,\s*84px\)\);[^}]*padding:\s*16px;[^}]*border-radius:\s*0;/s
  )
  assert.match(css, /\.figma-home-sidebar-content\s*\{[^}]*display:\s*grid;[^}]*gap:\s*16px;/s)
  assert.match(
    css,
    /\.color-panel:has\(\.figma-home-sidebar-content\)\s+\.sidebar-close-button\s*\{[^}]*z-index:\s*2;/s
  )
  assert.doesNotMatch(css, /\.figma-home-sidebar-artwork\s*\{/)
})

test('the page-one scene fills the canvas and keeps the exact map crop and controls', () => {
  assert.match(
    css,
    /\.experience-shell:has\(\.figma-home-sidebar-content\)\s+>\s+\.landing-space\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*min-height:\s*100dvh;/s
  )
  assert.match(
    css,
    /\.figma-home-map-clip\s*\{[^}]*top:\s*-7px;[^}]*left:\s*0;[^}]*width:\s*833px;[^}]*height:\s*674px;/s
  )
  assert.match(
    css,
    /\.experience-shell:has\(\.figma-home-sidebar-content\)\s+>\s+\.house-link:has\(\.house-mark--figma\)\s*\{[^}]*position:\s*fixed;[^}]*left:\s*36px;[^}]*bottom:\s*36px;[^}]*margin:\s*0;/s
  )
  assert.match(
    css,
    /\.house-mark--figma\s*\{[^}]*display:\s*block;[^}]*width:\s*30px;[^}]*height:\s*24px;[^}]*transform:\s*none;/s
  )
})

test('the native Figma cards keep the reference heights and fine distance rule', () => {
  assert.match(css, /\.figma-sidebar-intro\s*\{[^}]*height:\s*93px;[^}]*padding:\s*12px;/s)
  assert.match(css, /\.figma-sidebar-activity\s*\{[^}]*height:\s*126px;/s)
  assert.match(css, /\.figma-sidebar-distance\s*\{[^}]*height:\s*88px;/s)
  assert.match(css, /\.figma-sidebar-network\s*\{[^}]*height:\s*180px;/s)
  assert.match(css, /\.figma-distance-segment\s*\{[^}]*top:\s*13px;[^}]*height:\s*5px;/s)
  assert.match(
    css,
    /\.figma-distance-track\s*\{[^}]*touch-action:\s*none;[^}]*cursor:\s*grab;[^}]*background:\s*none;/s
  )
  assert.match(css, /\.figma-distance-strip\s*\{[^}]*display:\s*flex;/s)
  assert.match(css, /\.figma-distance-strip\s*\{[^}]*width:\s*783px;/s)
  assert.match(
    css,
    /\.figma-distance-strip\s*\{[^}]*transform:\s*translate3d\(calc\(-261px \+ var\(--distance-drag\)\),\s*0,\s*0\);/s
  )
  assert.match(css, /\.figma-distance-slide\s*\{[^}]*flex:\s*0 0 261px;[^}]*width:\s*261px;/s)
  assert.match(css, /\.figma-distance-route\s*\{[^}]*width:\s*261px;[^}]*transform:\s*none;/s)
  assert.match(
    css,
    /\.figma-distance-ticks--middle\s*\{[^}]*left:\s*53\.17px;[^}]*width:\s*63\.8px;/s
  )
  assert.match(
    css,
    /@font-face\s*\{[^}]*font-family:\s*"Nanum Gothic Coding";[^}]*NanumGothicCoding-Bold\.woff2[^}]*font-weight:\s*700;/s
  )
  assert.match(
    css,
    /\.figma-sidebar-intro p\s*\{[^}]*font-family:\s*"Nanum Gothic Coding",\s*monospace;[^}]*font-size:\s*12px;[^}]*font-weight:\s*700;[^}]*line-height:\s*12px;[^}]*transform:\s*none;/s
  )
  assert.match(css, /\.figma-sidebar-time\s*\{[^}]*letter-spacing:\s*0;/s)
  assert.match(
    css,
    /\.figma-sidebar-bars\s*\{[^}]*position:\s*relative;[^}]*width:\s*261px;[^}]*height:\s*69px;/s
  )
  assert.match(
    css,
    /\.figma-sidebar-status-chip\s*\{[^}]*height:\s*19px;[^}]*padding:\s*3px\s+5px;[^}]*background:\s*#f2f2f2;/s
  )
  assert.match(css, /\.figma-sidebar-network\s*\{[^}]*background-color:\s*#fcfcfc;/s)
  assert.match(
    css,
    /\.figma-sidebar-network circle,[\s\S]*\.figma-sidebar-network line,[\s\S]*\.figma-sidebar-network polyline\s*\{[^}]*stroke:\s*#282828;[^}]*stroke-width:\s*1\.5;/s
  )
  assert.match(css, /@font-face\s*\{[^}]*font-family:\s*"Poppins";[^}]*Poppins-Regular\.ttf/s)
  assert.match(
    css,
    /\.figma-home-top-labels\s*\{[^}]*font-family:\s*"Poppins",\s*Arial,\s*sans-serif;/s
  )
})

test('the live house map keeps every route black and exposes keyboard focus on house rings', () => {
  assert.match(
    css,
    /\.figma-sidebar-network \.figma-house-map-route\s*\{[^}]*stroke:\s*#282828;/s
  )
  assert.match(css, /\.figma-house-map-house-link\s*\{[^}]*cursor:\s*pointer;/s)
  assert.match(
    css,
    /\.figma-house-map-house-link:hover \.figma-house-map-ring,[\s\S]*\.figma-house-map-house-link:focus-visible \.figma-house-map-ring\s*\{[^}]*stroke-width:\s*2;/s
  )
})

test('the enlarged house map exposes direct drag affordances without animating behind the pointer', () => {
  assert.match(
    css,
    /\.figma-house-map-canvas\.can-pan\s*\{[^}]*cursor:\s*grab;[^}]*touch-action:\s*none;/s
  )
  assert.match(css, /\.figma-house-map-canvas\.can-pan\.is-dragging\s*\{[^}]*cursor:\s*grabbing;/s)
  assert.match(
    css,
    /\.figma-house-map-canvas\.is-dragging \.figma-house-map-viewport\s*\{[^}]*transition:\s*none;/s
  )
})

test('the map zoom control keeps the 100 percent label and both buttons inside stable columns', () => {
  assert.match(
    css,
    /\.figma-network-zoom\s*\{[^}]*width:\s*72px;[^}]*display:\s*grid;[^}]*grid-template-columns:\s*11px\s+minmax\(30px,\s*1fr\)\s+11px;[^}]*column-gap:\s*4px;/s
  )
  assert.match(
    css,
    /\.figma-network-zoom strong\s*\{[^}]*text-align:\s*center;[^}]*white-space:\s*nowrap;/s
  )
})
