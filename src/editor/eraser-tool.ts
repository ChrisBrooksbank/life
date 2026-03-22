import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface EraserToolOptions {
  getCamera: () => Camera
  getActiveTool: () => DrawingTool
  /** Fetch all current live cells from the simulation (async). */
  getCells: () => Promise<Cell[]>
  /** Replace all live cells in the simulation. */
  setCells: (cells: Cell[]) => void
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function parseKey(key: string): Cell {
  const comma = key.indexOf(',')
  return { x: Number(key.slice(0, comma)), y: Number(key.slice(comma + 1)) }
}

/**
 * Attach eraser tool event handlers to a canvas.
 *
 * When the active tool is 'eraser', a left mouse click/drag removes cells:
 * - The eraser always removes cells — it never adds them.
 * - Each cell is only removed once per stroke regardless of how many times
 *   the cursor passes over it.
 *
 * Returns a dispose function that removes all event listeners.
 */
export function createEraserTool(
  canvas: HTMLCanvasElement,
  options: EraserToolOptions,
): () => void {
  const { getCamera, getActiveTool, getCells, setCells } = options

  let isDrawing = false
  /** Canonical cell set (string keys) for the current stroke. */
  let currentCells = new Set<string>()
  /** Cells already processed this stroke — each cell erased at most once. */
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

  function applyErase(cellX: number, cellY: number): void {
    const key = cellKey(cellX, cellY)
    if (visitedInStroke.has(key)) return
    visitedInStroke.add(key)
    currentCells.delete(key)
    flushCells()
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || getActiveTool() !== 'eraser') return

    const start = screenToCell(e.clientX, e.clientY)
    isDrawing = true
    visitedInStroke = new Set()
    pendingPositions = [start]

    getCells().then((cells) => {
      if (!isDrawing) return // stroke was cancelled before cells arrived

      currentCells = new Set(cells.map((c) => cellKey(c.x, c.y)))

      // Replay buffered positions
      const buffered = pendingPositions!
      pendingPositions = null
      for (const pt of buffered) {
        applyErase(pt.x, pt.y)
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
      applyErase(x, y)
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
