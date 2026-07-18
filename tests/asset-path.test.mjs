import test from 'node:test'
import assert from 'node:assert/strict'
import { assetPath } from '../lib/asset-path.mjs'

test('returns a root asset path without a base path', () => {
  assert.equal(assetPath('media/cctv-1080p.mp4'), '/media/cctv-1080p.mp4')
})

test('prefixes a normalized GitHub Pages base path', () => {
  assert.equal(
    assetPath('/media/if-and-only-if.mp3', '/pixel-site/'),
    '/pixel-site/media/if-and-only-if.mp3'
  )
})
