# Figma Home Frame Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace page 1's coordinate-grid treatment with the Figma `home` frame while preserving the centered `/experience/` link and all existing sidebar open/close behavior.

**Architecture:** Keep `LandingFrame` and `ResponsiveSidebar` as the interaction shell. Add a dedicated Figma-derived playfield component and a dedicated sidebar-content component, then compose both from `MainLanding`; style the new elements in the existing global stylesheet and store Figma image assets under `public/media`.

**Tech Stack:** Next.js 15, React 19, JavaScript modules, TypeScript app entrypoints, CSS, Node test runner.

## Global Constraints

- Keep the centered link that navigates to `/experience/`.
- Keep the current `ResponsiveSidebar` open, close, backdrop, keyboard, mobile, and responsive animations.
- Keep the sidebar's compact state and right-edge anchoring.
- Match the Figma `home` frame `2710:286`, including the right-sidebar UI.
- Do not change pages 2 or 3.
- Do not commit, push, or deploy.

---

### Task 1: Lock page-1 structure with a failing test

**Files:**
- Modify: `tests/home-coordinate-grid.test.mjs`
- Test: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Consumes: `MainLanding(): ReactElement`
- Produces: required markup contracts `.figma-home-scene`, `.figma-home-map`, `.figma-home-sidebar-content`

- [ ] **Step 1: Replace the old coordinate-grid assertion with Figma-home assertions**

```js
test('the main page renders the Figma home scene and sidebar content', () => {
  const html = renderToStaticMarkup(createElement(MainLanding))
  assert.match(html, /class="figma-home-scene"/)
  assert.match(html, /class="figma-home-map"/)
  assert.match(html, /class="figma-home-sidebar-content"/)
  assert.match(html, /href="\/experience\/"/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: FAIL because the Figma-home classes do not exist yet.

---

### Task 2: Add local Figma assets and playfield component

**Files:**
- Create: `public/media/figma-home-map.png`
- Create: `components/site/FigmaHomeScene.mjs`
- Modify: `components/site/MainLanding.mjs`
- Test: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Consumes: `assetPath(path: string): string`
- Produces: `FigmaHomeScene(): ReactElement`

- [ ] **Step 1: Download the exact Figma map raster into `public/media/figma-home-map.png`**

Use the `img20260806232551` asset URL returned for node `2710:287`; verify it is a valid PNG before keeping it.

- [ ] **Step 2: Implement the playfield with generated grid and coordinate labels**

```js
export function FigmaHomeScene() {
  return createElement(
    'div',
    { className: 'figma-home-scene', 'aria-hidden': 'true' },
    createElement('div', { className: 'figma-home-grid' }),
    createElement('img', {
      className: 'figma-home-map',
      src: assetPath('media/figma-home-map.png'),
      alt: '',
      draggable: false,
    })
  )
}
```

- [ ] **Step 3: Replace `LandingCoordinateGrid` with `FigmaHomeScene` in `MainLanding`**

Keep the existing `landing-enter-link` unchanged.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: still FAIL only for missing sidebar content.

---

### Task 3: Recreate the Figma sidebar interior

**Files:**
- Create: `components/site/FigmaHomeSidebarContent.mjs`
- Modify: `components/site/MainLanding.mjs`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**
- Produces: `FigmaHomeSidebarContent(): ReactElement`
- Consumed as `LandingFrame` children and therefore as `ResponsiveSidebar` children.

- [ ] **Step 1: Implement semantic sections for intro, activity bars, distance, and network graph**

```js
export function FigmaHomeSidebarContent() {
  return createElement(
    'div',
    { className: 'figma-home-sidebar-content' },
    createElement(
      'section',
      { className: 'figma-sidebar-intro' },
      createElement('p', null, 'Rather than the moment of radiant bloom, EPEUL stands closer to what endures beneath it and remains.'),
      createElement('div', { className: 'figma-sidebar-tags' }, ['epeul', 'mooeemee', 'epeul'].map((tag, index) => createElement('span', { key: `${tag}-${index}` }, tag)))
    ),
    createElement(
      'section',
      { className: 'figma-sidebar-activity' },
      createElement('div', { className: 'figma-sidebar-status' }, createElement('span', null, '11:14:56'), createElement('span', null, 'Active : 7,000'), createElement('span', null, '1 day')),
      createElement('div', { className: 'figma-sidebar-bars', 'aria-hidden': 'true' }, ACTIVITY_BARS.map((height, index) => createElement('span', { key: index, style: { '--activity-height': `${height}%` } })))
    ),
    createElement('section', { className: 'figma-sidebar-distance' }, createElement('span', null, 'distance'), createElement('div', { className: 'figma-distance-track', 'aria-hidden': 'true' })),
    createElement('section', { className: 'figma-sidebar-network', 'aria-label': 'Network distance diagram' }, createElement('svg', { viewBox: '0 0 261 154', role: 'img' }, createElement('polyline', { points: '26,71 56,92 119,143 176,29 250,78' })))
  )
}
```

- [ ] **Step 2: Pass the sidebar content as `LandingFrame` children**

```js
createElement(
  LandingFrame,
  { houseHref, houseLabel, playfield: createElement(FigmaHomeScene) },
  createElement(FigmaHomeSidebarContent)
)
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `node --test tests/home-coordinate-grid.test.mjs`

Expected: PASS.

---

### Task 4: Match the Figma desktop and responsive layout

**Files:**
- Modify: `app/globals.css`
- Test: `tests/responsive-sidebar.test.mjs`
- Test: `tests/main-navigation.test.mjs`

**Interfaces:**
- Consumes existing `.landing-shell`, `.landing-enter-link`, `.sidebar-panel`, `.sidebar-content` contracts.
- Produces responsive `.figma-home-*` and `.figma-sidebar-*` styling without changing the sidebar state classes.

- [ ] **Step 1: Add scene styling**

Use `#f0f0f0`, a 48px reference grid, 10px gray labels, the map raster at the Figma reference bounds, and `mix-blend-mode: color-burn; opacity: 0.4`.

- [ ] **Step 2: Add sidebar-content styling**

Match the 287px-wide Figma content area, 1px `#c8c8c8` borders, 10–12px typography, activity bars, segmented distance line, and graph grid.

- [ ] **Step 3: Add responsive rules**

Scale the scene from its 1280 × 720 reference while keeping the existing sidebar width rules and preventing horizontal overflow.

- [ ] **Step 4: Run navigation and sidebar regression tests**

Run: `node --test tests/main-navigation.test.mjs tests/responsive-sidebar.test.mjs`

Expected: PASS with the centered link and sidebar interactions unchanged.

---

### Task 5: Full verification and browser QA

**Files:**
- Verify: all modified source, tests, and assets

**Interfaces:**
- Produces a verified page-1 implementation at `http://127.0.0.1:3004/`.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass with no warnings.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: successful Next.js production build.

- [ ] **Step 3: Verify the local page visually**

Open page 1 at desktop and mobile widths. Confirm the Figma home visual, centered button, sidebar interior, compact sidebar state, open/close animation, and backdrop behavior.

- [ ] **Step 4: Report changed files without committing**

Summarize the implementation and keep all changes local.
