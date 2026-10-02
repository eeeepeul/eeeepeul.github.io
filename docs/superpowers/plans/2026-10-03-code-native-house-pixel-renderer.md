# 코드 기반 집 픽셀 렌더러 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/second/` 집 배경을 이미지 파일 없이 코드 기반 픽셀 렌더러로 교체하고, 시각 벽은 더 얇게 유지하면서 기존 충돌 판정을 보존한다.

**Architecture:** `HouseInteriorTilemap`의 공개 인터페이스와 `HOUSE_INTERIOR_MAP` 데이터 계약은 유지한다. 새 픽셀 데이터 모듈이 제한된 팔레트와 run-length 도트를 제공하고, 클라이언트 캔버스가 이를 직접 그린다. 벽은 `HOUSE_INTERIOR_WALL_THICKNESS`로 그리며, 캐릭터 이동은 기존 충돌 셀과 내비게이션을 계속 사용한다.

**Tech Stack:** Next.js 15, React 19, ES modules, Canvas 2D, CSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-03-code-native-house-pixel-renderer-design.md`

## Global Constraints

- 통합 위치는 기존 `/second/` playfield의 배경 레이어로 한정한다.
- 기존 `/`, `/second/`, `/experience/` 라우팅, 사이드바, 캐릭터 레이어, 카메라 동작은 변경하지 않는다.
- `HOUSE_INTERIOR_MAP`의 64×48 논리 좌표, 방 범위, 문 개구부, 가구 충돌 셀, 스폰 위치는 변경하지 않는다.
- 캐릭터가 파란 벽을 넘어가지 못하는 `HOUSE_INTERIOR_COLLISION_CELLS`와 `createInteriorNavigation`의 계약은 유지한다.
- 런타임 배경에는 `house-interior-plan*.png`를 사용하지 않는다. 최종 시각 데이터는 코드 모듈로 보관한다.
- 새 렌더러가 표현하는 벽은 기존보다 얇은 고정 두께를 사용한다. 얇아지는 것은 시각 표현만이며 충돌 영역은 그대로다.
- 기존 충돌·내비게이션 모듈에는 새 의존성을 추가하지 않는다.

## Review Focus

- 캔버스가 아직 측정되지 않은 첫 프레임에서도 예외 없이 렌더링을 기다리는가 — Task 2의 zero-size redraw test.
- 픽셀 run이 캔버스 경계를 벗어나거나 알 수 없는 색상을 참조하지 않는가 — Task 1의 bounds/palette test.
- 벽 두께를 줄여도 충돌 셀과 문 개구부가 바뀌지 않는가 — Task 1의 immutable map comparison test.
- 이미지 참조가 남아 있지 않고 기존 타일 레이어가 fallback으로 유지되는가 — Task 2/3의 markup and CSS tests.
- 리사이즈와 카메라 확대에서 픽셀 보간 없이 비율이 유지되는가 — Task 3의 browser smoke check and CSS assertions.

---

### Task 1: 코드 기반 픽셀 데이터와 벽 두께 계약

**Files:**
- Create: `lib/house-interior-pixel-art.mjs`
- Create: `tests/house-interior-pixel-art.test.mjs`
- Modify: `tests/house-interior-map.test.mjs` only if a focused immutability assertion is needed

**Interfaces:**
- Produces `HOUSE_INTERIOR_PIXEL_WIDTH` and `HOUSE_INTERIOR_PIXEL_HEIGHT` as the fixed canvas source dimensions.
- Produces `HOUSE_INTERIOR_PIXEL_PALETTE` with named colors for ivory floor, blue wall, light blue, coral/red, and white.
- Produces `HOUSE_INTERIOR_PIXEL_RUNS`, an immutable array of `{ color, x, y, length }` horizontal runs.
- Produces `HOUSE_INTERIOR_WALL_THICKNESS`, a numeric visual thickness smaller than the current full-cell wall footprint.
- Produces `HOUSE_INTERIOR_PIXEL_SCENE`, an immutable ordered list of non-wall drawing commands used by the canvas renderer.

- [ ] **Step 1: Write the failing pixel-data contract tests**

  Add tests named `exposes a bounded pixel canvas and approved palette`, `keeps every pixel run inside the canvas`, and `keeps the visual wall thickness separate from collision geometry`. Assert that every run color is a palette key, `x >= 0`, `y >= 0`, `x + length <= width`, `length > 0`, and `HOUSE_INTERIOR_WALL_THICKNESS` is positive and less than one logical tile.

- [ ] **Step 2: Run the focused test and verify it fails for the missing module**

  Run: `node --test tests/house-interior-pixel-art.test.mjs`

  Expected: FAIL because `lib/house-interior-pixel-art.mjs` does not exist yet.

- [ ] **Step 3: Implement the pixel-art data module**

  Add the approved palette, source dimensions, run-length dot data, and scene commands. Keep the data frozen. Generate the run data once from the approved floor-plan composition, then store only the code module; do not make the browser load either PNG background asset. Set the initial wall thickness to a fixed value that is approximately 15–25% thinner than the previous visible wall width while remaining large enough to read at the 64×48 map scale.

- [ ] **Step 4: Run the focused data tests and verify they pass**

  Run: `node --test tests/house-interior-pixel-art.test.mjs`

  Expected: all pixel-data contract tests pass.

- [ ] **Step 5: Confirm the map collision contract remains unchanged**

  Run: `node --test tests/house-interior-map.test.mjs tests/house-interior-navigation.test.mjs`

  Expected: all existing room, doorway, collision, and wander tests pass without changing `HOUSE_INTERIOR_MAP`.

- [ ] **Step 6: Commit the data contract**

  ```bash
  git add lib/house-interior-pixel-art.mjs tests/house-interior-pixel-art.test.mjs tests/house-interior-map.test.mjs
  git commit -m "feat: add code-native house pixel data"
  ```

### Task 2: Canvas-backed `HouseInteriorTilemap`

**Files:**
- Modify: `components/site/HouseInteriorTilemap.mjs`
- Modify: `tests/house-interior-tilemap.test.mjs`

**Interfaces:**
- Consumes `HOUSE_INTERIOR_PIXEL_*`, `HOUSE_INTERIOR_PIXEL_PALETTE`, `HOUSE_INTERIOR_PIXEL_RUNS`, `HOUSE_INTERIOR_PIXEL_SCENE`, and `HOUSE_INTERIOR_WALL_THICKNESS` from Task 1.
- Keeps `HouseInteriorTilemap({ map = HOUSE_INTERIOR_MAP })` unchanged for callers.
- Produces one `.house-interior-pixel-canvas` element with `data-pixel-width`, `data-pixel-height`, and `aria-hidden="true"`.
- Keeps existing `data-layer` metadata and hidden `collision`/`spawn_points` containers for tests and future logic.

- [ ] **Step 1: Write the failing renderer tests**

  Extend `tests/house-interior-tilemap.test.mjs` with tests named `renders a code-native pixel canvas instead of a background image` and `keeps collision metadata hidden beside the canvas`. Assert the canvas class and dimensions, assert there is no `house-interior-background-image` or `/media/house-interior-plan` reference, and retain assertions for `data-layer="collision"` and `data-layer="spawn_points"` with `hidden`.

- [ ] **Step 2: Run the renderer tests and verify they fail**

  Run: `node --test tests/house-interior-tilemap.test.mjs`

  Expected: FAIL because the component still renders the background `<img>`.

- [ ] **Step 3: Implement the canvas renderer**

  Mark the component as client-rendered, add a canvas ref and a small `drawPixelScene(context, map)` helper. Set canvas dimensions from the pixel-data constants, disable image smoothing, paint the run-length dots and scene commands, then draw wall segments from `map.layers.walls` using `HOUSE_INTERIOR_WALL_THICKNESS`. Use a `ResizeObserver` or layout effect to redraw after the canvas receives a non-zero size; no pointer events or movement logic may be added. Remove the background `<img>` while keeping the map metadata and hidden data layers.

- [ ] **Step 4: Run the renderer tests and verify they pass**

  Run: `node --test tests/house-interior-tilemap.test.mjs`

  Expected: all tilemap tests pass, including no-image and hidden-collision assertions.

- [ ] **Step 5: Commit the renderer**

  ```bash
  git add components/site/HouseInteriorTilemap.mjs tests/house-interior-tilemap.test.mjs
  git commit -m "feat: render house background with pixel canvas"
  ```

### Task 3: Pixel-specific CSS, fallback, and asset cleanup

**Files:**
- Modify: `app/globals.css` only in `.house-interior-*` rules
- Delete after reference removal: `public/media/house-interior-plan.png`
- Delete after reference removal: `public/media/house-interior-plan-hd.png`
- Modify: `tests/house-interior-world.test.mjs` if a canvas integration assertion is needed

**Interfaces:**
- Keeps `.house-interior-world`, camera sizing, character z-index, and sidebar layout unchanged.
- Adds `.house-interior-pixel-canvas` sizing, `image-rendering: pixelated`, `object-fit: fill`, and `pointer-events: none`.
- Leaves the existing tile layers available as a safe fallback before the canvas effect marks the renderer ready.

- [ ] **Step 1: Write the failing CSS/integration assertions**

  Assert that the world still contains `.house-interior-tilemap` and `.house-interior-character-layer`, that the canvas is behind characters, and that the stylesheet contains the pixel canvas sizing and pixel-rendering rules.

- [ ] **Step 2: Run the focused integration test and verify it fails**

  Run: `node --test tests/house-interior-world.test.mjs`

  Expected: FAIL until the new canvas class and CSS rules are present.

- [ ] **Step 3: Implement scoped CSS and remove unused image assets**

  Add only `.house-interior-pixel-canvas` rules under the existing house-interior section. Keep the fallback tile layers visible until the canvas effect sets `data-pixel-ready="true"`, then hide only the visual tile layers behind that attribute. After the component no longer references them, remove the two explicitly named PNG files with a path-checked file deletion; do not delete any other media asset.

- [ ] **Step 4: Run focused integration tests and inspect the browser**

  Run: `node --test tests/house-interior-world.test.mjs tests/house-interior-tilemap.test.mjs tests/house-interior-navigation.test.mjs && git diff --check`

  Then reload `http://127.0.0.1:3004/second/?view=custom` and verify: thin blue walls are crisp when zoomed, characters stay above the canvas, the sidebar is unchanged, and attempting to cross a blue wall still leaves the character on the walkable side.

