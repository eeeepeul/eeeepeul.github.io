// Finds the moving subject in a fixed CCTV clip and writes where it is over time,
// so the red target box on the CCTV page can follow it without running any
// detection in the browser.
//
//   FFMPEG=/path/to/ffmpeg node scripts/build-motion-track.mjs <video> <out.json> [from-to,...]
//
// The optional last argument lists stretches (seconds) in which the subject is hidden
// behind something (a door swinging open) and the box should not be shown.
//
// The clips are fixed overhead shots, so the background is the per-pixel median of
// the whole clip and the subject is the biggest blob that differs from it.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [video, output, hiddenArgument = ''] = process.argv.slice(2)
const hidden = hiddenArgument
  .split(',')
  .filter(Boolean)
  .map((range) => range.split('-').map(Number))
if (!video || !output) {
  console.error('usage: node scripts/build-motion-track.mjs <video> <out.json>')
  process.exit(1)
}
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FPS = 10
const W = 320
const H = 180

function readFrames() {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-i', video,
      '-vf', `fps=${FPS},scale=${W}:${H},format=gray`,
      '-f', 'rawvideo', '-',
    ])
    const chunks = []
    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited with ${code}`))
      const data = Buffer.concat(chunks)
      const size = W * H
      const frames = []
      for (let offset = 0; offset + size <= data.length; offset += size) {
        frames.push(data.subarray(offset, offset + size))
      }
      resolve(frames)
    })
  })
}

function median(values) {
  const sorted = Uint8Array.from(values).sort()
  return sorted[sorted.length >> 1]
}

function blobs(mask) {
  const seen = new Uint8Array(W * H)
  const found = []
  for (let start = 0; start < W * H; start += 1) {
    if (!mask[start] || seen[start]) continue
    const stack = [start]
    seen[start] = 1
    let area = 0
    let sumX = 0
    let sumY = 0
    let x0 = W
    let y0 = H
    let x1 = 0
    let y1 = 0
    while (stack.length) {
      const index = stack.pop()
      const x = index % W
      const y = (index - x) / W
      area += 1
      sumX += x
      sumY += y
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      for (const next of [index - 1, index + 1, index - W, index + W]) {
        if (next < 0 || next >= W * H) continue
        if ((next === index - 1 && x === 0) || (next === index + 1 && x === W - 1)) continue
        if (mask[next] && !seen[next]) {
          seen[next] = 1
          stack.push(next)
        }
      }
    }
    found.push({ area, cx: sumX / area, cy: sumY / area, x0, y0, x1, y1 })
  }
  return found
}

function open(mask) {
  // Erode then dilate with a plus-shaped element to drop single-pixel noise.
  const eroded = new Uint8Array(W * H)
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x
      eroded[i] = mask[i] && mask[i - 1] && mask[i + 1] && mask[i - W] && mask[i + W] ? 1 : 0
    }
  }
  const dilated = new Uint8Array(W * H)
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x
      dilated[i] = eroded[i] || eroded[i - 1] || eroded[i + 1] || eroded[i - W] || eroded[i + W] ? 1 : 0
    }
  }
  return dilated
}

const frames = await readFrames()
const background = new Uint8Array(W * H)
const column = new Uint8Array(frames.length)
for (let pixel = 0; pixel < W * H; pixel += 1) {
  for (let f = 0; f < frames.length; f += 1) column[f] = frames[f][pixel]
  background[pixel] = median(column)
}

// A person is small in these overhead shots; anything bigger is a door, a gate or a
// light change, not the subject.
const MIN_AREA = 14
const MAX_WIDTH = W * 0.2
const MAX_HEIGHT = H * 0.38
// A person is a solid blob; a door or gate frame is a thin outline (low fill, long
// and narrow), which is what these limits keep out.
const MIN_FILL = 0.34
const MAX_ASPECT = 2.6
const THRESHOLD = 46
const MAX_JUMP = 70
let previous = null
const track = []
for (let f = 0; f < frames.length; f += 1) {
  const mask = new Uint8Array(W * H)
  for (let pixel = 0; pixel < W * H; pixel += 1) {
    mask[pixel] = Math.abs(frames[f][pixel] - background[pixel]) > THRESHOLD ? 1 : 0
  }
  const candidates = blobs(open(mask)).filter(
    (blob) =>
      blob.area >= MIN_AREA &&
      blob.x1 - blob.x0 <= MAX_WIDTH &&
      blob.y1 - blob.y0 <= MAX_HEIGHT &&
      blob.area / ((blob.x1 - blob.x0 + 1) * (blob.y1 - blob.y0 + 1)) >= MIN_FILL &&
      Math.max(blob.x1 - blob.x0 + 1, blob.y1 - blob.y0 + 1) /
        Math.min(blob.x1 - blob.x0 + 1, blob.y1 - blob.y0 + 1) <=
        MAX_ASPECT
  )
  // Prefer the biggest blob, but stay with the one nearest the last position.
  let pick = null
  for (const blob of candidates) {
    const near = previous ? Math.hypot(blob.cx - previous.cx, blob.cy - previous.cy) < MAX_JUMP : true
    const score = blob.area * (near ? 3 : 1)
    if (!pick || score > pick.score) pick = { ...blob, score }
  }
  track.push(pick ? { time: f / FPS, ...pick } : { time: f / FPS, lost: true })
  if (pick) previous = pick
}

// Smooth the box (it should glide, not jitter) and drop one-frame blips.
const smoothed = []
let box = null
let lostFrames = 0
for (const entry of track) {
  if (entry.lost) {
    lostFrames += 1
    smoothed.push({ time: entry.time, visible: lostFrames <= 4 && box !== null, box })
    continue
  }
  const target = {
    x: (entry.x0 + entry.x1) / 2 / W,
    y: (entry.y0 + entry.y1) / 2 / H,
    w: Math.max(0.07, ((entry.x1 - entry.x0) / W) * 1.5),
    h: Math.max(0.12, ((entry.y1 - entry.y0) / H) * 1.5),
  }
  lostFrames = 0
  const gain = box ? 0.55 : 1
  box = box
    ? {
        x: box.x + (target.x - box.x) * gain,
        y: box.y + (target.y - box.y) * gain,
        w: box.w + (target.w - box.w) * gain,
        h: box.h + (target.h - box.h) * gain,
      }
    : target
  smoothed.push({ time: entry.time, visible: true, box: { ...box } })
}

for (const entry of smoothed) {
  if (hidden.some(([from, to]) => entry.time >= from && entry.time <= to)) {
    entry.visible = false
    box = null
  }
}

const round = (value) => Math.round(value * 10000) / 10000
const samples = smoothed.map((entry) => [
  round(entry.time),
  entry.visible ? 1 : 0,
  ...(entry.box ? [round(entry.box.x), round(entry.box.y), round(entry.box.w), round(entry.box.h)] : [0, 0, 0, 0]),
])
writeFileSync(
  output,
  JSON.stringify({ fps: FPS, columns: ['time', 'visible', 'x', 'y', 'w', 'h'], samples })
)
const visible = samples.filter((sample) => sample[1]).length
console.log(`${video}: ${samples.length} frames, subject found in ${visible}`)
