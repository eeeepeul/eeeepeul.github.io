import test from 'node:test'
import assert from 'node:assert/strict'
import { pickH264Mime } from '../lib/export-support.mjs'

test('selects an explicit AVC MP4 type', () => {
  const supported = new Set(['video/mp4;codecs=avc1.42E01E,mp4a.40.2'])
  assert.equal(
    pickH264Mime((mime) => supported.has(mime)),
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2'
  )
})

test('does not silently fall back to WebM or generic MP4', () => {
  assert.equal(pickH264Mime((mime) => mime === 'video/webm' || mime === 'video/mp4'), null)
})
