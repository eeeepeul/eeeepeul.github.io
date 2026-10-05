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
const skin = readFileSync(new URL('../app/cctv-skin.css', import.meta.url), 'utf8')
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

test('shows four colour-combination swatches wired to the palette presets', () => {
  assert.match(colorPanel, />color combination</)
  assert.match(colorPanel, /--preset-background[^\n]*preset\.palette\.background/)
  assert.match(colorPanel, /--preset-main[^\n]*preset\.palette\.circle/)
  assert.match(colorPanel, /className="palette-main-swatch"/)
  assert.match(colorPanel, /onClick=\{\(\) => onSelect\(preset\.id\)\}/)
  assert.doesNotMatch(colorPanel, /preset-letter|--preset-diagonal|--preset-solid|--preset-glyph/)
})

test('marks the selected colour-combination swatch in red', () => {
  assert.match(colorPanel, /aria-pressed=\{selectedId === preset\.id\}/)
  assert.match(
    skin,
    /\.palette-preset\[aria-pressed="true"\] \.palette-preset-preview\s*\{[^}]*background:\s*var\(--cctv-red\);/s
  )
  assert.match(skin, /--cctv-red:\s*#770509;/)
})

test('renders the CCTV back arrow in red at the left end of the timeline', () => {
  assert.match(experience, /className="cctv-overlay-back"/)
  assert.match(skin, /\.cctv-overlay-back \.brand-mark svg \*\s*\{[^}]*fill:\s*var\(--cctv-red\);/s)
  assert.match(skin, /\.cctv-overlay-back\s*\{[^}]*position:\s*absolute;[^}]*left:/s)
})

