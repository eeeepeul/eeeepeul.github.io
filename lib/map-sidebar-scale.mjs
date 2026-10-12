export const MAP_SIDEBAR_REFERENCE_WIDTH = 1920
export const MAP_SIDEBAR_REFERENCE_HEIGHT = 1048
// Includes the scaled map cards, footer heatmap, inter-section gap, and browser
// zoom rounding observed at the narrowest supported viewport.
export const MAP_SIDEBAR_CONTENT_HEIGHT = 1076
export const MAP_SIDEBAR_PANEL_WIDTH = 260
export const MAP_SIDEBAR_CONTENT_WIDTH = 287

const DESKTOP_INSET = 14
const MOBILE_INSET = 12
const MOBILE_BREAKPOINT = 800

function finiteDimension(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function getMapSidebarScale({ width, height } = {}) {
  const viewportWidth = finiteDimension(width)
  const viewportHeight = finiteDimension(height)
  const isMobile = viewportWidth <= MOBILE_BREAKPOINT
  const inset = isMobile ? MOBILE_INSET : DESKTOP_INSET
  const availableHeight = Math.max(0, viewportHeight - inset * 2)
  const widthScale = isMobile
    ? Math.max(0, viewportWidth - inset * 2) / MAP_SIDEBAR_PANEL_WIDTH
    : viewportWidth / MAP_SIDEBAR_REFERENCE_WIDTH
  const heightScale = availableHeight / MAP_SIDEBAR_REFERENCE_HEIGHT

  return Number(Math.min(1, widthScale, heightScale).toFixed(4))
}

export function getMapSidebarLayout(viewport = {}) {
  const viewportWidth = finiteDimension(viewport.width)
  const viewportHeight = finiteDimension(viewport.height)
  const scale = getMapSidebarScale(viewport)
  const inset = viewportWidth <= MOBILE_BREAKPOINT ? MOBILE_INSET : DESKTOP_INSET
  const availableHeight = Math.max(0, viewportHeight - inset * 2)
  const contentScale = Math.min(scale, availableHeight / MAP_SIDEBAR_CONTENT_HEIGHT)

  return {
    scale,
    panelWidth: `${Number((MAP_SIDEBAR_PANEL_WIDTH * scale).toFixed(4))}px`,
    contentZoom: Number(
      ((MAP_SIDEBAR_PANEL_WIDTH / MAP_SIDEBAR_CONTENT_WIDTH) * contentScale).toFixed(4)
    ),
    inset: `${inset}px`,
  }
}
