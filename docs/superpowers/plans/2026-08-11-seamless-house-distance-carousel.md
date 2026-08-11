# Seamless House Distance Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the house-distance line fill its card and slide continuously between the four looping house pairs.

**Architecture:** Extend the pure route model with a wrapped previous/current/next window. Render those three routes inside a fixed-width carousel strip and commit the house-index change only after the strip transition completes.

**Tech Stack:** React 19 client component, Next.js 15 static export, Pointer Events, CSS transforms, Node test runner.

## Global Constraints

- Keep the route order `house1 → house2 → house3 → house4 → house1`.
- Keep the 28-pixel drag threshold and random page-load distances.
- Every route slide is exactly 261 pixels wide and uses the existing SVG assets.
- Do not commit, push, or deploy.

---

### Task 1: Wrapped carousel window

**Files:**

- Modify: `lib/house-distance.mjs`
- Modify: `tests/house-distance.test.mjs`

**Interfaces:**

- Produces: `getHouseWindow(index, houseCount = 4)` returning wrapped previous, current, and next indexes.

- [x] **Step 1: Write failing tests for the first and last carousel windows**
- [x] **Step 2: Run `node --test tests/house-distance.test.mjs` and confirm the missing export failure**
- [x] **Step 3: Implement `getHouseWindow` with `advanceHouse`**
- [x] **Step 4: Run the focused model test and confirm it passes**

### Task 2: Full-width continuous strip

**Files:**

- Modify: `components/site/HouseDistanceCard.mjs`
- Modify: `app/globals.css`
- Modify: `tests/home-coordinate-grid.test.mjs`
- Modify: `tests/responsive-sidebar.test.mjs`

**Interfaces:**

- Consumes: `getHouseWindow` and the existing distance helpers.
- Produces: three adjacent 261-pixel slides driven by one strip transform.

- [x] **Step 1: Write failing markup and CSS assertions for three slides and a 783-pixel strip**
- [x] **Step 2: Run the focused tests and confirm they fail for the static single-route implementation**
- [x] **Step 3: Replace the single route with a previous/current/next carousel strip**
- [x] **Step 4: Animate to one adjacent slide, update the current index on transition end, and recenter without transition**
- [x] **Step 5: Run focused tests and confirm they pass**

### Task 3: Verification

**Files:**

- Verify: `components/site/HouseDistanceCard.mjs`
- Verify: `app/globals.css`

- [x] **Step 1: Verify the line fills the card and loops forward/reverse in the local browser**
- [x] **Step 2: Run `npm test`**
- [x] **Step 3: Run `npm run build`**
- [x] **Step 4: Keep all changes uncommitted and unpushed**
