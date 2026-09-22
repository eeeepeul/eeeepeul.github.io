# Shared House Characters Design

## Goal

After deployment, a character submitted by any visitor on the custom page appears as a moving, customized character inside the shared house interior for every visitor. Shared characters remain visible for the latest 24 hours only.

## Current state

- `SecondaryLanding` owns `characterIds` and `characterCustomizations` in browser-local React state.
- `CustomSidebarContent` emits the five selected option indexes when `input` is pressed.
- `HouseInteriorCharacterWorld` already renders custom match-color filters and shoe layers and moves every character through the existing interior navigator.
- Supabase is already configured through `lib/supabase-browser.mjs` and `lib/shared-visits.mjs` for shared visit events and Realtime inserts.

## Architecture

### Database

Add `public.character_events` with a server-generated bigint identity id and `created_at` timestamp, a fixed `world_id` (`shared-house`), and five smallint selection columns: `match_color`, `expression`, `flame_color`, `flame_shape`, and `shoe`.

Each selection is zero-based and constrained to the existing sidebar option count. `created_at` is not accepted from the browser. The table is protected by RLS, grants only the required Data API privileges to `anon` and `authenticated`, and exposes only rows newer than 24 hours through its SELECT policy. INSERT uses a WITH CHECK policy that permits only the fixed world and valid selection ranges. The table is added to `supabase_realtime` for INSERT events.

### Client data layer

Create `lib/shared-characters.mjs` with the same narrow adapter shape as `lib/shared-visits.mjs`:

- normalize database rows into `{ id, createdAt, worldId, customization }`;
- validate the five integer selections and the shared world;
- insert a customization and return the normalized server row;
- load rows after a timestamp with keyset pagination;
- subscribe to INSERT events and remove the channel during cleanup;
- merge by numeric id so the initial load, Realtime, and same-tab event cannot duplicate a character.

Extend `lib/supabase-browser.mjs` with a configured shared-character store while preserving the existing visit store API.

### React flow

`SecondaryLanding` starts one shared-character feed for the house interior, loads only the last 24 hours, and merges received rows into `characterIds`/`characterCustomizations`. On `input`, it records the selection through the store and publishes the normalized result to the same-tab feed. If Supabase is unavailable or insertion fails, it keeps the current local-only fallback so the UI remains usable.

Remote characters are not camera targets. The existing locally submitted character remains the active character, while remote characters are added as ordinary moving characters with their saved match-color and shoe styles.

### Testing

Add unit tests for row normalization, invalid option rejection, merge de-duplication, pagination, Realtime subscription cleanup, and same-tab publication. Add static/behavior tests proving the second-page component starts the feed, records `input`, preserves the existing six NPCs, and passes shared customizations to the interior world. Run the complete Node test suite and a production build.

## Failure handling

- Missing Supabase configuration: no network calls; current local behavior remains.
- Failed initial load or Realtime connection: keep existing NPCs and local characters; mark the feed offline internally without showing an error overlay.
- Failed character insert: keep the submitted character locally and do not retry automatically.
- Malformed remote row: discard it before it reaches React state.
- Expired rows: excluded by the database policy and client `created_at` cutoff.

## Non-goals

- No authentication or user profiles.
- No changes to the existing map, CCTV layout, custom sidebar layout, or interior art.
- No permanent character archive, editing, deletion, or moderation UI.
