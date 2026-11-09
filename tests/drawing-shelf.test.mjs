import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SEED_DRAWINGS,
  SHELF_LIMIT,
  getGallery,
  getSelectedDrawing,
  resetGallery,
  saveDrawing,
  selectDrawing,
} from '../lib/drawing-gallery.mjs'
import {
  createSharedDrawingStore,
  isDrawingAspect,
  isDrawingImage,
  normalizeDrawingRow,
} from '../lib/shared-drawings.mjs'
import { SHELF_COLUMNS, shelfCellCount } from '../components/site/StageDrawingShelf.mjs'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

test('the shelf starts with the 16 supplied doodles', () => {
  resetGallery()
  assert.equal(SEED_DRAWINGS.length, 16)
  assert.equal(getGallery().drawings.length, 16)
  assert.ok(getGallery().drawings.every((drawing) => drawing.seed && drawing.src.startsWith('/media/drawings/seed-')))
})

test('a saved drawing goes first on the shelf, before the supplied doodles', () => {
  resetGallery()
  const saved = saveDrawing(PNG, 0.5)
  const { drawings } = getGallery()
  assert.equal(drawings[0].id, saved.id)
  assert.equal(drawings[0].aspect, 0.5)
  assert.equal(drawings.length, 17)
  saveDrawing('data:image/png;base64,AAAA', 2)
  assert.equal(getGallery().drawings.length, 18)
  assert.ok(getGallery().drawings.length <= SHELF_LIMIT)
})

test('a drawing is chosen by pressing it, and let go by pressing it again', () => {
  resetGallery()
  const [first, second] = getGallery().drawings
  selectDrawing(first.id)
  assert.equal(getSelectedDrawing().id, first.id)
  selectDrawing(second.id)
  assert.equal(getSelectedDrawing().id, second.id)
  selectDrawing(second.id)
  assert.equal(getSelectedDrawing(), null)
})

test('saving sends the drawing to the shared store when there is one', async () => {
  resetGallery()
  const sent = []
  saveDrawing(PNG, 1.5, { recordDrawing: async (drawing) => sent.push(drawing) })
  assert.deepEqual(sent, [{ image: PNG, aspect: 1.5 }])
})

test('drawings from the shared store are read only when they are real PNG pictures of a sane proportion', () => {
  assert.ok(isDrawingImage(PNG))
  assert.ok(!isDrawingImage('https://example.com/x.png'))
  assert.ok(!isDrawingImage(`data:image/png;base64,${'A'.repeat(300_001)}`))
  assert.ok(isDrawingAspect(1) && !isDrawingAspect(0) && !isDrawingAspect(500) && !isDrawingAspect(NaN))
  assert.equal(normalizeDrawingRow({ id: 5, created_at: '2026-11-09T00:00:00Z', image: PNG, aspect: 2 }).id, 'shared-5')
  assert.equal(normalizeDrawingRow({ id: 5, created_at: '2026-11-09T00:00:00Z', image: 'javascript:alert(1)', aspect: 2 }), null)
})

test('the shared store saves, loads the newest first and listens for new drawings', async () => {
  const calls = []
  const rows = [{ id: 2, created_at: '2026-11-09T00:00:02Z', image: PNG, aspect: 1 }]
  const query = {
    insert(row) { calls.push(['insert', row]); return query },
    select(columns) { calls.push(['select', columns]); return query },
    order(column, options) { calls.push(['order', column, options]); return query },
    limit(count) { calls.push(['limit', count]); return Promise.resolve({ data: rows, error: null }) },
    single() { return Promise.resolve({ data: rows[0], error: null }) },
  }
  const client = { from: () => query, channel: () => ({ on() { return this }, subscribe() { return this } }), removeChannel: async () => {} }
  const store = createSharedDrawingStore(client)
  const drawing = await store.recordDrawing({ image: PNG, aspect: 1 })
  assert.equal(drawing.id, 'shared-2')
  const loaded = await store.loadDrawings({ limit: 10 })
  assert.equal(loaded.length, 1)
  assert.ok(calls.some((call) => call[0] === 'order' && call[1] === 'id' && call[2].ascending === false))
  await assert.rejects(store.recordDrawing({ image: 'nope', aspect: 1 }), TypeError)
})

test('the shelf is ruled into cells of four across, in whole rows, never fewer than the box shows', () => {
  assert.equal(shelfCellCount(0), 16)
  assert.equal(shelfCellCount(16), 16)
  assert.equal(shelfCellCount(17), 20)
  assert.equal(shelfCellCount(40), 40)
  assert.equal(SHELF_COLUMNS, 4)
})
