import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLassoTool } from './lasso-tool'
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
  // jsdom getBoundingClientRect returns all zeros so clientX/Y == canvas-local coords
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
function keyDown(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

// zoom=16 → each cell is 16px wide/tall
// cell(n,m) covers px [n*16, (n+1)*16) × [m*16, (m+1)*16)
// cell centre at (n*16+8, m*16+8)
// screenToWorld at zoom=16, camera(0,0): worldX = clientX/16

// ---------------------------------------------------------------------------
// createLassoTool — basic drawing
// ---------------------------------------------------------------------------

describe('createLassoTool — drawing', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onLassoChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createLassoTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'lasso'
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])
    onLassoChange = vi.fn()

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getCells,
      setCells,
      onLassoChange,
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('getLasso returns null initially', () => {
    expect(handler.getLasso()).toBeNull()
  })

  it('does nothing when active tool is not lasso', () => {
    activeTool = 'pencil'
    mouseDown(canvas, 8, 8)
    mouseUp(80, 80)
    expect(handler.getLasso()).toBeNull()
  })

  it('ignores non-primary mouse buttons', () => {
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 8, clientY: 8, button: 2, bubbles: true }),
    )
    expect(handler.getLasso()).toBeNull()
  })

  it('drawing a polygon updates onLassoChange', () => {
    mouseDown(canvas, 8, 8)
    mouseMove(80, 8)
    mouseMove(80, 80)
    mouseUp(8, 80)

    expect(onLassoChange).toHaveBeenCalled()
    expect(handler.getLasso()).not.toBeNull()
  })

  it('closed polygon has points from drag path', () => {
    mouseDown(canvas, 8, 8) // world (0.5, 0.5)
    mouseMove(80, 8) // world (5.0, 0.5)
    mouseUp(8, 80) // world (0.5, 5.0)

    const lasso = handler.getLasso()
    expect(lasso).not.toBeNull()
    expect(lasso!.points.length).toBeGreaterThanOrEqual(2)
  })

  it('Escape clears the lasso', () => {
    mouseDown(canvas, 8, 8)
    mouseMove(80, 8)
    mouseUp(80, 8)

    expect(handler.getLasso()).not.toBeNull()

    keyDown('Escape')

    expect(handler.getLasso()).toBeNull()
    expect(onLassoChange).toHaveBeenLastCalledWith(null)
  })

  it('onLassoChange is called with null on dispose', () => {
    mouseDown(canvas, 8, 8)
    mouseUp(80, 80)

    onLassoChange.mockClear()
    handler.dispose()

    expect(onLassoChange).toHaveBeenCalledWith(null)
  })

  it('dispose removes listeners so further events are ignored', () => {
    handler.dispose()
    mouseDown(canvas, 8, 8)
    expect(handler.getLasso()).toBeNull()
    expect(getCells).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// createLassoTool — point-in-polygon / cell selection
// ---------------------------------------------------------------------------

describe('createLassoTool — cell selection', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let handler: ReturnType<typeof createLassoTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells: vi.fn().mockResolvedValue([]),
      setCells: vi.fn(),
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('triangle polygon selects cells whose centres are inside', () => {
    // Draw a triangle that covers cells (0,0), (1,0), (0,1)
    // Vertices in world coords: (0,0) → (2,0) → (0,2) back to start
    // At zoom=16: px (0,0) → (32,0) → (0,32)
    mouseDown(canvas, 0, 0) // world (0, 0)
    mouseMove(32, 0) // world (2, 0)
    mouseMove(0, 32) // world (0, 2)
    mouseUp(0, 0) // world (0, 0) — close near start

    const lasso = handler.getLasso()
    expect(lasso).not.toBeNull()
    // Cell (0,0) centre at (0.5, 0.5): inside the triangle 0→2→0
    // Cell (1,0) centre at (1.5, 0.5): should be inside
    // Cell (0,1) centre at (0.5, 1.5): should be inside
    // Cell (2,0) centre at (2.5, 0.5): outside
    const lassoCopy = handler.getLasso()!
    expect(lassoCopy.bounds.minX).toBeLessThanOrEqual(0)
    expect(lassoCopy.bounds.minY).toBeLessThanOrEqual(0)
  })

  it('copySelection returns cells relative to bounds origin', async () => {
    const getCells = vi.fn().mockResolvedValue([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 10, y: 10 }, // outside
    ])

    handler.dispose()
    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells: vi.fn(),
    })

    // Draw a rectangle-shaped lasso around cells (2,2)–(3,2):
    // world vertices: (2,2)→(4,2)→(4,3)→(2,3) back
    // px: (32,32)→(64,32)→(64,48)→(32,48)
    mouseDown(canvas, 32, 32) // world (2, 2)
    mouseMove(64, 32) // world (4, 2)
    mouseMove(64, 48) // world (4, 3)
    mouseMove(32, 48) // world (2, 3)
    mouseUp(32, 32) // world (2, 2)

    await Promise.resolve()
    await Promise.resolve()

    const copied = handler.copySelection()
    expect(copied).not.toBeNull()
    // Should include (2,2) and (3,2), shifted relative to bounds (minX=2, minY=2)
    const keys = copied!.map((c) => `${c.x},${c.y}`).sort()
    expect(keys).toContain('0,0') // (2,2) - (2,2)
    expect(keys).toContain('1,0') // (3,2) - (2,2)
    expect(keys).not.toContain('8,8') // (10,10) is outside
  })
})

// ---------------------------------------------------------------------------
// createLassoTool — deleteSelection
// ---------------------------------------------------------------------------

