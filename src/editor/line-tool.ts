import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface LineToolOptions {
  getCamera: () => Camera
  getActiveTool: () => DrawingTool
  /** Fetch all current live cells from the simulation (async). */
  getCells: () => Promise<Cell[]>
  /** Replace all live cells in the simulation. */
  setCells: (cells: Cell[]) => void
  /** Called once per stroke with the cell snapshot taken before the first change. */
  onBeforeChange?: (snapshot: Cell[]) => void
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function parseKey(key: string): Cell {
  const comma = key.indexOf(',')
  return { x: Number(key.slice(0, comma)), y: Number(key.slice(comma + 1)) }
}

/**
 * Bresenham's line algorithm.
 * Returns all grid cells on the line from (x0, y0) to (x1, y1), inclusive.
 */
export function bresenham(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0
  let y = y0

  for (;;) {
    cells.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return cells
}

/**
 * Attach line-drawing tool event handlers to a canvas.
 *
 * When the active tool is 'line', a left mouse press-and-drag draws a straight
 * line of cells from the click position to the release position using
 * Bresenham's algorithm.  While dragging, a live preview is shown by merging
 * the line cells onto the existing cell set.  Releasing the mouse commits the
 * preview as the new simulation state.
 *
 * Returns a dispose function that removes all event listeners.
 */
export function createLineTool(canvas: HTMLCanvasElement, options: LineToolOptions): () => void {
  const { getCamera, getActiveTool, getCells, setCells, onBeforeChange } = options

  let isDrawing = false
  let startCell: { x: number; y: number } | null = null
  /** Original cell set (string keys) captured at stroke start. */
  let originalCells = new Set<string>()
  /**
   * Buffered current endpoint gathered before the async getCells() resolves.
   * Null means we are past the async-init phase.
   */
  let pendingEndpoint: { x: number; y: number } | null = null

  // ── Helpers ───────────────────────────────────────────────────────────────

  function screenToCell(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const world = screenToWorld(getCamera(), clientX - rect.left, clientY - rect.top)
    return { x: Math.floor(world.x), y: Math.floor(world.y) }
  }

  function applyLine(endX: number, endY: number): void {
    if (startCell === null) return
    const lineCells = bresenham(startCell.x, startCell.y, endX, endY)
    const result = new Set<string>(originalCells)
    for (const c of lineCells) {
      result.add(cellKey(c.x, c.y))
    }
    const cells: Cell[] = []
    for (const key of result) {
      cells.push(parseKey(key))
    }
    setCells(cells)
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || getActiveTool() !== 'line') return

    startCell = screenToCell(e.clientX, e.clientY)
    isDrawing = true
    pendingEndpoint = { ...startCell }

    getCells().then((cells) => {
      if (!isDrawing) return // stroke was cancelled before cells arrived

      onBeforeChange?.(cells)
      originalCells = new Set(cells.map((c) => cellKey(c.x, c.y)))

      // Apply the buffered endpoint (latest position seen so far)
      if (pendingEndpoint !== null) {
        applyLine(pendingEndpoint.x, pendingEndpoint.y)
        pendingEndpoint = null
      }
    })
  }

  function onMouseMove(e: MouseEvent): void {
    if (!isDrawing) return
    const { x, y } = screenToCell(e.clientX, e.clientY)
    if (pendingEndpoint !== null) {
      // Still waiting for getCells() — update the buffered endpoint
      pendingEndpoint = { x, y }
    } else {
      applyLine(x, y)
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (!isDrawing) return
    // If getCells has already resolved, commit the final line position.
    // If still pending, the async callback will be cancelled by isDrawing=false.
    if (pendingEndpoint === null && startCell !== null) {
      const { x, y } = screenToCell(e.clientX, e.clientY)
      applyLine(x, y)
    }
    isDrawing = false
    startCell = null
    originalCells = new Set()
    pendingEndpoint = null
  }

  // ── Register listeners ────────────────────────────────────────────────────

  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  return function dispose() {
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}
