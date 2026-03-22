import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFillTool, floodFill } from './fill-tool'
import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  return canvas
}

function makeCamera(overrides: Partial<Camera> = {}): Camera {
  return { x: 0, y: 0, zoom: 16, ...overrides }
}

function mouseDown(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX, clientY, button: 0, bubbles: true }))
}

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

function liveSet(...keys: string[]): Set<string> {
  return new Set(keys)
}

// ---------------------------------------------------------------------------
// floodFill() unit tests
// ---------------------------------------------------------------------------

describe('floodFill — live cell region (erase)', () => {
  it('erases a single live cell when clicked', () => {
    const live = liveSet('0,0')
    const result = floodFill(0, 0, live)
    expect(result).not.toBeNull()
    expect(result!.has('0,0')).toBe(false)
    expect(result!.size).toBe(0)
  })

  it('erases all 4-connected live cells', () => {
    // 3-cell horizontal line: (0,0) (1,0) (2,0)
    const live = liveSet('0,0', '1,0', '2,0')
    const result = floodFill(1, 0, live)
    expect(result).not.toBeNull()
    expect(result!.size).toBe(0)
  })

  it('only erases the connected live region (diagonals are not connected)', () => {
    // (0,0) is live, (1,1) is live but only diagonally adjacent — not 4-connected
    const live = liveSet('0,0', '1,1')
    const result = floodFill(0, 0, live)
    expect(result).not.toBeNull()
    expect(result!.has('0,0')).toBe(false)
    expect(result!.has('1,1')).toBe(true) // untouched — not 4-connected
  })

  it('preserves live cells outside the connected region', () => {
    // Two separate blobs: (0,0) and (5,5)
    const live = liveSet('0,0', '5,5')
    const result = floodFill(0, 0, live)
    expect(result).not.toBeNull()
    expect(result!.has('0,0')).toBe(false)
    expect(result!.has('5,5')).toBe(true)
  })

  it('erases a larger connected blob', () => {
    // 2×2 square
    const live = liveSet('0,0', '1,0', '0,1', '1,1')
    const result = floodFill(0, 0, live)
    expect(result).not.toBeNull()
    expect(result!.size).toBe(0)
  })
})

describe('floodFill — dead cell region (fill enclosed)', () => {
  it('fills an enclosed single dead cell surrounded by live cells', () => {
    // Dead cell at (1,1), surrounded on 4 sides by live cells
    const live = liveSet('0,1', '2,1', '1,0', '1,2')
    const result = floodFill(1, 1, live)
    expect(result).not.toBeNull()
    expect(result!.has('1,1')).toBe(true)
    expect(result!.size).toBe(5) // 4 live + 1 filled
  })

  it('fills all dead cells in an enclosed region', () => {
    // 3×3 border of live cells (outline), dead interior (1,1)
    const live = new Set(['0,0', '1,0', '2,0', '0,1', '2,1', '0,2', '1,2', '2,2'])
    const result = floodFill(1, 1, live)
    expect(result).not.toBeNull()
    expect(result!.has('1,1')).toBe(true)
    expect(result!.size).toBe(9) // 8 border + 1 interior
  })

  it('returns null for an unbounded (open) dead region', () => {
    // No live cells — infinite dead grid
    const result = floodFill(0, 0, new Set(), 10)
    expect(result).toBeNull()
  })

  it('returns null when dead region exceeds maxDeadCells', () => {
    // Just 2 live cells, leaving a large open region
    const live = liveSet('0,0', '100,100')
    const result = floodFill(5, 5, live, 5)
    expect(result).toBeNull()
  })

  it('does not modify anything when clicking on a live cell boundary', () => {
    // The start cell is live — treated as erase, not fill
    const live = liveSet('0,0')
    const result = floodFill(0, 0, live)
    expect(result).not.toBeNull()
    expect(result!.has('0,0')).toBe(false)
  })

  it('does not fill outside the live-cell boundary', () => {
    // L-shaped enclosure: fill only reaches inside
    // Build a box with one inside cell
    const live = new Set(['0,0', '1,0', '2,0', '0,1', '2,1', '0,2', '1,2', '2,2'])
    const resultInside = floodFill(1, 1, live)
    expect(resultInside).not.toBeNull()
    // The outside dead cells should NOT be filled — start from outside
    const resultOutside = floodFill(5, 5, live, 10)
    expect(resultOutside).toBeNull() // unbounded
  })
})

// ---------------------------------------------------------------------------
// createFillTool integration tests
// ---------------------------------------------------------------------------

describe('createFillTool', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let dispose: () => void

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'fill'
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])

    dispose = createFillTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getCells,
      setCells,
    })
  })

  afterEach(() => {
    dispose()
  })

  it('does nothing when active tool is not fill', async () => {
    activeTool = 'pencil'
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('ignores non-primary mouse buttons', async () => {
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 8, clientY: 8, button: 2, bubbles: true }),
    )
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('does not call setCells when clicking unbounded dead region', async () => {
    getCells.mockResolvedValue([]) // no live cells → unbounded
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('fills enclosed dead region on click', async () => {
    // zoom=16 → each cell is 16px, cell(0,0) is at px(0..15)
    // Click at (8,8) → cell (0,0)
    // Surround cell (0,0) with live cells at (-1,0),(1,0),(0,-1),(0,1)
    getCells.mockResolvedValue([
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    ])
    mouseDown(canvas, 8, 8) // cell (0, 0) — dead, enclosed
    await Promise.resolve()
    expect(setCells).toHaveBeenCalledOnce()
    const result = cellSet(setCells.mock.calls[0]![0] as Cell[])
    expect(result).toContain('0,0') // filled
    expect(result).toContain('-1,0') // preserved
    expect(result).toContain('1,0')
    expect(result).toContain('0,-1')
    expect(result).toContain('0,1')
    expect(result.length).toBe(5)
  })

  it('erases connected live region on click', async () => {
    // zoom=16, click at (8,8) → cell(0,0) which is live
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
    mouseDown(canvas, 8, 8) // cell (0, 0) — live, connected to (1,0)
    await Promise.resolve()
    expect(setCells).toHaveBeenCalledOnce()
    const result = cellSet(setCells.mock.calls[0]![0] as Cell[])
    expect(result).not.toContain('0,0')
    expect(result).not.toContain('1,0')
    expect(result.length).toBe(0)
  })

  it('dispose removes mousedown listener', async () => {
    dispose()
    dispose = () => {}
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })
})
