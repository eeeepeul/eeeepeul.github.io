# 미발화하우스 실내 픽셀 타일맵 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 라우트와 기능을 건드리지 않고 `/house/`에 64×48 실내용 픽셀 하우스 배경 타일맵을 추가한다.

**Architecture:** 맵 계약과 배치 데이터는 `lib/house-interior-map.mjs`에 둔다. `HouseInteriorTilemap.mjs`는 데이터를 시각 레이어와 숨은 데이터 레이어로 렌더링하고, `/house/` 페이지는 이를 전체 화면 프리뷰로 감싼다. 기존 `/`, `/second/`, `/experience/` 컴포넌트는 수정하지 않는다.

**Tech Stack:** Next.js 15 App Router, React 19, ES modules, CSS Grid/absolute positioning, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-21-house-interior-tilemap-design.md`

## Global Constraints

- 기존 `/`, `/second/`, `/experience/` 라우트와 기존 사이드바·네비게이션·기능을 변경하지 않는다.
- 새 페이지는 `/house/`에만 추가한다.
- 맵 규격은 `64 × 48` 타일, `16 × 16px` tile size를 사용한다.
- 외부 정원·연못·숲·마당은 렌더링하지 않는다.
- 캐릭터 이동, NPC, DB, 키보드/포인터 입력, 카메라 추적, 네트워크 동기화는 구현하지 않는다.
- 타일 데이터와 충돌/스폰 데이터는 시각 렌더링과 분리한다.
- 실제 타일 이미지가 없어도 placeholder CSS tile로 완성된 프리뷰를 보여준다.

## Review Focus

- 방 범위와 현관 돌출부가 요구 좌표에서 벗어나지 않는지 — Task 1의 좌표 계약 테스트
- 거실과 주변 방의 연결부가 긴 복도로 변하지 않는지 — Task 1의 connection 테스트
- 충돌/스폰 정보가 시각 레이어에 섞이지 않는지 — Task 1의 layer separation 테스트
- `/house/`가 새 배경을 표시하면서 기존 `/second/` 정적 마크업을 바꾸지 않는지 — Task 3의 route render 테스트
- 작은 화면에서도 맵이 잘리지 않고 픽셀 비율을 유지하는지 — Task 3의 CSS/정적 빌드 검증

---

### Task 1: 데이터 우선 맵 계약과 레이어 배치

**Files:**
- Create: `lib/house-interior-map.mjs`
- Create: `tests/house-interior-map.test.mjs`

**Interfaces:**
- Produces `HOUSE_INTERIOR_MAP_WIDTH`, `HOUSE_INTERIOR_MAP_HEIGHT`, `HOUSE_INTERIOR_TILE_SIZE`
- Produces `HOUSE_INTERIOR_LAYER_ORDER`
- Produces `HOUSE_INTERIOR_ROOMS`, `HOUSE_INTERIOR_CONNECTIONS`, `HOUSE_INTERIOR_OBJECTS`
- Produces `HOUSE_INTERIOR_COLLISION_CELLS`, `HOUSE_INTERIOR_SPAWN_POINTS`
- Produces `HOUSE_INTERIOR_MAP` containing all of the above under stable keys

- [ ] **Step 1: Write the failing data-contract tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HOUSE_INTERIOR_COLLISION_CELLS,
  HOUSE_INTERIOR_CONNECTIONS,
  HOUSE_INTERIOR_LAYER_ORDER,
  HOUSE_INTERIOR_MAP,
  HOUSE_INTERIOR_MAP_HEIGHT,
  HOUSE_INTERIOR_MAP_WIDTH,
  HOUSE_INTERIOR_OBJECTS,
  HOUSE_INTERIOR_ROOMS,
  HOUSE_INTERIOR_SPAWN_POINTS,
  HOUSE_INTERIOR_TILE_SIZE,
} from '../lib/house-interior-map.mjs'

test('exposes the requested 64 by 48 map contract', () => {
  assert.equal(HOUSE_INTERIOR_MAP_WIDTH, 64)
  assert.equal(HOUSE_INTERIOR_MAP_HEIGHT, 48)
  assert.equal(HOUSE_INTERIOR_TILE_SIZE, 16)
  assert.deepEqual(HOUSE_INTERIOR_LAYER_ORDER, [
    'floor', 'walls', 'doors_windows', 'furniture', 'decor', 'collision', 'spawn_points',
  ])
  assert.equal(HOUSE_INTERIOR_MAP.width, 64)
  assert.equal(HOUSE_INTERIOR_MAP.height, 48)
})

test('keeps every requested room inside the supplied tile bounds', () => {
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.main_house, { x: 6, y: 4, width: 52, height: 37 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.entrance_projection, { x: 24, y: 41, width: 16, height: 7 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.living_room, { x: 20, y: 14, width: 23, height: 17 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.bedroom, { x: 7, y: 6, width: 13, height: 13 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.study_record_room, { x: 43, y: 6, width: 14, height: 13 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.bathroom, { x: 7, y: 20, width: 10, height: 9 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.kitchen_dining, { x: 43, y: 21, width: 14, height: 15 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.quiet_room, { x: 7, y: 30, width: 13, height: 10 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.entry_hall, { x: 20, y: 31, width: 23, height: 10 })
  assert.deepEqual(HOUSE_INTERIOR_ROOMS.entrance, { x: 25, y: 41, width: 14, height: 7 })
})

test('defines short direct openings between the hub and each adjacent room', () => {
  assert.deepEqual(
    HOUSE_INTERIOR_CONNECTIONS.map(({ from, to }) => `${from}->${to}`),
    [
      'living_room->bedroom',
      'living_room->study_record_room',
      'living_room->bathroom',
      'living_room->kitchen_dining',
      'living_room->entry_hall',
      'entry_hall->entrance',
    ]
  )
  assert.ok(HOUSE_INTERIOR_CONNECTIONS.every(({ width }) => width <= 5))
})

test('keeps visual objects separate from collision and spawn data', () => {
  assert.ok(HOUSE_INTERIOR_OBJECTS.furniture.length > 0)
  assert.ok(HOUSE_INTERIOR_OBJECTS.decor.length > 0)
  assert.ok(Array.isArray(HOUSE_INTERIOR_COLLISION_CELLS))
  assert.ok(Array.isArray(HOUSE_INTERIOR_SPAWN_POINTS))
  assert.equal('collision' in HOUSE_INTERIOR_OBJECTS, false)
  assert.equal('spawn_points' in HOUSE_INTERIOR_OBJECTS, false)
})
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing module**

Run: `npm test -- tests/house-interior-map.test.mjs`

Expected: FAIL because `../lib/house-interior-map.mjs` does not exist yet.

- [ ] **Step 3: Implement the minimal data module**

Create immutable plain-data exports. Use inclusive design coordinates converted to `{ x, y, width, height }` so the renderer can position items with CSS grid. Define `HOUSE_INTERIOR_OBJECTS` with these furniture/decor placements: bedroom bed/nightstand/rug; living room rug/sofas/low table/lamp/plant; study desk/chair/two bookcases/lamp; bathroom tub/sink; kitchen counter/table/two chairs; quiet room sofa/beanbag/rug/plant/table; entry hall console/mat; entrance door/mat. Define connection records with `from`, `to`, `orientation`, `x`, `y`, and `width`. Derive wall collision cells from the outer house bounds, room boundaries, and furniture footprints while removing each connection opening.

The exported shape must be:

```js
export const HOUSE_INTERIOR_MAP = {
  width: HOUSE_INTERIOR_MAP_WIDTH,
  height: HOUSE_INTERIOR_MAP_HEIGHT,
  tileSize: HOUSE_INTERIOR_TILE_SIZE,
  rooms: HOUSE_INTERIOR_ROOMS,
  connections: HOUSE_INTERIOR_CONNECTIONS,
  layers: {
    floor: HOUSE_INTERIOR_FLOOR_TILES,
    walls: HOUSE_INTERIOR_WALL_TILES,
    doors_windows: HOUSE_INTERIOR_DOOR_WINDOW_TILES,
    furniture: HOUSE_INTERIOR_OBJECTS.furniture,
    decor: HOUSE_INTERIOR_OBJECTS.decor,
  },
  collision: HOUSE_INTERIOR_COLLISION_CELLS,
  spawn_points: HOUSE_INTERIOR_SPAWN_POINTS,
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/house-interior-map.test.mjs`

Expected: PASS for all map contract tests.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`

Expected: all existing tests plus the new map tests pass.

- [ ] **Step 6: Commit the data contract**

```bash
git add lib/house-interior-map.mjs tests/house-interior-map.test.mjs
git commit -m "feat: add house interior tilemap data"
```

### Task 2: Layered tilemap renderer

**Files:**
- Create: `components/site/HouseInteriorTilemap.mjs`
- Create: `tests/house-interior-tilemap.test.mjs`

**Interfaces:**
- Consumes: `HOUSE_INTERIOR_MAP` from `lib/house-interior-map.mjs`
- Produces: `HouseInteriorTilemap({ map = HOUSE_INTERIOR_MAP })`
- Produces a root `.house-interior-tilemap` with `data-map-width`, `data-map-height`, `data-tile-size`
- Produces one element for every visual layer in `HOUSE_INTERIOR_LAYER_ORDER`, plus hidden data containers for `collision` and `spawn_points`

- [ ] **Step 1: Write the failing renderer tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HouseInteriorTilemap } from '../components/site/HouseInteriorTilemap.mjs'

