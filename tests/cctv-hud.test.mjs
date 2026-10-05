import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatCctvHudTimestamp } from '../lib/cctv-hud.mjs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)

test('formats the thermal HUD timestamp from the video timeline', () => {
  assert.equal(formatCctvHudTimestamp(0), '2020-05-02 20:52:15 Sab')
  assert.equal(formatCctvHudTimestamp(65), '2020-05-02 20:53:20 Sab')
})

test('draws a non-interactive crosshair HUD over the video', () => {
  assert.match(experience, /className="cctv-hud"/)
  assert.match(experience, /aria-hidden="true"/)
  assert.doesNotMatch(experience, /cctv-thermal-hud|zone-alarm/)
})
