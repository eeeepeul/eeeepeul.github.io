# Shared Mosaic Role Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Circle과 Square가 M·O·E와 동일한 밝기별 세 가지 팔레트 색을 사용하게 한다.

**Architecture:** `pixel-shaders.ts`에서 밝기 구간에 따른 `roleColor` 선택을 패턴 분기 전에 공통으로 수행한다. 도형 분기는 마스크만 바꾸고 선택된 역할 색은 덮어쓰지 않는다.

**Tech Stack:** TypeScript, GLSL ES 1.00, Node test runner, Next.js

## Global Constraints

- 기존 M·O·E 임계값과 색 매핑을 그대로 사용한다.
- Circle/Square의 크기·간격·Kick 반응을 유지한다.
- 커밋, 푸시, 배포는 수행하지 않는다.

---

### Task 1: Shared role-color rendering

**Files:**
- Modify: `tests/mosaic-shape-rendering.test.mjs`
- Modify: `lib/pixel-shaders.ts`

**Interfaces:**
- Consumes: `uDiagonalColor`, `uCircleColor`, `uSolidColor`, `inkLuma`, `E_TO_O`, `O_TO_M`
- Produces: 모든 `uShapeMode`에서 공유되는 밝기별 `roleColor`

- [ ] **Step 1: Write the failing regression test**

도형 모드가 `roleColor = uCircleColor`로 단일 색을 강제하지 않고, 기존 두 임계값 분기를 공유하는지 검증한다.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/mosaic-shape-rendering.test.mjs`

Expected: 도형 모드의 단일 색 덮어쓰기 때문에 실패한다.

- [ ] **Step 3: Implement the minimal shader change**

`roleColor`는 기존 E/O/M 밝기 분기에서만 선택하고, Circle/Square 분기에서는 `glyph` 마스크만 변경한다.

- [ ] **Step 4: Run focused and full verification**

Run: `node --test tests/mosaic-shape-rendering.test.mjs`

Run: `npm test`

Run: `npm run build`

- [ ] **Step 5: Verify in the browser**

Circle과 Square를 각각 선택해 세 역할 색과 영상 윤곽이 함께 보이는지 확인한다.
