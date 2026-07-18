import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const required = [
  'out/index.html',
  'out/media/cctv-1080p.mp4',
  'out/media/if-and-only-if.mp3',
]
const forbidden = ['EPEUL', 'MH:M', '/api/newsletter']
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml'])

function collectTextFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectTextFiles(target)
    return textExtensions.has(path.extname(entry.name)) ? [target] : []
  })
}

for (const file of required) {
  if (!existsSync(file) || statSync(file).size === 0) {
    throw new Error(`Required static export is missing or empty: ${file}`)
  }
}

for (const file of collectTextFiles('out')) {
  const content = readFileSync(file, 'utf8')
  for (const marker of forbidden) {
    if (content.includes(marker)) throw new Error(`Forbidden legacy marker ${marker} found in ${file}`)
  }
}

console.log('Static export verified')
