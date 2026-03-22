import { describe, it, expect, vi } from 'vitest'
import { HistoryManager } from './history'
import type { Cell } from '../engine/types'

function cells(...coords: [number, number][]): Cell[] {
  return coords.map(([x, y]) => ({ x, y }))
}

function makeCellsGetter(initial: Cell[]): () => Promise<Cell[]> {
  return vi.fn().mockResolvedValue(initial)
}

describe('HistoryManager', () => {
  // ── push ───────────────────────────────────────────────────────────────

  it('canUndo() is false when no snapshot has been pushed', () => {
    const h = new HistoryManager()
    expect(h.canUndo()).toBe(false)
  })

  it('canUndo() is true after a snapshot is pushed', () => {
    const h = new HistoryManager()
    h.push(cells([0, 0]))
    expect(h.canUndo()).toBe(true)
  })

  it('push stores a copy — mutations to the original array do not affect the snapshot', () => {
    const h = new HistoryManager()
    const snapshot = cells([0, 0])
    h.push(snapshot)
    snapshot.push({ x: 99, y: 99 })

    const setCells = vi.fn()
    h.undo(makeCellsGetter([]), setCells)
    return Promise.resolve().then(() => {
      expect(setCells).toHaveBeenCalledWith(cells([0, 0]))
    })
  })

  it('push clears the redo stack', async () => {
    const h = new HistoryManager()
    h.push(cells([0, 0]))

    const setCells = vi.fn()
    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(h.canRedo()).toBe(true)

    // New operation should clear redo
    h.push(cells([1, 1]))
    expect(h.canRedo()).toBe(false)
  })

  it('respects maxSize by evicting the oldest snapshot', async () => {
    const h = new HistoryManager(3)
    h.push(cells([0, 0])) // evicted when 4th is pushed
    h.push(cells([1, 0]))
    h.push(cells([2, 0]))
    h.push(cells([3, 0])) // stack is now [[1,0],[2,0],[3,0]]

    const setCells = vi.fn()

    // 1st undo: pops [3,0]
    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).toHaveBeenLastCalledWith(cells([3, 0]))

    // 2nd undo: pops [2,0]
    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).toHaveBeenLastCalledWith(cells([2, 0]))

    // 3rd undo: pops [1,0]
    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).toHaveBeenLastCalledWith(cells([1, 0]))

    // 4th undo should be a no-op (stack only had 3 entries after eviction)
    const callCount = setCells.mock.calls.length
    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells.mock.calls.length).toBe(callCount)
  })

  // ── undo ──────────────────────────────────────────────────────────────

  it('undo restores the previous cell state', async () => {
    const h = new HistoryManager()
    const before = cells([0, 0])
    h.push(before)

    const setCells = vi.fn()
    h.undo(makeCellsGetter(cells([0, 0], [1, 0])), setCells)
    await Promise.resolve()

    expect(setCells).toHaveBeenCalledWith(before)
  })

  it('undo is a no-op when the stack is empty', async () => {
    const h = new HistoryManager()
    const setCells = vi.fn()
    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('undo pushes current state onto the redo stack', async () => {
    const h = new HistoryManager()
    h.push(cells([0, 0]))

    const current = cells([0, 0], [1, 0])
    const setCells = vi.fn()
    h.undo(makeCellsGetter(current), setCells)
    await Promise.resolve()

    expect(h.canRedo()).toBe(true)
  })

  it('multiple undos traverse the stack in LIFO order', async () => {
    const h = new HistoryManager()
    h.push(cells([0, 0]))
    h.push(cells([1, 0]))
    h.push(cells([2, 0]))

    const setCells = vi.fn()

    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).toHaveBeenLastCalledWith(cells([2, 0]))

    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).toHaveBeenLastCalledWith(cells([1, 0]))

    h.undo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).toHaveBeenLastCalledWith(cells([0, 0]))
  })

  // ── redo ──────────────────────────────────────────────────────────────

  it('canRedo() is false initially', () => {
    const h = new HistoryManager()
    expect(h.canRedo()).toBe(false)
  })

  it('redo restores the state that was undone', async () => {
    const h = new HistoryManager()
    const before = cells([0, 0])
    const after = cells([0, 0], [1, 0])

    h.push(before)

    const setCells = vi.fn()
    // Undo: go from `after` back to `before`
    h.undo(makeCellsGetter(after), setCells)
    await Promise.resolve()

    setCells.mockClear()

    // Redo: go from `before` forward to `after`
    h.redo(makeCellsGetter(before), setCells)
    await Promise.resolve()

    expect(setCells).toHaveBeenCalledWith(after)
  })

  it('redo is a no-op when the redo stack is empty', async () => {
    const h = new HistoryManager()
    const setCells = vi.fn()
    h.redo(makeCellsGetter([]), setCells)
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('redo pushes state onto undo stack so a further undo works', async () => {
    const h = new HistoryManager()
    h.push(cells([0, 0]))

    const setCells = vi.fn()
    h.undo(makeCellsGetter(cells([0, 0], [1, 0])), setCells)
    await Promise.resolve()

    h.redo(makeCellsGetter(cells([0, 0])), setCells)
    await Promise.resolve()

    expect(h.canUndo()).toBe(true)
  })

  // ── clear ─────────────────────────────────────────────────────────────

  it('clear resets both stacks', async () => {
    const h = new HistoryManager()
    h.push(cells([0, 0]))
    h.push(cells([1, 0]))
    h.undo(makeCellsGetter([]), vi.fn())
    await Promise.resolve()

    h.clear()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
  })
})
