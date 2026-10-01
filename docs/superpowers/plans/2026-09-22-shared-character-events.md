# Shared House Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist custom characters for 24 hours and stream them into every visitor's shared house interior without changing the existing layout.

**Architecture:** Add a validated `public.character_events` Supabase table and a small client adapter parallel to the existing shared visit store. `SecondaryLanding` will load and subscribe to the adapter, merge server rows by id, and pass remote customizations into the existing moving-character renderer while retaining a local fallback.

**Tech Stack:** Next.js 15, React 19, `@supabase/supabase-js` 2.112.3, Supabase Postgres/Reatime, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-22-shared-character-events-design.md`

## Global Constraints

- Keep the current `/second/` map/CCTV/custom navigation and sidebar layout unchanged.
- Never expose a Supabase service-role or secret key to the browser.
- Store only the five existing customization indexes and a fixed shared-house id.
- Show only rows created during the latest 24 hours.
- Preserve the current six NPCs and local-only fallback when Supabase is unavailable.

## Review Focus

- Malformed or out-of-range remote rows must be discarded before they reach React state; covered by data-layer normalization tests.
- Initial load and Realtime INSERT for the same row must render one character; covered by merge and same-tab event tests.
- A failed insert must not remove the locally added character; covered by SecondaryLanding fallback tests.
- An unavailable Supabase configuration must leave the current custom page usable; covered by store factory and component wiring tests.
- Realtime cleanup must remove the channel and timers on unmount; covered by feed lifecycle tests.

### Task 1: Define and test the shared character contract

**Files:**
- Create: `tests/shared-characters.test.mjs`
- Modify: `lib/character-customization.mjs` only if a shared validation constant is needed

**Interfaces:**
- Produces test cases for `normalizeCharacterRow`, `mergeCharacterEvents`, `houseCharacterCustomization`, and the store lifecycle that later tasks implement.

- [x] **Step 1: Write failing tests** for valid rows, invalid ids/worlds/indexes, 24-hour filtering inputs, merge de-duplication, and same-tab publication.
- [x] **Step 2: Run `node --test tests/shared-characters.test.mjs` and confirm the missing-module failures.**
- [x] **Step 3: Keep the test fixtures limited to the existing five sidebar option ranges.**

### Task 2: Add the Supabase schema and security policy

**Files:**
- Create: `supabase/migrations/<timestamp>_create_character_events.sql`
- Test: `tests/character-events-migration.test.mjs`

**Interfaces:**
- Produces table `public.character_events` with columns `id`, `created_at`, `world_id`, `match_color`, `expression`, `flame_color`, `flame_shape`, and `shoe`.

- [x] **Step 1: Discover the installed Supabase CLI with `supabase --version` and `supabase migration new --help`; if unavailable, create the migration under the repository's existing migration convention.**
- [x] **Step 2: Write the migration test asserting RLS, grants, five range checks, the 24-hour SELECT policy, and `supabase_realtime` publication setup.**
- [x] **Step 3: Write the SQL with server defaults and no client-controlled `created_at`.**
- [x] **Step 4: Run the migration test and inspect the SQL for anon/authenticated least-privilege access.**

### Task 3: Implement the shared-character Supabase adapter

**Files:**
- Create: `lib/shared-characters.mjs`
- Modify: `lib/supabase-browser.mjs`
- Test: `tests/shared-characters.test.mjs`

**Interfaces:**
- `createSharedCharacterStore(client)` returns `recordCharacter(customization, worldId)`, `loadCharacters({ sinceMs, pageSize })`, and `subscribe({ onCharacter, onStatus })`.
- `startSharedCharacterFeed({ store, getSinceMs, onCharacters, onStatus, eventTarget, setIntervalImpl, clearIntervalImpl, refreshMs })` returns `{ ready, cleanup }`.
- Normalized rows have `{ id, createdAt, worldId, customization }`.

- [x] **Step 1: Implement pure validation/normalization and merge helpers until Task 1 tests pass.**
- [x] **Step 2: Implement server insert/select calls with keyset pagination and a fixed column list.**
- [x] **Step 3: Implement the Postgres Changes INSERT channel and same-tab custom event handling.**
- [x] **Step 4: Add `getSharedCharacterStore()` alongside the existing visit store without changing its behavior.**
- [x] **Step 5: Run the focused shared-character tests.**

### Task 4: Connect the feed to the existing house interior

**Files:**
- Modify: `components/site/SecondaryLanding.mjs`
- Modify: `components/site/HouseInteriorWorld.mjs` only if a prop boundary needs adjustment
- Modify: `components/site/HouseInteriorCharacterWorld.mjs` only if remote ids need a non-following role
- Test: `tests/secondary-character-customization.test.mjs`
- Create: `tests/secondary-shared-characters.test.mjs`

**Interfaces:**
- `SecondaryLanding` owns the merged remote character list and passes `characterIds` plus `characterCustomizations` to the unchanged interior renderer.

- [x] **Step 1: Add failing wiring tests for starting the 24-hour feed and mapping a remote row to a moving character.**
- [x] **Step 2: Start one feed in `SecondaryLanding` with cleanup on unmount and keep six initial NPC ids.**
- [x] **Step 3: On `input`, record the selection, optimistically add a local character on failure, and publish the normalized server result on success.**
- [x] **Step 4: Mark only the submitted local character as the active camera target; remote characters remain ordinary wandering entities.**
- [x] **Step 5: Run the focused SecondaryLanding and customization tests.**

### Task 5: Verify the integrated feature

**Files:**
- Modify only files needed to fix verification failures.

- [x] **Step 1: Run `npm test` and confirm all existing plus new tests pass.**
- [x] **Step 2: Run `npm run build` with the existing environment and confirm the second page compiles.**
- [x] **Step 3: If Supabase credentials are available, run a read-only verification query or inspect the publication/table configuration; do not write production rows outside the feature flow.**
- [x] **Step 4: Open `/second/?view=custom` and verify a submitted character remains customized while remote rows would be added through the feed.**
- [x] **Step 5: Review the diff for layout changes, secrets, and accidental unrelated edits.**