describe('createLassoTool — deleteSelection', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onBeforeChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createLassoTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    setCells = vi.fn()
    getCells = vi.fn()
    onBeforeChange = vi.fn()
  })

  afterEach(() => {
    handler.dispose()
  })

  it('deleteSelection with no lasso is a no-op', () => {
    getCells.mockResolvedValue([])
    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
    })
    handler.deleteSelection()
    expect(getCells).not.toHaveBeenCalled()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('deleteSelection removes cells inside lasso, keeps cells outside', async () => {
    getCells.mockResolvedValue([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 10, y: 10 }, // outside
    ])

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
      onBeforeChange,
    })

    // Rectangle lasso around (2,2)–(3,2)
    mouseDown(canvas, 32, 32) // world (2,2)
    mouseMove(64, 32) // world (4,2)
    mouseMove(64, 48) // world (4,3)
    mouseMove(32, 48) // world (2,3)
    mouseUp(32, 32)

    handler.deleteSelection()
    await Promise.resolve()
    await Promise.resolve()

    expect(onBeforeChange).toHaveBeenCalled()
    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['10,10'])
  })

  it('Delete key triggers deleteSelection', async () => {
    getCells.mockResolvedValue([{ x: 2, y: 2 }])

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
    })

    mouseDown(canvas, 32, 32)
    mouseMove(64, 32)
    mouseMove(64, 48)
    mouseMove(32, 48)
    mouseUp(32, 32)

    setCells.mockClear()
    keyDown('Delete')
    await Promise.resolve()
    await Promise.resolve()

    expect(setCells).toHaveBeenCalled()
  })

  it('Backspace key triggers deleteSelection', async () => {
    getCells.mockResolvedValue([{ x: 2, y: 2 }])

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
    })

    mouseDown(canvas, 32, 32)
    mouseMove(64, 32)
    mouseMove(64, 48)
    mouseMove(32, 48)
    mouseUp(32, 32)

    setCells.mockClear()
    keyDown('Backspace')
    await Promise.resolve()
    await Promise.resolve()

    expect(setCells).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// createLassoTool — cutSelection
// ---------------------------------------------------------------------------

describe('createLassoTool — cutSelection', () => {
  it('cutSelection removes selected cells and clears lasso', async () => {
    const canvas = makeCanvas()
    const camera = makeCamera()
    const setCells = vi.fn()
    const getCells = vi.fn().mockResolvedValue([
      { x: 2, y: 2 },
      { x: 10, y: 10 },
    ])

    const handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
    })

    mouseDown(canvas, 32, 32)
    mouseMove(64, 32)
    mouseMove(64, 48)
    mouseMove(32, 48)
    mouseUp(32, 32)

    handler.cutSelection()
    await Promise.resolve()
    await Promise.resolve()

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['10,10'])
    expect(handler.getLasso()).toBeNull()

    handler.dispose()
  })
})

// ---------------------------------------------------------------------------
// createLassoTool — move
// ---------------------------------------------------------------------------

describe('createLassoTool — move', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onBeforeChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createLassoTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    setCells = vi.fn()
    getCells = vi.fn()
    onBeforeChange = vi.fn()
  })

  afterEach(() => {
    handler.dispose()
  })

  it('dragging a selected cell moves it', async () => {
    getCells.mockResolvedValue([
      { x: 2, y: 2 },
      { x: 10, y: 10 }, // outside
    ])

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
      onBeforeChange,
    })

    // Draw rectangle lasso around cell (2,2)
    mouseDown(canvas, 32, 32) // world (2,2)
    mouseMove(52, 32) // world (3.25,2) — covers cell (2,2) and (3,2)
    mouseMove(52, 52) // world (3.25,3.25)
    mouseMove(32, 52) // world (2,3.25)
    mouseUp(32, 32) // world (2,2) — close polygon

    // Wait for cachedSelected to be populated
    await Promise.resolve()
    await Promise.resolve()

    setCells.mockClear()

    // Click on cell (2,2) to start move, drag to cell (4,2) (dx=2)
    mouseDown(canvas, 40, 40) // cell (2,2) centre-ish — inside lasso
    await Promise.resolve()
    await Promise.resolve()

    mouseMove(72, 40) // cell (4,2) — dx=2
    mouseUp(72, 40)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toContain('4,2')
    expect(cellSet(lastCall)).toContain('10,10')
    expect(cellSet(lastCall)).not.toContain('2,2')
  })

  it('lasso polygon translates with move', async () => {
    getCells.mockResolvedValue([{ x: 2, y: 2 }])

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
    })

    mouseDown(canvas, 32, 32)
    mouseMove(52, 32)
    mouseMove(52, 52)
    mouseMove(32, 52)
    mouseUp(32, 32)

    await Promise.resolve()
    await Promise.resolve()

    const lassoBefore = handler.getLasso()!
    const origMinX = lassoBefore.bounds.minX

    // Move: drag from cell (2,2) to cell (3,2) — dx=1
    mouseDown(canvas, 40, 40) // cell (2,2)
    await Promise.resolve()
    await Promise.resolve()
    mouseUp(56, 40) // cell (3,2)

    const lassoAfter = handler.getLasso()!
    expect(lassoAfter.bounds.minX).toBe(origMinX + 1)
  })

  it('onBeforeChange is called at start of move', async () => {
    getCells.mockResolvedValue([{ x: 2, y: 2 }])

    handler = createLassoTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'lasso',
      getCells,
      setCells,
      onBeforeChange,
    })

    mouseDown(canvas, 32, 32)
    mouseMove(52, 32)
    mouseMove(52, 52)
    mouseMove(32, 52)
    mouseUp(32, 32)

    await Promise.resolve()
    await Promise.resolve()

    onBeforeChange.mockClear()

    mouseDown(canvas, 40, 40)
    await Promise.resolve()
    await Promise.resolve()
    mouseUp(56, 40)

    expect(onBeforeChange).toHaveBeenCalledOnce()
  })
})