test('renders a data-driven 64 by 48 tilemap with stable layer names', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))
  assert.match(html, /class="house-interior-tilemap"/)
  assert.match(html, /data-map-width="64"/)
  assert.match(html, /data-map-height="48"/)
  assert.match(html, /data-tile-size="16"/)
  for (const layer of ['floor', 'walls', 'doors_windows', 'furniture', 'decor', 'collision', 'spawn_points']) {
    assert.match(html, new RegExp(`data-layer="${layer}"`))
  }
})

test('renders furniture and decor as positioned tile objects instead of hardcoded page markup', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))
  assert.match(html, /data-tile-id="living-rug"/)
  assert.match(html, /data-tile-id="bedroom-bed"/)
  assert.match(html, /data-tile-id="study-bookcase-a"/)
  assert.match(html, /data-tile-id="kitchen-table"/)
  assert.match(html, /data-tile-id="entrance-mat"/)
})

test('keeps collision and spawn layers hidden from the visual preview', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))
  assert.match(html, /data-layer="collision"[^>]*hidden/)
  assert.match(html, /data-layer="spawn_points"[^>]*hidden/)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/house-interior-tilemap.test.mjs`

Expected: FAIL because the renderer module and layer markup do not exist.

- [ ] **Step 3: Implement the renderer**

Use `createElement` so the module follows the existing `.mjs` component pattern. Build a `renderLayer` helper that returns a layer wrapper with `data-layer` and maps tile/object descriptors to absolutely positioned elements. Render the `floor` layer as a full 64×48 grid generated from map dimensions; render wall and door tile descriptors as cells; render furniture/decor descriptors with `data-tile-id`, CSS modifier classes, and CSS custom properties `--tile-x`, `--tile-y`, `--tile-width`, `--tile-height`. Render collision and spawn points in hidden containers with `data-cell` or `data-spawn-id` attributes so future logic can query the same map without adding visual elements.

The root element must use:

```js
{
  className: 'house-interior-tilemap',
  'data-map-width': map.width,
  'data-map-height': map.height,
  'data-tile-size': map.tileSize,
}
```

- [ ] **Step 4: Run the focused renderer tests and verify they pass**

Run: `npm test -- tests/house-interior-tilemap.test.mjs`

Expected: PASS for layer order, positioned object markers, and hidden data layers.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit the renderer**

```bash
git add components/site/HouseInteriorTilemap.mjs tests/house-interior-tilemap.test.mjs
git commit -m "feat: render layered house interior tilemap"
```

### Task 3: New `/house/` route and isolated pixel styling

**Files:**
- Create: `app/house/page.tsx`
- Create: `components/site/HouseInteriorPage.mjs`
- Modify: `app/globals.css` by appending only `.house-interior-*` rules
- Create: `tests/house-interior-route.test.mjs`

**Interfaces:**
- Consumes: `HouseInteriorTilemap` from Task 2
- Produces: `HouseInteriorPage()` with a full-viewport `.house-interior-page` and `.house-interior-viewport`
- Produces: `app/house/page.tsx` as a thin App Router wrapper around `HouseInteriorPage`

- [ ] **Step 1: Write the failing route-render test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HouseInteriorPage } from '../components/site/HouseInteriorPage.mjs'

test('renders the new house page without replacing the existing second-page component', () => {
  assert.equal(typeof HouseInteriorPage, 'function')
  const html = renderToStaticMarkup(createElement(HouseInteriorPage))
  assert.match(html, /class="house-interior-page"/)
  assert.match(html, /class="house-interior-viewport"/)
  assert.match(html, /class="house-interior-tilemap"/)
  const secondPageSource = readFileSync(new URL('../app/second/page.tsx', import.meta.url), 'utf8')
  assert.match(secondPageSource, /SecondaryLanding/)
})
```

