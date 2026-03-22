import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPastePreview } from './paste-preview'
import type { PastePreviewHandler } from './paste-preview'
import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'

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

function keyDown(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

// zoom=16 → each cell is 16px wide/tall
// screenToCell uses Math.floor(world) so px(0..15,0..15) → cell(0,0), px(16..31,0..15) → cell(1,0)

// ---------------------------------------------------------------------------
// createPastePreview
// ---------------------------------------------------------------------------

describe('createPastePreview — setup', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let cells: Cell[]
  let getCells: ReturnType<typeof vi.fn>
  let setCells: ReturnType<typeof vi.fn>
  let onCommit: ReturnType<typeof vi.fn>
  let onCancel: ReturnType<typeof vi.fn>
  let handler: PastePreviewHandler

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    cells = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    getCells = vi.fn().mockResolvedValue([])
    setCells = vi.fn()
    onCommit = vi.fn()
    onCancel = vi.fn()

    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('getCurrentOffset returns (0,0) initially', () => {
    expect(handler.getCurrentOffset()).toEqual({ x: 0, y: 0 })
  })
})

describe('createPastePreview — mouse move', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let cells: Cell[]
  let getCells: ReturnType<typeof vi.fn>
  let setCells: ReturnType<typeof vi.fn>
  let onCommit: ReturnType<typeof vi.fn>
  let onCancel: ReturnType<typeof vi.fn>
  let onMove: ReturnType<typeof vi.fn>
  let handler: PastePreviewHandler

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    cells = [{ x: 0, y: 0 }]
    getCells = vi.fn().mockResolvedValue([])
    setCells = vi.fn()
    onCommit = vi.fn()
    onCancel = vi.fn()
    onMove = vi.fn()

    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
      onMove,
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('calls onMove with grid cell coords on mouse move', () => {
    // zoom=16, camera at 0,0 → px(32,16) → world(2.0, 1.0) → cell(2, 1)
    mouseMove(32, 16)
    expect(onMove).toHaveBeenCalledWith(2, 1)
  })

  it('updates getCurrentOffset after mouse move', () => {
    mouseMove(32, 16)
    expect(handler.getCurrentOffset()).toEqual({ x: 2, y: 1 })
  })

  it('floors fractional world coordinates to cell', () => {
    // px(17, 1) → world(1.0625, 0.0625) → cell(1, 0)
    mouseMove(17, 1)
    expect(handler.getCurrentOffset()).toEqual({ x: 1, y: 0 })
  })
})

describe('createPastePreview — commit on click', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let getCells: ReturnType<typeof vi.fn>
  let setCells: ReturnType<typeof vi.fn>
  let onCommit: ReturnType<typeof vi.fn>
  let onCancel: ReturnType<typeof vi.fn>
  let handler: PastePreviewHandler

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    getCells = vi.fn().mockResolvedValue([])
    setCells = vi.fn()
    onCommit = vi.fn()
    onCancel = vi.fn()
  })

  afterEach(() => {
    handler.dispose()
  })

  it('places cells offset by cursor position on click', async () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
    })

    // Click at px(16,0) → cell(1,0) → offset=(1,0)
    mouseDown(canvas, 16, 0)
    await Promise.resolve()
    await Promise.resolve()

    expect(setCells).toHaveBeenCalledOnce()
    const placed = setCells.mock.calls[0]![0] as Cell[]
    expect(cellSet(placed)).toEqual(
      cellSet([
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    )
  })

  it('merges with existing cells without duplicates', async () => {
    const cells: Cell[] = [{ x: 0, y: 0 }]
    const existing: Cell[] = [
      { x: 1, y: 0 },
      { x: 5, y: 5 },
    ]
    getCells.mockResolvedValue(existing)

    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
    })

    // Click at px(16,0) → cell(1,0) → places cell(1,0) which already exists
    mouseDown(canvas, 16, 0)
    await Promise.resolve()
    await Promise.resolve()

    const placed = setCells.mock.calls[0]![0] as Cell[]
    // Should have existing cells + new cells, no duplicates
    expect(cellSet(placed)).toEqual(
      cellSet([
        { x: 1, y: 0 },
        { x: 5, y: 5 },
      ]),
    )
  })

  it('calls onCommit after placing cells', async () => {
    const cells: Cell[] = [{ x: 0, y: 0 }]
    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
    })

    mouseDown(canvas, 0, 0)
    await Promise.resolve()
    await Promise.resolve()

    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('calls onBeforeChange with snapshot before committing', async () => {
    const cells: Cell[] = [{ x: 0, y: 0 }]
    const existing: Cell[] = [{ x: 3, y: 3 }]
    getCells.mockResolvedValue(existing)
    const onBeforeChange = vi.fn()

    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onBeforeChange,
      onCommit,
      onCancel,
    })

    mouseDown(canvas, 0, 0)
    await Promise.resolve()
    await Promise.resolve()

    expect(onBeforeChange).toHaveBeenCalledWith(existing)
  })

  it('ignores non-left-button mouse clicks', async () => {
    const cells: Cell[] = [{ x: 0, y: 0 }]
    handler = createPastePreview(canvas, cells, {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
    })

    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 0, clientY: 0, button: 2, bubbles: true }),
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(setCells).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('createPastePreview — cancel on Escape', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let getCells: ReturnType<typeof vi.fn>
  let setCells: ReturnType<typeof vi.fn>
  let onCommit: ReturnType<typeof vi.fn>
  let onCancel: ReturnType<typeof vi.fn>
  let handler: PastePreviewHandler

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    getCells = vi.fn().mockResolvedValue([])
    setCells = vi.fn()
    onCommit = vi.fn()
    onCancel = vi.fn()

    handler = createPastePreview(canvas, [{ x: 0, y: 0 }], {
      getCamera: () => camera,
      getCells,
      setCells,
      onCommit,
      onCancel,
    })
  })

  afterEach(() => {
    handler.dispose()
  })

  it('calls onCancel when Escape is pressed', () => {
    keyDown('Escape')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onCommit or setCells when Escape is pressed', () => {
    keyDown('Escape')
    expect(onCommit).not.toHaveBeenCalled()
    expect(setCells).not.toHaveBeenCalled()
  })

  it('does not cancel on other keys', () => {
    keyDown('Enter')
    keyDown('Delete')
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('createPastePreview — dispose', () => {
  it('removes event listeners after dispose', async () => {
    const canvas = makeCanvas()
    const getCells = vi.fn().mockResolvedValue([])
    const setCells = vi.fn()
    const onCommit = vi.fn()
    const onCancel = vi.fn()

    const handler = createPastePreview(canvas, [{ x: 0, y: 0 }], {
      getCamera: () => makeCamera(),
      getCells,
      setCells,
      onCommit,
      onCancel,
    })

    handler.dispose()

    // After dispose, clicks and key presses should have no effect
    mouseDown(canvas, 0, 0)
    await Promise.resolve()
    await Promise.resolve()
    keyDown('Escape')

    expect(setCells).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
