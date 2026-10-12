import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

import { drawPixelScene } from '../components/site/HouseInteriorTilemap.mjs'
import {
  HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT,
  HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH,
} from '../lib/house-interior-pixel-art.mjs'

const rectangles = []
const context = {
  fillStyle: '#ffffff',
  imageSmoothingEnabled: false,
  setTransform() {},
  clearRect() {},
  fillRect(x, y, width, height) {
    rectangles.push({ color: this.fillStyle, x, y, width, height })
  },
}

drawPixelScene(context)

const rectangleMarkup = rectangles
  .map(
    ({ color, x, y, width, height }) =>
      `<rect fill="${color}" x="${x}" y="${y}" width="${width}" height="${height}"/>`
  )
  .join('')
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH}" height="${HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT}" viewBox="0 0 ${HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH} ${HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT}">${rectangleMarkup}</svg>`
)
const outputPath = new URL('../public/media/house-interior-poster.png', import.meta.url)
const png = await sharp(svg, { density: 72 })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer()

await writeFile(outputPath, png)
