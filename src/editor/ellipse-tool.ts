import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface EllipseToolOptions {
  getCamera: () => Camera
  getActiveTool: () => DrawingTool
  /** Returns true when the ellipse should be filled, false for outline only. */
  getEllipseFilled: () => boolean
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
 * Returns all cells on the outline (perimeter) of the ellipse inscribed in the
 * axis-aligned bounding box with corners (x0, y0) and (x1, y1), inclusive.
 *
 * Uses a dual-scan approach (scan in x and scan in y) to produce a connected
 * outline without gaps even for steep or shallow ellipses.
 */
export function ellipseOutline(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)

  // Degenerate: single point
  if (minX === maxX && minY === maxY) return [{ x: minX, y: minY }]

  // Degenerate: horizontal line
  if (minY === maxY) {
    const cells: Array<{ x: number; y: number }> = []
    for (let x = minX; x <= maxX; x++) cells.push({ x, y: minY })
    return cells
  }

  // Degenerate: vertical line
  if (minX === maxX) {
    const cells: Array<{ x: number; y: number }> = []
    for (let y = minY; y <= maxY; y++) cells.push({ x: minX, y })
    return cells
  }

  // Use 2× coordinates to avoid fractions when the center or radii are half-integers.
  // In 2× space: center = (minX + maxX, minY + maxY), diameters = (maxX-minX, maxY-minY).
  // A point (x,y) is on the ellipse when:
  //   (2x - cx2)^2 * b2^2 + (2y - cy2)^2 * a2^2 = a2^2 * b2^2
  const a2 = maxX - minX // x-diameter
  const b2 = maxY - minY // y-diameter
  const cx2 = minX + maxX
  const cy2 = minY + maxY

  const cellSet = new Set<string>()

  // Scan in x: for each integer x, find the top and bottom ellipse y values.
  for (let x = minX; x <= maxX; x++) {
    const dx2 = 2 * x - cx2
    const radicand = a2 * a2 - dx2 * dx2
    if (radicand < 0) continue
    const dy2 = (b2 * Math.sqrt(radicand)) / a2
    const yTop = Math.round((cy2 + dy2) / 2)
    const yBot = Math.round((cy2 - dy2) / 2)
    cellSet.add(cellKey(x, yTop))
    if (yTop !== yBot) cellSet.add(cellKey(x, yBot))
  }

  // Scan in y: for each integer y, find the left and right ellipse x values.
  for (let y = minY; y <= maxY; y++) {
    const dy2 = 2 * y - cy2
    const radicand = b2 * b2 - dy2 * dy2
    if (radicand < 0) continue
    const dx2 = (a2 * Math.sqrt(radicand)) / b2
    const xRight = Math.round((cx2 + dx2) / 2)
    const xLeft = Math.round((cx2 - dx2) / 2)
    cellSet.add(cellKey(xRight, y))
    if (xRight !== xLeft) cellSet.add(cellKey(xLeft, y))
  }

  return Array.from(cellSet).map(parseKey)
}

/**
 * Returns all cells inside the ellipse inscribed in the axis-aligned bounding
 * box with corners (x0, y0) and (x1, y1), inclusive (filled ellipse).
 *
 * Built from the outline: for each scan line, fills all cells between the
 * leftmost and rightmost outline cells at that y, guaranteeing the filled
 * ellipse is always a superset of its outline.
 */
export function ellipseFilled(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const outline = ellipseOutline(x0, y0, x1, y1)

  // For degenerate cases (point, line) the outline IS the filled shape.
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  if (minX === maxX || minY === maxY) return outline

  // Group outline cells by y, tracking x extents per row.
  const byY = new Map<number, { minX: number; maxX: number }>()
  for (const { x, y } of outline) {
    const row = byY.get(y)
    if (!row) {
      byY.set(y, { minX: x, maxX: x })
    } else {
      if (x < row.minX) row.minX = x
      if (x > row.maxX) row.maxX = x
    }
  }

  // Fill each scan line from its leftmost to rightmost outline cell.
  const cells: Array<{ x: number; y: number }> = []
  for (const [y, { minX: lx, maxX: rx }] of byY) {
    for (let x = lx; x <= rx; x++) {
      cells.push({ x, y })
    }
  }
  return cells
}

/**
 * Attach ellipse-drawing tool event handlers to a canvas.
 *
 * When the active tool is 'ellipse', a left mouse press-and-drag draws an
 * ellipse inscribed in the bounding box from the click position to the release
 * position.  The ellipse can be filled or outline depending on getEllipseFilled().
 * While dragging, a live preview is shown.  Releasing commits the preview as
 * the new simulation state.
 *
 * Returns a dispose function that removes all event listeners.
 */
export function createEllipseTool(
  canvas: HTMLCanvasElement,
  options: EllipseToolOptions,
): () => void {
  const { getCamera, getActiveTool, getEllipseFilled, getCells, setCells, onBeforeChange } = options

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

  function applyEllipse(endX: number, endY: number): void {
    if (startCell === null) return
    const shapeCells = getEllipseFilled()
      ? ellipseFilled(startCell.x, startCell.y, endX, endY)
      : ellipseOutline(startCell.x, startCell.y, endX, endY)
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
    if (e.button !== 0 || getActiveTool() !== 'ellipse') return

    startCell = screenToCell(e.clientX, e.clientY)
    isDrawing = true
    pendingEndpoint = { ...startCell }

    getCells().then((cells) => {
      if (!isDrawing) return // stroke was cancelled before cells arrived

      onBeforeChange?.(cells)
      originalCells = new Set(cells.map((c) => cellKey(c.x, c.y)))

      // Apply the buffered endpoint (latest position seen so far)
      if (pendingEndpoint !== null) {
        applyEllipse(pendingEndpoint.x, pendingEndpoint.y)
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
      applyEllipse(x, y)
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (!isDrawing) return
    // If getCells has already resolved, commit the final ellipse position.
    // If still pending, the async callback will be cancelled by isDrawing=false.
    if (pendingEndpoint === null && startCell !== null) {
      const { x, y } = screenToCell(e.clientX, e.clientY)
      applyEllipse(x, y)
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
