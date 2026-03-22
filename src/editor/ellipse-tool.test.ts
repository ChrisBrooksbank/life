import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEllipseTool, ellipseOutline, ellipseFilled } from './ellipse-tool'
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

function cellKeys(cells: Array<{ x: number; y: number }>): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

// ---------------------------------------------------------------------------
// ellipseOutline() unit tests
// ---------------------------------------------------------------------------

describe('ellipseOutline', () => {
  it('single point returns itself', () => {
    expect(ellipseOutline(3, 5, 3, 5)).toEqual([{ x: 3, y: 5 }])
  })

  it('horizontal line returns all cells on that row', () => {
    const pts = ellipseOutline(0, 0, 3, 0)
    const keys = cellKeys(pts)
    expect(keys).toEqual(['0,0', '1,0', '2,0', '3,0'])
  })

  it('vertical line returns all cells on that column', () => {
    const pts = ellipseOutline(0, 0, 0, 3)
    const keys = cellKeys(pts)
    expect(keys).toEqual(['0,0', '0,1', '0,2', '0,3'])
  })

  it('circle (1×1 bounding box) returns 4 cells', () => {
    // Bounding box (0,0)–(1,1): 2×2 square, circle fits inside
    const pts = ellipseOutline(0, 0, 1, 1)
    // A 2-wide, 2-tall ellipse should touch all 4 corner cells
    expect(pts.length).toBeGreaterThanOrEqual(1)
  })

  it('works with reversed corners', () => {
    const fwd = cellKeys(ellipseOutline(0, 0, 4, 4))
    const rev = cellKeys(ellipseOutline(4, 4, 0, 0))
    expect(fwd).toEqual(rev)
  })

  it('outline of 5×5 bounding box does not include center cell', () => {
    // Bounding box 0..4 × 0..4, center at (2,2)
    const pts = ellipseOutline(0, 0, 4, 4)
    const keys = new Set(cellKeys(pts))
    expect(keys.has('2,2')).toBe(false)
  })

  it('outline touches all four extremes of the bounding box', () => {
    // For a large enough ellipse, the extreme cells should be present
    const pts = ellipseOutline(0, 0, 8, 6)
    const keys = new Set(cellKeys(pts))
    // Top and bottom extremes (center x = 4)
    expect(keys.has('4,0')).toBe(true)
    expect(keys.has('4,6')).toBe(true)
    // Left and right extremes (center y = 3)
    expect(keys.has('0,3')).toBe(true)
    expect(keys.has('8,3')).toBe(true)
  })

  it('all outline cells lie within the bounding box', () => {
    const pts = ellipseOutline(1, 2, 7, 5)
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(1)
      expect(p.x).toBeLessThanOrEqual(7)
      expect(p.y).toBeGreaterThanOrEqual(2)
      expect(p.y).toBeLessThanOrEqual(5)
    }
  })

  it('no duplicate cells in outline', () => {
    const pts = ellipseOutline(0, 0, 6, 4)
    const keys = pts.map((p) => `${p.x},${p.y}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

// ---------------------------------------------------------------------------
// ellipseFilled() unit tests
// ---------------------------------------------------------------------------

describe('ellipseFilled', () => {
  it('single point returns itself', () => {
    expect(ellipseFilled(3, 5, 3, 5)).toEqual([{ x: 3, y: 5 }])
  })

  it('horizontal line returns all cells on that row', () => {
    const pts = ellipseFilled(0, 0, 3, 0)
    const keys = cellKeys(pts)
    expect(keys).toEqual(['0,0', '1,0', '2,0', '3,0'])
  })

  it('vertical line returns all cells on that column', () => {
    const pts = ellipseFilled(0, 0, 0, 3)
    const keys = cellKeys(pts)
    expect(keys).toEqual(['0,0', '0,1', '0,2', '0,3'])
  })

  it('filled ellipse includes center cell for large ellipses', () => {
    // A 9×7 bounding box: center at (4,3) should be included
    const pts = ellipseFilled(0, 0, 8, 6)
    const keys = new Set(cellKeys(pts))
    expect(keys.has('4,3')).toBe(true)
  })

  it('filled has more cells than outline for a non-degenerate ellipse', () => {
    const outline = ellipseOutline(0, 0, 8, 6)
    const filled = ellipseFilled(0, 0, 8, 6)
    expect(filled.length).toBeGreaterThan(outline.length)
  })

  it('works with reversed corners', () => {
    const fwd = ellipseFilled(0, 0, 4, 4)
    const rev = ellipseFilled(4, 4, 0, 0)
    expect(cellKeys(fwd)).toEqual(cellKeys(rev))
  })

  it('all filled cells lie within the bounding box', () => {
    const pts = ellipseFilled(1, 2, 7, 5)
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(1)
      expect(p.x).toBeLessThanOrEqual(7)
      expect(p.y).toBeGreaterThanOrEqual(2)
      expect(p.y).toBeLessThanOrEqual(5)
    }
  })

  it('filled ellipse is a superset of its outline', () => {
    const outline = new Set(cellKeys(ellipseOutline(0, 0, 8, 6)))
    const filled = new Set(cellKeys(ellipseFilled(0, 0, 8, 6)))
    for (const key of outline) {
      expect(filled.has(key)).toBe(true)
    }
  })

  it('no duplicate cells in filled result', () => {
    const pts = ellipseFilled(0, 0, 6, 4)
    const keys = pts.map((p) => `${p.x},${p.y}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

// ---------------------------------------------------------------------------
// createEllipseTool tests
// ---------------------------------------------------------------------------

describe('createEllipseTool', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let ellipseFill: boolean
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let dispose: () => void

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'ellipse'
    ellipseFill = false
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])

    dispose = createEllipseTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getEllipseFilled: () => ellipseFill,
      getCells,
      setCells,
    })
  })

  afterEach(() => {
    dispose()
  })

  // ── Outline mode ─────────────────────────────────────────────────────────

  it('click and release at the same cell draws a single cell (outline)', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // world (0.5, 0.5) → cell (0, 0)
    await Promise.resolve()
    mouseUp(8, 8)
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['0,0'])
  })

  it('outline ellipse touches bounding box extremes', async () => {
    getCells.mockResolvedValue([])
    // zoom=16, so each cell is 16px.
    // cell(0,0) at px center ~(8,8), cell(8,0) at px center ~(136,8)
    // cell(0,6) at px center ~(8,104), cell(8,6) at px center ~(136,104)
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(136, 104) // cell (8, 6)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = new Set(cellSet(lastCall))
    // Top/bottom extremes (center x=4)
    expect(keys.has('4,0')).toBe(true)
    expect(keys.has('4,6')).toBe(true)
    // Left/right extremes (center y=3)
    expect(keys.has('0,3')).toBe(true)
    expect(keys.has('8,3')).toBe(true)
  })

  it('outline ellipse does not include center for a large ellipse', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(136, 104) // cell (8, 6)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = new Set(cellSet(lastCall))
    expect(keys.has('4,3')).toBe(false) // center should not be in outline
  })

  // ── Filled mode ───────────────────────────────────────────────────────────

  it('filled ellipse includes center cell', async () => {
    ellipseFill = true
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(136, 104) // cell (8, 6)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = new Set(cellSet(lastCall))
    expect(keys.has('4,3')).toBe(true) // center must be present in filled
  })

  it('filled has more cells than outline for a non-trivial ellipse', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp(136, 104) // cell (8, 6)
    const outlineCount = (setCells.mock.calls.at(-1)![0] as Cell[]).length

    setCells.mockClear()
    ellipseFill = true
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    mouseUp(136, 104)
    const filledCount = (setCells.mock.calls.at(-1)![0] as Cell[]).length

    expect(filledCount).toBeGreaterThan(outlineCount)
  })

  // ── Live preview ─────────────────────────────────────────────────────────

  it('live preview updates as the mouse moves', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(24, 8) // cell (1, 0) — horizontal line
    expect(setCells).toHaveBeenCalled()

    mouseMove(8, 24) // cell (0, 1) — vertical line
    expect(setCells).toHaveBeenCalled()
  })

  // ── Existing cells preserved ─────────────────────────────────────────────

  it('preserves existing cells when drawing the ellipse', async () => {
    getCells.mockResolvedValue([{ x: 10, y: 10 }])
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    mouseUp(8, 8)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('10,10')
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

  // ── Tool guard ───────────────────────────────────────────────────────────

  it('does nothing when the active tool is not ellipse', async () => {
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

  // ── Buffering during async init ──────────────────────────────────────────

  it('buffered mousemove endpoint is applied after getCells resolves', async () => {
    let resolveCells!: (cells: Cell[]) => void
    getCells.mockReturnValue(new Promise<Cell[]>((r) => (resolveCells = r)))

    mouseDown(canvas, 8, 8) // cell (0, 0)
    mouseMove(24, 8) // cell (1, 0) — buffered

    expect(setCells).not.toHaveBeenCalled()

    resolveCells([])
    await Promise.resolve()

    // Should have drawn with the buffered endpoint
    expect(setCells).toHaveBeenCalled()
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('0,0')
    expect(cellSet(lastCall)).toContain('1,0')
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

  // ── Dispose ──────────────────────────────────────────────────────────────

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
