import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SECOND_STAGE } from '../components/site/SecondStage.mjs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const block = css.slice(css.indexOf('the second pages on a stage of fixed proportion'))

test('the stage of the second pages is 16:9', () => {
  assert.equal(SECOND_STAGE.width / SECOND_STAGE.height, 2000 / 1125)
  assert.ok(Math.abs(SECOND_STAGE.width / SECOND_STAGE.height - 16 / 9) < 1e-9)
})

test('the stage keeps its proportion on every screen: one scale for both sides, no narrow-screen layout', () => {
  assert.match(block, /width:\s*calc\(2000px \* var\(--stage-scale\)\)/)
  assert.match(block, /height:\s*calc\(1125px \* var\(--stage-scale\)\)/)
  assert.doesNotMatch(block, /@media/)
})
