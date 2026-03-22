import { createStore } from 'zustand/vanilla'
import { DEFAULT_RULES } from './engine/types'
import type { Rules, Cell } from './engine/types'
import type { WorkerClient } from './engine/worker-client'
import { THEME_COLORS } from './renderer/themes'
import type { Theme, ThemeColors } from './renderer/themes'
import { historyManager } from './editor/history'
import { encodeRle, decodeRle } from './patterns/rle'
import { SnapshotHistory } from './engine/snapshot-history'
import type { Snapshot } from './engine/snapshot-history'

/** How many generations between automatic snapshots during playback. */
export const SNAPSHOT_INTERVAL = 50

export type DrawingTool =
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'fill'
  | 'select'
  | 'lasso'

export interface AppState {
  // Simulation state
  isRunning: boolean
  generation: number
  population: number
  /** Target generations per second (1–1000) */
  speed: number
  rules: Rules

  // Editor state
  activeTool: DrawingTool

  // Theme
  theme: Theme
  themeColors: ThemeColors

  /**
   * Reference to the simulation worker client.
   * Set once during app initialisation via setWorker().
   * Not reactive — mutations to the client object don't trigger re-renders.
   */
  worker: WorkerClient | null

  /**
   * Cells pending placement in smart-paste preview mode (origin-relative).
   * Non-null while the user is previewing a paste before committing.
   */
  pastePreviewCells: Cell[] | null

  // Actions
  setWorker: (worker: WorkerClient) => void
  play: () => void
  pause: () => void
  /** Advance by one generation. */
  step: () => void
  reset: () => void
  /** Undo the last editor operation (Ctrl+Z). */
  undo: () => void
  /** Redo the last undone editor operation (Ctrl+Shift+Z). */
  redo: () => void
  setSpeed: (speed: number) => void
  setActiveTool: (tool: DrawingTool) => void
  setRules: (rules: Rules) => void
  /** Switch to a preset theme (resets any custom color overrides). */
  setTheme: (theme: Theme) => void
  /** Override individual renderer colors without changing the theme preset. */
  setThemeColors: (colors: Partial<ThemeColors>) => void
  /** Called by the worker's onState callback to sync generation/population. */
  updateSimState: (generation: number, population: number) => void
  /**
   * Copy all live cells to the system clipboard in RLE format.
   * No-op if the worker is unavailable or clipboard access is denied.
   */
  copyToClipboard: () => void
  /**
   * Read RLE from the system clipboard and enter smart-paste preview mode.
   * Sets pastePreviewCells so a canvas-level paste-preview tool can show a
   * ghost and place the cells on click.
   * No-op if clipboard is empty or content is invalid.
   */
  pasteFromClipboard: () => void
  /**
   * Enter smart-paste preview mode with the given origin-relative cells.
   * A canvas-level paste-preview tool should watch pastePreviewCells and
   * instantiate createPastePreview when it becomes non-null.
   */
  startPastePreview: (cells: Cell[]) => void
  /** Cancel an in-progress smart-paste preview. */
  cancelPastePreview: () => void

  // Snapshot history for time travel / rewind
  /** Ordered list of snapshots available for time travel (oldest first). */
  snapshots: Snapshot[]
  /** True when there is at least one snapshot to rewind to. */
  canRewind: boolean
  /**
   * Manually capture a snapshot of the current simulation state.
   * The worker must be set.  No-op otherwise.
   */
  takeSnapshot: () => Promise<void>
  /**
   * Restore the simulation to the snapshot at the given index (0 = oldest).
   * Clears all snapshots that are newer than the restored one.
   * Pauses the simulation.
   */
  rewindTo: (index: number) => void
  /**
   * Leap forward to the given target generation using HashLife.
   * Switches the engine to HashLife, steps by (target - currentGeneration),
   * then pauses. No-op if target <= current generation or worker is unavailable.
   */
  jumpToGeneration: (target: number) => void

  // Internal: allows overriding which cells are copied (e.g. selection)
  _clipboardCopySource: (() => Cell[] | null) | null
  _setClipboardCopySource: (fn: (() => Cell[] | null) | null) => void
  /** Internal snapshot history instance (not reactive). */
  _snapshotHistory: SnapshotHistory
}

