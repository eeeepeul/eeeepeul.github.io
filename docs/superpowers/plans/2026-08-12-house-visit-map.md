# House Visit Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every house on the simplified map clickable and size its ring from the latest 24 hours of house-specific CCTV visits while keeping routes black and distance labels a constant visual size.

**Architecture:** Add a focused house-visit data module with local persistence and optional shared-endpoint synchronization. A small recorder on the CCTV page writes the selected `house` query parameter, while `HouseMapSection` reads live counts and passes them to the SVG map. The map owns only rendering and zoom interaction.

**Tech Stack:** Next.js 15 static export, React client components, native SVG, browser `localStorage`, optional JSON visitor endpoint, Node test runner.

## Global Constraints

- House URLs are `/experience/?house=house1` through `/experience/?house=house4`.
- Counts use a rolling 24-hour window.
- Ring radii stay between 7 and 23.4 map units.
- All routes use black strokes.
- Distance labels remain visually fixed at every zoom level.
- No new backend, dependency, commit, push, or deployment.

---

### Task 1: House visit model

**Files:**
- Create: `lib/house-visits.mjs`
- Create: `tests/house-visits.test.mjs`

**Interfaces:**
- Produces: `normalizeHouseId(value) -> "house1" | ... | "house4" | null`
- Produces: `countRecentHouseVisits(visits, nowMs) -> Record<string, number>`
- Produces: `getHouseVisitRadii(counts, minRadius = 7, maxRadius = 23.4) -> Record<string, number>`
- Produces: `readLocalHouseVisits`, `recordLocalHouseVisit`, `loadHouseVisits`, and `recordHouseVisit`
- Produces: `recordHouseVisitFromSearch({ search, endpoint, fetchImpl, storage, nowMs })`

- [ ] **Step 1: Write failing tests for validation, rolling counts, and ring limits**

```js
assert.equal(normalizeHouseId('house3'), 'house3')
assert.equal(normalizeHouseId('house8'), null)
assert.deepEqual(countRecentHouseVisits(visits, nowMs), {
  house1: 2,
  house2: 1,
  house3: 0,
  house4: 0,
})
assert.equal(Math.max(...Object.values(getHouseVisitRadii(counts))), 23.4)
```

- [ ] **Step 2: Run the focused test and confirm the module is missing**

Run: `node --test tests/house-visits.test.mjs`
Expected: FAIL because `lib/house-visits.mjs` does not exist.

- [ ] **Step 3: Implement normalized records and square-root ring scaling**

```js
export const HOUSE_IDS = ['house1', 'house2', 'house3', 'house4']
export const HOUSE_VISIT_WINDOW_MS = 86_400_000
export const HOUSE_VISIT_STORAGE_KEY = 'epeul.house-visits.v1'

export function normalizeHouseId(value) {
  return HOUSE_IDS.includes(value) ? value : null
}
```

Implement filtering for `{ houseId, visitedAt }`, JSON local persistence, POST bodies containing both fields, GET parsing for `houseVisits` or object-valued `visits`, and local fallback.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/house-visits.test.mjs`
Expected: PASS.

### Task 2: Record house CCTV visits

**Files:**
- Create: `components/pixel-experience/HouseVisitRecorder.tsx`
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Test: `tests/house-visits.test.mjs`

**Interfaces:**
- Consumes: `recordHouseVisit({ houseId, endpoint, storage, nowMs })`
- Produces: a non-visual client component that records one valid house visit per CCTV page load

- [ ] **Step 1: Add a failing query-to-storage behavior test**

```js
await recordHouseVisitFromSearch({
  search: '?house=house3',
  storage,
  nowMs,
})
assert.deepEqual(JSON.parse(storage.getItem(HOUSE_VISIT_STORAGE_KEY)), [
  { houseId: 'house3', visitedAt: nowMs },
])
```

- [ ] **Step 2: Run the focused test and confirm the recorder is absent**

Run: `node --test tests/house-visits.test.mjs`
Expected: FAIL because `recordHouseVisitFromSearch` is not exported.

- [ ] **Step 3: Implement the recorder**

```tsx
export function HouseVisitRecorder() {
  useEffect(() => {
    if (pageLoadRecorded) return
    pageLoadRecorded = true
    void recordHouseVisitFromSearch({
      search: window.location.search,
      endpoint: ACTIVITY_ENDPOINT,
      storage: window.localStorage,
    })
  }, [])
  return null
}
```

Render `<HouseVisitRecorder />` once inside `PixelExperience`; the production build and browser verification in Task 4 check the component integration.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/house-visits.test.mjs`
Expected: PASS.

