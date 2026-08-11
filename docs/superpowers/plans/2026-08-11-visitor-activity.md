# Rolling Visitor Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every page load as a visit, keep only the latest 24 hours, render the visit count as black activity marks, and keep the in-progress portion of the graph light gray.

**Architecture:** Put time-window filtering, visit persistence, and graph-slot selection in a dependency-free library so it can be tested without a browser. Render the Figma activity card through a small client component that records once per page mount, uses browser storage immediately, and switches to a shared JSON endpoint when `NEXT_PUBLIC_VISITOR_ACTIVITY_ENDPOINT` is configured.

**Tech Stack:** Next.js 15 static export, React 19, browser `localStorage`, Fetch API, Node test runner.

## Global Constraints

- Count every page load, including repeated visits from the same browser, as a separate visit.
- Only visits newer than 24 hours are active.
- Keep the current Figma sidebar geometry and the right-side light-gray in-progress motif.
- Preserve GitHub Pages static export; do not add a server-only Next.js route.
- Do not commit, push, or deploy until the user asks.

---

### Task 1: Rolling visit model and persistence

**Files:**

- Create: `lib/visitor-activity.mjs`
- Create: `tests/visitor-activity.test.mjs`

**Interfaces:**

- Produces: `filterRecentVisits(visits, nowMs)` returning normalized timestamps in `(now - 24h, now]`.
- Produces: `buildVisitorActivity(visits, nowMs, slotCapacity)` returning `{ activeCount, visibleVisitCount }`.
- Produces: `recordLocalVisit(storage, nowMs)` appending the current timestamp without deduplicating repeated visits.
- Produces: `recordVisitorPageView({ endpoint, fetchImpl, storage, nowMs })` preferring the shared endpoint and falling back to local storage.

- [x] **Step 1: Write the failing model tests**

```js
assert.deepEqual(filterRecentVisits([now, now, now - DAY - 1], now), [now, now])
assert.equal(buildVisitorActivity([now, now], now, 72).visibleVisitCount, 2)
assert.deepEqual(recordLocalVisit(storage, now), [now])
assert.deepEqual(recordLocalVisit(storage, now), [now, now])
```

- [x] **Step 2: Run the focused test and verify the missing-module failure**

Run: `node --test tests/visitor-activity.test.mjs`

Expected: FAIL because `lib/visitor-activity.mjs` does not exist.

- [x] **Step 3: Implement the minimum rolling-window and storage logic**

```js
export const VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000

export function filterRecentVisits(visits, nowMs = Date.now()) {
  const lowerBound = nowMs - VISITOR_WINDOW_MS
  return visits
    .map(toTimestamp)
    .filter((value) => value > lowerBound && value <= nowMs)
    .sort((a, b) => a - b)
}
```

- [x] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/visitor-activity.test.mjs`

Expected: PASS.

### Task 2: Live Figma activity card

**Files:**

- Create: `components/site/VisitorActivityCard.mjs`
- Modify: `components/site/FigmaHomeSidebarContent.mjs`
- Modify: `app/globals.css`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**

- Consumes: `recordVisitorPageView` and `buildVisitorActivity` from Task 1.
- Produces: `VisitorActivityCard`, which records one visit per component mount and renders the current time, 24-hour active count, black visit marks, and the light-gray in-progress motif.

- [x] **Step 1: Write the failing component assertions**

```js
assert.match(html, /data-activity-source="live"/)
assert.match(html, /class="figma-sidebar-progress"/)
assert.match(html, /aria-live="polite"/)
```

- [x] **Step 2: Run the focused sidebar test and verify it fails**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: FAIL because the static activity card has not been replaced.

- [x] **Step 3: Implement the client activity card and preserve Figma dimensions**

```js
useEffect(() => {
  if (didRecord.current) return
  didRecord.current = true
  recordVisitorPageView({ endpoint, storage: window.localStorage }).then(setVisits)
}, [])
```

- [x] **Step 4: Run focused tests and verify they pass**

Run: `node --test tests/visitor-activity.test.mjs tests/home-coordinate-grid.test.mjs`

Expected: PASS.

### Task 3: Browser and static-export verification

**Files:**

- Verify: `components/site/VisitorActivityCard.mjs`
- Verify: `app/globals.css`

**Interfaces:**

- Consumes: the completed page-one sidebar.
- Produces: verified local behavior with no hydration, console, or static-export errors.

- [x] **Step 1: Open `http://127.0.0.1:3004/` and verify the card visually**

Expected: the activity card keeps its 261-by-69 graph, the counter increments after a reload, black marks correspond to the active count, and the in-progress region stays light gray.

- [x] **Step 2: Verify the full test suite**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 3: Verify the static export build**

Run: `npm run build`

Expected: Next.js completes the static export successfully.

- [x] **Step 4: Leave changes uncommitted**

Run: `git status --short`

Expected: the visitor activity changes are visible alongside the user's existing uncommitted work; no commit, push, or deploy is performed.