- [ ] **Step 2: Run the focused route test and verify it fails**

Run: `npm test -- tests/house-interior-route.test.mjs`

Expected: FAIL because `components/site/HouseInteriorPage.mjs` and the isolated page markup do not exist.

- [ ] **Step 3: Implement the route**

Create `components/site/HouseInteriorPage.mjs` with a default function that returns:

```js
import { createElement } from 'react'
import { HouseInteriorTilemap } from './HouseInteriorTilemap.mjs'

export function HouseInteriorPage() {
  return createElement(
    'main',
    { className: 'house-interior-page' },
    createElement('div', { className: 'house-interior-viewport' }, createElement(HouseInteriorTilemap))
  )
}
```

Then create the App Router wrapper at `app/house/page.tsx`:

```tsx
import { HouseInteriorPage } from '../../components/site/HouseInteriorPage.mjs'

export default function HousePage() {
  return <HouseInteriorPage />
}
```

- [ ] **Step 4: Add isolated responsive CSS**

Append rules scoped to `.house-interior-page` only. Use a dark blue outer frame, an ivory board, CSS Grid for the 64×48 logical grid, `image-rendering: pixelated`, and CSS variables for each tile’s logical position. Define classes for the required furniture/decor tile IDs with limited ivory, blue, slate, and coral colors. Use `aspect-ratio: 4 / 3`, `max-width: min(96vw, 1120px)`, `max-height: 92dvh`, `overflow: auto`, and `object-fit`-equivalent grid sizing so the map stays wholly visible on narrow screens. Do not edit any existing selectors.

