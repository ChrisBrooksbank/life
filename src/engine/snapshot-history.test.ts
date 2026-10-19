import { describe, it, expect } from 'vitest'
import { SnapshotHistory } from './snapshot-history'

describe('SnapshotHistory — basics', () => {
  it('starts empty', () => {
    const h = new SnapshotHistory()
    expect(h.size).toBe(0)
    expect(h.canRewind).toBe(false)
    expect(h.snapshots).toHaveLength(0)
  })

  it('push adds a snapshot', () => {
    const h = new SnapshotHistory()
    h.push(5, [{ x: 0, y: 0 }])
    expect(h.size).toBe(1)
    expect(h.canRewind).toBe(true)
  })

  it('get returns snapshot at given index', () => {
    const h = new SnapshotHistory()
    h.push(10, [{ x: 1, y: 2 }])
    const s = h.get(0)
    expect(s?.generation).toBe(10)
    expect(s?.cells).toEqual([{ x: 1, y: 2 }])
  })

  it('get returns undefined for out-of-range index', () => {
    const h = new SnapshotHistory()
    expect(h.get(0)).toBeUndefined()
    expect(h.get(99)).toBeUndefined()
  })

  it('snapshots are stored oldest-first', () => {
    const h = new SnapshotHistory()
    h.push(1, [])
    h.push(2, [])
    h.push(3, [])
    expect(h.snapshots[0]!.generation).toBe(1)
    expect(h.snapshots[2]!.generation).toBe(3)
  })

  it('push copies the cells array (no mutation)', () => {
    const h = new SnapshotHistory()
    const cells = [{ x: 0, y: 0 }]
    h.push(0, cells)
    cells.push({ x: 1, y: 1 })
    expect(h.get(0)!.cells).toHaveLength(1)
  })

  it('ignores duplicate generation', () => {
    const h = new SnapshotHistory()
    h.push(5, [{ x: 0, y: 0 }])
    h.push(5, [{ x: 1, y: 1 }])
    expect(h.size).toBe(1)
    // First push wins
    expect(h.get(0)!.cells).toEqual([{ x: 0, y: 0 }])
  })
})

describe('SnapshotHistory — capacity / eviction', () => {
  it('evicts oldest entry when capacity is exceeded', () => {
    const h = new SnapshotHistory(3)
    h.push(1, [])
    h.push(2, [])
    h.push(3, [])
    h.push(4, [])
    expect(h.size).toBe(3)
    expect(h.snapshots[0]!.generation).toBe(2) // gen 1 evicted
    expect(h.snapshots[2]!.generation).toBe(4)
  })

  it('capacity is exposed', () => {
    const h = new SnapshotHistory(50)
    expect(h.capacity).toBe(50)
  })
})

describe('SnapshotHistory — pop', () => {
  it('pop removes and returns the most recent snapshot', () => {
    const h = new SnapshotHistory()
    h.push(1, [])
    h.push(2, [{ x: 0, y: 0 }])
    const s = h.pop()
    expect(s?.generation).toBe(2)
    expect(h.size).toBe(1)
  })

  it('pop on empty returns undefined', () => {
    const h = new SnapshotHistory()
    expect(h.pop()).toBeUndefined()
  })
})

describe('SnapshotHistory — clear', () => {
  it('clear empties all snapshots', () => {
    const h = new SnapshotHistory()
    h.push(1, [])
    h.push(2, [])
    h.clear()
    expect(h.size).toBe(0)
    expect(h.canRewind).toBe(false)
  })
})
