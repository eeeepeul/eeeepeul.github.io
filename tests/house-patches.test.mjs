import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { FIRST_PATCH_FRAME, HOUSE_PATCHES } from '../lib/house-patches.mjs'
import { ZOOM_PATH, ZOOM_VIDEO } from '../lib/deep-zoom-map.mjs'

test('every clip frame from the first patched one to the last has a patch inside the frame and inside the atlas', () => {
  const last = ZOOM_VIDEO.firstFrame + ZOOM_VIDEO.frameCount - 1
  for (let frame = FIRST_PATCH_FRAME; frame <= last; frame += 1) {
    const patch = HOUSE_PATCHES.frames[frame]
    assert.ok(patch, `frame ${frame} has no patch`)
    const [x, y, width, height, atlasX, atlasY] = patch
    assert.ok(x >= 0 && y >= 0 && x + width <= ZOOM_VIDEO.bufferWidth && y + height <= ZOOM_VIDEO.bufferHeight, `frame ${frame} is off the frame`)
    assert.ok(atlasX + width <= HOUSE_PATCHES.width && atlasY + height <= HOUSE_PATCHES.height, `frame ${frame} is off the atlas`)
  }
  // the houses are small before the first patch (about a dozen pixels), so the patches start where they can be read
  assert.ok(FIRST_PATCH_FRAME <= 160 && FIRST_PATCH_FRAME > ZOOM_PATH.handFrame)
})

test('the patches are laid over the houses when a clip frame is drawn, and the atlas is a file of the site', () => {
  const source = readFileSync(new URL('../components/site/DeepZoomMap.mjs', import.meta.url), 'utf8')
  assert.match(source, /layHousePatch\(context, frame\)/)
  assert.match(source, /loadImage\(HOUSE_PATCHES\.src/)
  assert.ok(existsSync(new URL(`../public${HOUSE_PATCHES.src}`, import.meta.url)))
  // the picture past the clip's last frame (and that frame) hold the same shapes: both pictures are in the site
  assert.ok(existsSync(new URL(`../public${ZOOM_PATH.houses.src}`, import.meta.url)))
  assert.ok(existsSync(new URL(`../public${ZOOM_PATH.houses.lastFrame}`, import.meta.url)))
})
