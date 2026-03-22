import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRectTool, rectOutline, rectFilled } from './rect-tool'
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
// rectOutline() unit tests
// ---------------------------------------------------------------------------

describe('rectOutline', () => {
  it('single point returns itself', () => {
    expect(rectOutline(3, 5, 3, 5)).toEqual([{ x: 3, y: 5 }])
  })

  it('horizontal line (1×2 rect) returns just the two endpoints', () => {
    const pts = rectOutline(0, 0, 1, 0)
    const keys = pts.map((p) => `${p.x},${p.y}`).sort()
    expect(keys).toEqual(['0,0', '1,0'])
  })

  it('vertical line (2×1 rect) returns just the two endpoints', () => {
    const pts = rectOutline(0, 0, 0, 1)
    const keys = pts.map((p) => `${p.x},${p.y}`).sort()
    expect(keys).toEqual(['0,0', '0,1'])
  })

  it('3×3 outline contains only perimeter cells', () => {
    const pts = rectOutline(0, 0, 2, 2)
    const keys = pts.map((p) => `${p.x},${p.y}`).sort()
    // Interior cell (1,1) must NOT be present
    expect(keys).not.toContain('1,1')
    // All 8 perimeter cells must be present
    expect(keys).toEqual(['0,0', '0,1', '0,2', '1,0', '1,2', '2,0', '2,1', '2,2'])
  })

  it('works with reversed corners (x1 < x0, y1 < y0)', () => {
    const pts = rectOutline(2, 2, 0, 0)
    const keys = pts.map((p) => `${p.x},${p.y}`).sort()
    expect(keys).toEqual(['0,0', '0,1', '0,2', '1,0', '1,2', '2,0', '2,1', '2,2'])
  })

  it('4×3 outline has correct number of unique cells', () => {
    // width=4 (0..3), height=3 (0..2) → perimeter = 2*(4+3)-4 = 10
    const pts = rectOutline(0, 0, 3, 2)
    const keys = new Set(pts.map((p) => `${p.x},${p.y}`))
    expect(keys.size).toBe(10)
  })

  it('does not include interior cells for a large rect', () => {
    const pts = rectOutline(0, 0, 4, 4)
    const keys = new Set(pts.map((p) => `${p.x},${p.y}`))
    expect(keys.has('2,2')).toBe(false) // center cell
    expect(keys.has('1,1')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// rectFilled() unit tests
// ---------------------------------------------------------------------------

describe('rectFilled', () => {
  it('single point returns itself', () => {
    expect(rectFilled(3, 5, 3, 5)).toEqual([{ x: 3, y: 5 }])
  })

  it('2×2 filled rect returns all 4 cells', () => {
    const pts = rectFilled(0, 0, 1, 1)
    const keys = pts.map((p) => `${p.x},${p.y}`).sort()
    expect(keys).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  it('3×3 filled rect contains interior cell', () => {
    const pts = rectFilled(0, 0, 2, 2)
    const keys = new Set(pts.map((p) => `${p.x},${p.y}`))
    expect(keys.has('1,1')).toBe(true) // center must be present
    expect(keys.size).toBe(9) // 3×3 = 9 cells
  })

  it('works with reversed corners', () => {
    const pts = rectFilled(2, 2, 0, 0)
    expect(pts.length).toBe(9)
  })

  it('returns width×height cells', () => {
    const pts = rectFilled(0, 0, 4, 3)
    expect(pts.length).toBe(5 * 4) // 5 wide × 4 tall
  })
})

// ---------------------------------------------------------------------------
// createRectTool tests
// ---------------------------------------------------------------------------

describe('createRectTool', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let rectFilled: boolean
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let dispose: () => void

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'rect'
    rectFilled = false
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])

    dispose = createRectTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getRectFilled: () => rectFilled,
      getCells,
      setCells,
    })
  })

  afterEach(() => {
    dispose()
  })

  // ── Outline mode ───────────────────────────────────────────────────────

  it('click and release at the same cell draws a single cell (outline)', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // world (0.5, 0.5) → cell (0, 0)
    await Promise.resolve()
    mouseUp(8, 8)
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0'])
  })

  it('outline rect draws only perimeter cells', async () => {
    getCells.mockResolvedValue([])
    // zoom=16, so each cell is 16px. cell(0,0) at px(8,8), cell(2,2) at px(40,40)
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(40, 40) // cell (2, 2)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = cellSet(lastCall)
    // Interior cell (1,1) must NOT be present
    expect(keys).not.toContain('1,1')
    // All 8 perimeter cells present
    expect(keys).toContain('0,0')
    expect(keys).toContain('2,2')
    expect(keys).toContain('0,2')
    expect(keys).toContain('2,0')
    expect(keys.length).toBe(8)
  })

  it('live preview updates as the mouse moves (outline)', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(24, 8) // cell (1, 0) — 1×1 horizontal line
    expect(cellSet(setCells.mock.calls.at(-1)![0] as Cell[])).toEqual(['0,0', '1,0'])

    mouseMove(24, 24) // cell (1, 1) — 2×2 outline
    const keys = cellSet(setCells.mock.calls.at(-1)![0] as Cell[])
    expect(keys).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  // ── Filled mode ────────────────────────────────────────────────────────

  it('filled rect includes all interior cells', async () => {
    rectFilled = true
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(40, 40) // cell (2, 2)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = cellSet(lastCall)
    // Interior cell (1,1) must be present
    expect(keys).toContain('1,1')
    expect(keys.length).toBe(9) // 3×3 = 9 cells
  })

  // ── Existing cells are preserved ──────────────────────────────────────

  it('preserves existing cells when drawing the rect', async () => {
    getCells.mockResolvedValue([{ x: 5, y: 5 }])
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    mouseUp(8, 8)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('5,5')
    expect(cellSet(lastCall)).toContain('0,0')
  })

  it('second stroke starts fresh (does not reuse previous original cells)', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    mouseUp(8, 8)

    setCells.mockClear()
    getCells.mockResolvedValue([{ x: 0, y: 0 }])

    mouseDown(canvas, 24, 8) // cell (1, 0)
    await Promise.resolve()
    mouseUp(24, 8)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('0,0')
    expect(cellSet(lastCall)).toContain('1,0')
  })

  // ── Tool guard ─────────────────────────────────────────────────────────

  it('does nothing when the active tool is not rect', async () => {
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
    mouseMove(24, 24) // cell (1, 1) — buffered

    expect(setCells).not.toHaveBeenCalled()

    resolveCells([])
    await Promise.resolve()

    // Should draw a 2×2 outline rect from (0,0) to (1,1)
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0', '0,1', '1,0', '1,1'])
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
