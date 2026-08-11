# House Map Drag Pan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the enlarged house map follow mouse and touch drags without breaking house clicks or zoom controls.

**Architecture:** Add pure pan and transform helpers to the existing house-map model, then connect them to React Pointer Events in `HouseMapCard`. Keep animation and pointer affordances in the existing CSS, with active dragging disabling the transform transition.

**Tech Stack:** React 19, Next.js 15, JavaScript ES modules, SVG, CSS, Node test runner

## Global Constraints

- The 2% overview does not pan.
- A gesture becomes a drag only after 5 screen pixels of movement.
- Pan is limited to horizontal ±120 and vertical ±72 SVG units.
- Releasing the pointer leaves the map at the dragged position without inertia or snapping.
- Zoom or selected-house changes reset pan to `{ x: 0, y: 0 }`.
- Existing house links and zoom controls remain accessible.
- Do not commit, push, or deploy unless explicitly requested.

---

### Task 1: Pure map pan model

**Files:**
- Modify: `tests/house-map.test.mjs`
- Modify: `lib/house-map.mjs`

**Interfaces:**
- Produces: `clampHouseMapPan(pan, zoom) -> { x: number, y: number }`
- Extends: `getHouseMapView(houseIndex, zoom, pan?) -> { centerX, centerY, scale, transform }`

- [ ] **Step 1: Write failing unit tests**

Add literal assertions showing that 2% always returns `{ x: 0, y: 0 }`, enlarged pan clamps to `{ x: 120, y: -72 }`, and 100% view composition includes the clamped screen-space translation.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/house-map.test.mjs`

Expected: FAIL because `clampHouseMapPan` is not exported and `getHouseMapView` does not compose pan.

- [ ] **Step 3: Implement the minimal pure helpers**

Normalize non-finite values to zero, force zero pan at the overview level, clamp enlarged values to the approved bounds, and compose pan before the SVG scale so drag distances remain screen-space distances.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/house-map.test.mjs`

Expected: all house-map tests pass.

### Task 2: Pointer gesture integration

**Files:**
- Modify: `components/site/HouseMapCard.mjs`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Consumes: `clampHouseMapPan` and `getHouseMapView(houseIndex, zoom, pan)`
- Produces: pointer-captured drag behavior with `data-map-pan-x`, `data-map-pan-y`, and `data-map-dragging` state for observable UI verification

- [ ] **Step 1: Write a failing component test**

Render the card and assert that the map exposes the approved default pan state and pan affordance without changing the four link destinations.

- [ ] **Step 2: Run the focused component test and verify RED**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: FAIL because the pan state attributes are missing.

- [ ] **Step 3: Implement pointer handling**

Use `useRef`, `useState`, and `useEffect` to capture the active pointer, measure movement from pointer-down, clamp offsets after the 5-pixel threshold, prevent the post-drag link click, and reset offsets when zoom or house selection changes.

- [ ] **Step 4: Run the focused component test and verify GREEN**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: all coordinate-grid tests pass.

### Task 3: Drag affordance and full verification

**Files:**
- Modify: `app/globals.css`
- Modify: `tests/responsive-sidebar.test.mjs`

**Interfaces:**
- Consumes: `.can-pan` and `.is-dragging` states on the map SVG
- Produces: `grab`/`grabbing` cursors, `touch-action: none`, and transition-free active dragging

- [ ] **Step 1: Write a failing CSS behavior test**

Assert that enlarged maps expose grab/grabbing cursors, disable native touch gestures, and remove viewport transition only during active drag.

- [ ] **Step 2: Run the focused CSS test and verify RED**

Run: `node --test tests/responsive-sidebar.test.mjs`

Expected: FAIL because the pan-state CSS is missing.

- [ ] **Step 3: Implement the minimal CSS**

Add scoped rules for `.figma-house-map-canvas.can-pan`, `.is-dragging`, and its viewport transition while retaining pointer cursors on house links.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: zero failures.

Run: `npm run build`

Expected: production build exits successfully and refreshes `out` for the existing local server.

- [ ] **Step 5: Verify the local interaction**

At `http://127.0.0.1:3004/`, enlarge the map, drag it horizontally and vertically, release at an arbitrary point, verify it stays there, then confirm a simple house click still opens the matching CCTV URL while a drag that starts on a house does not navigate.
