import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SecondaryLanding } from '../components/site/SecondaryLanding.mjs'

test('initial second page keeps the existing sidebar and has no player yet', () => {
  const html = renderToStaticMarkup(createElement(SecondaryLanding))
  assert.match(html, /class="character-spawn-button"[^>]*aria-label="새 캐릭터 추가"/)
  assert.doesNotMatch(html, /data-character-role="player"/)
  assert.match(html, /data-camera-mode="living-room"/)
})
