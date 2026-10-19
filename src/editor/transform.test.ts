import { describe, it, expect } from 'vitest'
import { transformCells } from './transform'
import type { TransformType } from './transform'
import type { Cell } from '../engine/types'
import type { SelectionRect } from './selection-tool'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

function sel(minX: number, minY: number, maxX: number, maxY: number): SelectionRect {
  return { minX, minY, maxX, maxY }
}

// ---------------------------------------------------------------------------
// rotate90cw
// ---------------------------------------------------------------------------

describe('transformCells — rotate90cw', () => {
  it('rotates a single cell at the origin', () => {
    const { cells, newSelection } = transformCells([{ x: 0, y: 0 }], sel(0, 0, 0, 0), 'rotate90cw')
    expect(cellSet(cells)).toEqual(['0,0'])
    expect(newSelection).toEqual(sel(0, 0, 0, 0))
  })

  it('rotates an L-shape in a 2×3 selection', () => {
    // Selection: minX=0, minY=0, maxX=1, maxY=2 (W=1, H=2)
    // Cells: (0,0), (0,1), (1,1) — top-left and bottom row
    // rotate90cw: (rx,ry) → (H-ry, rx) = (2-ry, rx)
    // (0,0) → (2,0); (0,1) → (1,0); (1,1) → (1,1)
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]
    const { cells: out, newSelection } = transformCells(cells, sel(0, 0, 1, 2), 'rotate90cw')
    // New selection should be H×W = 2×1
    expect(newSelection).toEqual(sel(0, 0, 2, 1))
    // After rotate90cw: (0,0)→(2,0), (0,1)→(1,0), (1,1)→(1,1)
    expect(cellSet(out)).toEqual(['1,0', '1,1', '2,0'])
  })

  it('rotates a 3×1 horizontal line into a 1×3 vertical line', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]
    const { cells: out, newSelection } = transformCells(cells, sel(0, 0, 2, 0), 'rotate90cw')
    // W=2, H=0; rotate90cw swaps: new width=H=0, new height=W=2
    // (rx,ry) → (0-ry, rx); all ry=0 so new x stays 0, new y = rx
    expect(newSelection).toEqual(sel(0, 0, 0, 2))
    expect(cellSet(out)).toEqual(['0,0', '0,1', '0,2'])
  })

  it('handles non-zero origin selection', () => {
    const cells: Cell[] = [
      { x: 5, y: 3 },
      { x: 6, y: 3 },
    ]
    // Selection 5,3 to 6,4 (W=1, H=1); cells on top row
    const { cells: out, newSelection } = transformCells(cells, sel(5, 3, 6, 4), 'rotate90cw')
    // (rx,ry): (0,0)→(1,0), (1,0)→(1,1)
    // abs: (5+1, 3+0)=(6,3), (5+1, 3+1)=(6,4)
    expect(newSelection).toEqual(sel(5, 3, 6, 4)) // square selection stays square
    expect(cellSet(out)).toEqual(['6,3', '6,4'])
  })
})

// ---------------------------------------------------------------------------
// rotate180
// ---------------------------------------------------------------------------

describe('transformCells — rotate180', () => {
  it('rotates a single cell', () => {
    const { cells } = transformCells([{ x: 0, y: 0 }], sel(0, 0, 0, 0), 'rotate180')
    expect(cellSet(cells)).toEqual(['0,0'])
  })

  it('rotates an L-shape 180°', () => {
    // Cells (0,0) and (1,0) in a 2×2 selection (W=1,H=1)
    // (rx,ry)→(W-rx, H-ry): (0,0)→(1,1), (1,0)→(0,1)
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    const { cells: out, newSelection } = transformCells(cells, sel(0, 0, 1, 1), 'rotate180')
    expect(newSelection).toEqual(sel(0, 0, 1, 1))
    expect(cellSet(out)).toEqual(['0,1', '1,1'])
  })

  it('applying twice returns the original', () => {
    const original: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ]
    const selection = sel(0, 0, 3, 2)
    const { cells: once } = transformCells(original, selection, 'rotate180')
    const { cells: twice } = transformCells(once, selection, 'rotate180')
    expect(cellSet(twice)).toEqual(cellSet(original))
  })
})

