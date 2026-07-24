# Split Workspace Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current titled page with an empty white left panel and a large right-hand pixel workspace modeled on the supplied reference.

**Architecture:** Keep all playback, WebGL, drag, Kick, and recording logic in `PixelExperience`. Change only its presentation structure to a two-column shell and rewrite the page-level CSS so the right workspace owns the graphic and controls while mobile hides the purely visual blank panel.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Grid, WebGL, Node test runner

## Global Constraints

- Keep the left panel completely empty.
- Remove the page header, footer, and artwork metadata copy.
- Keep the approved `#EDECF1`, `#B70000`, and `#9AC2F0` palette unchanged.
- Keep the current video, music, Kick response, pixel-size drag behavior, and 1920×1080 H.264 export unchanged.
- Hide the empty panel on narrow mobile widths and preserve keyboard and touch controls.

---

### Task 1: Two-column workspace layout

**Files:**
- Create: `tests/split-workspace-layout.test.mjs`
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the existing `PixelCanvas`, `DragControl`, `ExportButton`, `usePlaybackEngine`, and `useH264Recorder` interfaces without changes
- Produces: `.experience-shell`, `.blank-sidebar`, and `.workspace` layout regions

- [ ] **Step 1: Write the failing layout test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('renders a blank sidebar and an uncluttered right workspace', () => {
  assert.match(experience, /<aside className="blank-sidebar" aria-hidden="true" \/>/)
  assert.match(experience, /<div className="workspace">/)
  assert.doesNotMatch(experience, /<header|<footer|stage-meta/)
  assert.doesNotMatch(experience, /IF AND ONLY IF|PIXEL CCTV|CAM 01|4 BAND PATTERN|YOUR INPUT STAYS/)
})

test('uses two desktop columns and hides the empty sidebar on mobile', () => {
  assert.match(css, /\.experience-shell\s*\{[^}]*grid-template-columns:\s*clamp\(240px,\s*22vw,\s*360px\)\s+minmax\(0,\s*1fr\)/s)
  assert.match(css, /\.blank-sidebar\s*\{[^}]*background:\s*#fff[^}]*border-right:/s)
  assert.match(css, /\.workspace\s*\{[^}]*min-width:\s*0[^}]*display:\s*grid/s)
  assert.match(css, /@media\s*\(max-width:\s*800px\)[\s\S]*?\.experience-shell\s*\{[^}]*grid-template-columns:\s*1fr[\s\S]*?\.blank-sidebar\s*\{[^}]*display:\s*none/s)
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/split-workspace-layout.test.mjs`

Expected: 2 failures because the blank sidebar/workspace do not exist and the current header/footer remain.

- [ ] **Step 3: Replace the page-level structure**

In `PixelExperience.tsx`, replace the header with an empty visual panel and open the right workspace:

```tsx
<main className="experience-shell">
  <aside className="blank-sidebar" aria-hidden="true" />
  <div className="workspace">
    <section className="visual-stage" aria-label="픽셀 CCTV 재생 영역">
```

Delete both `.stage-meta` blocks from inside the visual stage. Keep the `PixelCanvas`, hidden video/audio, `control-deck`, all buttons, support/error messages, and their handlers unchanged. Delete the existing footer and close the workspace before the main element:

```tsx
    </section>
  </div>
</main>
```

- [ ] **Step 4: Replace the page-level CSS layout**

Use these exact desktop layout rules in `app/globals.css`:

```css
.experience-shell {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: clamp(240px, 22vw, 360px) minmax(0, 1fr);
}

.blank-sidebar {
  min-height: 100dvh;
  background: #fff;
  border-right: 1px solid var(--line);
}

.workspace {
  min-width: 0;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(18px, 2.2vw, 34px);
  padding: clamp(24px, 3.2vw, 56px);
  background: var(--paper);
}
```

Keep the existing shared flex rule only for `.action-row`, `.timeline-row`, and `.drag-copy`. Delete all unused `.site-header`, `.site-footer`, `.eyebrow`, `.header-title`, `.status-cluster`, `.status-light`, and `.stage-meta` rules.

Update the stage and controls:

```css
.visual-stage {
  position: relative;
  align-self: center;
  width: min(100%, calc((100dvh - 280px) * 16 / 9));
  aspect-ratio: 16 / 9;
  margin: auto;
  background: var(--paper);
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(23, 22, 27, 0.10);
}

.control-deck {
  width: min(100%, 1280px);
  margin: 0 auto;
  display: grid;
  gap: 16px;
  border-top: 1px solid var(--line);
  padding: 14px 0 0;
}
```

Replace the narrow-screen rules with:

```css
@media (max-width: 800px) {
  .experience-shell {
    grid-template-columns: 1fr;
  }

  .blank-sidebar {
    display: none;
  }

  .workspace {
    min-height: 100dvh;
    gap: 14px;
    padding: max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  }

  .visual-stage {
    width: 100%;
  }

  .action-row {
    align-items: flex-end;
  }

  .kick-monitor {
    width: 32%;
    display: grid;
    gap: 6px;
  }

  .button-group {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .action-button {
    min-height: 36px;
    padding: 0 10px;
  }
}
```

In the short landscape query, remove the header rule and use `.visual-stage { max-height: calc(100dvh - 190px); }`.

- [ ] **Step 5: Run focused and full tests and confirm GREEN**

Run: `node --test tests/split-workspace-layout.test.mjs`

Expected: 2 tests pass.

Run: `npm test`

Expected: all current and new tests pass.

- [ ] **Step 6: Commit the layout change**

```bash
git add tests/split-workspace-layout.test.mjs components/pixel-experience/PixelExperience.tsx app/globals.css
git commit -m "feat: add split pixel workspace layout"
```

---

### Task 2: Build, local verification, and public deployment

**Files:**
- Verify generated output: `out/`
- No source files should change in this task

**Interfaces:**
- Consumes: completed split workspace from Task 1
- Produces: refreshed local preview and deployed GitHub Pages site

- [ ] **Step 1: Build and verify the static site**

Run: `npm run build && npm run verify:static && git diff --check`

Expected: production build succeeds, `Static export verified` prints, and the diff check is silent.

- [ ] **Step 2: Verify the local site and media**

Keep the existing local server on `http://127.0.0.1:3004/` running. Verify `/`, `/media/cctv-1080p.mp4`, and `/media/if-and-only-if.mp3` return HTTP 200, and confirm the generated page contains `blank-sidebar` but no `PIXEL CCTV` heading.

- [ ] **Step 3: Push the approved change to public `main` without force**

```bash
git fetch https://github.com/eeeepeul/eeeepeul.github.io.git main
git rev-list --left-right --count FETCH_HEAD...HEAD
git push https://github.com/eeeepeul/eeeepeul.github.io.git codex/audience-pixel-cctv:main
```

Expected: no remote-only commits and a fast-forward push.

- [ ] **Step 4: Verify the audience site**

Wait for the Pages workflow matching `git rev-parse HEAD` to complete successfully. Verify `https://eeeepeul.github.io/` and both media routes return HTTP 200, and confirm the deployed page contains `blank-sidebar` but no `PIXEL CCTV` heading.
