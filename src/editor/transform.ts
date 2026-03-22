import type { Cell } from '../engine/types'
import type { SelectionRect } from './selection-tool'

export type TransformType = 'rotate90cw' | 'rotate180' | 'rotate270cw' | 'flipH' | 'flipV'

/**
 * Transform cells within a selection rectangle.
 *
 * All transforms preserve the top-left corner of the selection.
 * Rotations swap width and height; flips preserve dimensions.
 *
 * Returns the transformed cells and the updated selection bounds.
 */
export function transformCells(
  cells: Cell[],
  selection: SelectionRect,
  type: TransformType,
): { cells: Cell[]; newSelection: SelectionRect } {
  const { minX, minY, maxX, maxY } = selection
  // W and H are the inclusive spans (e.g. a 3-cell-wide selection has W=2)
  const W = maxX - minX
  const H = maxY - minY

  switch (type) {
    case 'rotate90cw': {
      // (rx, ry) → (H − ry, rx)  →  new width = H, new height = W
      const newCells = cells.map((c) => ({
        x: minX + (H - (c.y - minY)),
        y: minY + (c.x - minX),
      }))
      return { cells: newCells, newSelection: { minX, minY, maxX: minX + H, maxY: minY + W } }
    }

    case 'rotate180': {
      // (rx, ry) → (W − rx, H − ry)  →  same dims
      const newCells = cells.map((c) => ({
        x: minX + (W - (c.x - minX)),
        y: minY + (H - (c.y - minY)),
      }))
      return { cells: newCells, newSelection: { ...selection } }
    }

    case 'rotate270cw': {
      // (rx, ry) → (ry, W − rx)  →  new width = H, new height = W
      const newCells = cells.map((c) => ({
        x: minX + (c.y - minY),
        y: minY + (W - (c.x - minX)),
      }))
      return { cells: newCells, newSelection: { minX, minY, maxX: minX + H, maxY: minY + W } }
    }

    case 'flipH': {
      // (rx, ry) → (W − rx, ry)  →  same dims
      const newCells = cells.map((c) => ({
        x: minX + (W - (c.x - minX)),
        y: c.y,
      }))
      return { cells: newCells, newSelection: { ...selection } }
    }

    case 'flipV': {
      // (rx, ry) → (rx, H − ry)  →  same dims
      const newCells = cells.map((c) => ({
        x: c.x,
        y: minY + (H - (c.y - minY)),
      }))
      return { cells: newCells, newSelection: { ...selection } }
    }
  }
}
