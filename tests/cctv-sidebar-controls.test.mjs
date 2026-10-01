import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const colorPanel = readFileSync(
  new URL('../components/pixel-experience/ColorPanel.tsx', import.meta.url),
  'utf8'
)
const settingsPanel = readFileSync(
  new URL('../components/pixel-experience/SettingsPanel.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const cctvArtworkReflection = readFileSync(
  new URL('../public/media/figma-cctv-artwork.svg', import.meta.url),
  'utf8'
)
const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const playbackEngine = readFileSync(
  new URL('../hooks/usePlaybackEngine.ts', import.meta.url),
  'utf8'
)

test('shows four background and main-color combination cards', () => {
  assert.match(colorPanel, />color combination</)
  assert.match(colorPanel, /--preset-background[^\n]*preset\.palette\.background/)
  assert.match(colorPanel, /--preset-main[^\n]*preset\.palette\.circle/)
  assert.match(colorPanel, /className="palette-main-swatch"/)
  assert.match(colorPanel, /className="palette-preset-name">SKY BLUE</)
  assert.doesNotMatch(colorPanel, /preset-letter|--preset-diagonal|--preset-solid|--preset-glyph/)
})

test('moves the square color-combination marker with the selected circle', () => {
  assert.match(colorPanel, /aria-pressed=\{selectedId === preset\.id\}/)
  assert.match(
    css,
    /\.cctv-sidebar-content \.palette-preset\[aria-pressed=['"]true['"]\] \.palette-preset-preview\s*\{[^}]*background:\s*#B70000;/s
  )
  assert.match(css, /\.cctv-sidebar-content \.palette-main-swatch\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s)
  assert.doesNotMatch(css, /\.cctv-sidebar-content \.palette-preset\[aria-pressed=['"]true['"]\] \.palette-main-swatch/)
  assert.doesNotMatch(css, /\.cctv-sidebar-content \.palette-preset:first-child \.palette-preset-preview/)
})

test('matches the Figma now-playing artwork projection and palette circle inset', () => {
  assert.match(colorPanel, /figma-cctv-artwork\.svg/)
  assert.match(colorPanel, /figma-cctv-artwork-shadow\.svg/)
  assert.match(
    css,
    /\.cctv-sidebar-content \.now-playing-artwork\s*\{[^}]*position:\s*relative;[^}]*width:\s*80\.5px;[^}]*height:\s*84\.5262px;/s
  )
  assert.match(
    css,
    /\.cctv-sidebar-content \.now-playing-artwork img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;/s
  )
  assert.match(
    css,
    /\.cctv-sidebar-content \.palette-main-swatch\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s
  )
})

test('keeps the now-playing artwork square while hover changes only its Y-axis rotation', () => {
  assert.match(
    css,
    /\.cctv-sidebar-content \.now-playing-artwork\s*\{[^}]*overflow:\s*visible;[^}]*border-radius:\s*0;[^}]*transition:[^;]*transform/s
  )
  const hoverRule = css.slice(css.indexOf('.cctv-sidebar-content .now-playing-artwork:hover'))
  assert.doesNotMatch(hoverRule.slice(0, hoverRule.indexOf('}')), /clip-path:/)
})

test('shows a gradient reflection of the artwork below the shape', () => {
  assert.match(
    css,
    /\.cctv-sidebar-content \.now-playing-artwork img\.now-playing-artwork-shadow\s*\{[^}]*top:\s*calc\(100% \+ 5px\);[^}]*height:\s*42px;[^}]*opacity:\s*0\.8;[^}]*transform:\s*scaleY\(1\);[^}]*transform-origin:\s*center top;[^}]*transition:\s*transform 360ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);[^}]*will-change:\s*transform;[^}]*filter:\s*none;/s
  )
  assert.match(cctvArtworkReflection, /x1="40" y1="23\.5" x2="40" y2="84"/)
  assert.match(
    css,
    /\.cctv-sidebar-content \.now-playing-artwork:hover \.now-playing-artwork-shadow,\s*\.cctv-sidebar-content \.now-playing-artwork:focus-visible \.now-playing-artwork-shadow\s*\{[^}]*transform:\s*translateX\(-3\.75px\) rotateY\(-36deg\);/s
  )
})

