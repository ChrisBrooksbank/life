import type { Cell } from '../engine/types'

const MAX_HISTORY_SIZE = 50

/**
 * Manages an undo/redo stack of cell-state snapshots.
 *
 * Tools record the state *before* each operation via push().
 * Ctrl+Z calls undo(); Ctrl+Shift+Z calls redo().
 */
export class HistoryManager {
  private undoStack: Cell[][] = []
  private redoStack: Cell[][] = []
  private readonly maxSize: number

  constructor(maxSize = MAX_HISTORY_SIZE) {
    this.maxSize = maxSize
  }

  /** Record current cell state before an operation. Clears the redo stack. */
  push(snapshot: Cell[]): void {
    this.undoStack.push([...snapshot])
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  /** Undo the last operation: swap current state with the top of the undo stack. */
  undo(getCells: () => Promise<Cell[]>, setCells: (cells: Cell[]) => void): void {
    if (this.undoStack.length === 0) return
    const before = this.undoStack.pop()!
    getCells().then((current) => {
      this.redoStack.push([...current])
      setCells(before)
    })
  }

  /** Redo the last undone operation. */
  redo(getCells: () => Promise<Cell[]>, setCells: (cells: Cell[]) => void): void {
    if (this.redoStack.length === 0) return
    const after = this.redoStack.pop()!
    getCells().then((current) => {
      this.undoStack.push([...current])
      setCells(after)
    })
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Clear all history (e.g. after a simulation reset). */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}

/** Application-level singleton shared across all editor tools. */
export const historyManager = new HistoryManager()
