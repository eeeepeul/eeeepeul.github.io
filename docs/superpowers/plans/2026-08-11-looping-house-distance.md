# Looping House Distance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a draggable page-one distance card that cycles through four random house-to-house distances in an infinite loop.

**Architecture:** Keep loop and distance calculations in a pure library, then render them through a focused client component with pointer and arrow controls. The existing Figma tick and segment assets remain the visual route while CSS scales the route length and moves the second endpoint.

**Tech Stack:** React 19 client component, Next.js 15 static export, Pointer Events, Node test runner, existing SVG assets.

## Global Constraints

- The route order is `house1 → house2 → house3 → house4 → house1`.
- Dragging left advances and dragging right returns; the threshold is 28 pixels.
- Four distances are generated once per page load, each between 8,000 and 18,000.
- Route lengths stay between 68% and 100% of the 261-pixel card track.
- Keep existing page-one sidebar geometry and assets.
- Do not commit, push, or deploy until the user explicitly asks.

---

### Task 1: House route model

**Files:**

- Create: `lib/house-distance.mjs`
- Create: `tests/house-distance.test.mjs`

**Interfaces:**

- Produces: `advanceHouse(index, direction, houseCount = 4)` returning a wrapped zero-based index.
- Produces: `resolveHouseDrag(deltaX, threshold = 28)` returning `1`, `-1`, or `0`.
- Produces: `createHouseDistances(random = Math.random)` returning four integer distances.
- Produces: `scaleHouseDistance(distance, distances)` returning a number from `0.68` through `1`.

- [x] **Step 1: Write the failing route-model tests**

```js
assert.equal(advanceHouse(3, 1), 0)
assert.equal(advanceHouse(0, -1), 3)
assert.equal(resolveHouseDrag(-29), 1)
assert.equal(resolveHouseDrag(29), -1)
assert.deepEqual(
  createHouseDistances(() => 0.5),
  [13000, 13000, 13000, 13000]
)
assert.equal(scaleHouseDistance(8000, [8000, 18000]), 0.68)
assert.equal(scaleHouseDistance(18000, [8000, 18000]), 1)
```

- [x] **Step 2: Run the focused test and verify the missing-module failure**

Run: `node --test tests/house-distance.test.mjs`

Expected: FAIL because `lib/house-distance.mjs` does not exist.

- [x] **Step 3: Implement the pure route model**

```js
export function advanceHouse(index, direction, houseCount = 4) {
  return (((index + direction) % houseCount) + houseCount) % houseCount
}
```

- [x] **Step 4: Run the focused model test**

Run: `node --test tests/house-distance.test.mjs`

Expected: PASS.

### Task 2: Draggable distance card

**Files:**

- Create: `components/site/HouseDistanceCard.mjs`
- Modify: `components/site/FigmaHomeSidebarContent.mjs`
- Modify: `app/globals.css`
- Modify: `tests/home-coordinate-grid.test.mjs`
- Modify: `tests/responsive-sidebar.test.mjs`

**Interfaces:**

- Consumes: all Task 1 functions.
- Produces: `HouseDistanceCard`, a client component with pointer drag, previous/next buttons, current/next house labels, and live distance output.

- [x] **Step 1: Write failing markup and style assertions**

```js
assert.match(html, /class="figma-distance-track"[^>]*role="slider"/)
assert.match(html, /aria-label="이전 집 거리 보기"/)
assert.match(html, /aria-label="다음 집 거리 보기"/)
assert.match(html, /data-house-from="house1"[^>]*data-house-to="house2"/)
```

- [x] **Step 2: Run the focused page-one test and verify it fails**

Run: `node --test tests/home-coordinate-grid.test.mjs tests/responsive-sidebar.test.mjs`

Expected: FAIL because the static distance card has no controls or slider semantics.

- [x] **Step 3: Implement pointer dragging and arrow navigation**

```js
const finishDrag = (event) => {
  const direction = resolveHouseDrag(event.clientX - dragStart.current.x)
  if (direction !== 0) setCurrentHouse((index) => advanceHouse(index, direction))
  setDragOffset(0)
}
```

- [x] **Step 4: Run focused tests and verify they pass**

Run: `node --test tests/house-distance.test.mjs tests/home-coordinate-grid.test.mjs tests/responsive-sidebar.test.mjs`

Expected: PASS.

### Task 3: Interaction and build verification

**Files:**

- Verify: `components/site/HouseDistanceCard.mjs`
- Verify: `app/globals.css`

**Interfaces:**

- Consumes: the completed distance card.
- Produces: verified pointer, arrow, loop, responsive, and static-export behavior.

- [x] **Step 1: Verify arrows and the complete loop in the local browser**

Expected: four next clicks show `1→2`, `2→3`, `3→4`, `4→1`, then return to `1→2`; previous wraps in reverse.

- [x] **Step 2: Verify the pointer-drag model and event wiring**

Verified: focused tests cover both directions and the 28-pixel threshold; the client component wires pointer down, move, up, and cancel handling to that model.

- [x] **Step 3: Run the complete test suite**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 4: Run the static export build**

Run: `npm run build`

Expected: the Next.js build and export complete successfully.

- [x] **Step 5: Leave the branch uncommitted**

Run: `git status --short`

Expected: the new distance files and existing user changes remain in the current worktree with no commit, push, or deployment.
