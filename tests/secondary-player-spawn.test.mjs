import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SecondaryLanding } from '../components/site/SecondaryLanding.mjs'

test('initial second page keeps the character sidebar and has no player yet', () => {
  const html = renderToStaticMarkup(createElement(SecondaryLanding))
  // the add-a-character key is the custom sidebar's input key now (the sidebar is the same on both pages)
  assert.match(html, /class="custom-sidebar-input character-spawn-button[^"]*"/)
  assert.doesNotMatch(html, /data-character-role="player"/)
  assert.match(html, /data-camera-mode="living-room"/)
})