test('shows the pattern controls', () => {
  const renderedControls = settingsPanel.slice(
    settingsPanel.indexOf('export function SettingsPanel')
  )

  assert.match(settingsPanel, />Pattern</)
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

test('styles the square swatches and the filled pattern rows', () => {
  assert.match(skin, /\.palette-preset-preview\s*\{[^}]*border-radius:\s*0;/s)
  assert.match(skin, /\.compact-setting-row\s*\{[^}]*border-radius:\s*0;/s)
  assert.match(skin, /\.compact-setting-fill\s*\{[^}]*width:\s*var\(--setting-fill, 0%\);/s)
})

test('lays the CCTV page out as the grey control room', () => {
  assert.match(experience, /className="stage-workspace cctv-layout"/)
  assert.match(experience, /className="cctv-topbar"/)
  assert.match(experience, /className="visual-stage cctv-video-frame"/)
  assert.match(experience, /className="cctv-breadcrumb"/)
  assert.match(experience, /className="visual-stage-canvas cctv-stage-canvas"/)
  assert.match(experience, /className="cctv-footerbar"/)
  assert.match(experience, /className="cctv-timeline-panel"/)
  assert.match(experience, /className="cctv-playhead"/)
  assert.match(experience, /className="cctv-hud"/)
  assert.doesNotMatch(experience, /cctv-thermal|cctv-overlay-header/)
  // Breadcrumb names the house on show.
  assert.match(experience, /<span>Country<\/span>/)
  assert.match(experience, /<span>CCTV A<\/span>/)
  // Two columns: the stage and a panel one pixel-of-the-design wide.
  assert.match(skin, /\.experience-shell\.experience-shell--cctv\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s+calc\(462 \* var\(--m\)\);/s)
  assert.match(skin, /--cctv-page:\s*#dddfde;/)
  assert.match(skin, /--cctv-panel:\s*#a7b0b0;/)
  assert.match(skin, /\.cctv-layout\s*\{[^}]*grid-template-rows:\s*63fr 847fr 118fr;/s)
  // The controls that were never part of the design stay hidden.
  assert.match(skin, /\.cctv-topbar-actions[^{]*\{[^}]*display:\s*none;/s)
})

test('draws the red crosshair and target box over the video without catching the pointer', () => {
  assert.match(skin, /\.cctv-hud\s*\{[^}]*pointer-events:\s*none;/s)
  assert.match(skin, /\.cctv-hud-line\s*\{[^}]*background:\s*var\(--cctv-red\);/s)
  assert.match(skin, /\.cctv-hud-ring\s*\{[^}]*border-radius:\s*50%;/s)
  assert.match(skin, /\.cctv-hud-target\s*\{[^}]*transform:\s*translate\(-50%, -50%\);/s)
  assert.match(skin, /\.cctv-hud-target\[data-tracking="lost"\]\s*\{[^}]*opacity:\s*0;/s)
})

test('keeps the sidebar panels in order with the live controls', () => {
  const sidebar = colorPanel
  assert.ok(sidebar.indexOf('now-playing-section') < sidebar.indexOf('house-layout-section'))
  assert.ok(sidebar.indexOf('house-layout-section') < sidebar.indexOf('palette-section'))
  assert.ok(sidebar.indexOf('palette-section') < sidebar.indexOf('mosaic-section'))
  assert.ok(sidebar.indexOf('mosaic-section') < sidebar.indexOf('track-info-section'))
  assert.match(sidebar, />Now playing</)
  assert.match(sidebar, />Playing at</)
  assert.match(sidebar, />Track info</)
  assert.match(sidebar, /now-playing-progress/)
  assert.match(sidebar, /playing-at-spots/)
  assert.match(skin, /\.experience-shell--cctv > \.color-panel\.sidebar-panel\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s)
  assert.match(skin, /\.panel-body\s*\{[^}]*border:\s*1px dashed/s)
})

test('wires the transport buttons, volume and track-info toggle', () => {
  assert.match(colorPanel, /className="transport-previous"[^>]*onClick=\{onPrevious\}/s)
  assert.match(colorPanel, /className="transport-play"[\s\S]*?onClick=\{onTogglePlayback\}/)
  assert.match(colorPanel, /className="transport-pause"[\s\S]*?onClick=\{onTogglePlayback\}/)
  assert.match(colorPanel, /className="transport-stop"[^>]*onClick=\{stop\}/s)
  assert.match(colorPanel, /className="transport-next"[^>]*onClick=\{onNext\}/s)
  assert.match(colorPanel, /onVolumeChange\?\.\(next\)/)
  assert.match(colorPanel, /aria-expanded=\{trackInfoOpen\}/)
  assert.match(experience, /onVolumeChange=\{handleVolumeChange\}/)
  assert.match(experience, /audio\.volume = /)
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

test('shows a full-size flipped, fading reflection of the album art', () => {
  assert.match(colorPanel, /className="now-playing-artwork-reflection"/)
  assert.match(colorPanel, /className="now-playing-artwork-face"/)
  // Same box as the art, flipped, fading downwards, sitting behind the other controls.
  assert.match(
    skin,
    /\.now-playing-artwork-reflection\s*\{[^}]*height:\s*100%;[^}]*z-index:\s*-1;[^}]*mask-image:\s*linear-gradient\(to top[^}]*transform:\s*scaleY\(-1\) perspective\(calc\(475 \* var\(--m\)\)\) rotateY\(0deg\);/s
  )
  assert.match(skin, /\.now-playing-card\s*\{[^}]*isolation:\s*isolate;/s)
  // A small gap at rest.
  assert.match(skin, /\.now-playing-artwork-reflection\s*\{[^}]*top:\s*calc\(100% \+ 6\.4 \* var\(--m\)\);/s)
})

test('on hover the art and its reflection turn together about their centre line', () => {
  assert.match(
    skin,
    /\.now-playing-artwork-face\s*\{[^}]*transform:\s*perspective\(calc\(475 \* var\(--m\)\)\) rotateY\(0deg\);/s
  )
  assert.match(skin, /transform-origin:\s*50% 50%;/)
  assert.match(
    skin,
    /\.now-playing-artwork:hover \.now-playing-artwork-face\s*\{[^}]*rotateY\(11deg\)/s
  )
  // Positive rotateY brings the left edge forward. The reflection turns the same way,
  // and its gap closes so the two meet in an X.
  assert.match(
    skin,
    /\.now-playing-artwork:hover \.now-playing-artwork-reflection\s*\{[^}]*top:\s*94%;[^}]*scaleY\(-1\) scale\(0\.94\) perspective\(calc\(475 \* var\(--m\)\)\) rotateY\(11deg\)/s
  )
})
