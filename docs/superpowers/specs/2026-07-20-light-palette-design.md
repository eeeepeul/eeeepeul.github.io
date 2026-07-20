# Pixel CCTV Light Palette Design

**Date:** 2026-07-20  
**Status:** Approved direction, pending implementation

## Goal

Convert the existing Pixel CCTV experience from a dark interface to a unified light interface without changing playback, Kick analysis, pixel sizing, dragging, recording, responsive layout, or video looping.

## Approved Palette

| Role | Color |
| --- | --- |
| Page, stage, canvas, and unlit pixel background | `#EDECF1` |
| Ring pixels | `#B70000` |
| Diagonal pixels | `#9AC2F0` |
| Solid square pixels | `#9AC2F0` |
| Primary interface text | `#17161B` |
| Secondary interface text | `#6C6873` |
| Hairline borders | `rgba(23, 22, 27, 0.20)` |

The fixed dark neutral foreground and muted secondary text keep controls readable on `#EDECF1`. Red and blue remain the only strong chromatic accents.

## Rendering Design

The existing four luminance bands stay unchanged:

1. Dark video samples render as the same `#EDECF1` used by the page and stage.
2. Low-mid samples render the existing diagonal mask in `#9AC2F0`.
3. Mid-high samples render the existing ring mask in `#B70000`.
4. Bright samples render the existing solid square mask in `#9AC2F0`.

The current Kick-driven color boost will be removed so the requested colors remain exact. Kick energy will continue to enlarge pixels by reducing the grid column count, preserving the existing automatic motion.

## Interface Design

- Set the document color scheme to light.
- Use `#EDECF1` for the page, stage, canvas fallback, and start overlay foundation.
- Convert headings, metadata, controls, timelines, borders, and footer copy to dark-on-light values with sufficient contrast.
- Use `#17161B` for the primary Start button, with `#EDECF1` button text and `#B70000` hover emphasis.
- Replace the dark radial canvas fallback with a flat `#EDECF1` fallback.
- Use a translucent light start overlay so the first screen remains readable while matching the new palette.
- Keep all spacing, typography, layout, labels, touch targets, and responsive behavior unchanged.

## Components and Data Flow

No component boundaries or runtime data flow change. `PixelExperience` continues to own playback state, Kick strength, drag position, and recording state. `PixelCanvas` continues to pass video frames, resolution, tile count, and Kick values into the WebGL shader. Only CSS tokens and fragment-shader output colors change.

## Error Handling

Existing WebGL, media playback, and recording error handling remains unchanged. The palette change introduces no new user input, network request, or failure state.

## Testing and Verification

- Add a test that verifies the approved four shader color roles and confirms that Kick no longer alters the output color.
- Add a test that verifies the document uses the light color scheme and `#EDECF1` page background.
- Run the complete unit test suite.
- Run the production static build and static-export verification.
- Confirm the local server returns the rebuilt HTML, CSS, video, and audio successfully.

## Out of Scope

- Changing the luminance thresholds or pixel masks
- Changing Kick sensitivity or animation behavior
- Changing text, layout, controls, video, audio, export format, or deployment architecture
- Adding a user-selectable light/dark theme toggle
