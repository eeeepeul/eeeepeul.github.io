# Figma Home Pixel-Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace page 1's reconstructed sidebar and lower-left mark with the exact exported Figma visuals while preserving navigation and sidebar interaction behavior.

**Architecture:** Keep `ResponsiveSidebar` as the interaction/state container. Render the exported Figma sidebar image as an absolute visual layer inside the existing panel, with the current close control as a transparent overlay. Extend the shared house-link component with an optional exact-image source so only page 1 changes.

**Tech Stack:** Next.js 15, React `createElement`, CSS, Node test runner, Figma exported assets.

## Global Constraints

- Match Figma frame `2710:286` at 1280×720.
- Sidebar visual source is Figma node `2710:288`, 319×664.
- House visual source is Figma node `2710:485`, 30×24 at 36px left/bottom.
- Preserve the centered `/experience/` link and existing sidebar interactions.
- Do not change page 2 or page 3.
- Do not commit, push, or deploy.

---

### Task 1: Lock the exact visual contract with tests

**Files:**
- Modify: `tests/home-coordinate-grid.test.mjs`
- Modify: `tests/main-navigation.test.mjs`

**Interfaces:**
- Consumes: `MainLanding()` rendered through `renderToStaticMarkup`.
- Produces: assertions for `.figma-home-sidebar-artwork`, `/media/figma-home-sidebar.png`, `.house-mark--figma`, and `/media/figma-home-house.svg`.

- [ ] **Step 1: Add failing assertions**

Assert that page 1 contains the exact sidebar and house image assets while retaining `href="/experience/"`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/home-coordinate-grid.test.mjs tests/main-navigation.test.mjs`

Expected: FAIL because the exact artwork classes and asset paths are absent.

### Task 2: Add the exact Figma assets and page-1 rendering hooks

**Files:**
- Create: `public/media/figma-home-sidebar.png`
- Create: `public/media/figma-home-house.svg`
- Modify: `components/site/FigmaHomeSidebarContent.mjs`
- Modify: `components/site/HouseLink.mjs`
- Modify: `components/site/LandingFrame.mjs`
- Modify: `components/site/MainLanding.mjs`

**Interfaces:**
- `HouseLink({ href, label, assetSrc })` renders the exact image when `assetSrc` is supplied and preserves the existing SVG fallback otherwise.
- `LandingFrame({ houseAssetSrc })` forwards the optional source to `HouseLink`.
- `FigmaHomeSidebarContent()` renders one decorative image with class `figma-home-sidebar-artwork`.

- [ ] **Step 1: Download exact exports**

Download node `2710:288` as PNG and node `2710:485` as SVG from Figma into the declared media paths.

- [ ] **Step 2: Implement the minimal rendering changes**

Replace reconstructed page-1 sidebar children with the exported artwork and pass the exact house asset only from `MainLanding`.

- [ ] **Step 3: Verify GREEN**

Run: `node --test tests/home-coordinate-grid.test.mjs tests/main-navigation.test.mjs`

Expected: PASS.

### Task 3: Match the Figma geometry without changing interaction logic

**Files:**
- Modify: `app/globals.css`
- Test: `tests/responsive-sidebar.test.mjs`

**Interfaces:**
- Page-1 panel uses the exact 319×664 reference geometry at 1280×720.
- `.figma-home-sidebar-artwork` fills the panel.
- Existing `.sidebar-close-button` remains interactive above the artwork but its image is hidden on page 1.

- [ ] **Step 1: Add a failing CSS contract assertion**

Assert exact page-1 column width `319px`, artwork fill rules, transparent close overlay, and exact 30×24 house mark size.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/responsive-sidebar.test.mjs`

Expected: FAIL because the pixel-match CSS contract is absent.

- [ ] **Step 3: Add scoped CSS**

Use `:has(.figma-home-sidebar-artwork)` selectors to scope the 319px panel, hide duplicate reconstructed assets, keep the close control interactive, and scale the artwork uniformly on mobile. Set the page-1 house link to the Figma reference position and size.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/responsive-sidebar.test.mjs`

Expected: PASS.

### Task 4: Full verification and local handoff

**Files:**
- Verify all modified files.

**Interfaces:**
- Page 1 matches the exact exported Figma visuals.
- Existing navigation and sidebar interaction behavior remains covered.

- [ ] **Step 1: Run the complete tests**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: successful static export for `/`, `/experience`, and `/second`.

- [ ] **Step 3: Restart the local server**

Run: `npm run dev`

Expected: `http://127.0.0.1:3004/` is ready.

- [ ] **Step 4: Compare at 1280×720 when browser policy permits**

Verify 28px panel margins, 319×664 sidebar, 36px house offsets, and preserved open/close behavior.
