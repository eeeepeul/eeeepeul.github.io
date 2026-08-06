# Avant Garde Mosaic Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the M·O·E mosaic with locally activated ITC Avant Garde Gothic Pro Bold glyphs that fit cleanly inside square atlas cells.

**Architecture:** Put font-stack and glyph-fit calculations in a small browser-independent module. `PixelCanvas` will consume that module while building its existing canvas atlas, so the WebGL shader and all non-text modes remain unchanged.

**Tech Stack:** JavaScript modules, React/Next.js, Canvas 2D, WebGL, Node test runner

## Global Constraints

- Use `ITC Avant Garde Gothic Pro` at weight 700 when it is locally available.
- Use a 64×64 atlas cell and preserve six pixels of horizontal padding.
- Fall back to `Avant Garde Gothic`, `Century Gothic`, Arial, and sans-serif.
- Do not copy or bundle the Adobe-managed font file.
- Do not change interface typography, palette logic, video sampling, Kick behavior, Circle, or Square modes.
- Do not commit, push, or deploy unless the user explicitly requests it.

---

### Task 1: Add an unclipped Avant Garde glyph atlas

**Files:**
- Create: `lib/glyph-atlas.mjs`
- Create: `tests/glyph-atlas.test.mjs`
- Modify: `components/pixel-experience/PixelCanvas.tsx`

**Interfaces:**
- Produces: `GLYPH_ATLAS_CELL_SIZE`, `GLYPH_ATLAS_FONT_SIZE`, `GLYPH_ATLAS_FONT_FAMILY`, and `fitGlyphFontSize(measuredWidth, requestedSize, cellSize, padding)`
- Consumes: Canvas 2D `measureText()` width and the existing `createGlyphAtlas(characters)` path

- [ ] **Step 1: Write the failing fit tests**

Create `tests/glyph-atlas.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { fitGlyphFontSize } from '../lib/glyph-atlas.mjs'

test('shrinks a wide glyph enough to preserve atlas padding', () => {
  assert.equal(fitGlyphFontSize(60, 54, 64, 6), 46.8)
})

test('keeps the requested size when a glyph already fits', () => {
  assert.equal(fitGlyphFontSize(40, 54, 64, 6), 54)
})

test('keeps the requested size when no usable measurement exists', () => {
  assert.equal(fitGlyphFontSize(0, 54, 64, 6), 54)
})

```

- [ ] **Step 2: Run the new test and verify the expected failure**

Run: `node --test tests/glyph-atlas.test.mjs`

Expected: FAIL because `lib/glyph-atlas.mjs` does not exist.

- [ ] **Step 3: Add the pure atlas configuration module**

Create `lib/glyph-atlas.mjs`:

```js
export const GLYPH_ATLAS_CELL_SIZE = 64
export const GLYPH_ATLAS_FONT_SIZE = 54
export const GLYPH_ATLAS_PADDING = 6
export const GLYPH_ATLAS_FONT_FAMILY =
  '"ITC Avant Garde Gothic Pro", "Avant Garde Gothic", "Century Gothic", Arial, sans-serif'

export function fitGlyphFontSize(
  measuredWidth,
  requestedSize = GLYPH_ATLAS_FONT_SIZE,
  cellSize = GLYPH_ATLAS_CELL_SIZE,
  padding = GLYPH_ATLAS_PADDING
) {
  const width = Number(measuredWidth)
  if (!Number.isFinite(width) || width <= 0) return requestedSize
  const availableWidth = Math.max(1, cellSize - padding * 2)
  return Math.min(requestedSize, requestedSize * availableWidth / width)
}
```

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/glyph-atlas.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 5: Apply the module to the canvas atlas**

In `PixelCanvas.tsx`, import the helpers:

```ts
import {
  GLYPH_ATLAS_CELL_SIZE,
  GLYPH_ATLAS_FONT_FAMILY,
  GLYPH_ATLAS_FONT_SIZE,
  fitGlyphFontSize,
} from '../../lib/glyph-atlas.mjs'
```

Replace the atlas dimensions and font setup with:

```ts
const cellWidth = GLYPH_ATLAS_CELL_SIZE
const cellHeight = GLYPH_ATLAS_CELL_SIZE
// ...create and clear the canvas as before...
context.font = `700 ${GLYPH_ATLAS_FONT_SIZE}px ${GLYPH_ATLAS_FONT_FAMILY}`
const widestGlyph = glyphs.reduce(
  (width, glyph) => Math.max(width, context.measureText(glyph).width),
  0
)
context.font = `700 ${fitGlyphFontSize(widestGlyph)}px ${GLYPH_ATLAS_FONT_FAMILY}`
```

Keep the existing centered `fillText` loop so only the font geometry and fit change.

- [ ] **Step 6: Verify the local font and rendered modes**

At `http://127.0.0.1:3004/experience/`, confirm `document.fonts.check('700 56px "ITC Avant Garde Gothic Pro"')` is true, visually inspect the M·O·E atlas, and switch to Circle and Square to confirm their rendering is unchanged.

- [ ] **Step 7: Run final verification**

Run `npm test`, `git diff --check`, and `npm run build`; restart port 3004 and verify `/experience/` returns HTTP 200.
