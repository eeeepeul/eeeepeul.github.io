const HOUSE_VIDEO_FILES = Object.freeze([
  'media/CCTV-1.mp4',
  'media/mosaic-02.mp4',
  'media/mosaic-03.mp4',
  'media/cctv-1080p.mp4',
])

export const CCTV_HOUSES = Object.freeze(
  HOUSE_VIDEO_FILES.map((videoSrc, index) => {
    const number = index + 1
    return Object.freeze({
      id: `house${number}`,
      label: `house ${number}`,
      title: `House ${number} CCTV`,
      videoSrc,
    })
  })
)

export function normalizeHouseId(value) {
  const candidate = typeof value === 'string' ? value.toLowerCase() : ''
  return CCTV_HOUSES.some((house) => house.id === candidate) ? candidate : CCTV_HOUSES[0].id
}

export function getCctvHouse(value) {
  const id = normalizeHouseId(value)
  return CCTV_HOUSES.find((house) => house.id === id) ?? CCTV_HOUSES[0]
}
