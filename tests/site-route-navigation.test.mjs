import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const navigation = readFileSync(
  new URL('../components/site/PageNavigation.mjs', import.meta.url),
  'utf8'
)
const landingFrame = readFileSync(
  new URL('../components/site/LandingFrame.mjs', import.meta.url),
  'utf8'
)
const experienceFrame = readFileSync(
  new URL('../components/pixel-experience/ExperienceFrame.mjs', import.meta.url),
  'utf8'
)
const secondaryLanding = readFileSync(
  new URL('../components/site/SecondaryLanding.mjs', import.meta.url),
  'utf8'
)

test('connects the map, CCTV, and custom pages without merging their layouts', () => {
  assert.match(navigation, /assetPath\('experience'\)/)
  assert.match(navigation, /assetPath\('second'\).*view=custom/)
  assert.match(navigation, /페이지 이동/)
  assert.match(landingFrame, /PageNavigation/)
  assert.match(experienceFrame, /PageNavigation/)
})

test('keeps the custom page world as the shared second-page house interior', () => {
  assert.match(secondaryLanding, /playfield:\s*createElement\(HouseInteriorWorld/)
  assert.match(secondaryLanding, /isCustomView\s*\?\s*createElement\(CustomSidebarContent,\s*\{\s*onInput:\s*addCharacter\s*\}\)/)
  assert.doesNotMatch(secondaryLanding, /CustomWireframeWorld/)
})