test('changes only the Y-axis rotation of the now-playing artwork on hover', () => {
  assert.match(
    css,
    /\.cctv-sidebar-content \.now-playing-artwork\s*\{[^}]*perspective:\s*520px;[^}]*transform-style:\s*preserve-3d;[^}]*transform-origin:\s*center bottom;[^}]*transform:\s*perspective\(520px\) rotateY\(0deg\);/s
  )
  assert.match(
    css,
        /\.cctv-sidebar-content \.now-playing-artwork:hover\s*,\s*\.cctv-sidebar-content \.now-playing-artwork:focus-visible\s*\{[^}]*transform:\s*perspective\(520px\) rotateY\(18deg\);/s
  )
  const hoverRule = css.slice(css.indexOf('.cctv-sidebar-content .now-playing-artwork:hover'))
  assert.doesNotMatch(hoverRule.slice(0, hoverRule.indexOf('}')), /translate[XYZ]|rotateX|rotateZ/)
})

test('renders the CCTV back arrow in black', () => {
  assert.match(
    css,
    /\.cctv-overlay-back \.brand-mark svg (?:rect|path),\s*\.cctv-overlay-back \.brand-mark svg (?:path|rect)\s*\{[^}]*fill:\s*#282828;/s
  )
})

test('shows the Figma mosaic pattern controls', () => {
  const renderedControls = settingsPanel.slice(
    settingsPanel.indexOf('export function SettingsPanel')
  )

  assert.match(settingsPanel, />mosaic pattern</)
  assert.match(settingsPanel, /label="scale"/)
  assert.match(settingsPanel, /label="spacing"/)
  assert.doesNotMatch(settingsPanel, />shape</)
  assert.doesNotMatch(settingsPanel, /MOSAIC_SHAPE_PRESETS/)
  assert.match(settingsPanel, /min=\{0\}/)
  assert.doesNotMatch(
    renderedControls,
    />\s*(?:SETTINGS|RESET|Output Width|Character Set|ADJUSTMENTS|Brightness|Contrast|Saturation|Hue Rotation|Sharpness|Gamma|COLOR|Background|Intensity)\s*</
  )
})

test('styles the reference card and square-cornered filled-row controls', () => {
  assert.match(css, /\.palette-preset-preview\s*\{[^}]*aspect-ratio:\s*1;[^}]*background:\s*var\(--preset-background\);/s)
  assert.match(css, /\.palette-main-swatch\s*\{[^}]*border-radius:\s*50%;[^}]*background:\s*var\(--preset-main\);/s)
  assert.match(css, /\.compact-setting-row\s*\{[^}]*border-radius:\s*0;/s)
  assert.match(css, /\.compact-setting-fill\s*\{[^}]*width:\s*var\(--setting-fill\);/s)
})

test('uses the Figma CCTV frame as the desktop composition', () => {
  assert.match(experience, /className="stage-workspace cctv-layout"/)
  assert.match(experience, /className="visual-stage cctv-video-frame"/)
  assert.match(experience, /className="cctv-overlay-header"/)
  assert.match(experience, /className="cctv-overlay-back"/)
  assert.match(experience, /className="visual-stage-canvas cctv-stage-canvas"/)
  assert.match(experience, /className="control-deck cctv-control-deck"/)
  assert.doesNotMatch(experience, /className="visual-stage-header cctv-stage-header"/)
  assert.match(css, /\.experience-shell--cctv\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s+var\(--cctv-sidebar-width\);/s)
  assert.match(css, /\.experience-shell--cctv\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\);/s)
  assert.match(css, /\.experience-shell--cctv\s*\{[^}]*--cctv-sidebar-width:\s*clamp\(/s)
  assert.match(css, /\.experience-shell--cctv\s*>\s*\.stage-workspace\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s)
  assert.match(css, /\.cctv-video-frame\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s)
  assert.match(css, /\.cctv-stage-canvas\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;/s)
  assert.match(css, /\.experience-shell--cctv\s+\.cctv-control-deck\s*\{[^}]*display:\s*none;/s)
  assert.match(css, /\.cctv-overlay-header\s*\{[^}]*position:\s*absolute;/s)
  assert.match(css, /\.cctv-overlay-back\s*\{[^}]*position:\s*absolute;/s)
  assert.match(
    css,
    /\.cctv-overlay-back\s*\{[^}]*left:\s*14px;[^}]*bottom:\s*42px;[^}]*width:\s*24px;[^}]*height:\s*30px;/s
  )
  assert.match(css, /\.cctv-overlay-back \.brand-mark svg\s*\{[^}]*width:\s*24px;[^}]*height:\s*30px;/s)
})

