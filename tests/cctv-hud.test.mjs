import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatCctvHudTimestamp } from '../lib/cctv-hud.mjs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('formats the thermal HUD timestamp from the video timeline', () => {
  assert.equal(formatCctvHudTimestamp(0), '2020-05-02 20:52:15 Sab')
  assert.equal(formatCctvHudTimestamp(65), '2020-05-02 20:53:20 Sab')
})

test('renders a non-interactive CCTV measurement HUD over the video', () => {
  assert.match(experience, /className="cctv-thermal-hud"/)
  assert.match(experience, /zone-alarm/)
  assert.match(experience, /Avg:\s*23\.5\s*Min:\s*15\.8\s*Max:\s*35\.9/)
  assert.match(experience, /formatCctvHudTimestamp\(playback\.currentTime\)/)
  assert.match(css, /\.cctv-thermal-hud\s*\{[^}]*pointer-events:\s*none;/s)
  assert.match(css, /\.cctv-thermal-hud\s*\{[^}]*z-index:\s*2;/s)
  assert.match(css, /\.cctv-thermal-zone\s*\{[^}]*border:\s*1px\s+solid/s)
  assert.match(css, /\.cctv-thermal-temperature-scale\s*\{[^}]*position:\s*absolute;/s)
})
