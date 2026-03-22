import { useEffect, useState } from 'preact/hooks'
import './app.css'
import { appStore } from './store'
import { Controls } from './ui/Controls'
import { HUD } from './ui/HUD'
import { PatternLibrary } from './ui/PatternLibrary'
import { PerfMetrics } from './ui/PerfMetrics'
import { ThemeToggle } from './ui/ThemeToggle'
import { useFileDrop } from './ui/useFileDrop'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'
import { downloadCanvasAsPng } from './patterns/screenshot'

export function App() {
  const [theme, setTheme] = useState(() => appStore.getState().theme)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const isDragging = useFileDrop()

  useKeyboardShortcuts()

  // Keep local theme in sync with store and apply to <html> element
  useEffect(() => {
    return appStore.subscribe((s) => setTheme(s.theme))
  }, [])

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme
  }, [theme])

  return (
    <div class="app" role="application" aria-label="Conway's Game of Life">
      {/* Simulation canvas — renderer attaches here */}
      <canvas id="life-canvas" class="app__canvas" aria-hidden="true" />

      {/* Drawing toolbar (left on desktop, top strip on mobile) */}
      <nav class="app__toolbar" aria-label="Drawing tools">
        {/* Tool buttons added in later tasks */}
      </nav>

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div class="app__drop-overlay" aria-hidden="true">
          Drop .rle, .cells, or .lif file to import
        </div>
      )}

      {/* Pattern library sidebar */}
      {libraryOpen && <PatternLibrary onClose={() => setLibraryOpen(false)} />}

      {/* HUD overlay — real-time stats */}
      <aside class="app__hud" aria-label="Simulation statistics" aria-live="polite">
        <HUD />
        <hr class="hud__divider" />
        <PerfMetrics />
      </aside>

      {/* Playback controls bar */}
      <footer class="app__controls" aria-label="Simulation controls">
        <button
          class="app__pattern-library-toggle"
          type="button"
          onClick={() => setLibraryOpen((o) => !o)}
          aria-pressed={libraryOpen}
          aria-label={libraryOpen ? 'Close pattern library' : 'Open pattern library'}
          title="Pattern library"
        >
          Patterns
        </button>
        <Controls />
        <button
          class="app__screenshot-btn"
          type="button"
          onClick={() => {
            const canvas = document.getElementById('life-canvas') as HTMLCanvasElement | null
            if (canvas) {
              const gen = appStore.getState().generation
              downloadCanvasAsPng(canvas, `life-gen-${gen}.png`)
            }
          }}
          aria-label="Export PNG screenshot"
          title="Export PNG screenshot"
        >
          📷
        </button>
        <ThemeToggle />
      </footer>
    </div>
  )
}
