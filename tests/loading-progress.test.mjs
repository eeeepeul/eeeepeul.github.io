import test from 'node:test'
import assert from 'node:assert/strict'
import { LOADING_BLOCKS, LOADING_MIN_MS, getFilledBlocks, getLoadingProgress } from '../lib/loading-progress.mjs'

test('the loading bar fills toward 90% over its minimum time and waits there for the job', () => {
  assert.equal(getLoadingProgress(0, false), 0)
  assert.ok(Math.abs(getLoadingProgress(LOADING_MIN_MS / 2, false) - 0.45) < 1e-9)
  assert.equal(getLoadingProgress(LOADING_MIN_MS, false), 0.9)
  assert.equal(getLoadingProgress(LOADING_MIN_MS * 5, false), 0.9)
})

test('the loading bar is full only when the job has finished and the minimum time has passed', () => {
  assert.equal(getLoadingProgress(LOADING_MIN_MS - 1, true) < 1, true)
  assert.equal(getLoadingProgress(LOADING_MIN_MS, true), 1)
})

test('the blocks of the bar are lit from the left as the share grows', () => {
  assert.equal(getFilledBlocks(0), 0)
  assert.equal(getFilledBlocks(0.5), LOADING_BLOCKS / 2)
  assert.equal(getFilledBlocks(0.9), Math.floor(0.9 * LOADING_BLOCKS))
  assert.equal(getFilledBlocks(1), LOADING_BLOCKS)
})
