import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'
import type { SelectionRect } from './selection-tool'

export interface LassoPoint {
  x: number
  y: number
}

export interface LassoPolygon {
  /** Polygon vertices in world (grid float) coordinates. */
  points: LassoPoint[]
  /** Axis-aligned bounding box in cell coordinates. */
  bounds: SelectionRect
}

export interface LassoToolOptions {
  getCamera: () => Camera
  getActiveTool: () => DrawingTool
  getCells: () => Promise<Cell[]>
  setCells: (cells: Cell[]) => void
  onBeforeChange?: (snapshot: Cell[]) => void
  /** Called whenever the lasso changes (null = cleared). */
  onLassoChange?: (lasso: LassoPolygon | null) => void
}

export interface LassoToolHandler {
  dispose: () => void
  getLasso: () => LassoPolygon | null
  deleteSelection: () => void
  copySelection: () => Cell[] | null
  cutSelection: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function parseKey(key: string): Cell {
  const comma = key.indexOf(',')
  return { x: Number(key.slice(0, comma)), y: Number(key.slice(comma + 1)) }
}

/**
 * Ray-casting point-in-polygon test.
 * Returns true when (px, py) is inside the polygon defined by `points`.
 */
function pointInPolygon(px: number, py: number, points: LassoPoint[]): boolean {
  const n = points.length
  if (n < 3) return false
  let inside = false
  let j = n - 1
  for (let i = 0; i < n; i++) {
    const pi = points[i]!
    const pj = points[j]!
    const xi = pi.x
    const yi = pi.y
    const xj = pj.x
    const yj = pj.y
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
    j = i
  }
  return inside
}

function computeBounds(points: LassoPoint[]): SelectionRect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return {
    minX: Math.floor(minX),
    minY: Math.floor(minY),
    maxX: Math.ceil(maxX),
    maxY: Math.ceil(maxY),
  }
}

/**
 * Return the set of cell keys whose centres (x+0.5, y+0.5) fall inside
 * the polygon.
 */
function cellsInsidePolygon(polygon: LassoPolygon): Set<string> {
  const selected = new Set<string>()
  const { bounds, points } = polygon
  for (let cy = bounds.minY; cy <= bounds.maxY; cy++) {
    for (let cx = bounds.minX; cx <= bounds.maxX; cx++) {
      if (pointInPolygon(cx + 0.5, cy + 0.5, points)) {
        selected.add(cellKey(cx, cy))
      }
    }
  }
  return selected
}

function translatePolygon(polygon: LassoPolygon, dx: number, dy: number): LassoPolygon {
  return {
    points: polygon.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    bounds: {
      minX: polygon.bounds.minX + dx,
      minY: polygon.bounds.minY + dy,
      maxX: polygon.bounds.maxX + dx,
      maxY: polygon.bounds.maxY + dy,
    },
  }
}

// ---------------------------------------------------------------------------
// createLassoTool
// ---------------------------------------------------------------------------

/**
 * Attach freeform-lasso selection tool event handlers to a canvas.
 *
 * Phases:
 *   idle     — no selection, no drag
 *   drawing  — user is dragging to draw the lasso polygon
 *   selected — polygon is closed, cells identified
 *   moving   — user is dragging the selected cells to a new position
 */
