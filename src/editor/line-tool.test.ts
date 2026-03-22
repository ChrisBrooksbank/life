import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLineTool, bresenham } from './line-tool'
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
  // jsdom returns all-zeros for getBoundingClientRect, so
  // clientX/Y === canvas-local screenX/Y in all test events.
  return canvas
}

function makeCamera(overrides: Partial<Camera> = {}): Camera {
  return { x: 0, y: 0, zoom: 16, ...overrides }
}

function mouseDown(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX, clientY, button: 0, bubbles: true }))
}
function mouseMove(clientX: number, clientY: number) {
  window.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }))
}
function mouseUp(clientX = 0, clientY = 0) {
  window.dispatchEvent(new MouseEvent('mouseup', { clientX, clientY, bubbles: true }))
}

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

// ---------------------------------------------------------------------------
// bresenham() unit tests
// ---------------------------------------------------------------------------

describe('bresenham', () => {
  it('single point returns itself', () => {
    expect(bresenham(3, 5, 3, 5)).toEqual([{ x: 3, y: 5 }])
  })

  it('horizontal line (left to right)', () => {
    const pts = bresenham(0, 0, 3, 0)
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
  })

  it('horizontal line (right to left)', () => {
    const pts = bresenham(3, 0, 0, 0)
    expect(pts.map((p) => p.x)).toEqual([3, 2, 1, 0])
  })

  it('vertical line (top to bottom)', () => {
    const pts = bresenham(0, 0, 0, 3)
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ])
  })

  it('diagonal line 45°', () => {
    const pts = bresenham(0, 0, 2, 2)
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ])
  })

  it('includes both endpoints', () => {
    const pts = bresenham(1, 2, 4, 6)
    expect(pts[0]).toEqual({ x: 1, y: 2 })
    expect(pts[pts.length - 1]).toEqual({ x: 4, y: 6 })
  })
})

// ---------------------------------------------------------------------------
// createLineTool tests
// ---------------------------------------------------------------------------

describe('createLineTool', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let dispose: () => void

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'line'
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])

    dispose = createLineTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getCells,
      setCells,
    })
  })

  afterEach(() => {
    dispose()
  })

  // ── Basic line drawing ─────────────────────────────────────────────────

  it('click and release at the same cell draws a single cell', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // world (0.5, 0.5) → cell (0, 0)
    await Promise.resolve()
    mouseUp(8, 8)
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0'])
  })

  it('drag horizontally draws a full horizontal line', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(40, 8) // cell (2, 0)
    mouseUp(40, 8)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0', '1,0', '2,0'])
  })

  it('drag diagonally draws a diagonal line', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(24, 24) // cell (1, 1)
    mouseUp(24, 24)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0', '1,1'])
  })

  it('line preview updates as the mouse moves', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(24, 8) // cell (1, 0) — preview: (0,0)-(1,0)
    expect(cellSet(setCells.mock.calls.at(-1)![0] as Cell[])).toEqual(['0,0', '1,0'])

    mouseMove(40, 8) // cell (2, 0) — preview extends
    expect(cellSet(setCells.mock.calls.at(-1)![0] as Cell[])).toEqual(['0,0', '1,0', '2,0'])
  })

  it('preserves existing cells when drawing the line', async () => {
    getCells.mockResolvedValue([{ x: 5, y: 5 }])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseUp(8, 8)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('5,5')
    expect(cellSet(lastCall)).toContain('0,0')
  })

  it('second stroke starts fresh (does not reuse previous original cells)', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(8, 8)

    setCells.mockClear()
    getCells.mockResolvedValue([{ x: 0, y: 0 }]) // previous stroke now alive

    mouseDown(canvas, 24, 8) // cell (1, 0)
    await Promise.resolve()
    mouseUp(24, 8)

    // New stroke should start from fresh originalCells which includes (0,0)
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('0,0') // from getCells
    expect(cellSet(lastCall)).toContain('1,0') // line cell
  })

  it('does nothing when the active tool is not line', async () => {
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

  // ── Buffering during async init ────────────────────────────────────────

  it('buffered mousemove endpoint is applied after getCells resolves', async () => {
    let resolveCells!: (cells: Cell[]) => void
    getCells.mockReturnValue(new Promise<Cell[]>((r) => (resolveCells = r)))

    mouseDown(canvas, 8, 8) // cell (0, 0)
    mouseMove(40, 8) // cell (2, 0) — buffered endpoint

    expect(setCells).not.toHaveBeenCalled()

    resolveCells([])
    await Promise.resolve()

    // Should draw line from (0,0) to (2,0)
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0', '1,0', '2,0'])
  })

  it('stroke cancelled by mouseup before getCells resolves does not draw', async () => {
    let resolveCells!: (cells: Cell[]) => void
    getCells.mockReturnValue(new Promise<Cell[]>((r) => (resolveCells = r)))

    mouseDown(canvas, 8, 8)
    mouseUp(8, 8) // cancel before async resolves

    resolveCells([])
    await Promise.resolve()

    expect(setCells).not.toHaveBeenCalled()
  })

  // ── Dispose ────────────────────────────────────────────────────────────

  it('dispose removes mousedown listener', async () => {
    dispose()
    dispose = () => {}
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('dispose removes mousemove listener', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    setCells.mockClear()

    dispose()
    dispose = () => {}
    mouseMove(24, 8)
    expect(setCells).not.toHaveBeenCalled()
  })
})
