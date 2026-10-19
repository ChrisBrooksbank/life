import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEraserTool } from './eraser-tool'
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
function mouseUp() {
  window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createEraserTool', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let dispose: () => void

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'eraser'
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])

    dispose = createEraserTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getCells,
      setCells,
    })
  })

  afterEach(() => {
    dispose()
  })

  // ── Basic erasing ──────────────────────────────────────────────────────

  it('clicking a live cell removes it', async () => {
    getCells.mockResolvedValue([{ x: 0, y: 0 }])
    mouseDown(canvas, 8, 8) // world (0.5, 0.5) → cell (0, 0)
    await Promise.resolve()
    expect(setCells).toHaveBeenCalledWith([])
  })

  it('clicking a dead cell does nothing (no change)', async () => {
    getCells.mockResolvedValue([{ x: 1, y: 0 }])
    mouseDown(canvas, 8, 8) // cell (0, 0) — dead
    await Promise.resolve()
    // setCells is still called (flush), but cell list is unchanged
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(lastCall).toEqual([{ x: 1, y: 0 }])
  })

  it('dragging erases all cells under the cursor', async () => {
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(24, 8) // cell (1, 0)
    mouseMove(40, 8) // cell (2, 0)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(lastCall).toEqual([])
  })

  it('dragging over the same cell twice only erases it once', async () => {
    getCells.mockResolvedValue([{ x: 0, y: 0 }])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(8, 8) // same cell (0, 0) again
    mouseMove(8, 8)

    // Cell (0,0) must not appear in any call after being erased
    const allCells = setCells.mock.calls.flatMap((call) => call[0] as Cell[])
    const count = allCells.filter((c) => c.x === 0 && c.y === 0).length
    expect(count).toBe(0)
  })

  it('does not add cells — eraser only removes', async () => {
    getCells.mockResolvedValue([]) // no live cells
    mouseDown(canvas, 8, 8) // cell (0, 0) — dead
    await Promise.resolve()

    mouseMove(24, 8)
    mouseMove(40, 8)

    // All setCells calls should have empty or unchanged arrays (never grow)
    for (const call of setCells.mock.calls) {
      const cells = call[0] as Cell[]
      expect(cells.length).toBe(0)
    }
  })

  it('mouseup ends the stroke so the next click starts fresh', async () => {
    getCells.mockResolvedValue([{ x: 0, y: 0 }])
    mouseDown(canvas, 8, 8) // cell (0, 0) — erased
    await Promise.resolve()
    mouseUp()

    setCells.mockClear()
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])

    mouseDown(canvas, 24, 8) // cell (1, 0) — new stroke
    await Promise.resolve()
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(lastCall).toEqual([{ x: 0, y: 0 }])
  })

  it('does nothing when the active tool is not eraser', async () => {
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

  it('buffered mousemove positions are applied after getCells resolves', async () => {
    let resolveCells!: (cells: Cell[]) => void
    getCells.mockReturnValue(new Promise<Cell[]>((r) => (resolveCells = r)))

    mouseDown(canvas, 8, 8) // cell (0, 0)
    mouseMove(24, 8) // cell (1, 0) — buffered
    mouseMove(40, 8) // cell (2, 0) — buffered

    // Nothing should have been called yet
    expect(setCells).not.toHaveBeenCalled()

    resolveCells([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])
    await Promise.resolve()

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(lastCall).toEqual([])
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
    getCells.mockResolvedValue([{ x: 0, y: 0 }])
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    setCells.mockClear()

    dispose()
    dispose = () => {}
    mouseMove(24, 8)
    expect(setCells).not.toHaveBeenCalled()
  })
})
