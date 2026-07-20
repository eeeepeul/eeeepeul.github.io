import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('shows the looping muted pixel preview without a start overlay', () => {
  assert.doesNotMatch(experience, /START EXPERIENCE|className="start-layer"/)
  assert.match(experience, /<PixelCanvas[\s\S]*?playing=\{true\}/)
  assert.match(experience, /<video[\s\S]*?autoPlay[\s\S]*?loop[\s\S]*?muted[\s\S]*?playsInline/)
  assert.doesNotMatch(css, /\.start-layer|\.start-copy|\.start-button|\.start-index/)
})

test('uses a compact user gesture to start audible music', () => {
  assert.match(experience, /hasStarted \? playback\.restart\(\) : playback\.start\(\)/)
  assert.match(experience, /'음악 시작'/)
  assert.match(experience, /'처음부터'/)
})