- [ ] **Step 5: Run route tests and verify they pass**

Run: `npm test -- tests/house-interior-route.test.mjs`

Expected: PASS and the existing `/second/` import remains available.

- [ ] **Step 6: Build the static site**

Run: `npm run build`

Expected: Next.js static export succeeds and includes `out/house/index.html`.

- [ ] **Step 7: Commit the route and styling**

```bash
git add app/house/page.tsx app/globals.css tests/house-interior-route.test.mjs
git commit -m "feat: add house interior preview route"
```

### Task 4: Full regression and visual verification

**Files:**
- No production file changes unless a verification failure identifies a scoped issue.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all tests pass, including existing tests for `/second/`, `/experience/`, sidebar behavior, and media controls.

- [ ] **Step 2: Run the static verification command**

Run: `npm run verify:static`

Expected: static output checks pass without changing existing route artifacts.

- [ ] **Step 3: Start or reuse the local server and inspect `/house/`**

Use the existing local server if it is already running; otherwise run `npm run dev` on its configured port. Open `/house/` and verify the full house interior is visible: living room centered and largest, all seven surrounding spaces readable, entrance projection attached at the bottom, no exterior scenery, and no characters/NPCs.

- [ ] **Step 4: Inspect regression routes**

Open `/second/` and `/experience/` and verify their existing visual structure and interactions are unchanged. Do not replace the canonical local site with the new route.

- [ ] **Step 5: Record the final implementation notes**

Report the added/modified files, the map data location, the single tile/asset map swap point, and the next step for adding a character layer using `HOUSE_INTERIOR_COLLISION_CELLS` and `HOUSE_INTERIOR_SPAWN_POINTS`.
