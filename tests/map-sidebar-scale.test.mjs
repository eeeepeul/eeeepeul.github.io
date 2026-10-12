import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { MainLanding } from '../components/site/MainLanding.mjs'
import { ResponsiveSidebar } from '../components/site/ResponsiveSidebar.mjs'

const sidebarScaleModule = await import('../lib/map-sidebar-scale.mjs').catch(() => ({}))
const mapCss = readFileSync(new URL('../app/map-skin.css', import.meta.url), 'utf8')

test('keeps the map sidebar at 260px scale on a 1920 by 1080 viewport', () => {
  assert.equal(typeof sidebarScaleModule.getMapSidebarScale, 'function')
  assert.equal(sidebarScaleModule.getMapSidebarScale({ width: 1920, height: 1080 }), 1)
})

test('shrinks the desktop map sidebar by the tighter width or height ratio', () => {
  assert.equal(typeof sidebarScaleModule.getMapSidebarScale, 'function')
  assert.equal(sidebarScaleModule.getMapSidebarScale({ width: 1194, height: 833 }), 0.6219)
  assert.equal(sidebarScaleModule.getMapSidebarScale({ width: 1366, height: 768 }), 0.7061)
})

test('fits the complete map sidebar inside phone height without desktop-width shrinking', () => {
  assert.equal(typeof sidebarScaleModule.getMapSidebarScale, 'function')
  assert.equal(sidebarScaleModule.getMapSidebarScale({ width: 390, height: 844 }), 0.7824)
  assert.equal(sidebarScaleModule.getMapSidebarScale({ width: 320, height: 568 }), 0.5191)
})

test('keeps the 1920 panel at 260px while fitting the complete content height', () => {
  assert.equal(typeof sidebarScaleModule.getMapSidebarLayout, 'function')
  assert.deepEqual(
    sidebarScaleModule.getMapSidebarLayout({ width: 1920, height: 1080 }),
    {
      scale: 1,
      panelWidth: '260px',
      contentZoom: 0.8857,
      inset: '14px',
    }
  )
  assert.deepEqual(
    sidebarScaleModule.getMapSidebarLayout({ width: 390, height: 844 }),
    {
      scale: 0.7824,
      panelWidth: '203.424px',
      contentZoom: 0.6904,
      inset: '12px',
    }
  )
})

test('opts only the map sidebar into viewport scaling', () => {
  const mapHtml = renderToStaticMarkup(createElement(MainLanding))
  const ordinaryHtml = renderToStaticMarkup(
    createElement(ResponsiveSidebar, null, createElement('span', null, 'ordinary'))
  )

  assert.match(
    mapHtml,
    /<aside[^>]*data-viewport-scaled="true"[^>]*style="--map-sidebar-scale:1;--map-sidebar-width:260px;--map-sidebar-zoom:0\.8857;--map-sidebar-inset:14px"/
  )
  assert.doesNotMatch(ordinaryHtml, /data-viewport-scaled|--map-sidebar-scale/)
})

test('uses the calculated width and zoom without a desktop sidebar scrollbar', () => {
  assert.match(
    mapCss,
    /@media \(min-width: 801px\)[\s\S]*\.color-panel\.sidebar-panel\[data-viewport-scaled='true'\]:has\(\.figma-home-sidebar-content\)\s*\{[^}]*top:\s*var\(--map-sidebar-inset\);[^}]*right:\s*var\(--map-sidebar-inset\);[^}]*width:\s*var\(--map-sidebar-width\);[^}]*height:\s*calc\(100dvh - \(var\(--map-sidebar-inset\) \* 2\)\);[^}]*overflow:\s*hidden;/s
  )
  assert.match(
    mapCss,
    /\.figma-home-sidebar-content,[\s\S]*\.sidebar-footer-content\s*\{[^}]*zoom:\s*var\(--map-sidebar-zoom\);/s
  )
})

test('fits the open phone sidebar to the same calculated viewport scale', () => {
  assert.match(
    mapCss,
    /@media \(max-width: 800px\)[\s\S]*\.color-panel\.sidebar-panel\[data-viewport-scaled='true'\]:has\(\.figma-home-sidebar-content\)\s*\{[^}]*top:\s*var\(--map-sidebar-inset\);[^}]*right:\s*var\(--map-sidebar-inset\);[^}]*width:\s*var\(--map-sidebar-width\);[^}]*height:\s*calc\(100dvh - \(var\(--map-sidebar-inset\) \* 2\)\);[^}]*overflow:\s*hidden;/s
  )
})
