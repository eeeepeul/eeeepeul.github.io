# Fixed-focus island map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract network diagram with a fixed-focus, scroll-zooming island map that transitions into a detailed house-cluster map.

**Architecture:** `lib/house-map.mjs` owns bounded continuous zoom, wheel steps, and one fixed camera target. `HouseMapCard` renders overview, transition, and detailed SVG layers. CSS controls layer opacity and fixed-size labels while visitor counts and CCTV links use their existing data path.

**Tech Stack:** Next.js static export, React client component, SVG, CSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-12-fixed-focus-island-map-design.md`

## Global Constraints

- Use code-drawn SVG/CSS map layers; do not use a screenshot as the map.
- Keep the focus point fixed on the supplied black four-building cluster.
- Capture wheel input only inside the map and prevent default only when zoom can change.
- Remove drag-to-pan; all zoom controls write the same 1–100 zoom value.
- Preserve all four CCTV links, visitor rings, fixed apparent distance-label size, and accessible button/link labels.
- Reduced-motion users receive the same end state with no prolonged transition.

---

### Task 1: Fixed-focus zoom model

**Files:**

- Modify: `lib/house-map.mjs`
- Modify: `tests/house-map.test.mjs`

**Interfaces:**

- Produces: `clampHouseMapZoom(zoom)`, `changeHouseMapZoom(zoom, direction)`, `changeHouseMapZoomByWheel(zoom, deltaY)`, `getHouseMapView(zoom)`, `getHouseMapLabelFontSize(zoom)`.
- Consumes: Existing `HOUSE_MAP_POINTS` and `HOUSE_MAP_ZOOM_LEVELS` exports.

- [ ] **Step 1: Write the failing test**

```js
test('keeps fixed-focus zoom within its range', () => {
  assert.equal(clampHouseMapZoom(-4), 1)
  assert.equal(clampHouseMapZoom(108), 100)
  assert.equal(changeHouseMapZoomByWheel(50, 120), 58)
  assert.equal(changeHouseMapZoomByWheel(50, -120), 42)
})

test('always centers the black house cluster', () => {
  assert.deepEqual(getHouseMapView(100), {
    centerX: 171, centerY: 46, scale: 4,
    transform: 'translate(143.5 90) scale(4) translate(-171 -46)',
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/house-map.test.mjs`

Expected: FAIL because the continuous zoom helpers are not exported and the old view uses the selected route.

- [ ] **Step 3: Implement the minimal zoom model**

```js
export const HOUSE_MAP_FOCUS = { x: 171, y: 46 }
export function clampHouseMapZoom(zoom) {
  return roundMapValue(Math.max(1, Math.min(100, Number(zoom) || 1)))
}
export function changeHouseMapZoomByWheel(zoom, deltaY) {
  return clampHouseMapZoom(clampHouseMapZoom(zoom) + Math.sign(Number(deltaY) || 0) * 8)
}
```

Make `getHouseMapView(zoom)` calculate its transform only from `HOUSE_MAP_FOCUS`; remove pan bounds and pan clamp from the component render path.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/house-map.test.mjs`

Expected: PASS, including updated fixed-label-size and route tests.

- [ ] **Step 5: Commit**

```bash
git add lib/house-map.mjs tests/house-map.test.mjs
git commit -m "feat: add fixed-focus island map zoom model"
```

### Task 2: Scroll-controlled map component

**Files:**

- Modify: `components/site/HouseMapCard.mjs`
- Modify: `tests/house-map.test.mjs`

**Interfaces:**

- Consumes: Task 1's wheel and view helpers.
- Produces: overview, detail, and building SVG groups plus a non-pannable wheel interaction.

- [ ] **Step 1: Write the failing test**

```js
test('uses wheel zoom and keeps every CCTV house link', async () => {
  const source = await readFile('components/site/HouseMapCard.mjs', 'utf8')
  assert.match(source, /onWheel: handleWheel/)
  assert.doesNotMatch(source, /onPointerDown: handlePointerDown/)
  for (const houseId of ['house1', 'house2', 'house3', 'house4']) assert.match(source, new RegExp(houseId))
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/house-map.test.mjs`

Expected: FAIL because pointer drag handlers remain and no wheel handler exists.

- [ ] **Step 3: Render SVG layers and connect wheel zoom**

```js
const handleWheel = (event) => {
  const nextZoom = changeHouseMapZoomByWheel(zoom, event.deltaY)
  if (nextZoom === zoom) return
  event.preventDefault()
  setZoom(nextZoom)
}
```

Add `figma-island-overview`, `figma-island-detail`, and `figma-island-houses` groups. Derive `--map-overview-opacity` and `--map-detail-opacity` from zoom. Keep the four existing anchors and their visitor rings inside the building group. Remove pointer capture, pan state, drag refs, and drag suppression.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/house-map.test.mjs`

Expected: PASS with wheel zoom, no drag handling, and four CCTV targets.

- [ ] **Step 5: Commit**

```bash
git add components/site/HouseMapCard.mjs tests/house-map.test.mjs
git commit -m "feat: add scroll zoom to island map"
```

### Task 3: Cartographic visual system

**Files:**

- Modify: `app/globals.css`
- Modify: `tests/house-map.test.mjs`

**Interfaces:**

- Consumes: Task 2 layer classes and CSS opacity variables.
- Produces: grid overview, monochrome detailed terrain, smooth transitions, no pan cursor, and reduced-motion support.

- [ ] **Step 1: Write the failing test**

```js
test('defines cartographic layers without pan affordances', async () => {
  const css = await readFile('app/globals.css', 'utf8')
  assert.match(css, /\.figma-island-overview/)
  assert.match(css, /\.figma-island-detail/)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(css, /\.figma-house-map-canvas\.can-pan/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/house-map.test.mjs`

Expected: FAIL because the new layer rules and reduced-motion rule do not exist while pan CSS remains.

- [ ] **Step 3: Add the visual system**

```css
.figma-island-overview { opacity: var(--map-overview-opacity); transition: opacity 260ms ease; }
.figma-island-detail { opacity: var(--map-detail-opacity); transition: opacity 260ms ease; }
.figma-island-current { fill: none; stroke: #282828; stroke-width: .55; opacity: .7; }
.figma-island-building { fill: #282828; stroke: none; }
@media (prefers-reduced-motion: reduce) {
  .figma-house-map-viewport, .figma-island-overview, .figma-island-detail { transition: none; }
}
```

Remove `.can-pan` and `.is-dragging` rules. Preserve `vector-effect: non-scaling-stroke` for cartographic linework and Task 1's label-font calculation.

- [ ] **Step 4: Run tests and build**

Run: `node --test tests/house-map.test.mjs`

Run: `npm run build`

Expected: Map tests pass and static export completes without errors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tests/house-map.test.mjs
git commit -m "style: add cartographic island map layers"
```
