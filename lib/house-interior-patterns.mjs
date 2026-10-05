const freeze = (value) => Object.freeze(value)

export const HOUSE_INTERIOR_PATTERN_PERIOD = 8

const PATTERN_BY_TILE_ID = freeze({
  bed: freeze({ color: 'blue', motif: 'diagonal' }),
  bookcase: freeze({ color: 'blue', motif: 'grid' }),
  console: freeze({ color: 'blue', motif: 'grid' }),
  counter: freeze({ color: 'blue', motif: 'grid' }),
  desk: freeze({ color: 'blue', motif: 'grid' }),
  'door-blue': freeze({ color: 'blue', motif: 'plus' }),
  'door-coral': freeze({ color: 'coral', motif: 'plus' }),
  'rug-blue': freeze({ color: 'blue', motif: 'diagonal' }),
  'rug-coral': freeze({ color: 'coral', motif: 'diagonal' }),
  'sofa-blue': freeze({ color: 'blue', motif: 'crosshatch' }),
  'sofa-slate': freeze({ color: 'blue', motif: 'crosshatch' }),
  'window-blue': freeze({ color: 'blue', motif: 'grid' }),
})

export const resolveHouseInteriorPattern = (tileId) =>
  PATTERN_BY_TILE_ID[tileId] ?? null

const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor

export const isHouseInteriorPatternPixel = (motif, x, y) => {
  const localX = positiveModulo(x, HOUSE_INTERIOR_PATTERN_PERIOD)
  const localY = positiveModulo(y, HOUSE_INTERIOR_PATTERN_PERIOD)

  if (motif === 'diagonal') {
    return positiveModulo(x + y, HOUSE_INTERIOR_PATTERN_PERIOD) <= 1
  }
  if (motif === 'crosshatch') {
    return (
      positiveModulo(x + y, HOUSE_INTERIOR_PATTERN_PERIOD) <= 1 ||
      positiveModulo(x - y, HOUSE_INTERIOR_PATTERN_PERIOD) <= 1
    )
  }
  if (motif === 'grid') {
    return localX <= 1 || localY <= 1
  }
  if (motif === 'plus') {
    const distanceX = Math.abs(localX - HOUSE_INTERIOR_PATTERN_PERIOD / 2)
    const distanceY = Math.abs(localY - HOUSE_INTERIOR_PATTERN_PERIOD / 2)
    return (distanceX === 0 && distanceY <= 2) || (distanceY === 0 && distanceX <= 2)
  }
  return false
}
