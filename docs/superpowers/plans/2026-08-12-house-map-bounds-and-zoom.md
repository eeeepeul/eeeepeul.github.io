# House Map Bounds and Zoom Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the house map pan to its live outer-ring edges, keep the 100% zoom buttons contained, and use 1% as the fixed overview.

**Architecture:** Replace fixed pan constants with pure geometry derived from house coordinates, live ring radii, selected-route focus, and zoom scale. Pass the same radii through the component's render and drag paths, then give the zoom control a stable three-column CSS layout.

**Tech Stack:** React 19, Next.js 15, JavaScript ES modules, SVG, CSS, Node test runner

## Global Constraints

- Zoom levels are `1`, `10`, `25`, `50`, `75`, and `100` percent.
- The 1% overview is centered and cannot pan.
- Enlarged maps stop when the live outermost house ring touches the viewport edge.
- Empty space beyond the outer rings cannot be dragged into view.
- A smaller-than-viewport axis stays centered and cannot move.
- Existing five-pixel drag threshold, click suppression, touch support, and no-inertia release remain unchanged.
- Both zoom buttons stay inside the control at 100%.
- Preserve existing uncommitted work and do not commit, push, or deploy.

---

### Task 1: Ring-derived zoom and pan geometry

**Files:**
- Modify: `tests/house-map.test.mjs`
- Modify: `lib/house-map.mjs`

**Interfaces:**
- Produces: `getHouseMapContentBounds(visitRadii) -> { minX, maxX, minY, maxY }`
- Produces: `getHouseMapPanBounds(houseIndex, zoom, visitRadii) -> { minX, maxX, minY, maxY }`
- Replaces: `clampHouseMapPan(pan, zoom)` with `clampHouseMapPan(pan, houseIndex, zoom, visitRadii)`
- Extends: `getHouseMapView(houseIndex, zoom, pan, visitRadii)`

- [ ] **Step 1: Write failing zoom tests**

Assert that the public zoom sequence is `[1, 10, 25, 50, 75, 100]`, decrementing at 1% stays at 1%, the 1% view has scale `1`, and the 100% view has scale `4`.

- [ ] **Step 2: Write failing geometry tests**

With every ring radius set to 10, assert content bounds `{ minX: 34, maxX: 262, minY: 28, maxY: 153 }` and 100% pan bounds `{ minX: -312.5, maxX: 312.5, minY: -208, maxY: 112 }`. Assert an oversized pan clamps to `{ x: 312.5, y: -208 }`, while 1% clamps to `{ x: 0, y: 0 }`.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test tests/house-map.test.mjs`

Expected: FAIL because the minimum is still 2%, content-bound helpers are absent, and fixed pan constants return the old limits.

- [ ] **Step 4: Implement the pure geometry**

Use the live radius for each house with a finite nonnegative fallback of zero. At enlarged levels, transform the content bounds around the selected route midpoint, derive the pan value that aligns each content edge with its viewport edge, and collapse a smaller-than-viewport axis to its centered offset. Interpolate scale with `1 + ((zoom - 1) / 99) * 3`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/house-map.test.mjs`

Expected: all house-map tests pass.

### Task 2: Use live bounds during component dragging

**Files:**
- Modify: `components/site/HouseMapCard.mjs`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Consumes: `clampHouseMapPan(pan, houseIndex, zoom, visitRadii)`
- Consumes: `getHouseMapView(houseIndex, zoom, pan, visitRadii)`
- Produces: initial `data-map-zoom="1"`, `1%` UI, and pan positions clamped against current visit rings

- [ ] **Step 1: Write the failing component test**

Change the initial markup assertions from 2% to 1% while retaining the disabled pan and disabled minus button assertions.

- [ ] **Step 2: Run the focused component test and verify RED**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: FAIL because the component still renders 2%.

- [ ] **Step 3: Wire live visit radii through render and drag paths**

Compute the clamped render pan from the current house index, zoom, and visit radii. Use it for data attributes, SVG transforms, pointer-down origins, and pointer-move clamping so visit updates cannot leave the map beyond its new edges.

- [ ] **Step 4: Run the focused component test and verify GREEN**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: all coordinate-grid tests pass.

### Task 3: Contain the 100% zoom control

**Files:**
- Modify: `tests/responsive-sidebar.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: a fixed three-column `.figma-network-zoom` layout with separate button columns and a centered percentage column

- [ ] **Step 1: Write a failing CSS contract test**

Assert a width of 72px, `display: grid`, columns `11px minmax(30px, 1fr) 11px`, a 4px column gap, and centered non-wrapping percentage text.

- [ ] **Step 2: Run the focused CSS test and verify RED**

Run: `node --test tests/responsive-sidebar.test.mjs`

Expected: FAIL because the current 65px flex layout overflows at 100%.

- [ ] **Step 3: Implement the stable grid layout**

Keep the current bottom-right position, height, padding, colors, and button sizes. Change only the width and internal layout needed to contain `100%`.

- [ ] **Step 4: Run full automated verification**

Run: `npm test`

Expected: zero failures.

Run: `npm run build`

Expected: a successful static production build that refreshes `out` for the existing local server.

- [ ] **Step 5: Verify in the local browser**

At `http://127.0.0.1:3004/`, confirm the initial label is 1%, zoom to 100%, verify the plus button stays inside its background, drag to every boundary until the live outer ring touches the map edge, and confirm no beyond-content space appears.
