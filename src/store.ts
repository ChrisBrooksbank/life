import { createStore } from 'zustand/vanilla'
import { DEFAULT_RULES } from './engine/types'
import type { Rules } from './engine/types'
import type { WorkerClient } from './engine/worker-client'
import { THEME_COLORS } from './renderer/themes'
import type { Theme, ThemeColors } from './renderer/themes'
import { historyManager } from './editor/history'

export type DrawingTool = 'pencil' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill' | 'select'

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
    const { worker } = get()
    worker?.reset()
    historyManager.clear()
    set({ isRunning: false, generation: 0, population: 0 })
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
  },
}))
