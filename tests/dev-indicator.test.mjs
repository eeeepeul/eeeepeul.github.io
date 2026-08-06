import test from 'node:test'
import assert from 'node:assert/strict'

import nextConfig from '../next.config.js'

test('the local development toolbar stays hidden', () => {
  assert.equal(nextConfig.devIndicators, false)
})
