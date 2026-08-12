# Supabase Shared Visitor Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every visitor page load part of one Supabase-backed realtime activity history and use the same shared data for house map visit rings.

**Architecture:** A least-privilege `visit_events` table is the single source of truth. A focused browser data source wraps `supabase-js`; one root recorder writes each page load while the existing activity and map components read, subscribe, and periodically reconcile.

**Tech Stack:** Next.js 15 static export, React 19, Node test runner, `@supabase/supabase-js`, Supabase Postgres/RLS/Realtime.

## Global Constraints

- Store no IP address, fingerprint, user id, or personal information.
- Use server-generated `visited_at` timestamps.
- Anonymous clients may SELECT and INSERT only; they may not UPDATE or DELETE.
- A missing or unavailable Supabase connection must not prevent the page from rendering.
- Do not migrate existing localStorage records.
- Do not commit, push, or deploy until the user explicitly requests it.
- Use Node.js 22 or later for Supabase JavaScript packages.

---

### Task 1: Shared visit data-source contract

**Files:**

- Create: `lib/shared-visits.mjs`
- Create: `tests/shared-visits.test.mjs`

**Interfaces:**

- Produces: `normalizeVisitRow(row) -> { id, visitedAt, houseId } | null`
- Produces: `houseIdFromLocation(pathname, search) -> house id | null`
- Produces: `createSharedVisitStore(client) -> { recordVisit, loadVisits, subscribe }`

- [ ] **Step 1: Write failing normalization and location tests**

```js
assert.deepEqual(
  normalizeVisitRow({ id: 7, visited_at: '2026-08-12T00:00:00Z', house_id: 'house2' }),
  {
    id: 7,
    visitedAt: Date.parse('2026-08-12T00:00:00Z'),
    houseId: 'house2',
  }
)
assert.equal(houseIdFromLocation('/experience/', '?house=house4'), 'house4')
assert.equal(houseIdFromLocation('/', '?house=house4'), null)
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test tests/shared-visits.test.mjs`

Expected: FAIL because `lib/shared-visits.mjs` does not exist.

- [ ] **Step 3: Implement row validation and location parsing**

```js
export function normalizeVisitRow(row) {
  const visitedAt = Date.parse(row?.visited_at)
  const houseId = normalizeHouseId(row?.house_id)
  if (!Number.isFinite(visitedAt) || !Number.isFinite(Number(row?.id))) return null
  if (row?.house_id != null && !houseId) return null
  return { id: Number(row.id), visitedAt, houseId }
}
```

- [ ] **Step 4: Write failing store tests with a mock Supabase client**

Verify that `recordVisit('house2')` inserts exactly `{ house_id: 'house2' }`, a general visit inserts `{ house_id: null }`, `loadVisits()` requests ordered pages until the returned page is short, and `subscribe()` registers only INSERT events on `public.visit_events` and removes the channel during cleanup.

- [ ] **Step 5: Implement the store and pass the focused tests**

Use a 1,000-row page size and keyset pagination with the sequential `id` (`id > lastId`, ascending). Apply the `visited_at >= since` filter to every page, convert raw rows through `normalizeVisitRow`, and discard invalid rows. Realtime callbacks receive the normalized inserted event.

Run: `node --test tests/shared-visits.test.mjs`

Expected: PASS.

---

### Task 2: Secure Supabase schema and browser configuration

**Files:**

- Modify: `package.json`
- Modify: `yarn.lock`
- Create locally: `.env.local`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**

- Consumes: `createSharedVisitStore(client)` from Task 1.
- Produces: `getSharedVisitStore() -> shared store | null` in `lib/supabase-browser.mjs`.

- [ ] **Step 1: Install the pinned Supabase browser client**

Run: `yarn add --exact @supabase/supabase-js@2.112.3`

Expected: `package.json` and `yarn.lock` contain an exact package version. Confirm the selected version supports Node.js 22 and browsers.

- [ ] **Step 2: Apply the database migration**

```sql
create table public.visit_events (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  house_id text null,
  constraint visit_events_house_id_check
    check (house_id is null or house_id in ('house1', 'house2', 'house3', 'house4'))
);
create index visit_events_visited_at_idx on public.visit_events (visited_at desc);
create index visit_events_house_visited_at_idx
  on public.visit_events (house_id, visited_at desc)
  where house_id is not null;
alter table public.visit_events enable row level security;
revoke all on table public.visit_events from anon, authenticated;
grant select on table public.visit_events to anon, authenticated;
grant insert (house_id) on table public.visit_events to anon, authenticated;
grant usage, select on sequence public.visit_events_id_seq to anon, authenticated;
create policy "public can read visit events"
  on public.visit_events for select to anon, authenticated using (true);
create policy "public can append visit events"
  on public.visit_events for insert to anon, authenticated
  with check (house_id is null or house_id in ('house1', 'house2', 'house3', 'house4'));
alter publication supabase_realtime add table public.visit_events;
```

