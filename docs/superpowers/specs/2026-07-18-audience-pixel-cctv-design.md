# Audience Pixel CCTV Experience — Design Specification

## Objective

Replace the existing EPEUL/MH:M website with a static, audience-facing audiovisual experience. Each visitor sees the supplied CCTV video, hears the supplied track, and gets an independent pixel treatment that reacts automatically to the track's kick while remaining manually adjustable through drag input.

The experience does not control Resolume or a shared stage output. All rendering, audio analysis, interaction, and export happen locally in each visitor's browser.

## Source Media

- Video: `/Users/judy1103/Downloads/클링 cctv.mp4`
- Audio: `/Users/judy1103/Downloads/[track02] if and only if.mp3`
- Audio duration: approximately 264.072 seconds (4:24.072)
- Audio format: stereo MP3, 48 kHz, approximately 192 kbps
- Delivery video format: H.264 MP4 at 1920×1080

The audio element is the master timeline. The CCTV video loops until the audio ends. When the audio ends, video playback and animation stop.

## Repository Replacement Scope

Target repository:

`/Users/judy1103/Documents/New project/tailwind-nextjs-starter-blog`

Preserve:

- `.git` history and repository metadata
- package-management and build configuration needed for the replacement site
- GitHub Actions configuration that is useful for GitHub Pages deployment
- license and essential project documentation

Remove or replace:

- the existing EPEUL/MH:M interface
- existing page-specific React components and CSS
- blog/editorial routes and content not used by the new experience
- unused images, audio, and other public assets
- server-only features that prevent a static GitHub Pages export

The replacement will remain a focused standalone site rather than preserving the old blog or magazine functionality.

## Runtime Architecture

The site is a client-side static application deployable to GitHub Pages.

### Playback Controller

- Requires an explicit Start gesture to satisfy browser autoplay rules.
- Starts the MP3 and CCTV video together.
- Uses the audio element's `currentTime` as the authoritative clock.
- Keeps the looping video synchronized using modulo video duration and corrects visible drift.
- Stops the experience when the audio reaches its end.
- Provides a restart path that resets audio, video, kick state, and animation state.

### Kick Analyzer

- Uses the Web Audio API with the supplied MP3; no microphone permission is required.
- Samples the low-frequency region associated with the kick.
- Applies an adaptive or calibrated threshold so the response remains visible without constant triggering.
- Uses a fast attack and approximately 100–200 ms release.
- Produces a normalized kick envelope from 0 to 1.

The final visual pixel size combines two independent values:

`effectivePixelSize = manualBaseSize + kickEnvelope × kickAmount`

The result is clamped to a safe visual and performance range.

### Pixel Renderer

- Uses WebGL for GPU rendering.
- Maintains a 16:9 composition and 1920×1080 export surface.
- Samples one source color/luminance value per tile.
- Quantizes luminance into four threshold bands.
- Maps the four bands to configurable visual treatments inspired by the reference:
  - empty or dark tile
  - solid-color tile
  - diagonal stripe tile
  - ring tile
- Uses a restrained palette derived from the reference while retaining the CCTV video's night-vision atmosphere.
- Caps device pixel ratio and rendering workload on mobile devices while preserving the 16:9 composition.
- Falls back to a simpler Canvas rendering path or a clear unsupported message if WebGL initialization fails.

### Interaction

- A single draggable control adjusts the visitor's manual base pixel size.
- Pointer Events support mouse, touch, and pen through one interaction path.
- Dragging provides immediate local feedback and never sends data to a backend.
- Each visitor's state is independent.
- Keyboard adjustment and accessible labeling are included for non-pointer input.

## Visual and UI Direction

- Full-screen, dark, cinematic presentation
- CCTV video remains the dominant surface
- Minimal chrome and no blog/navigation remnants
- A clear initial Start state
- A compact drag control that does not obscure the main image
- Subtle status feedback for loading, playing, ended, recording, and unsupported export
- Responsive behavior for portrait mobile screens, preserving the full 16:9 artwork with intentional letterboxing when necessary

## Export

- Target: MP4 container, H.264 video, 1920×1080, with the supplied track as audio.
- Recording captures the processed WebGL canvas rather than the unprocessed source video.
- Export starts from the beginning of the track and ends at the track duration.
- The UI must verify runtime codec/container support before recording.
- If the browser cannot produce the required H.264 MP4, the site must show a compatibility message rather than silently exporting WebM or another codec.
- Desktop Chrome or Safari on the production Mac will be the primary export-validation environment.

## GitHub Pages Deployment

- Produce a static export with no required server runtime.
- Configure repository-relative asset paths so project-site deployments work under `/<repository>/`.
- Add or update a GitHub Actions workflow that builds and deploys the static output to GitHub Pages.
- Keep all audiovisual processing in the browser; no API keys, backend, database, or real-time service are required.

## Failure Handling

- Media load failure: show the failed asset and a retry action.
- Autoplay rejection: remain on the Start state and request another user gesture.
- Audio context suspension: resume only from a user gesture.
- WebGL failure: use a supported fallback or show a clear device-compatibility message.
- Export codec failure: disable Export and state that H.264 MP4 is unavailable on that browser.
- Performance degradation: reduce render resolution or frame rate without changing audio timing.
- Page backgrounding: resynchronize video and visual state to the audio clock when the page becomes visible again.

## Verification Criteria

1. Production build completes successfully as a static site.
2. Start launches audio and video together from zero.
3. The CCTV video loops without restarting or delaying the audio.
4. Playback stops at approximately 264.072 seconds when the track ends.
5. Kick events visibly enlarge pixels and decay within the approved response window.
6. Drag input changes base pixel size independently of kick motion.
7. Two browser sessions can show different manual pixel sizes without interference.
8. The visual uses four threshold bands and the approved tile patterns.
9. Touch interaction works on representative iPhone and Android viewport sizes.
10. GitHub Pages output resolves scripts, styles, video, and audio from the project base path.
11. Exported output, where supported, is MP4/H.264 at 1920×1080 with audio and the processed pixels.
12. No EPEUL/MH:M page, route, or navigation remains accessible in the replacement build.

## Out of Scope

- Resolume or stage control
- Shared audience state
- Multi-user aggregation
- Backend services
- Microphone or live audio input
- User accounts, analytics, or content management
- Custom Resolume Wire effects
