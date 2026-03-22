import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSelectionTool } from './selection-tool'
import type { SelectionRect } from './selection-tool'
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

// zoom=16 → each cell is 16px wide/tall; cell(n,m) centre at px(n*16+8, m*16+8)
// screenToCell uses Math.floor(world) so px(8,8) → cell(0,0), px(24,8) → cell(1,0)

// ---------------------------------------------------------------------------
// createSelectionTool — selection phase
// ---------------------------------------------------------------------------

describe('createSelectionTool — selection', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let activeTool: DrawingTool
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onSelectionChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createSelectionTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    activeTool = 'select'
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])
    onSelectionChange = vi.fn()

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool,
      getCells,
      setCells,
      onSelectionChange,
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('getSelection returns null initially', () => {
    expect(handler.getSelection()).toBeNull()
  })

  it('dragging sets the selection rect', () => {
    mouseDown(canvas, 8, 8) // cell (0,0)
    mouseMove(40, 40) // cell (2,2)
    mouseUp(40, 40)

    const sel = handler.getSelection()
    expect(sel).not.toBeNull()
    expect(sel!.minX).toBe(0)
    expect(sel!.minY).toBe(0)
    expect(sel!.maxX).toBe(2)
    expect(sel!.maxY).toBe(2)
  })

  it('onSelectionChange is called during drag', () => {
    mouseDown(canvas, 8, 8)
    mouseMove(24, 8) // cell (1,0)

    const calls = onSelectionChange.mock.calls
    // At least one call with a valid rect
    const last = calls.at(-1)![0] as SelectionRect
    expect(last.minX).toBe(0)
    expect(last.maxX).toBe(1)
  })

  it('onSelectionChange is called with null on dispose', () => {
    mouseDown(canvas, 8, 8)
    mouseUp(8, 8)

    onSelectionChange.mockClear()
    handler.dispose()

    expect(onSelectionChange).toHaveBeenCalledWith(null)
  })

  it('single click (no drag) creates a 1×1 selection', () => {
    mouseDown(canvas, 8, 8)
    mouseUp(8, 8)

    const sel = handler.getSelection()
    expect(sel).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('selection works with reversed drag direction', () => {
    mouseDown(canvas, 40, 40) // cell (2,2)
    mouseUp(8, 8) // cell (0,0)

    const sel = handler.getSelection()
    expect(sel).toEqual({ minX: 0, minY: 0, maxX: 2, maxY: 2 })
  })

  it('does nothing when active tool is not select', async () => {
    activeTool = 'pencil'
    mouseDown(canvas, 8, 8)
    mouseUp(40, 40)

    expect(handler.getSelection()).toBeNull()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('ignores non-primary mouse buttons', () => {
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 8, clientY: 8, button: 2, bubbles: true }),
    )
    expect(handler.getSelection()).toBeNull()
  })

  it('Escape key clears the selection', async () => {
    mouseDown(canvas, 8, 8)
    mouseUp(40, 40)

    expect(handler.getSelection()).not.toBeNull()

    keyDown('Escape')

    expect(handler.getSelection()).toBeNull()
    expect(onSelectionChange).toHaveBeenLastCalledWith(null)
  })
})

// ---------------------------------------------------------------------------
// createSelectionTool — delete
// ---------------------------------------------------------------------------

describe('createSelectionTool — deleteSelection', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onBeforeChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createSelectionTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    setCells = vi.fn()
    getCells = vi.fn().mockResolvedValue([])
    onBeforeChange = vi.fn()

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select' as DrawingTool,
      getCells,
      setCells,
      onBeforeChange,
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('deleteSelection with no selection is a no-op', () => {
    handler.deleteSelection()
    expect(getCells).not.toHaveBeenCalled()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('deleteSelection removes cells inside selection, keeps cells outside', async () => {
    // Select cell (0,0)–(1,1) via canvas drag (getActiveTool returns 'select' here)
    // We need to select first, then delete.
    // Use a fresh handler with proper getActiveTool
    handler.dispose()

    const activeTool: { value: DrawingTool } = { value: 'select' }
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: 5 },
    ])

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool.value,
      getCells,
      setCells,
      onBeforeChange,
    })

    // Select (0,0)–(1,0)
    mouseDown(canvas, 8, 8) // cell (0,0)
    mouseUp(24, 8) // cell (1,0)

    // trigger delete
    handler.deleteSelection()
    await Promise.resolve()
    await Promise.resolve()

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['5,5'])
    expect(onBeforeChange).toHaveBeenCalled()
  })

  it('Delete key triggers deleteSelection', async () => {
    const activeTool: { value: DrawingTool } = { value: 'select' }
    getCells.mockResolvedValue([{ x: 0, y: 0 }])

    handler.dispose()
    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool.value,
      getCells,
      setCells,
    })

    mouseDown(canvas, 8, 8)
    mouseUp(8, 8)

    setCells.mockClear()
    keyDown('Delete')
    await Promise.resolve()
    await Promise.resolve()

    expect(setCells).toHaveBeenCalled()
    const cells = setCells.mock.calls.at(-1)![0] as Cell[]
    // (0,0) was inside selection → deleted
    expect(cellSet(cells)).toEqual([])
  })

  it('Backspace key triggers deleteSelection', async () => {
    const activeTool: { value: DrawingTool } = { value: 'select' }
    getCells.mockResolvedValue([{ x: 0, y: 0 }])

    handler.dispose()
    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => activeTool.value,
      getCells,
      setCells,
    })

    mouseDown(canvas, 8, 8)
    mouseUp(8, 8)

    setCells.mockClear()
    keyDown('Backspace')
    await Promise.resolve()
    await Promise.resolve()

    expect(setCells).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// createSelectionTool — copy / cut