export function createLassoTool(
  canvas: HTMLCanvasElement,
  options: LassoToolOptions,
): LassoToolHandler {
  const { getCamera, getActiveTool, getCells, setCells, onBeforeChange, onLassoChange } = options

  type Phase = 'idle' | 'drawing' | 'selected' | 'moving'
  let phase: Phase = 'idle'

  /** Current closed polygon, or null when idle/drawing. */
  let lasso: LassoPolygon | null = null

  /** Points collected so far during the drawing phase. */
  let drawPoints: LassoPoint[] = []

  /**
   * Set of cell keys inside the lasso, cached once the polygon is closed.
   * Used for copy, cut, and move-start detection.
   */
  let cachedSelected = new Set<string>()

  /** Snapshot of cells at start of move. */
  let moveSnapshotInside = new Set<string>()
  let moveSnapshotOutside = new Set<string>()

  /** The cell coordinate under the cursor at move start. */
  let moveStartCell: { x: number; y: number } | null = null
  /** The lasso polygon at move start. */
  let moveStartLasso: LassoPolygon | null = null
  let movePending = false

  // ── Helpers ───────────────────────────────────────────────────────────────

  function screenToWorldFloat(clientX: number, clientY: number): LassoPoint {
    const rect = canvas.getBoundingClientRect()
    return screenToWorld(getCamera(), clientX - rect.left, clientY - rect.top)
  }

  function screenToCell(clientX: number, clientY: number): { x: number; y: number } {
    const w = screenToWorldFloat(clientX, clientY)
    return { x: Math.floor(w.x), y: Math.floor(w.y) }
  }

  function setLasso(next: LassoPolygon | null): void {
    lasso = next
    onLassoChange?.(next)
  }

  function clearLasso(): void {
    lasso = null
    phase = 'idle'
    drawPoints = []
    cachedSelected = new Set()
    moveStartCell = null
    moveStartLasso = null
    movePending = false
    onLassoChange?.(null)
  }

  function applyMovedCells(dx: number, dy: number): void {
    const result = new Set<string>(moveSnapshotOutside)
    for (const key of moveSnapshotInside) {
      const c = parseKey(key)
      result.add(cellKey(c.x + dx, c.y + dy))
    }
    const cells: Cell[] = []
    for (const key of result) {
      cells.push(parseKey(key))
    }
    setCells(cells)
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || getActiveTool() !== 'lasso') return

    const cell = screenToCell(e.clientX, e.clientY)

    if (phase === 'selected' && lasso !== null && cachedSelected.has(cellKey(cell.x, cell.y))) {
      // Start moving the selected cells
      phase = 'moving'
      moveStartCell = cell
      moveStartLasso = lasso
      movePending = true

      getCells().then((cells) => {
        if (phase !== 'moving') return
        onBeforeChange?.(cells)
        const allKeys = new Set(cells.map((c) => cellKey(c.x, c.y)))
        moveSnapshotInside = new Set<string>()
        moveSnapshotOutside = new Set<string>()
        for (const key of allKeys) {
          if (cachedSelected.has(key)) {
            moveSnapshotInside.add(key)
          } else {
            moveSnapshotOutside.add(key)
          }
        }
        movePending = false
      })
    } else {
      // Start drawing the lasso
      phase = 'drawing'
      const pt = screenToWorldFloat(e.clientX, e.clientY)
      drawPoints = [pt]
      // Show a degenerate polygon while drawing starts
      setLasso({ points: [pt], bounds: computeBounds([pt]) })
    }
  }

  function onMouseMove(e: MouseEvent): void {
    if (phase === 'drawing') {
      const pt = screenToWorldFloat(e.clientX, e.clientY)
      const last = drawPoints[drawPoints.length - 1]!
      // Only add the point if it has moved (avoid zero-length segments)
      if (pt.x !== last.x || pt.y !== last.y) {
        drawPoints.push(pt)
      }
      setLasso({ points: [...drawPoints], bounds: computeBounds(drawPoints) })
      return
    }

    if (phase === 'moving' && moveStartCell !== null && moveStartLasso !== null) {
      const cell = screenToCell(e.clientX, e.clientY)
      const dx = cell.x - moveStartCell.x
      const dy = cell.y - moveStartCell.y

      setLasso(translatePolygon(moveStartLasso, dx, dy))

      if (!movePending) {
        applyMovedCells(dx, dy)
      }
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (phase === 'drawing') {
      const pt = screenToWorldFloat(e.clientX, e.clientY)
      const last = drawPoints[drawPoints.length - 1]!
      if (pt.x !== last.x || pt.y !== last.y) {
        drawPoints.push(pt)
      }

      const closed: LassoPolygon = { points: [...drawPoints], bounds: computeBounds(drawPoints) }
      setLasso(closed)
      phase = 'selected'
      drawPoints = []

      // Cache cells inside the polygon
      cachedSelected = cellsInsidePolygon(closed)
      return
    }

    if (phase === 'moving' && moveStartCell !== null && moveStartLasso !== null) {
      const cell = screenToCell(e.clientX, e.clientY)
      const dx = cell.x - moveStartCell.x
      const dy = cell.y - moveStartCell.y

      const newLasso = translatePolygon(moveStartLasso, dx, dy)
      setLasso(newLasso)

      if (!movePending) {
        applyMovedCells(dx, dy)
      }

      phase = 'selected'
      moveStartCell = null
      moveStartLasso = null
      movePending = false

      // Refresh cached selected cells after move
      cachedSelected = cellsInsidePolygon(newLasso)
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (getActiveTool() !== 'lasso') return
    if (e.key === 'Escape') {
      clearLasso()
      return
    }
    if (phase !== 'selected' || lasso === null) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelection()
    }
  }

  // ── Register listeners ────────────────────────────────────────────────────

  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)

  // ── Operations ────────────────────────────────────────────────────────────

  function deleteSelection(): void {
    if (lasso === null) return
    const currentSelected = new Set(cachedSelected)

    getCells().then((cells) => {
      onBeforeChange?.(cells)
      const newCells = cells.filter((c) => !currentSelected.has(cellKey(c.x, c.y)))
      setCells(newCells)
      clearLasso()
    })
  }

  function copySelection(): Cell[] | null {
    if (lasso === null || cachedSelected.size === 0) return null
    const originX = lasso.bounds.minX
    const originY = lasso.bounds.minY
    const result: Cell[] = []
    for (const key of cachedSelected) {
      const c = parseKey(key)
      result.push({ x: c.x - originX, y: c.y - originY })
    }
    return result
  }

  function cutSelection(): void {
    if (lasso === null) return
    const currentSelected = new Set(cachedSelected)

    getCells().then((cells) => {
      onBeforeChange?.(cells)
      const newCells = cells.filter((c) => !currentSelected.has(cellKey(c.x, c.y)))
      setCells(newCells)
      clearLasso()
    })
  }

  return {
    dispose() {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      clearLasso()
    },
    getLasso() {
      return lasso
    },
    deleteSelection,
    copySelection,
    cutSelection,
  }
}
