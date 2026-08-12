# Supabase Shared Visitor Records Design

## Goal

Replace device-local visitor counters with one shared, realtime visit stream. Every page load from every visitor contributes one global record, the activity card updates across open browsers, and house-specific CCTV visits drive the home map rings.

## Confirmed behavior

- Record every full page load once.
- Record the time on the Supabase server, never from the browser clock.
- Store an optional `house_id` only for `/experience/?house=house1` through `house4`.
- Keep all visitor events globally readable so the current 24-hour view and previous day views use the same source.
- Update open pages from Supabase Realtime and periodically reconcile in case a websocket event is missed.
- Start the shared history when this feature is enabled; do not copy localStorage history.
- Store no IP address, fingerprint, user id, or other personal information.
- Keep the interface usable during an outage and expose a shared/connecting/offline connection state.

## Database

Create `public.visit_events` with:

- `id bigint generated always as identity primary key`
- `visited_at timestamptz not null default now()`
- `house_id text null` constrained to `house1`, `house2`, `house3`, or `house4`

Indexes:

- `(visited_at desc)` for activity history queries.
- `(house_id, visited_at desc) where house_id is not null` for 24-hour house counts.

The table is added to `supabase_realtime` for INSERT notifications.

## Security

- Enable Row Level Security before granting browser access.
- Grant `SELECT` to `anon` and `authenticated`.
- Grant column-level `INSERT (house_id)` only. Browsers cannot supply `id` or `visited_at`.
- Add SELECT and INSERT policies for `anon` and `authenticated`.
- Do not grant UPDATE or DELETE.
- Use only the public Supabase URL and publishable key in frontend configuration; never expose a service-role or secret key.

## Frontend architecture

`lib/shared-visits.mjs` owns row normalization, paginated reads, INSERT recording, and Realtime subscription. `lib/supabase-browser.mjs` owns the singleton Supabase browser client and configuration.

`SharedVisitRecorder` is mounted once in the root layout. It records one event for each full page load and includes a validated house identifier when present. Existing activity and house-map components only read and subscribe, preventing duplicate inserts.

The activity card consumes all events since the fixed project timeline start. The map consumes house-tagged events from the last 24 hours. Both reconcile periodically and accept Realtime inserts immediately.

## Failure behavior

If configuration, an initial query, or Realtime fails, the current UI still renders. Already loaded shared data remains visible, the state changes to `offline`, and polling retries. LocalStorage is not mixed into global totals because that would show different numbers to different visitors.

## Verification

- Unit tests cover row normalization, page-load payloads, pagination, and Realtime cleanup.
- Integration/source tests confirm the root recorder is mounted and old local endpoint wiring is removed.
- Database checks verify table shape, grants, RLS policies, publication membership, allowed anonymous SELECT/INSERT, and denied UPDATE/DELETE.
- Production build and the existing full test suite must pass.