// ---------------------------------------------------------------------------

describe('createSelectionTool — copySelection / cutSelection', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createSelectionTool>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    setCells = vi.fn()
    getCells = vi.fn()
  })

  afterEach(() => {
    handler.dispose()
  })

  it('copySelection with no selection returns null', () => {
    getCells.mockResolvedValue([])
    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select',
      getCells,
      setCells,
    })
    expect(handler.copySelection()).toBeNull()
  })

  it('copySelection returns cells relative to selection origin', async () => {
    // Cells at (2,2) and (3,2); select (2,2)–(3,2)
    getCells.mockResolvedValue([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 10, y: 10 }, // outside
    ])

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select',
      getCells,
      setCells,
    })

    // Select covers cells (2,2)–(3,2): px (2*16+8=40, 2*16+8=40) to (3*16+8=56, 2*16+8=40)
    mouseDown(canvas, 40, 40) // cell (2,2)
    mouseUp(56, 40) // cell (3,2)

    // Wait for the getCells promise to resolve (populates cachedInside)
    await Promise.resolve()
    await Promise.resolve()

    const copied = handler.copySelection()
    expect(copied).not.toBeNull()
    const keys = copied!.map((c) => `${c.x},${c.y}`).sort()
    expect(keys).toEqual(['0,0', '1,0']) // relative to (2,2)
  })

  it('cutSelection removes selected cells and clears selection', async () => {
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ])

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select',
      getCells,
      setCells,
    })

    mouseDown(canvas, 8, 8) // cell (0,0)
    mouseUp(8, 8)

    handler.cutSelection()
    await Promise.resolve()
    await Promise.resolve()

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    expect(cellSet(lastCall)).toEqual(['5,5']) // (0,0) removed
    expect(handler.getSelection()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createSelectionTool — move
// ---------------------------------------------------------------------------

describe('createSelectionTool — move', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onBeforeChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createSelectionTool>

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

  it('dragging inside selection moves selected cells', async () => {
    // Live cells: (0,0) inside selection, (5,5) outside
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ])

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select',
      getCells,
      setCells,
      onBeforeChange,
    })

    // Select (0,0)–(1,1)
    mouseDown(canvas, 8, 8) // cell (0,0)
    mouseUp(24, 24) // cell (1,1)

    // Wait for getCells to populate cache
    await Promise.resolve()
    await Promise.resolve()

    setCells.mockClear()

    // Drag from cell (0,0) to cell (2,0) — move right by 2
    mouseDown(canvas, 8, 8) // inside selection, cell (0,0)
    await Promise.resolve() // let getCells resolve for move snapshot
    await Promise.resolve()
    mouseMove(40, 8) // cell (2,0) → dx=2, dy=0
    mouseUp(40, 8)

    const lastCall = setCells.mock.calls.at(-1)![0] as Cell[]
    // (0,0) should be moved to (2,0); (5,5) stays
    expect(cellSet(lastCall)).toContain('2,0')
    expect(cellSet(lastCall)).toContain('5,5')
    expect(cellSet(lastCall)).not.toContain('0,0')
  })

  it('selection rect follows the drag', async () => {
    getCells.mockResolvedValue([{ x: 0, y: 0 }])

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select',
      getCells,
      setCells,
    })

    mouseDown(canvas, 8, 8)
    mouseUp(8, 8)
    await Promise.resolve()
    await Promise.resolve()

    // Move: drag from (0,0) to (1,0)
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    await Promise.resolve()
    mouseUp(24, 8)

    const sel = handler.getSelection()
    expect(sel).not.toBeNull()
    expect(sel!.minX).toBe(1)
    expect(sel!.minY).toBe(0)
    expect(sel!.maxX).toBe(1)
    expect(sel!.maxY).toBe(0)
  })

  it('onBeforeChange is called at the start of a move', async () => {
    getCells.mockResolvedValue([{ x: 0, y: 0 }])

    handler = createSelectionTool(canvas, {
      getCamera: () => camera,
      getActiveTool: () => 'select',
      getCells,
      setCells,
      onBeforeChange,
    })

    // Select
    mouseDown(canvas, 8, 8)
    mouseUp(8, 8)
    await Promise.resolve()
    await Promise.resolve()

    onBeforeChange.mockClear()

    // Move
    mouseDown(canvas, 8, 8)
    await Promise.resolve()
    await Promise.resolve()
    mouseUp(24, 8)

    expect(onBeforeChange).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// createSelectionTool — dispose
// ---------------------------------------------------------------------------

describe('createSelectionTool — dispose', () => {
  it('dispose removes mousedown listener', () => {
    const canvas = makeCanvas()
    const getCells = vi.fn().mockResolvedValue([])
    const setCells = vi.fn()

    const handler = createSelectionTool(canvas, {
      getCamera: () => makeCamera(),
      getActiveTool: () => 'select',
      getCells,
      setCells,
    })

    handler.dispose()
    mouseDown(canvas, 8, 8)

    expect(handler.getSelection()).toBeNull()
    expect(getCells).not.toHaveBeenCalled()
  })

  it('dispose clears selection', () => {
    const canvas = makeCanvas()
    const getCells = vi.fn().mockResolvedValue([])
    const setCells = vi.fn()
    const onSelectionChange = vi.fn()

    const handler = createSelectionTool(canvas, {
      getCamera: () => makeCamera(),
      getActiveTool: () => 'select',
      getCells,
      setCells,
      onSelectionChange,
    })

    mouseDown(canvas, 8, 8)
    mouseUp(24, 24)

    expect(handler.getSelection()).not.toBeNull()

    handler.dispose()
    expect(handler.getSelection()).toBeNull()
  })
})
