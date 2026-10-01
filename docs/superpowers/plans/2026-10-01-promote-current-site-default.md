# Promote Current Site to Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the currently served `MAP / CCTV / CUSTOM` site from `codex/audience-pixel-cctv` the canonical default implementation on `main` without losing the six pre-existing uncommitted files.

**Architecture:** Preserve the dirty `main` working tree on a dedicated safety branch, then promote the tested site branch into `main` with the current served tree taking precedence for overlapping website files. Rebuild and serve the default checkout so future local starts no longer depend on the nested worktree.

**Tech Stack:** Git worktrees, Next.js 15 static export, Node.js test runner, Python local static server.

**Spec:** `/Users/judy1103/Documents/New project/AGENTS.md` and the user request in this chat to make the currently displayed whole website the default.

## Global Constraints

- Preserve the current page structure, spacing, sidebar placement, navigation, and responsive layout.
- Do not discard the six existing uncommitted `main` changes; keep them recoverable on a named safety branch.
- The canonical default must include the currently displayed MAP, CCTV, and CUSTOM routes.
- The canonical local URL remains `http://127.0.0.1:3004/`.

## Review Focus

- Dirty `main` checkout: preservation branch contains all six original modifications before promotion.
- Diverged histories: the promoted `main` tree matches the currently served site branch for website files.
- Generated output: `out/`, `/experience/`, and `/second/?view=custom` are rebuilt from the promoted default checkout.
- Route regressions: MAP, CCTV, and CUSTOM retain their existing navigation and layout.
- Local runtime: port 3004 serves the default checkout rather than the nested worktree.

---

### Task 1: Preserve the Existing Main Working Tree

**Files:**
- Preserve: `components/site/FollowingCharacterWorld.mjs`
- Preserve: `components/site/HouseInteriorWorld.mjs`
- Preserve: `components/site/SecondaryLanding.mjs`
- Preserve: `hooks/usePlaybackEngine.ts`
- Preserve: `tests/house-interior-world.test.mjs`
- Preserve: `tests/secondary-player-spawn.test.mjs`

**Interfaces:**
- Consumes: dirty `main` checkout at commit `739fdfd`
- Produces: a named safety branch and commit containing the six original modifications

- [ ] **Step 1: Reconfirm the exact dirty-file list**

Run: `git status --short -uno`

Expected: exactly the six files listed above are modified.

- [ ] **Step 2: Create a recoverable safety branch**

Create `codex/pre-current-site-default` from the current `main` checkout.

- [ ] **Step 3: Commit only the six preserved files**

Commit message: `chore: preserve pre-default site changes`

- [ ] **Step 4: Verify preservation**

Run: `git show --stat --oneline HEAD`

Expected: the safety commit contains exactly the six preserved files.

### Task 2: Promote the Current Site Tree to Main

**Files:**
- Modify: the tracked site tree changed by `codex/audience-pixel-cctv`
- Preserve: `docs/superpowers/plans/2026-10-01-promote-current-site-default.md`

**Interfaces:**
- Consumes: clean `main`, safety branch from Task 1, `codex/audience-pixel-cctv` at `f1f6911`
- Produces: `main` whose website tree matches the currently served site

- [ ] **Step 1: Return to `main` and verify it is clean**

Run: `git status --short -uno`

Expected: no tracked changes.

- [ ] **Step 2: Merge `codex/audience-pixel-cctv` into `main`**

Resolve overlapping website files in favor of the currently served branch. Do not import the safety branch's partial implementation into the canonical tree.

- [ ] **Step 3: Verify the promoted tree**

Run a tree comparison between `main` and `codex/audience-pixel-cctv`, excluding this plan document.

Expected: no differences in application, component, hook, library, public asset, migration, or test files.

- [ ] **Step 4: Commit the promotion**

Commit message: `merge: promote complete pixel cctv site to default`

### Task 3: Rebuild, Verify, and Serve the Default Checkout

**Files:**
- Generate: `.next/`
- Generate: `out/`

**Interfaces:**
- Consumes: promoted `main` checkout
- Produces: verified static export served from the default checkout on port 3004

- [ ] **Step 1: Run the focused MAP, CCTV, and CUSTOM tests**

Run the existing navigation, CCTV, custom-character, home-map, and static-export verification commands.

Expected: all focused tests pass and `Static export verified` is printed.

- [ ] **Step 2: Build the production static export**

Run: `./node_modules/.bin/next build`

Expected: exit code 0 with MAP, `/experience`, and `/second` listed as static routes.

- [ ] **Step 3: Switch port 3004 to the default checkout's `out/` directory**

Stop only the current temporary static server, then start the same server command from the default checkout.

- [ ] **Step 4: Verify all three routes in the browser**

Check `http://127.0.0.1:3004/`, `/experience/`, and `/second/?view=custom`.

Expected: the same canonical MAP, CCTV, and CUSTOM layouts currently displayed, with the browser left on the default MAP route.

- [ ] **Step 5: Confirm repository and recovery state**

Verify `main` is the active default branch, the canonical build is served from the default checkout, and `codex/pre-current-site-default` retains the prior six-file work.