- [ ] **Step 5: Commit the scoped CSS and cleanup**

  ```bash
  git add app/globals.css tests/house-interior-world.test.mjs
  rm -f public/media/house-interior-plan.png public/media/house-interior-plan-hd.png
  git commit -m "feat: finish code-native house background"
  ```

### Task 4: Full verification and handoff

**Files:**
- No new production files; update tests only if a verification gap is found.

- [ ] **Step 1: Run the relevant house/customization suite**

  Run: `node --test tests/house-interior-map.test.mjs tests/house-interior-navigation.test.mjs tests/house-interior-pixel-art.test.mjs tests/house-interior-tilemap.test.mjs tests/house-interior-world.test.mjs tests/secondary-shared-characters.test.mjs tests/secondary-character-customization.test.mjs tests/secondary-custom-sidebar.test.mjs && git diff --check`

  Expected: all listed tests pass and the diff check is clean.

- [ ] **Step 2: Run the production build**

  Run: `npm run build`

  Expected: Next.js compiles and exports `/`, `/experience`, and `/second` successfully.

- [ ] **Step 3: Run the full project test command and report unrelated failures honestly**

  Run: `npm test`

  Expected: report the exact pass/fail counts. If the existing untracked Mosaic tests remain red, identify them separately and do not attribute them to this house-renderer change.

- [ ] **Step 4: Review the final diff and browser state**

  Run: `git status --short`, `git diff --check`, and inspect the current `/second/` browser tab. Confirm there are no runtime image references, no collision-map edits, no layout/sidebar changes, and no accidental edits to `.next.build-cache-backup-20260922/` or `tests/mosaic-shape-rendering.test.mjs`.
