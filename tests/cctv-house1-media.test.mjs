import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { CCTV_HOUSES } from '../lib/cctv-houses.mjs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)

test('uses the supplied CCTV-1 source for house 1', () => {
  assert.equal(CCTV_HOUSES[0].videoSrc, 'media/CCTV-1.mp4')
  assert.ok(existsSync(new URL('../public/media/CCTV-1.mp4', import.meta.url)))
})

test('routes house 1 through the same controllable liquid canvas as the other CCTV feeds', () => {
  assert.match(experience, /const showLiquidEffect = true/)
  assert.match(experience, /showLiquidEffect && \(\s*<PixelCanvas/)
  assert.match(experience, /settings=\{settings\}/)
  assert.match(experience, /pulse=\{playback\.glitch\}/)
})
