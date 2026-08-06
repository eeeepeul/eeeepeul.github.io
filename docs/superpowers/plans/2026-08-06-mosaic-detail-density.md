# Mosaic Detail Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the initial mosaic from about 100 to 125 columns without changing the approved `scale 5` control value.

**Architecture:** Keep the existing shared `resolveMosaicColumns` path and increase its scale-density numerator from `2` to `2.5`. Because every mosaic shape consumes the same resolved column count, M·O·E, circle, and square gain detail together without shader or UI duplication.

**Tech Stack:** JavaScript modules, React/Next.js, Node test runner, WebGL browser preview

## Global Constraints

- Keep `DEFAULT_MOSAIC_SETTINGS.scale` equal to `5`.
- Produce 125 columns for the current initial base count of 249.
- Preserve spacing, palette mapping, flat background rendering, Kick response, and control ranges.
- Do not commit, push, or deploy unless the user explicitly requests it.

---

### Task 1: Increase shared mosaic density

**Files:**
- Modify: `tests/mosaic-settings.test.mjs`
- Modify: `lib/mosaic-settings.mjs`

**Interfaces:**
- Consumes: `resolveMosaicColumns(baseColumns, settings)` and `DEFAULT_MOSAIC_SETTINGS`
- Produces: the same numeric column-count API with a 25 percent denser scale mapping

- [ ] **Step 1: Write the failing behavioral test**

Update the approved-default test so the hand-derived expectations are:

```js
assert.equal(resolveMosaicColumns(89, DEFAULT_MOSAIC_SETTINGS), 45)
assert.equal(resolveMosaicColumns(249, DEFAULT_MOSAIC_SETTINGS), 125)
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --test tests/mosaic-settings.test.mjs`

Expected: FAIL because the current density formula returns 36 and 100 columns.

- [ ] **Step 3: Implement the minimal density change**

Change the shared calculation in `resolveMosaicColumns` to:

```js
return Math.max(8, Math.min(500, Math.round(base * (2.5 / normalized.scale))))
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/mosaic-settings.test.mjs`

Expected: all tests in the file PASS.

- [ ] **Step 5: Verify the rendered modes**

Reload `http://127.0.0.1:3004/experience/`, confirm the initial status shows `125 TILES / ROW`, and inspect M·O·E, Circle, and Square for greater detail with no visible source-video background layer.

- [ ] **Step 6: Run final verification**

Run: `npm test`, `git diff --check`, `npm run build`, restart the local server, and verify `/experience/` returns HTTP 200.