test('keeps the four live CCTV controls inside the Figma sidebar order', () => {
  const sidebar = colorPanel
  assert.ok(sidebar.indexOf('now-playing-section') < sidebar.indexOf('house-layout-section'))
  assert.ok(sidebar.indexOf('house-layout-section') < sidebar.indexOf('palette-section'))
  assert.ok(sidebar.indexOf('palette-section') < sidebar.indexOf('mosaic-section'))
  assert.match(sidebar, />playing at</)
  assert.match(sidebar, /now-playing-progress/)
  assert.match(sidebar, /playing-at-spots/)
  assert.match(css, /\.experience-shell--cctv\s*>\s*\.color-panel\.sidebar-panel\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s)
  assert.match(css, /\.cctv-sidebar-content\s+\.now-playing-card\s*\{[^}]*width:\s*100%;/s)
})

test('gives playing-at labels breathing room before their eight-bar groups', () => {
  assert.match(
    css,
    /\.playing-at-row\s*\{[^}]*grid-template-columns:\s*6px auto auto;[^}]*justify-content:\s*start;[^}]*gap:\s*12px;/s
  )
})

test('makes the now-playing progress bar seekable by mouse and keyboard', () => {
  assert.match(colorPanel, /onSeek\?: \(time: number\) => void/)
  assert.match(colorPanel, /type="range"/)
  assert.match(colorPanel, /aria-label="재생 위치"/)
  assert.match(colorPanel, /onChange=\{\(event\) => onSeek\?\.\(Number\(event\.target\.value\)\)\}/)
  assert.match(experience, /onSeek=\{playback\.seek\}/)
  assert.match(playbackEngine, /const seek = useCallback\(/)
  assert.match(playbackEngine, /audio\.currentTime = target/)
  assert.match(css, /\.now-playing-progress-track\s*\{[^}]*appearance:\s*none;[^}]*cursor:\s*ew-resize;/s)
})

test('uses the Figma Technical Drawing artwork for the playing-at graphic', () => {
  assert.match(colorPanel, /className="playing-at-technical-drawing"/)
  assert.match(colorPanel, /figma-technical-drawing-m1\.svg/)
  assert.match(colorPanel, /figma-technical-drawing-o\.svg/)
  assert.match(colorPanel, /figma-technical-drawing-m2\.svg/)
  assert.match(colorPanel, /figma-technical-drawing-e\.svg/)
  assert.doesNotMatch(colorPanel, /className="playing-at-graphic" \/>/)
  assert.match(css, /\.playing-at-technical-drawing\s*\{[^}]*background:\s*transparent;/s)
  assert.match(css, /\.playing-at-technical-drawing-item img\s*\{[^}]*display:\s*block;/s)
})

test('renders the selected Technical Drawing union in the playing-at graphic slot', () => {
  assert.match(colorPanel, /technicalDrawingAssets/)
  assert.match(colorPanel, /activeTechnicalDrawing\.src/)
  assert.match(colorPanel, /className="playing-at-technical-drawing-item"/)
  assert.match(css, /\.playing-at-technical-drawing\s*\{[^}]*place-items:\s*center;/s)
  assert.match(css, /\.playing-at-technical-drawing-item\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center end;/s)
  assert.match(
    css,
    /\.playing-at-technical-drawing-item img\s*\{[^}]*width:\s*auto;[^}]*height:\s*var\(--technical-drawing-height\);[^}]*max-width:\s*none;[^}]*max-height:\s*var\(--technical-drawing-height\);[^}]*object-fit:\s*contain;/s
  )
  assert.match(css, /\.playing-at-technical-drawing\s*\{[^}]*--technical-drawing-height:\s*84px;/s)
  assert.match(css, /\.cctv-sidebar-content \.playing-at-content\s*\{[^}]*align-items:\s*center;/s)
  assert.doesNotMatch(css, /\.playing-at-technical-drawing-item img\s*\{[^}]*object-fit:\s*cover;/s)
})

