import test from 'node:test'
import assert from 'node:assert/strict'
import { assetPath } from '../lib/asset-path.mjs'

test('returns a root asset path without a base path', () => {
  assert.equal(assetPath('media/mosaic-01.mp4'), '/media/mosaic-01.mp4')
})

test('prefixes a normalized GitHub Pages base path', () => {
  assert.equal(
    assetPath('/media/if-and-only-if.mp3', '/pixel-site/'),
    '/pixel-site/media/if-and-only-if.mp3'
  )
})
