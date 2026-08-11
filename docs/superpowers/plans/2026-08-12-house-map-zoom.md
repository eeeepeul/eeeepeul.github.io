# House Map Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a distance-synchronized four-house map with selected-house rings and 2%-to-100% zoom.

**Architecture:** Pure helpers define zoom levels, house coordinates, routes, and the selected-pair transform. `HouseDistanceCard` reports its existing state to a client wrapper, which feeds a native SVG map without duplicating distance generation.

**Tech Stack:** React 19, Next.js 15 static export, native SVG, CSS, Node test runner.

## Global Constraints

- Keep the existing 287-by-180 map card and sidebar geometry.
- Keep all current distance interactions unchanged.
- Use rings only for the selected departure and destination houses.
- Do not commit, push, or deploy.

---

### Task 1: Testable map model

**Files:**
- Create: `lib/house-map.mjs`
- Create: `tests/house-map.test.mjs`

**Interfaces:**
- Produces: `HOUSE_MAP_ZOOM_LEVELS`, `changeHouseMapZoom(zoom, direction)`, `getHouseMapView(houseIndex, zoom)`, and `getHouseMapRoutes(distances, houseIndex)`.

- [ ] **Step 1: Write failing tests for zoom clamping, selected-pair centering, and route-distance identity.**
- [ ] **Step 2: Run `node --test tests/house-map.test.mjs` and confirm the missing-module failure.**
- [ ] **Step 3: Implement the constants and pure helpers with four fixed house coordinates and a loop of four adjacent routes.**
- [ ] **Step 4: Run `node --test tests/house-map.test.mjs` and confirm all map-model tests pass.**

### Task 2: Synchronized native map UI

**Files:**
- Create: `components/site/HouseMapSection.mjs`
- Create: `components/site/HouseMapCard.mjs`
- Modify: `components/site/HouseDistanceCard.mjs`
- Modify: `components/site/FigmaHomeSidebarContent.mjs`
- Modify: `app/globals.css`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Consumes: `HouseDistanceCard({ onStateChange })` events shaped as `{ distances, houseIndex }`.
- Produces: a native SVG map with four house points, four routes, two selection rings, synchronized distance labels, and accessible zoom buttons.

- [ ] **Step 1: Add failing markup assertions for four houses, four routes, selected rings, and 2% zoom controls.**
- [ ] **Step 2: Run `node --test tests/home-coordinate-grid.test.mjs` and confirm the new assertions fail.**
- [ ] **Step 3: Add the optional distance-state callback without changing existing gestures.**
- [ ] **Step 4: Implement the client wrapper, SVG map, zoom controls, and CSS using the existing card geometry.**
- [ ] **Step 5: Run the focused component and map-model tests and confirm they pass.**

### Task 3: Verification

**Files:**
- Verify: `components/site/HouseMapSection.mjs`
- Verify: `components/site/HouseMapCard.mjs`
- Verify: `app/globals.css`

**Interfaces:**
- Produces: a visually verified local sidebar and a valid static export.

- [ ] **Step 1: Verify in the local browser that changing distance changes the highlighted map pair.**
- [ ] **Step 2: Verify the zoom buttons reach both 2% and 100% and remain centered on the selected pair.**
- [ ] **Step 3: Run `npm test`, `npm run build`, and `git diff --check`.**
- [ ] **Step 4: Leave all changes uncommitted.**
