import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { PageNavigation } from '../components/site/PageNavigation.mjs'
import { SecondaryLanding } from '../components/site/SecondaryLanding.mjs'

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
  assert.match(navigation, /assetPath\('second\/custom'\)/)
  assert.match(navigation, /페이지 이동/)
  assert.match(landingFrame, /PageNavigation/)
  assert.match(experienceFrame, /PageNavigation/)
})

test('keeps the custom page world as the shared second-page house interior', () => {
  assert.match(secondaryLanding, /playfield:\s*createElement\(HouseInteriorWorld/)
  assert.match(secondaryLanding, /isCustomView\s*\?\s*createElement\(CustomSidebarContent,\s*\{\s*onInput:\s*addCharacter\s*\}\)/)
  assert.doesNotMatch(secondaryLanding, /CustomWireframeWorld/)
})

test('links to a dedicated custom route that renders the current sidebar in the first HTML', () => {
  const navigationHtml = renderToStaticMarkup(createElement(PageNavigation))
  const customHtml = renderToStaticMarkup(
    createElement(SecondaryLanding, { initialCustomView: true })
  )

  assert.match(navigationHtml, /href="\/second\/custom\/"[^>]*>custom<\/a>/)
  assert.match(customHtml, /class="[^"]*pixel-custom-sidebar[^"]*"/)
  assert.match(customHtml, /aria-current="page"[^>]*>custom<\/a>/)
  assert.match(customHtml, /aria-label="캐릭터 커스터마이징 사이드바"/)
  assert.doesNotMatch(customHtml, /aria-label="새 캐릭터 추가"/)
})

test('lets the custom link switch the current view before changing routes', () => {
  let selectedRoute = null
  let prevented = false
  const navigationElement = PageNavigation({
    onRouteSelect: (route, event) => {
      event.preventDefault()
      selectedRoute = route
    },
  })
  const customLink = navigationElement.props.children.find(
    (child) => child.props.children === 'custom'
  )

  assert.equal(typeof customLink.props.onClick, 'function')
  customLink.props.onClick({
    preventDefault() {
      prevented = true
    },
  })

  assert.equal(prevented, true)
  assert.deepEqual(selectedRoute, {
    id: 'custom',
    label: 'custom',
    href: '/second/custom/',
  })
})
