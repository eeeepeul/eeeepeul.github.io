export const HOUSE_COUNT = 4
export const HOUSE_DISTANCE_MIN = 8_000
export const HOUSE_DISTANCE_MAX = 18_000
const HOUSE_WHEEL_RATIO = 0.4

function normalizeHouseCount(houseCount) {
  return Math.max(1, Math.floor(Number(houseCount) || HOUSE_COUNT))
}

export function advanceHouse(index, direction, houseCount = HOUSE_COUNT) {
  const count = normalizeHouseCount(houseCount)
  const current = Math.floor(Number(index) || 0)
  const step = Math.sign(Number(direction) || 0)
  return (((current + step) % count) + count) % count
}

export function getHousePair(index, houseCount = HOUSE_COUNT) {
  const count = normalizeHouseCount(houseCount)
  const current = advanceHouse(index, 0, count)
  const next = advanceHouse(current, 1, count)

  return {
    from: `house${current + 1}`,
    to: `house${next + 1}`,
  }
}

export function getHouseWindow(index, houseCount = HOUSE_COUNT) {
  const count = normalizeHouseCount(houseCount)
  const current = advanceHouse(index, 0, count)

  return {
    previous: advanceHouse(current, -1, count),
    current,
    next: advanceHouse(current, 1, count),
  }
}

export function settleHouseDrag(index, offset, trackWidth = 261, houseCount = HOUSE_COUNT) {
  const width = Math.max(1, Math.abs(Number(trackWidth) || 261))
  const boundedOffset = Math.max(-width, Math.min(width, Number(offset) || 0))

  if (boundedOffset <= -width) {
    return { houseIndex: advanceHouse(index, 1, houseCount), offset: 0 }
  }
  if (boundedOffset >= width) {
    return { houseIndex: advanceHouse(index, -1, houseCount), offset: 0 }
  }

  return {
    houseIndex: advanceHouse(index, 0, houseCount),
    offset: boundedOffset,
  }
}

export function scrollHousePosition(
  index,
  offset,
  deltaY,
  trackWidth = 261,
  houseCount = HOUSE_COUNT
) {
  const width = Math.max(1, Math.abs(Number(trackWidth) || 261))
  const wheelMovement = Math.max(-width, Math.min(width, (Number(deltaY) || 0) * HOUSE_WHEEL_RATIO))
  let houseIndex = advanceHouse(index, 0, houseCount)
  let nextOffset = (Number(offset) || 0) - wheelMovement

  if (nextOffset <= -width) {
    nextOffset += width
    houseIndex = advanceHouse(houseIndex, 1, houseCount)
  } else if (nextOffset >= width) {
    nextOffset -= width
    houseIndex = advanceHouse(houseIndex, -1, houseCount)
  }

  return {
    houseIndex,
    offset: Number(nextOffset.toFixed(4)),
  }
}

export function createHouseDistances(random = Math.random) {
  return Array.from({ length: HOUSE_COUNT }, () => {
    const sample = Number(random())
    const normalizedSample = Number.isFinite(sample) ? Math.min(1, Math.max(0, sample)) : 0
    return Math.round(
      HOUSE_DISTANCE_MIN + normalizedSample * (HOUSE_DISTANCE_MAX - HOUSE_DISTANCE_MIN)
    )
  })
}

export function scaleHouseDistance(distance, distances) {
  const finiteDistances = Array.isArray(distances)
    ? distances.map(Number).filter(Number.isFinite)
    : []
  const minimum = finiteDistances.length ? Math.min(...finiteDistances) : HOUSE_DISTANCE_MIN
  const maximum = finiteDistances.length ? Math.max(...finiteDistances) : HOUSE_DISTANCE_MAX

  if (maximum === minimum) return 0.84

  const normalized = Math.min(1, Math.max(0, (Number(distance) - minimum) / (maximum - minimum)))
  return Number((0.68 + normalized * 0.32).toFixed(4))
}
