# House Visit Map Design

## Goal

Turn the simplified house map into a clickable, live visit map. Every house is connected with the same black route stroke. Each house has a visit ring whose size represents visits to that house's CCTV page during the latest 24 hours.

## House navigation

- All four house points and their rings are interactive links.
- House links use `/experience/?house=house1` through `/experience/?house=house4`.
- Loading a valid house CCTV URL records one visit for that house.
- Unknown or missing house values do not create a house-specific visit.

## Visit data

- A visit record contains a timestamp and a house identifier.
- The map counts only records from the latest rolling 24-hour window.
- Local records update immediately and synchronize between same-origin tabs through browser storage events.
- When `NEXT_PUBLIC_VISITOR_ACTIVITY_ENDPOINT` is configured, the existing shared visitor endpoint is used for audience-wide reads and writes; requests include the house identifier.
- If the shared endpoint is unavailable or does not return house records, the map continues with local records.

## Ring scale

- Every house always has one ring so no house appears disconnected.
- Zero visits use the minimum radius of 7 map units.
- The most visited visible house uses the maximum radius of 23.4 map units, exactly 1.2 times the previous 19.5-unit large ring.
- Intermediate counts use square-root normalization so one popular house does not visually dominate the map.
- When every house has the same count, all rings use the minimum radius for zero and the midpoint radius for any positive count.

## Map rendering

- All four loop routes use the same black stroke. The selected distance route may be slightly thicker, but not a different color.
- Distance selection continues to synchronize the current house pair with the map.
- Distance labels remain visually the same font size at every zoom level by inversely scaling their SVG font size.
- House links have accessible labels that include the house name and recent visit count.
- Zoom remains at the approved levels: 2%, 10%, 25%, 50%, 75%, and 100%.

## Verification

- Unit tests cover house validation, recent-visit counting, ring-radius bounds, and fixed visual label sizing.
- Component tests verify four clickable house links, black routes, visit rings, and house-specific CCTV URLs.
- Browser verification checks navigation, live ring updates, distance synchronization, and 2%–100% zoom behavior.

## Scope

- No new backend is deployed in this change.
- The existing optional shared visitor endpoint remains the integration point for audience-wide synchronization.
- No commit, push, or deployment is performed.
