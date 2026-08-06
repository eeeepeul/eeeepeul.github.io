# Mosaic Font Proportion and Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the natural ITC Avant Garde Gothic Pro Bold proportions in the M·O·E mosaic and reduce the default visible gap between neighboring glyphs.

**Architecture:** Keep glyph sizing rules in `lib/glyph-atlas.mjs` and let the WebGL canvas consume separate atlas width and height constants. Match the atlas-cell aspect ratio to the existing tall mosaic grid, while preserving all shader, density, palette, and non-text shape behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL, Canvas 2D, Node test runner

## Global Constraints

- Use `ITC Avant Garde Gothic Pro` at weight 700 with the current fallback stack.
- Use a 64×104 glyph-atlas cell.
- Use 2 pixels of horizontal glyph padding.
- Do not change mosaic density, scale, spacing control behavior, palette, Kick response, circle mode, or square mode.
- Do not commit, push, or deploy until the user explicitly requests it.

---

### Task 1: Lock the atlas aspect and spacing contract

**Files:**
- Modify: `tests/glyph-atlas.test.mjs`
- Modify: `lib/glyph-atlas.mjs`

**Interfaces:**
- Produces: `GLYPH_ATLAS_CELL_WIDTH: number`
- Produces: `GLYPH_ATLAS_CELL_HEIGHT: number`
- Produces: `GLYPH_ATLAS_PADDING: number`
- Preserves: `fitGlyphFontSize(measuredWidth, requestedSize?, cellWidth?, padding?): number`

- [ ] **Step 1: Write the failing regression tests**

```js
const {
  GLYPH_ATLAS_CELL_WIDTH = Number.NaN,
  GLYPH_ATLAS_CELL_HEIGHT = Number.NaN,
} = glyphAtlas

test('preserves natural glyph width when the atlas maps into the tall mosaic cells', () => {
  const displayedWidthScale = 0.62 * GLYPH_ATLAS_CELL_HEIGHT / GLYPH_ATLAS_CELL_WIDTH
  assert.ok(Math.abs(displayedWidthScale - 1) < 0.01)
})

test('uses narrow default padding between neighboring glyphs', () => {
  assert.equal(fitGlyphFontSize(60), 54)
})
```

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

Run: `node --test tests/glyph-atlas.test.mjs`

Expected: FAIL because the current atlas is square and its default padding is 6 pixels.

- [ ] **Step 3: Add separate width and height constants and narrow the padding**

```js
export const GLYPH_ATLAS_CELL_WIDTH = 64
export const GLYPH_ATLAS_CELL_HEIGHT = 104
export const GLYPH_ATLAS_FONT_SIZE = 54
export const GLYPH_ATLAS_PADDING = 2

export function fitGlyphFontSize(
  measuredWidth,
  requestedSize = GLYPH_ATLAS_FONT_SIZE,
  cellWidth = GLYPH_ATLAS_CELL_WIDTH,
  padding = GLYPH_ATLAS_PADDING
) {
  const width = Number(measuredWidth)
  if (!Number.isFinite(width) || width <= 0) return requestedSize
  const availableWidth = Math.max(1, cellWidth - padding * 2)
  return Math.min(requestedSize, requestedSize * availableWidth / width)
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/glyph-atlas.test.mjs`

Expected: all glyph-atlas tests PASS.

### Task 2: Render the corrected atlas and verify the experience

**Files:**
- Modify: `components/pixel-experience/PixelCanvas.tsx`
- Verify: `components/pixel-experience/PixelCanvas.tsx`
- Verify: `lib/pixel-shaders.ts`

**Interfaces:**
- Consumes: `GLYPH_ATLAS_CELL_WIDTH` and `GLYPH_ATLAS_CELL_HEIGHT` from `lib/glyph-atlas.mjs`
- Preserves: `createGlyphAtlas(characters: string): { atlas: HTMLCanvasElement; count: number }`

- [ ] **Step 1: Update the glyph-atlas imports and canvas dimensions**

```ts
import {
  GLYPH_ATLAS_CELL_HEIGHT,
  GLYPH_ATLAS_CELL_WIDTH,
  GLYPH_ATLAS_FONT_FAMILY,
  GLYPH_ATLAS_FONT_SIZE,
  fitGlyphFontSize,
} from '../../lib/glyph-atlas.mjs'

const cellWidth = GLYPH_ATLAS_CELL_WIDTH
const cellHeight = GLYPH_ATLAS_CELL_HEIGHT
```

Keep centering at `cellHeight / 2 + 2` and keep the shader unchanged so only the atlas source aspect changes.

- [ ] **Step 2: Run the focused and complete automated tests**

Run: `node --test tests/glyph-atlas.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: every test PASS.

- [ ] **Step 3: Verify the UI in the browser**

Open: `http://127.0.0.1:3004/experience/`

Expected:
- M, O, and E retain their natural Avant Garde width-to-height proportions.
- Neighboring glyphs have a visibly narrower default gap.
- No source-video layer appears behind the glyphs.
- Circle and square modes remain geometrically correct and unchanged.

- [ ] **Step 4: Run production and whitespace verification**

Run: `git diff --check`

Expected: no output.

Stop the local development server, then run: `npm run build`

Expected: production build completes successfully.

Restart the local development server, then run:

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3004/experience/`

Expected: `200` after restarting the local development server.
