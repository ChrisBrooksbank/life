import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface PencilToolOptions {
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
 * Attach pencil tool event handlers to a canvas.
 *
 * When the active tool is 'pencil', a left mouse click/drag toggles cells:
 * - Clicking a dead cell enters "draw" mode (cells are added for the stroke).
 * - Clicking a live cell enters "erase" mode (cells are removed for the stroke).
 * - Dragging after the initial click continues in the same mode.
 * - Each cell is only toggled once per stroke regardless of how many times
 *   the cursor passes over it.
 *
 * Returns a dispose function that removes all event listeners.
 */
export function createPencilTool(
  canvas: HTMLCanvasElement,
  options: PencilToolOptions,
): () => void {
  const { getCamera, getActiveTool, getCells, setCells, onBeforeChange } = options

  type StrokeMode = 'draw' | 'erase'

  let isDrawing = false
  let strokeMode: StrokeMode = 'draw'
  /** Canonical cell set (string keys) for the current stroke. */
  let currentCells = new Set<string>()
  /** Cells already processed this stroke — each cell toggled at most once. */
  let visitedInStroke = new Set<string>()
  /**
   * Buffered positions gathered before the async getCells() resolves.
   * Null means we are not in the async-init phase.
   */
  let pendingPositions: Array<{ x: number; y: number }> | null = null

  // ── Helpers ───────────────────────────────────────────────────────────────

  function screenToCell(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const world = screenToWorld(getCamera(), clientX - rect.left, clientY - rect.top)
    return { x: Math.floor(world.x), y: Math.floor(world.y) }
  }

  function flushCells(): void {
    const cells: Cell[] = []
    for (const key of currentCells) {
      cells.push(parseKey(key))
    }
    setCells(cells)
  }

  function applyStroke(cellX: number, cellY: number): void {
    const key = cellKey(cellX, cellY)
    if (visitedInStroke.has(key)) return
    visitedInStroke.add(key)
    if (strokeMode === 'draw') {
      currentCells.add(key)
    } else {
      currentCells.delete(key)
    }
    flushCells()
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || getActiveTool() !== 'pencil') return

    const start = screenToCell(e.clientX, e.clientY)
    isDrawing = true
    visitedInStroke = new Set()
    pendingPositions = [start]

    getCells().then((cells) => {
      if (!isDrawing) return // stroke was cancelled before cells arrived

      onBeforeChange?.(cells)
      currentCells = new Set(cells.map((c) => cellKey(c.x, c.y)))

      // Determine draw vs erase from the first clicked position
      const first = pendingPositions![0]
      const firstKey = first !== undefined ? cellKey(first.x, first.y) : ''
      strokeMode = currentCells.has(firstKey) ? 'erase' : 'draw'

      // Replay buffered positions
      const buffered = pendingPositions!
      pendingPositions = null
      for (const pt of buffered) {
        applyStroke(pt.x, pt.y)
      }
    })
  }

  function onMouseMove(e: MouseEvent): void {
    if (!isDrawing) return
    const { x, y } = screenToCell(e.clientX, e.clientY)
    if (pendingPositions !== null) {
      // Still waiting for getCells() — buffer the position
      const last = pendingPositions[pendingPositions.length - 1]
      if (last === undefined || last.x !== x || last.y !== y) {
        pendingPositions.push({ x, y })
      }
    } else {
      applyStroke(x, y)
    }
  }

  function onMouseUp(): void {
    isDrawing = false
    pendingPositions = null
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
