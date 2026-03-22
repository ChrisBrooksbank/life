import { useEffect, useRef, useState } from 'preact/hooks'
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
import { startRecording } from './patterns/video-export'
import type { RecordingSession } from './patterns/video-export'
import { SettingsPanel } from './ui/SettingsPanel'

export function App() {
  const [theme, setTheme] = useState(() => appStore.getState().theme)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recordingSessionRef = useRef<RecordingSession | null>(null)
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

      {/* Settings panel */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

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
        <button
          class="app__record-btn"
          type="button"
          onClick={() => {
            if (isRecording) {
              recordingSessionRef.current?.stop()
              recordingSessionRef.current = null
              setIsRecording(false)
            } else {
              const canvas = document.getElementById('life-canvas') as HTMLCanvasElement | null
              if (!canvas) return
              const gen = appStore.getState().generation
              const session = startRecording(canvas, { filename: `life-gen-${gen}` })
              if (session) {
                recordingSessionRef.current = session
                setIsRecording(true)
              }
            }
          }}
          aria-label={isRecording ? 'Stop recording' : 'Record animation as WebM'}
          aria-pressed={isRecording}
          title={isRecording ? 'Stop recording' : 'Record animation as WebM'}
        >
          {isRecording ? '⏹' : '⏺'}
        </button>
        <ThemeToggle />
        <button
          class="app__settings-toggle"
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          aria-pressed={settingsOpen}
          aria-label={settingsOpen ? 'Close settings' : 'Open settings'}
          title="Settings"
        >
          ⚙
        </button>
      </footer>
    </div>
  )
}
