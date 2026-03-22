import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface SelectionRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface SelectionToolOptions {
  getCamera: () => Camera
  getActiveTool: () => DrawingTool
  getCells: () => Promise<Cell[]>
  setCells: (cells: Cell[]) => void
  onBeforeChange?: (snapshot: Cell[]) => void
  /** Called whenever the selection changes (null = selection cleared). */
  onSelectionChange?: (rect: SelectionRect | null) => void
}

export interface SelectionToolHandler {
  dispose: () => void
  /** Returns the current selection rectangle, or null if none. */
  getSelection: () => SelectionRect | null
  /** Delete all live cells inside the selection. */
  deleteSelection: () => void
  /**
   * Copy the live cells inside the selection.
   * Returns cells with coordinates relative to the selection's top-left corner,
   * or null if there is no selection.
   */
  copySelection: () => Cell[] | null
  /** Copy then delete the selected cells. */
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

function insideRect(x: number, y: number, rect: SelectionRect): boolean {
  return x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY
}

/**
 * Split a flat cell set into two sets: cells inside rect and cells outside rect.
 */
function partitionByRect(
  cells: Set<string>,
  rect: SelectionRect,
): { inside: Set<string>; outside: Set<string> } {
  const inside = new Set<string>()
  const outside = new Set<string>()
  for (const key of cells) {
    const c = parseKey(key)
    if (insideRect(c.x, c.y, rect)) {
      inside.add(key)
    } else {
      outside.add(key)
    }
  }
  return { inside, outside }
}

// ---------------------------------------------------------------------------
// createSelectionTool
// ---------------------------------------------------------------------------

/**
 * Attach rectangular-selection tool event handlers to a canvas.
 *
 * Phases:
 *   idle      — no selection, no drag
 *   selecting — user is dragging to draw the selection rectangle
 *   selected  — selection exists, ready for operations
 *   moving    — user is dragging the selected cells to a new position
 *
 * Returns a handler object with dispose() and operation methods.
 */
export function createSelectionTool(
  canvas: HTMLCanvasElement,
  options: SelectionToolOptions,
): SelectionToolHandler {
  const { getCamera, getActiveTool, getCells, setCells, onBeforeChange, onSelectionChange } =
    options

  type Phase = 'idle' | 'selecting' | 'selected' | 'moving'
  let phase: Phase = 'idle'

  /** Current selection bounds in grid coordinates. */
  let selection: SelectionRect | null = null

  /**
   * Cached cell sets populated once a selection is finalized (or a move
   * committed).  Used for copy and for computing move previews.
   */
  let cachedInside = new Set<string>()

  /** Snapshot of cells taken at the start of a move (for live preview). */
  let moveSnapshotInside = new Set<string>()
  let moveSnapshotOutside = new Set<string>()

  // ── Drag / selection tracking ─────────────────────────────────────────────

  let selectStart: { x: number; y: number } | null = null
  let moveStartCell: { x: number; y: number } | null = null
  let moveStartRect: SelectionRect | null = null
  let movePending = false // getCells has not yet resolved for this move

  // ── Helpers ───────────────────────────────────────────────────────────────

  function screenToCell(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const world = screenToWorld(getCamera(), clientX - rect.left, clientY - rect.top)
    return { x: Math.floor(world.x), y: Math.floor(world.y) }
  }

  function rectFromPoints(ax: number, ay: number, bx: number, by: number): SelectionRect {
    return {
      minX: Math.min(ax, bx),
      minY: Math.min(ay, by),
      maxX: Math.max(ax, bx),
      maxY: Math.max(ay, by),
    }
  }

  function setSelection(rect: SelectionRect | null): void {
    selection = rect
    onSelectionChange?.(rect)
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
    if (e.button !== 0 || getActiveTool() !== 'select') return

    const cell = screenToCell(e.clientX, e.clientY)

    if (phase === 'selected' && selection !== null && insideRect(cell.x, cell.y, selection)) {
      // Start moving the selection
      phase = 'moving'
      moveStartCell = cell
      moveStartRect = { ...selection }
      movePending = true

      getCells().then((cells) => {
        if (phase !== 'moving') return

        onBeforeChange?.(cells)
        const allKeys = new Set(cells.map((c) => cellKey(c.x, c.y)))
        const { inside, outside } = partitionByRect(allKeys, moveStartRect!)
        moveSnapshotInside = inside
        moveSnapshotOutside = outside
        movePending = false
      })
    } else {
      // Start a new selection
      phase = 'selecting'
      selectStart = cell
      setSelection(rectFromPoints(cell.x, cell.y, cell.x, cell.y))
    }
  }

  function onMouseMove(e: MouseEvent): void {
    if (phase === 'selecting' && selectStart !== null) {
      const cell = screenToCell(e.clientX, e.clientY)
      setSelection(rectFromPoints(selectStart.x, selectStart.y, cell.x, cell.y))
      return
    }

    if (phase === 'moving' && moveStartCell !== null && moveStartRect !== null) {
      const cell = screenToCell(e.clientX, e.clientY)
      const dx = cell.x - moveStartCell.x
      const dy = cell.y - moveStartCell.y

      setSelection({
        minX: moveStartRect.minX + dx,
        minY: moveStartRect.minY + dy,
        maxX: moveStartRect.maxX + dx,
        maxY: moveStartRect.maxY + dy,
      })

      if (!movePending) {
        applyMovedCells(dx, dy)
      }
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (phase === 'selecting' && selectStart !== null) {
      const cell = screenToCell(e.clientX, e.clientY)
      const rect = rectFromPoints(selectStart.x, selectStart.y, cell.x, cell.y)
      setSelection(rect)
      phase = 'selected'
      selectStart = null

      // Cache the cells that fall inside the selection for later operations.
      getCells().then((cells) => {
        if (selection === null) return
        const allKeys = new Set(cells.map((c) => cellKey(c.x, c.y)))
        cachedInside = partitionByRect(allKeys, selection).inside
      })
      return
    }

    if (phase === 'moving' && moveStartCell !== null && moveStartRect !== null) {
      const cell = screenToCell(e.clientX, e.clientY)
      const dx = cell.x - moveStartCell.x
      const dy = cell.y - moveStartCell.y

      const newRect = {
        minX: moveStartRect.minX + dx,
        minY: moveStartRect.minY + dy,
        maxX: moveStartRect.maxX + dx,
        maxY: moveStartRect.maxY + dy,
      }
      setSelection(newRect)

      if (!movePending) {
        applyMovedCells(dx, dy)
      }

      phase = 'selected'
      moveStartCell = null
      moveStartRect = null
      movePending = false

      // Refresh cached cell sets after the move.
      getCells().then((cells) => {
        if (selection === null) return
        const allKeys = new Set(cells.map((c) => cellKey(c.x, c.y)))
        cachedInside = partitionByRect(allKeys, selection).inside
      })
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (getActiveTool() !== 'select') return
    if (e.key === 'Escape') {
      clearSelection()
      return
    }
    if (phase !== 'selected' || selection === null) return
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

  function clearSelection(): void {
    selection = null
    phase = 'idle'
    selectStart = null
    moveStartCell = null
    moveStartRect = null
    movePending = false
    onSelectionChange?.(null)
  }

  function deleteSelection(): void {
    if (selection === null) return
    const currentRect = selection

    getCells().then((cells) => {
      onBeforeChange?.(cells)
      const allKeys = new Set(cells.map((c) => cellKey(c.x, c.y)))
      const newCells: Cell[] = []
      for (const key of allKeys) {
        const c = parseKey(key)
        if (!insideRect(c.x, c.y, currentRect)) {
          newCells.push(c)
        }
      }
      setCells(newCells)
      clearSelection()
    })
  }

  function copySelection(): Cell[] | null {
    if (selection === null) return null
    if (cachedInside.size === 0) return null

    const originX = selection.minX
    const originY = selection.minY
    const result: Cell[] = []
    for (const key of cachedInside) {
      const c = parseKey(key)
      result.push({ x: c.x - originX, y: c.y - originY })
    }
    return result
  }

  function cutSelection(): void {
    if (selection === null) return
    const currentRect = selection

    getCells().then((cells) => {
      onBeforeChange?.(cells)
      const allKeys = new Set(cells.map((c) => cellKey(c.x, c.y)))

      // Remove selected cells
      const newCells: Cell[] = []
      for (const key of allKeys) {
        const c = parseKey(key)
        if (!insideRect(c.x, c.y, currentRect)) {
          newCells.push(c)
        }
      }
      setCells(newCells)
      clearSelection()
    })
  }

  return {
    dispose() {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      clearSelection()
    },
    getSelection() {
      return selection
    },
    deleteSelection,
    copySelection,
    cutSelection,
  }
}