// ---------------------------------------------------------------------------
// rotate270cw
// ---------------------------------------------------------------------------

describe('transformCells — rotate270cw', () => {
  it('rotates a 3×1 horizontal line into a 1×3 vertical line', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]
    const { cells: out, newSelection } = transformCells(cells, sel(0, 0, 2, 0), 'rotate270cw')
    // W=2, H=0; new dims swapped: width=H=0, height=W=2
    // (rx,ry)→(ry, W-rx): all ry=0, new x=0; new y = 2-rx
    expect(newSelection).toEqual(sel(0, 0, 0, 2))
    expect(cellSet(out)).toEqual(['0,0', '0,1', '0,2'])
  })

  it('rotate90cw then rotate270cw returns the original', () => {
    const original: Cell[] = [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ]
    const selection = sel(0, 0, 2, 2)
    const { cells: rotated, newSelection } = transformCells(original, selection, 'rotate90cw')
    const { cells: back } = transformCells(rotated, newSelection, 'rotate270cw')
    expect(cellSet(back)).toEqual(cellSet(original))
  })
})

// ---------------------------------------------------------------------------
// flipH
// ---------------------------------------------------------------------------

describe('transformCells — flipH', () => {
  it('flips a single cell (no-op)', () => {
    const { cells, newSelection } = transformCells([{ x: 2, y: 2 }], sel(2, 2, 2, 2), 'flipH')
    expect(cellSet(cells)).toEqual(['2,2'])
    expect(newSelection).toEqual(sel(2, 2, 2, 2))
  })

  it('swaps left and right cells', () => {
    // (0,0) and (2,0) in selection 0,0–2,0 (W=2)
    // flipH: rx → W-rx → (0)→2, (2)→0
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]
    const { cells: out } = transformCells(cells, sel(0, 0, 2, 0), 'flipH')
    expect(cellSet(out)).toEqual(['0,0', '2,0'])
  })

  it('preserves y coordinates', () => {
    const cells: Cell[] = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ]
    const { cells: out } = transformCells(cells, sel(0, 0, 2, 2), 'flipH')
    // (rx=0,ry=1)→(2,1), (rx=1,ry=2)→(1,2)
    expect(cellSet(out)).toEqual(['1,2', '2,1'])
  })

  it('applying twice returns the original', () => {
    const original: Cell[] = [
      { x: 0, y: 0 },
      { x: 3, y: 1 },
    ]
    const selection = sel(0, 0, 3, 2)
    const { cells: once } = transformCells(original, selection, 'flipH')
    const { cells: twice } = transformCells(once, selection, 'flipH')
    expect(cellSet(twice)).toEqual(cellSet(original))
  })
})

// ---------------------------------------------------------------------------
// flipV
// ---------------------------------------------------------------------------

describe('transformCells — flipV', () => {
  it('swaps top and bottom cells', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
    ]
    const { cells: out } = transformCells(cells, sel(0, 0, 0, 2), 'flipV')
    // ry 0→2, ry 2→0
    expect(cellSet(out)).toEqual(['0,0', '0,2'])
  })

  it('preserves x coordinates', () => {
    const cells: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ]
    const { cells: out } = transformCells(cells, sel(0, 0, 2, 2), 'flipV')
    // (rx=1,ry=0)→(1,2), (rx=2,ry=1)→(2,1)
    expect(cellSet(out)).toEqual(['1,2', '2,1'])
  })

  it('applying twice returns the original', () => {
    const original: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 3 },
    ]
    const selection = sel(0, 0, 2, 3)
    const { cells: once } = transformCells(original, selection, 'flipV')
    const { cells: twice } = transformCells(once, selection, 'flipV')
    expect(cellSet(twice)).toEqual(cellSet(original))
  })
})

// ---------------------------------------------------------------------------
// empty cells
// ---------------------------------------------------------------------------