### Task 3: Live counts and clickable rings

**Files:**
- Modify: `components/site/HouseMapSection.mjs`
- Modify: `components/site/HouseMapCard.mjs`
- Modify: `lib/house-map.mjs`
- Modify: `tests/house-map.test.mjs`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Consumes: `loadHouseVisits`, `countRecentHouseVisits`, and `getHouseVisitRadii`
- Produces: `HouseMapCard({ distances, houseIndex, visitCounts })`
- Produces: `getHouseMapLabelFontSize(zoom) -> number`

- [ ] **Step 1: Write failing model and component tests**

```js
assert.equal(getHouseMapLabelFontSize(2), 8)
assert.equal(getHouseMapLabelFontSize(100) * getHouseMapView(0, 100).scale, 8)
assert.equal((html.match(/data-map-house-link="house[1-4]"/g) ?? []).length, 4)
assert.match(html, /href="\/experience\/\?house=house1"/)
```

- [ ] **Step 2: Run focused tests and confirm fixed label sizing and links are missing**

Run: `node --test tests/house-map.test.mjs tests/home-coordinate-grid.test.mjs`
Expected: FAIL on `getHouseMapLabelFontSize` and house link assertions.

- [ ] **Step 3: Implement live loading and SVG links**

`HouseMapSection` loads on mount, refreshes the optional endpoint every five seconds, listens for the `storage` event, filters to the latest 24 hours, and passes counts to `HouseMapCard`.

```js
createElement(
  'a',
  {
    href: `${assetPath('experience')}/?house=${house.id}`,
    'data-map-house-link': house.id,
    'aria-label': `${house.id} CCTV 보기, 최근 방문 ${visitCounts[house.id] ?? 0}회`,
  },
  createElement('circle', { className: 'figma-house-map-ring', r: radii[house.id] }),
  createElement('circle', { className: 'figma-house-map-point', r: 3 })
)
```

Set every route stroke to black, preserve selected-route thickness, and set each distance text node to `fontSize: 8 / view.scale` so the transformed visual size stays 8 pixels.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/house-visits.test.mjs tests/house-map.test.mjs tests/home-coordinate-grid.test.mjs`
Expected: PASS.

### Task 4: Styling and end-to-end verification

**Files:**
- Modify: `app/globals.css`
- Test: `tests/responsive-sidebar.test.mjs`

**Interfaces:**
- Consumes: the SVG classes and data attributes from Task 3
- Produces: black routes, clickable ring hover/focus feedback, and fixed-size text without layout changes

- [ ] **Step 1: Add failing CSS assertions**

```js
assert.match(css, /\.figma-house-map-route\s*\{[^}]*stroke:\s*#282828/s)
assert.match(css, /\.figma-house-map-house-link:focus-visible/)
```

- [ ] **Step 2: Run the CSS test and confirm the new focus rule is absent**

Run: `node --test tests/responsive-sidebar.test.mjs`
Expected: FAIL on the new map styling assertions.

- [ ] **Step 3: Add route and interactive-house styles**

```css
.figma-sidebar-network .figma-house-map-route {
  stroke: #282828;
}

.figma-house-map-house-link {
  cursor: pointer;
}

.figma-house-map-house-link:hover .figma-house-map-ring,
.figma-house-map-house-link:focus-visible .figma-house-map-ring {
  stroke-width: 2;
}
```

- [ ] **Step 4: Run all automated checks**

Run: `npm test`
Expected: all tests pass.

Run: `npm run build`
Expected: static export succeeds.

Run: `git diff --check`
Expected: no whitespace errors.

- [ ] **Step 5: Verify in the local browser**

Check that all four rings and black routes are visible, ring size changes after a house visit, a house click opens its matching query URL, labels remain visually constant from 2% to 100%, and distance selection still changes the emphasized route.
