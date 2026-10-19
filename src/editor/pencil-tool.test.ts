import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPencilTool } from './pencil-tool'
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

describe('createPencilTool', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let dispose: () => void

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'pencil'
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])

    dispose = createPencilTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getCells,
      setCells,
    })
  })

  afterEach(() => {
    dispose()
  })

  // ── Basic drawing ──────────────────────────────────────────────────────

  it('clicking a dead cell adds it (draw mode)', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // world (0.5, 0.5) → cell (0, 0)
    await Promise.resolve()
    expect(setCells).toHaveBeenCalledWith([{ x: 0, y: 0 }])
  })

  it('clicking a live cell removes it (erase mode)', async () => {
    getCells.mockResolvedValue([{ x: 0, y: 0 }])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    expect(setCells).toHaveBeenCalledWith([])
  })

  it('dragging over multiple cells draws them all', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(24, 8) // cell (1, 0)
    mouseMove(40, 8) // cell (2, 0)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = lastCall.map((c) => `${c.x},${c.y}`).sort()
    expect(keys).toEqual(['0,0', '1,0', '2,0'])
  })

  it('dragging over the same cell twice only toggles it once', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()

    mouseMove(8, 8) // same cell (0, 0) again
    mouseMove(8, 8)

    // setCells is called twice for the drag, but cell (0,0) only appears once each time
    for (const call of setCells.mock.calls) {
      const cells = call[0] as Cell[]
      const count = cells.filter((c) => c.x === 0 && c.y === 0).length
      expect(count).toBe(1)
    }
  })

  it('erase drag removes all dragged-over cells', async () => {
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])
    mouseDown(canvas, 8, 8) // cell (0, 0) — alive → erase mode
    await Promise.resolve()

    mouseMove(24, 8) // cell (1, 0)
    mouseMove(40, 8) // cell (2, 0)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(lastCall).toEqual([])
  })

  it('mouseup ends the stroke so the next click starts fresh', async () => {
    getCells.mockResolvedValue([])
    mouseDown(canvas, 8, 8) // cell (0, 0)
    await Promise.resolve()
    mouseUp()

    setCells.mockClear()
    getCells.mockResolvedValue([{ x: 0, y: 0 }]) // now alive

    mouseDown(canvas, 8, 8) // click same cell → should erase
    await Promise.resolve()
    expect(setCells).toHaveBeenCalledWith([])
  })

  it('does nothing when the active tool is not pencil', async () => {
    activeTool = 'eraser'
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

    resolveCells([])
    await Promise.resolve()

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = lastCall.map((c) => `${c.x},${c.y}`).sort()
    expect(keys).toEqual(['0,0', '1,0', '2,0'])
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