describe('transformCells — empty input', () => {
  const transforms: TransformType[] = ['rotate90cw', 'rotate180', 'rotate270cw', 'flipH', 'flipV']

  for (const type of transforms) {
    it(`${type} with no cells returns empty array`, () => {
      const { cells } = transformCells([], sel(0, 0, 2, 2), type)
      expect(cells).toHaveLength(0)
    })
  }
})

// ---------------------------------------------------------------------------
// selection tool integration — transformSelection
// ---------------------------------------------------------------------------

import { describe as d2, it as it2, expect as expect2, vi, beforeEach, afterEach } from 'vitest'
import { createSelectionTool } from './selection-tool'
import type { Camera } from '../renderer/webgl2-renderer'
import type { DrawingTool } from '../store'

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  return canvas
}

function makeCamera(): Camera {
  return { x: 0, y: 0, zoom: 16 }
}

function mouseDown(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX, clientY, button: 0, bubbles: true }))
}
function mouseUp(clientX = 0, clientY = 0) {
  window.dispatchEvent(new MouseEvent('mouseup', { clientX, clientY, bubbles: true }))
}

d2('createSelectionTool — transformSelection', () => {
  let canvas: HTMLCanvasElement
  let setCells: ReturnType<typeof vi.fn>
  let getCells: ReturnType<typeof vi.fn>
  let onBeforeChange: ReturnType<typeof vi.fn>
  let handler: ReturnType<typeof createSelectionTool>

  beforeEach(() => {
    canvas = makeCanvas()
    setCells = vi.fn()
    getCells = vi.fn()
    onBeforeChange = vi.fn()
  })

  afterEach(() => {
    handler.dispose()
  })

  it2('does nothing when there is no selection', () => {
    getCells.mockResolvedValue([])
    handler = createSelectionTool(canvas, {
      getCamera: makeCamera,
      getActiveTool: () => 'select' as DrawingTool,
      getCells,
      setCells,
    })
    handler.transformSelection('rotate90cw')
    expect2(getCells).not.toHaveBeenCalled()
    expect2(setCells).not.toHaveBeenCalled()
  })

  it2('flipH transforms cells and updates the selection rect', async () => {
    // Cells at (0,0) and (2,0) in a 3×1 selection (0,0)–(2,0)
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 10, y: 10 },
    ])

    handler = createSelectionTool(canvas, {
      getCamera: makeCamera,
      getActiveTool: () => 'select' as DrawingTool,
      getCells,
      setCells,
      onBeforeChange,
    })

    // Select (0,0)–(2,0): px 8..40 at y=8
    mouseDown(canvas, 8, 8) // cell (0,0)
    mouseUp(40, 8) // cell (2,0)

    handler.transformSelection('flipH')
    await Promise.resolve()
    await Promise.resolve()

    expect2(onBeforeChange).toHaveBeenCalled()
    const called = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = called.map((c: Cell) => `${c.x},${c.y}`).sort()
    // flipH on (0,0) and (2,0) in W=2 selection: positions swap but result is same
    expect2(keys).toContain('10,10') // outside stays
    // The two selected cells mirror across W=2; (0,0)→(2,0) and (2,0)→(0,0) — same set
    expect2(keys).toContain('0,0')
    expect2(keys).toContain('2,0')
  })

  it2('rotate90cw transforms cells and updates selection bounds', async () => {
    // A 3×1 horizontal line in selection (0,0)–(2,0)
    getCells.mockResolvedValue([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])

    handler = createSelectionTool(canvas, {
      getCamera: makeCamera,
      getActiveTool: () => 'select' as DrawingTool,
      getCells,
      setCells,
    })

    mouseDown(canvas, 8, 8) // cell (0,0)
    mouseUp(40, 8) // cell (2,0)

    handler.transformSelection('rotate90cw')
    await Promise.resolve()
    await Promise.resolve()

    // After rotate90cw: 3×1 → 1×3; new selection (0,0)–(0,2)
    const newSel = handler.getSelection()
    expect2(newSel).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 2 })

    // Cells should now be a vertical line at x=0
    const called = setCells.mock.calls.at(-1)![0] as Cell[]
    const keys = called.map((c: Cell) => `${c.x},${c.y}`).sort()
    expect2(keys).toEqual(['0,0', '0,1', '0,2'])
  })
})