test('maps the selected spot to the matching numbered Technical Drawing union', () => {
  assert.match(colorPanel, /technicalDrawingAssets\s*=\s*\[/)
  assert.match(colorPanel, /union:\s*'1'[\s\S]*figma-technical-drawing-o\.svg/)
  assert.match(colorPanel, /union:\s*'2'[\s\S]*figma-technical-drawing-m1\.svg/)
  assert.match(colorPanel, /union:\s*'3'[\s\S]*figma-technical-drawing-m2\.svg/)
  assert.match(colorPanel, /union:\s*'4'[\s\S]*figma-technical-drawing-e\.svg/)
  assert.match(colorPanel, /activeTechnicalDrawing\.src/)
  assert.match(colorPanel, /className="playing-at-technical-drawing-item"/)
  assert.doesNotMatch(colorPanel, /technicalDrawingAssets\.map\(/)
})

test('links each playing-at spot to its matching CCTV house selection', () => {
  assert.match(colorPanel, /selectedHouseId\?:\s*string/)
  assert.match(colorPanel, /houseId:\s*'house1'/)
  assert.match(colorPanel, /houseId:\s*'house2'/)
  assert.match(colorPanel, /houseId:\s*'house3'/)
  assert.match(colorPanel, /houseId:\s*'house4'/)
  assert.match(colorPanel, /href=\{`\$\{assetPath\('experience'\)\}\/\?house=\$\{spot\.houseId\}`\}/)
  assert.match(colorPanel, /active:\s*selectedHouseId === 'house1'/)
  assert.match(experience, /selectedHouseId=\{house\.id\}/)
})

test('keeps each CCTV feed looping so the live frame does not freeze at the end', () => {
  assert.match(experience, /<video[\s\S]*?\bloop\b/)
  assert.match(playbackEngine, /video\.loop\s*=\s*true/)
  assert.doesNotMatch(playbackEngine, /video\.loop\s*=\s*false/)
})

test('keeps the plain house 1 video free of the new CSS filter effect', () => {
  assert.doesNotMatch(experience, /getPixelPaletteVideoFilter/)
  assert.doesNotMatch(experience, /paletteVideoFilter/)
  assert.doesNotMatch(experience, /style=\{\{\s*filter:/)
  assert.doesNotMatch(css, /\.cctv-source-media\s*\{[^}]*filter:/s)
  assert.match(experience, /data-palette-id=\{paletteId\}/)
})

test('renders a dense waveform graphic from the full frequency spectrum', () => {
  assert.match(experience, /className="equalizer-waveform"/)
  assert.match(experience, /waveformPaths\.map\(/)
  assert.doesNotMatch(experience, /className="equalizer-bars"/)
  assert.doesNotMatch(experience, /waveformPathsFromBands\(/)
  assert.match(experience, /waveformPathFromSamples\(/)
  assert.match(experience, /playback\.waveformSamples/)
  assert.match(playbackEngine, /frequencyBandsFromData/)
  assert.match(playbackEngine, /setFrequencyBands\(nextBands\)/)
  assert.match(playbackEngine, /getByteTimeDomainData\(/)
  assert.match(playbackEngine, /setWaveformSamples\(/)
  assert.match(css, /\.equalizer-waveform path\s*\{[^}]*fill:\s*currentColor;/s)
  assert.match(css, /\.cctv-control-deck \.music-equalizer\s*\{[^}]*flex:\s*1;[^}]*width:\s*auto;/s)
  assert.match(css, /\.cctv-control-deck \.action-row\s*\{[^}]*padding:\s*0\s+0\s+0\s+44px;/s)
  assert.match(css, /\.cctv-control-deck \.equalizer-waveform\s*\{[^}]*width:\s*100%;[^}]*height:\s*30px;/s)
})