export const appStore = createStore<AppState>()((set, get) => ({
  // Initial simulation state
  isRunning: false,
  generation: 0,
  population: 0,
  speed: 10,
  rules: DEFAULT_RULES,

  // Initial editor state
  activeTool: 'pencil',

  // Initial theme
  theme: 'dark',
  themeColors: THEME_COLORS.dark,

  worker: null,
  pastePreviewCells: null,

  // Snapshot history
  snapshots: [],
  canRewind: false,
  _snapshotHistory: new SnapshotHistory(),

  setWorker: (worker) => {
    worker.onState = (generation, population) => {
      get().updateSimState(generation, population)
    }
    set({ worker })
  },

  play: () => {
    set({ isRunning: true })
  },

  pause: () => {
    set({ isRunning: false })
  },

  step: () => {
    const { worker } = get()
    worker?.step(1)
  },

  reset: () => {
    const { worker, _snapshotHistory } = get()
    worker?.reset()
    historyManager.clear()
    _snapshotHistory.clear()
    set({ isRunning: false, generation: 0, population: 0, snapshots: [], canRewind: false })
  },

  undo: () => {
    const { worker } = get()
    if (!worker) return
    historyManager.undo(
      () => worker.getCells(),
      (cells) => worker.setCells(cells),
    )
  },

  redo: () => {
    const { worker } = get()
    if (!worker) return
    historyManager.redo(
      () => worker.getCells(),
      (cells) => worker.setCells(cells),
    )
  },

  setSpeed: (speed) => {
    set({ speed })
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool })
  },

  setRules: (rules) => {
    const { worker } = get()
    worker?.setRules(rules)
    set({ rules })
  },

  setTheme: (theme) => {
    set({ theme, themeColors: THEME_COLORS[theme] })
  },

  setThemeColors: (colors) => {
    set((state) => ({ themeColors: { ...state.themeColors, ...colors } }))
  },

  updateSimState: (generation, population) => {
    set({ generation, population })
    // Auto-snapshot at regular intervals during playback
    if (generation > 0 && generation % SNAPSHOT_INTERVAL === 0) {
      // Fire-and-forget; takeSnapshot reads generation from state at call time
      void get().takeSnapshot()
    }
  },

  takeSnapshot: async () => {
    const { worker, generation, _snapshotHistory } = get()
    if (!worker) return
    const cells = await worker.getCells()
    _snapshotHistory.push(generation, cells)
    set({ snapshots: _snapshotHistory.snapshots.slice(), canRewind: _snapshotHistory.canRewind })
  },

  rewindTo: (index: number) => {
    const { worker, _snapshotHistory } = get()
    if (!worker) return
    const snapshot = _snapshotHistory.get(index)
    if (!snapshot) return
    // Restore cells and generation
    worker.setCells(snapshot.cells)
    // Truncate history so that entries after this point are removed
    const kept = _snapshotHistory.snapshots.slice(0, index)
    _snapshotHistory.clear()
    for (const s of kept) {
      _snapshotHistory.push(s.generation, s.cells)
    }
    set({
      isRunning: false,
      generation: snapshot.generation,
      snapshots: _snapshotHistory.snapshots.slice(),
      canRewind: _snapshotHistory.canRewind,
    })
  },

  jumpToGeneration: (target: number) => {
    const { worker, generation } = get()
    if (!worker) return
    const delta = target - generation
    if (delta <= 0) return
    set({ isRunning: false })
    worker.setEngine('hashlife')
    worker.step(delta)
  },

  _clipboardCopySource: null,

  _setClipboardCopySource: (fn) => {
    set({ _clipboardCopySource: fn })
  },

  copyToClipboard: () => {
    const { worker, _clipboardCopySource } = get()

    // Try the registered selection source first
    if (_clipboardCopySource) {
      const selected = _clipboardCopySource()
      if (selected !== null) {
        const rle = encodeRle(selected)
        navigator.clipboard.writeText(rle).catch(() => {
          /* clipboard unavailable */
        })
        return
      }
    }

    // Fall back to all live cells
    if (!worker) return
    worker.getCells().then((cells) => {
      const rle = encodeRle(cells)
      navigator.clipboard.writeText(rle).catch(() => {
        /* clipboard unavailable */
      })
    })
  },

  pasteFromClipboard: () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        const trimmed = text.trim()
        if (!trimmed) return
        const pasteCells = decodeRle(trimmed)
        if (pasteCells.length === 0) return
        get().startPastePreview(pasteCells)
      })
      .catch(() => {
        /* clipboard unavailable or invalid content */
      })
  },

  startPastePreview: (cells: Cell[]) => {
    set({ pastePreviewCells: cells })
  },

  cancelPastePreview: () => {
    set({ pastePreviewCells: null })
  },
}))
