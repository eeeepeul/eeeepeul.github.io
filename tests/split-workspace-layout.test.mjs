import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('renders a blank sidebar and an uncluttered right workspace', () => {
  assert.match(experience, /<aside className="blank-sidebar" aria-hidden="true" \/>/)
  assert.match(experience, /<div className="workspace">/)
  assert.doesNotMatch(experience, /<header|<footer|stage-meta/)
  assert.doesNotMatch(experience, /IF AND ONLY IF|PIXEL CCTV|CAM 01|4 BAND PATTERN|YOUR INPUT STAYS/)
})

test('uses two desktop columns and hides the empty sidebar on mobile', () => {
  assert.match(css, /\.experience-shell\s*\{[^}]*grid-template-columns:\s*clamp\(240px,\s*22vw,\s*360px\)\s+minmax\(0,\s*1fr\)/s)
  assert.match(css, /\.blank-sidebar\s*\{[^}]*background:\s*#fff[^}]*border-right:/s)
  assert.match(css, /\.workspace\s*\{[^}]*min-width:\s*0[^}]*display:\s*grid/s)
  assert.match(css, /@media\s*\(max-width:\s*800px\)[\s\S]*?\.experience-shell\s*\{[^}]*grid-template-columns:\s*1fr[\s\S]*?\.blank-sidebar\s*\{[^}]*display:\s*none/s)
})
