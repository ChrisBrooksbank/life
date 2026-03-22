import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import type { DrawingTool } from '../store'
import { screenToWorld } from '../renderer/camera'

export interface FillToolOptions {
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
 * Performs a 4-connected flood fill starting from (startX, startY).
 *
 * - If the start cell is **live**, fills all 4-connected live cells (they are
 *   always finite), toggling them off (erasing the connected live region).
 * - If the start cell is **dead**, fills all 4-connected dead cells only when
 *   the region is **enclosed** (bounded by live cells).  If the fill would
 *   exceed `maxDeadCells` cells the region is considered unbounded and an
 *   empty array is returned.
 *
 * Returns the set of cells after applying the fill, or null if nothing should
 * change (e.g. unbounded dead region).
 */
export function floodFill(
  startX: number,
  startY: number,
  liveCells: Set<string>,
  maxDeadCells = 100_000,
): Set<string> | null {
  const startKey = cellKey(startX, startY)
  const isLive = liveCells.has(startKey)

  if (isLive) {
    // Flood fill connected live cells → erase them
    const toErase = new Set<string>()
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]
    while (queue.length > 0) {
      const cell = queue.pop()!
      const key = cellKey(cell.x, cell.y)
      if (toErase.has(key)) continue
      if (!liveCells.has(key)) continue
      toErase.add(key)
      queue.push(
        { x: cell.x - 1, y: cell.y },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x, y: cell.y + 1 },
      )
    }
    const result = new Set<string>(liveCells)
    for (const key of toErase) {
      result.delete(key)
    }
    return result
  } else {
    // Flood fill connected dead cells → add them (only if region is enclosed)
    const toAdd = new Set<string>()
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]
    while (queue.length > 0) {
      const cell = queue.pop()!
      const key = cellKey(cell.x, cell.y)
      if (toAdd.has(key)) continue
      if (liveCells.has(key)) continue // hit a live-cell boundary
      toAdd.add(key)
      if (toAdd.size > maxDeadCells) {
        // Region is unbounded — refuse to fill
        return null
      }
      queue.push(
        { x: cell.x - 1, y: cell.y },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x, y: cell.y + 1 },
      )
    }
    const result = new Set<string>(liveCells)
    for (const key of toAdd) {
      result.add(key)
    }
    return result
  }
}

/**
 * Attach fill tool event handlers to a canvas.
 *
 * When the active tool is 'fill', a single left click performs a flood fill:
 * - Clicking a live cell erases the entire 4-connected live region.
 * - Clicking a dead cell fills the enclosed 4-connected dead region with live
 *   cells.  If the dead region is unbounded the click is a no-op.
 *
 * Returns a dispose function that removes all event listeners.
 */
export function createFillTool(canvas: HTMLCanvasElement, options: FillToolOptions): () => void {
  const { getCamera, getActiveTool, getCells, setCells } = options

  function screenToCell(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const world = screenToWorld(getCamera(), clientX - rect.left, clientY - rect.top)
    return { x: Math.floor(world.x), y: Math.floor(world.y) }
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || getActiveTool() !== 'fill') return

    const { x, y } = screenToCell(e.clientX, e.clientY)

    getCells().then((cells) => {
      const liveCells = new Set(cells.map((c) => cellKey(c.x, c.y)))
      const result = floodFill(x, y, liveCells)
      if (result === null) return // unbounded region — no-op

      const newCells: Cell[] = []
      for (const key of result) {
        newCells.push(parseKey(key))
      }
      setCells(newCells)
    })
  }

  canvas.addEventListener('mousedown', onMouseDown)

  return function dispose() {
    canvas.removeEventListener('mousedown', onMouseDown)
  }
}