- [ ] **Step 3: Verify schema security before frontend use**

Query `pg_policies`, `information_schema.role_table_grants`, `information_schema.column_privileges`, and `pg_publication_tables`. Confirm RLS is enabled, SELECT and column INSERT are present, UPDATE/DELETE are absent, and Realtime includes the table. Run Supabase security and performance advisors.

- [ ] **Step 4: Configure the public client**

Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Add the same public build variables to the Pages workflow and upgrade `actions/setup-node` from Node 20 to Node 22. Never use a secret or service-role key.

- [ ] **Step 5: Implement singleton creation**

```js
export function getSharedVisitStore() {
  if (!url || !publishableKey) return null
  if (!store) store = createSharedVisitStore(createClient(url, publishableKey))
  return store
}
```

Run: `node --test tests/shared-visits.test.mjs`

Expected: PASS.

---

### Task 3: One page-load recorder and realtime consumers

**Files:**

- Create: `components/site/SharedVisitRecorder.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/site/VisitorActivityCard.mjs`
- Modify: `components/site/HouseMapSection.mjs`
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Delete: `components/pixel-experience/HouseVisitRecorder.tsx`
- Test: `tests/shared-visits-integration.test.mjs`

**Interfaces:**

- Consumes: `getSharedVisitStore()` from Task 2.
- Produces: browser event `epeul:shared-visit` with `{ visit }` detail after a successful same-tab insert.

- [ ] **Step 1: Write failing integration/source tests**

Assert that the root layout mounts `SharedVisitRecorder`, the recorder calls `recordVisit(houseIdFromLocation(...))`, `PixelExperience` no longer mounts `HouseVisitRecorder`, and the activity/map components no longer reference `NEXT_PUBLIC_VISITOR_ACTIVITY_ENDPOINT` or localStorage visit keys.

- [ ] **Step 2: Run the focused integration test and confirm it fails**

Run: `node --test tests/shared-visits-integration.test.mjs`

Expected: FAIL because the root recorder is not mounted and old local wiring remains.

- [ ] **Step 3: Add one root recorder**

On mount, resolve the current path/query, call `store.recordVisit(houseId)`, and dispatch the same-tab event with the returned event. Keep one module-level page-load guard so React strict-mode effects cannot double-insert.

- [ ] **Step 4: Convert the activity card to shared reads**

Load from the fixed timeline start, subscribe to INSERT events, merge by database `id`, filter future/invalid rows, and reconcile every 30 seconds. Set `data-activity-storage` to `connecting`, `shared`, or `offline`; retain loaded rows during reconnects.

- [ ] **Step 5: Convert the house map to shared reads**

Load only the latest 24 hours, filter rows with valid `houseId`, subscribe to the same INSERT stream, update rings immediately, and reconcile every 30 seconds. Do not read or write localStorage.

- [ ] **Step 6: Remove the old page-specific recorder and pass tests**

Run: `node --test tests/shared-visits.test.mjs tests/shared-visits-integration.test.mjs tests/visitor-activity.test.mjs tests/house-visits.test.mjs`

Expected: PASS after old endpoint tests are updated or retained only for pure legacy helpers that are no longer imported by UI code.

---

### Task 4: End-to-end verification

**Files:**

- Modify only if failures expose a concrete defect.

**Interfaces:**

- Consumes: completed shared database and frontend.
- Produces: verified local static build with shared realtime visit data.

- [ ] **Step 1: Test anonymous browser permissions against Supabase**

Using the publishable key, verify SELECT succeeds, INSERT with only `house_id` succeeds and uses a server timestamp, invalid `house_id` fails, and UPDATE/DELETE fail.

- [ ] **Step 2: Verify cross-client realtime behavior**

Subscribe as one anonymous client, insert as a second anonymous client, and assert the subscriber receives the inserted row within a bounded timeout.

- [ ] **Step 3: Run the complete test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 4: Build and verify the static export**

Run: `npm run build && npm run verify:static`

Expected: Next.js build succeeds, `out/` is generated, and static verification passes.

- [ ] **Step 5: Inspect the local pages**

Open `/`, `/experience/?house=house1`, and `/second/`. Confirm one page load creates one row, the home activity card updates without refresh, the relevant house ring responds, and the UI still renders if Realtime is disconnected.
