import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResponsiveSidebar } from '../components/site/ResponsiveSidebar.mjs'
import { AttentionHeatmap } from '../components/site/AttentionHeatmap.mjs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const mainLanding = readFileSync(
  new URL('../components/site/MainLanding.mjs', import.meta.url),
  'utf8'
)
const landingFrame = readFileSync(
  new URL('../components/site/LandingFrame.mjs', import.meta.url),
  'utf8'
)

test('replaces the home sidebar butterfly mark with an attention heatmap', () => {
  const html = renderToStaticMarkup(
    createElement(
      ResponsiveSidebar,
      { footer: createElement(AttentionHeatmap) },
      createElement('div', null, 'existing sidebar content')
    )
  )

  assert.match(html, /class="attention-heatmap"/)
  assert.match(html, /aria-label="Attention heatmap"/)
  assert.match(html, />ATTENTION HEATMAP</)
  assert.match(html, />in-frame visual attention</)
  assert.match(html, /class="attention-heatmap-legend"/)
  assert.doesNotMatch(html, /class="sidebar-footer-mark"/)
  assert.match(mainLanding, /import \{ AttentionHeatmap \} from '\.\/AttentionHeatmap\.mjs'/)
  assert.match(mainLanding, /sidebarFooter: createElement\(AttentionHeatmap\)/)
  assert.match(landingFrame, /footer: sidebarFooter/)
  assert.match(css, /\.attention-heatmap\s*\{[^}]*color:\s*#222;[^}]*background:\s*#fff;/s)
  assert.match(css, /\.attention-heatmap-frame\s*\{[^}]*background:/s)
  assert.match(css, /\.attention-heatmap-frame\s*\{[^}]*url\('\/media\/figma-home-map\.png'\)/s)
  assert.match(css, /\.attention-heatmap-frame\s*\{[^}]*background-blend-mode:\s*luminosity/s)
  assert.match(css, /\.attention-heatmap-frame\s*\{[^}]*border:\s*1px solid #bdbdbd;/s)
  assert.match(css, /\.attention-heatmap-scale\s*\{[^}]*linear-gradient\(\s*to bottom/s)
})
