import type { Camera } from '../renderer/webgl2-renderer'
import type { Cell } from '../engine/types'
import { screenToWorld } from '../renderer/camera'

export interface PastePreviewOptions {
  /** Returns the current camera state for coordinate conversion. */
  getCamera: () => Camera
  /** Fetch all current live cells (async). */
  getCells: () => Promise<Cell[]>
  /** Replace all live cells. */
  setCells: (cells: Cell[]) => void
  /** Called once before the commit change with the current cell snapshot. */
  onBeforeChange?: (snapshot: Cell[]) => void
  /** Called when the paste is committed (cells have been placed). */
  onCommit: () => void
  /** Called when the paste is cancelled (Escape key). */
  onCancel: () => void
  /**
   * Called on mouse move with the current preview offset in grid coordinates.
   * Use this to drive an external preview overlay.
   */
  onMove?: (offsetX: number, offsetY: number) => void
}

export interface PastePreviewHandler {
  /** Remove all event listeners and deactivate the preview. */
  dispose: () => void
  /** Returns the current cursor offset in grid coordinates. */
  getCurrentOffset: () => { x: number; y: number }
}

/**
 * Enters "smart paste" mode: the given cells follow the cursor as a preview
 * and are placed into the simulation on left-click.
 *
 * The paste cells are assumed to be origin-relative (top-left at 0,0).
 * On commit, each paste cell is placed offset by the current cursor position.
 * Pressing Escape cancels the preview without modifying the simulation.
 */
export function createPastePreview(
  canvas: HTMLCanvasElement,
  cells: Cell[],
  options: PastePreviewOptions,
): PastePreviewHandler {
  const { getCamera, getCells, setCells, onBeforeChange, onCommit, onCancel, onMove } = options

  let currentOffsetX = 0
  let currentOffsetY = 0

  function screenToCell(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const world = screenToWorld(getCamera(), clientX - rect.left, clientY - rect.top)
    return { x: Math.floor(world.x), y: Math.floor(world.y) }
  }

  function onMouseMove(e: MouseEvent): void {
    const { x, y } = screenToCell(e.clientX, e.clientY)
    currentOffsetX = x
    currentOffsetY = y
    onMove?.(x, y)
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return
    const { x, y } = screenToCell(e.clientX, e.clientY)
    commit(x, y)
  }

  function commit(offsetX: number, offsetY: number): void {
    getCells().then((existing) => {
      onBeforeChange?.(existing)
      const existingSet = new Set(existing.map((c) => `${c.x},${c.y}`))
      const merged = [...existing]
      for (const c of cells) {
        const px = c.x + offsetX
        const py = c.y + offsetY
        if (!existingSet.has(`${px},${py}`)) {
          merged.push({ x: px, y: py })
        }
      }
      setCells(merged)
      onCommit()
    })
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('keydown', onKeyDown)

  return {
    dispose() {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
    },
    getCurrentOffset() {
      return { x: currentOffsetX, y: currentOffsetY }
    },
  }
}
