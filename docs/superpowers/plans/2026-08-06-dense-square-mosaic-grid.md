# Dense Square Mosaic Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `scale 1` and `spacing 0.00` render a substantially denser M·O·E mosaic with nearly square pixel cells and natural glyph proportions.

**Architecture:** Remove the historical row-reduction factor from the shared grid calculation so column density determines a square physical grid. Match the glyph atlas to that square grid and enlarge the glyph inside its cell; Circle and Square inherit the new density through the existing shared uniforms.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL, Canvas 2D, Node test runner

## Global Constraints

- Resolve 500 columns at 1920×1080 to 281 rows.
- Keep `spacing 0.00` as zero tile inset.
- Use a square 64×64 glyph-atlas cell, requested font size 60, and zero atlas padding.
- Preserve the ITC Avant Garde Gothic Pro Bold family and fallback stack.
- Apply the shared grid to M·O·E, Circle, and Square.
- Do not add colored backing squares or expose the source video behind the mosaic.
- Do not commit, push, or deploy until the user explicitly requests it.

---

### Task 1: Resolve a dense square mosaic grid

**Files:**
- Modify: `tests/mosaic-settings.test.mjs`
- Modify: `lib/mosaic-settings.mjs`

**Interfaces:**
- Preserves: `resolveMosaicGrid(columns, width, height): { rows: number; shapeYScale: number }`
- Produces: 281 rows for `(500, 1920, 1080)` and nearly equal physical tile width and height.

- [ ] **Step 1: Write the failing square-grid regression test**

```js
test('uses dense square cells at the 500-column scale-one limit', () => {
  const { rows, shapeYScale } = mosaicSettings.resolveMosaicGrid(500, 1920, 1080)

  assert.equal(rows, 281)
  assert.ok(Math.abs(shapeYScale - 1) < 0.01)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/mosaic-settings.test.mjs`

Expected: FAIL because the current `0.62` factor resolves only about 174 rows.

- [ ] **Step 3: Remove the historical row-reduction factor**

```js
export function resolveMosaicGrid(columns, width, height) {
  const columnCount = clamp(columns, 1, 500, 89)
  const pixelWidth = Math.max(1, Number(width) || 1920)
  const pixelHeight = Math.max(1, Number(height) || 1080)
  const rows = Math.max(1, Math.floor(columnCount * pixelHeight / pixelWidth))
  const shapeYScale = (pixelHeight / rows) / (pixelWidth / columnCount)

  return { rows, shapeYScale }
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/mosaic-settings.test.mjs`

Expected: all mosaic-settings tests PASS.

### Task 2: Match and fill the glyph atlas to the square grid

**Files:**
- Modify: `tests/glyph-atlas.test.mjs`
- Modify: `lib/glyph-atlas.mjs`
- Verify: `components/pixel-experience/PixelCanvas.tsx`

**Interfaces:**
- Preserves: `GLYPH_ATLAS_CELL_WIDTH: number`
- Changes: `GLYPH_ATLAS_CELL_HEIGHT` from 104 to 64
- Changes: `GLYPH_ATLAS_FONT_SIZE` from 54 to 60
- Changes: `GLYPH_ATLAS_PADDING` from 2 to 0
- Preserves: `fitGlyphFontSize(measuredWidth, requestedSize?, cellWidth?, padding?): number`

- [ ] **Step 1: Update the tests to express square mapping and dense default glyph fit**

```js
test('preserves natural glyph proportions in the square mosaic grid', () => {
  const displayedWidthScale = glyphAtlasCellHeight / glyphAtlasCellWidth
  assert.ok(Math.abs(displayedWidthScale - 1) < 0.01)
})

test('fills the zero-spacing cell with the larger default glyph', () => {
  assert.equal(fitGlyphFontSize(60), 60)
})
```

- [ ] **Step 2: Run the glyph-atlas test and verify the updated assertions fail**

Run: `node --test tests/glyph-atlas.test.mjs`

Expected: FAIL because the current cell height is 104 and the default font size/padding resolve 54.

- [ ] **Step 3: Set the atlas to the approved dense square values**

```js
export const GLYPH_ATLAS_CELL_WIDTH = 64
export const GLYPH_ATLAS_CELL_HEIGHT = 64
export const GLYPH_ATLAS_FONT_SIZE = 60
export const GLYPH_ATLAS_PADDING = 0
```

No `PixelCanvas.tsx` logic change is needed because it already consumes separate atlas width and height constants.

- [ ] **Step 4: Run the focused and complete tests**

Run: `node --test tests/glyph-atlas.test.mjs tests/mosaic-settings.test.mjs`

Expected: both focused suites PASS.

Run: `npm test`

Expected: every test PASS.

- [ ] **Step 5: Verify the requested UI state in the browser**

Open: `http://127.0.0.1:3004/experience/`

Set `scale` to `1` and keep `spacing` at `0.00`.

Expected:
- Status reads `500 TILES / ROW`.
- The number of vertical rows is visibly higher and the broad blue row gaps are substantially reduced.
- M·O·E retains natural proportions.
- Circle and Square remain geometrically correct.

- [ ] **Step 6: Run production and local-server verification**

Run: `git diff --check`

Expected: no output.

Stop the local development server, then run: `npm run build`

Expected: production build completes successfully.

Restart the local development server, then run:

`curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3004/experience/`

Expected: `200`.
