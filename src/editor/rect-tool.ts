import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface RectToolOptions {
  getCamera: () => Camera
  getActiveTool: () => DrawingTool
  /** Returns true when the rectangle should be filled, false for outline only. */
  getRectFilled: () => boolean
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
 * Returns all cells on the outline (perimeter) of the axis-aligned rectangle
 * with corners at (x0, y0) and (x1, y1), inclusive.
 */
export function rectOutline(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)

  const cells: Array<{ x: number; y: number }> = []

  // Top and bottom rows
  for (let x = minX; x <= maxX; x++) {
    cells.push({ x, y: minY })
    if (maxY !== minY) cells.push({ x, y: maxY })
  }
  // Left and right columns (excluding corners already added)
  for (let y = minY + 1; y < maxY; y++) {
    cells.push({ x: minX, y })
    if (maxX !== minX) cells.push({ x: maxX, y })
  }

  return cells
}

/**
 * Returns all cells inside the axis-aligned rectangle with corners at
 * (x0, y0) and (x1, y1), inclusive (filled rectangle).
 */
export function rectFilled(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)

  const cells: Array<{ x: number; y: number }> = []
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      cells.push({ x, y })
    }
  }
  return cells
}

/**
 * Attach rectangle-drawing tool event handlers to a canvas.
 *
 * When the active tool is 'rect', a left mouse press-and-drag draws a rectangle
 * from the click position to the release position.  The rectangle can be either
 * filled or outline depending on getRectFilled().  While dragging, a live preview
 * is shown.  Releasing the mouse commits the preview as the new simulation state.
 *
 * Returns a dispose function that removes all event listeners.
 */
export function createRectTool(canvas: HTMLCanvasElement, options: RectToolOptions): () => void {
  const { getCamera, getActiveTool, getRectFilled, getCells, setCells, onBeforeChange } = options

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

  function applyRect(endX: number, endY: number): void {
    if (startCell === null) return
    const shapeCells = getRectFilled()
      ? rectFilled(startCell.x, startCell.y, endX, endY)
      : rectOutline(startCell.x, startCell.y, endX, endY)
    const result = new Set<string>(originalCells)
    for (const c of shapeCells) {
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
    if (e.button !== 0 || getActiveTool() !== 'rect') return

    startCell = screenToCell(e.clientX, e.clientY)
    isDrawing = true
    pendingEndpoint = { ...startCell }

    getCells().then((cells) => {
      if (!isDrawing) return // stroke was cancelled before cells arrived

      onBeforeChange?.(cells)
      originalCells = new Set(cells.map((c) => cellKey(c.x, c.y)))

      // Apply the buffered endpoint (latest position seen so far)
      if (pendingEndpoint !== null) {
        applyRect(pendingEndpoint.x, pendingEndpoint.y)
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
      applyRect(x, y)
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (!isDrawing) return
    // If getCells has already resolved, commit the final rect position.
    // If still pending, the async callback will be cancelled by isDrawing=false.
    if (pendingEndpoint === null && startCell !== null) {
      const { x, y } = screenToCell(e.clientX, e.clientY)
      applyRect(x, y)
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
