# House Distance Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the house-distance strip left on downward wheel input and preserve its free resting position across the four-house loop.

**Architecture:** Add a pure wheel-position resolver to the existing house-distance model. Store house index and offset as one React state object so rapid wheel events update both values atomically, then connect `onWheel` to the existing strip transform.

**Tech Stack:** React 19 client component, Next.js 15 static export, Wheel Events, Node test runner.

## Global Constraints

- Scrolling down moves the route from right to left; scrolling up reverses it.
- Do not snap after wheel input.
- Preserve the fractional offset while looping through all four houses.
- Do not commit, push, or deploy.

---

### Task 1: Wheel position model

**Files:**

- Modify: `lib/house-distance.mjs`
- Modify: `tests/house-distance.test.mjs`

**Interfaces:**

- Produces: `scrollHousePosition(index, offset, deltaY, trackWidth = 261, houseCount = 4)` returning `{ houseIndex, offset }`.

- [x] **Step 1: Add failing tests proving positive delta moves the offset negative and loop crossings preserve the remainder**
- [x] **Step 2: Run `node --test tests/house-distance.test.mjs` and confirm the missing export failure**
- [x] **Step 3: Implement bounded wheel movement and wrapped house advancement**
- [x] **Step 4: Run the focused model tests and confirm they pass**

### Task 2: Distance-card wheel interaction

**Files:**

- Modify: `components/site/HouseDistanceCard.mjs`
- Modify: `tests/home-coordinate-grid.test.mjs`

**Interfaces:**

- Consumes: `scrollHousePosition`.
- Produces: an accessible distance slider whose wheel input updates the free strip position without moving the page.

- [x] **Step 1: Cover the wheel interaction contract through the real position resolver**
- [x] **Step 2: Replace separate house and offset state with one atomic position state**
- [x] **Step 3: Connect `onWheel`, prevent default page scrolling, and update position through the pure resolver**
- [x] **Step 4: Run focused tests and confirm they pass**

### Task 3: Verification

**Files:**

- Verify: `components/site/HouseDistanceCard.mjs`
- Verify: `lib/house-distance.mjs`

- [x] **Step 1: Load the updated local page and inspect the distance card**
- [x] **Step 2: Run `npm test`**
- [x] **Step 3: Run `npm run build`**
- [x] **Step 4: Keep the branch and worktree uncommitted and unpushed**
