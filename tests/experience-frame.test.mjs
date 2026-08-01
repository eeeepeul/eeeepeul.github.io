import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let ExperienceFrame
try {
  ;({ ExperienceFrame } = await import('../components/pixel-experience/ExperienceFrame.mjs'))
} catch {
  ExperienceFrame = undefined
}

test('renders the mark outside the shared right sidebar with the stage before it', () => {
  assert.equal(typeof ExperienceFrame, 'function')

  const markup = renderToStaticMarkup(
    createElement(
      ExperienceFrame,
      {
        mark: createElement('span', { id: 'mark' }, 'mark'),
        panel: createElement('div', { id: 'panel' }, 'panel'),
        panelLabel: '픽셀 설정 메뉴',
      },
      createElement('section', { id: 'stage' }, 'stage')
    )
  )

  const mark = markup.indexOf('id="mark"')
  const stage = markup.indexOf('id="stage"')
  const panel = markup.indexOf('id="panel"')

  assert.match(markup, /<main class="experience-shell"/)
  assert.ok(markup.includes('class="experience-mark"'))
  assert.ok(mark < stage)
  assert.ok(stage < panel)
  assert.match(markup, /<aside[^>]*class="color-panel sidebar-panel"[^>]*aria-label="픽셀 설정 메뉴"/)
  assert.match(markup, /<img class="sidebar-wordmark"[^>]*alt="M:MH"/)
  assert.match(markup, /<img class="sidebar-footer-mark"[^>]*alt=""/)
  assert.ok(!markup.includes('color-panel-footer'))
})
