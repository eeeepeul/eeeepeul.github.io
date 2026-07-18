import test from 'node:test'
import assert from 'node:assert/strict'
import { withTimeout } from '../lib/promise-timeout.mjs'

test('returns a promise value before the deadline', async () => {
  assert.equal(await withTimeout(Promise.resolve('ready'), 20, 'timeout'), 'ready')
})

test('rejects instead of leaving playback in loading forever', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10, '오디오 시작 시간 초과'), {
    message: '오디오 시작 시간 초과',
  })
})
