import test from 'node:test'
import assert from 'node:assert/strict'
import { waveformPathFromSamples, waveformPathsFromBands } from '../lib/waveform.mjs'

test('builds several animated waveform paths from the frequency bands', () => {
  const paths = waveformPathsFromBands(
    [0.12, 0.3, 0.75, 0.45, 0.2, 0.8, 0.55, 0.25, 0.18, 0.5, 0.7, 0.35],
    6,
    96,
    0.25
  )

  assert.equal(paths.length, 6)
  assert.ok(paths.every((path) => path.startsWith('M ')))
  assert.ok(paths.every((path) => path.split(' L ').length > 80))
  assert.notDeepEqual(
    waveformPathsFromBands([0.12, 0.3, 0.75], 6, 96, 0),
    waveformPathsFromBands([0.12, 0.3, 0.75], 6, 96, 0.5)
  )
})

test('renders each track as a filled waveform silhouette instead of a hairline', () => {
  const paths = waveformPathsFromBands(Array(12).fill(0.8), 6, 96, 0.25)

  assert.ok(paths.every((path) => path.endsWith(' Z')))
  assert.ok(paths.some((path) => path.split(' L ').length > 180))
})

test('builds one continuous waveform silhouette from time-domain audio samples', () => {
  const samples = Array.from({ length: 256 }, (_, index) => {
    const envelope = 0.08 + Math.abs(Math.sin(index * 0.09)) * 0.38
    return 0.5 + Math.sin(index * 2.7) * envelope
  })
  const path = waveformPathFromSamples(samples, 240)
  const yValues = [...path.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]))

  assert.ok(path.startsWith('M '))
  assert.ok(path.endsWith(' Z'))
  assert.ok(path.split(' L ').length > 400)
  assert.ok(Math.max(...yValues) - Math.min(...yValues) > 18)
})

test('keeps waveform geometry stable for missing or invalid band input', () => {
  const paths = waveformPathsFromBands(null, 6, 96, 0)

  assert.equal(paths.length, 6)
  assert.ok(paths.every((path) => path.startsWith('M ')))
})

test('keeps each waveform track inside its own visual lane', () => {
  const paths = waveformPathsFromBands(Array(12).fill(1), 6, 96, 0.25)

  paths.forEach((path, track) => {
    const baseline = ((track + 0.5) / paths.length) * 72
    const yValues = [...path.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]))
    const excursion = Math.max(...yValues.map((value) => Math.abs(value - baseline)))
    assert.ok(excursion <= 5.9, `track ${track} escaped its lane by ${excursion}`)
  })
})
