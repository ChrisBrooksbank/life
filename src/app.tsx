import { useEffect, useRef, useState } from 'preact/hooks'
import './app.css'
import { appStore } from './store'
import { Controls } from './ui/Controls'
import { HUD } from './ui/HUD'
import { PatternLibrary } from './ui/PatternLibrary'
import { PerfMetrics } from './ui/PerfMetrics'
import { PopulationSparkline } from './ui/PopulationSparkline'
import { ThemeToggle } from './ui/ThemeToggle'
import { TimeTravelControls } from './ui/TimeTravelControls'
import { Toolbar } from './ui/Toolbar'
import { useFileDrop } from './ui/useFileDrop'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'
import { useRenderer } from './ui/useRenderer'
import { downloadCanvasAsPng } from './patterns/screenshot'
import { startRecording } from './patterns/video-export'
import type { RecordingSession } from './patterns/video-export'
import { SettingsPanel } from './ui/SettingsPanel'
import { CheatSheet } from './ui/CheatSheet'
import { announce } from './ui/announce'

export function App() {
  const [theme, setTheme] = useState(() => appStore.getState().theme)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cheatSheetOpen, setCheatSheetOpen] = useState(() => appStore.getState().cheatSheetOpen)
  const [isRecording, setIsRecording] = useState(false)
  const recordingSessionRef = useRef<RecordingSession | null>(null)
  const isDragging = useFileDrop()

  useKeyboardShortcuts()
  useRenderer()

  // Keep local theme and cheat sheet state in sync with store
  useEffect(() => {
    return appStore.subscribe((s) => {
      setTheme(s.theme)
      setCheatSheetOpen(s.cheatSheetOpen)
    })
  }, [])

  // Screen reader announcements for important state changes
  useEffect(() => {
    let prevIsRunning = appStore.getState().isRunning
    let prevActiveTool = appStore.getState().activeTool

    return appStore.subscribe((s) => {
      if (s.isRunning !== prevIsRunning) {
        announce(s.isRunning ? 'Simulation started' : 'Simulation paused')
        prevIsRunning = s.isRunning
      }
      if (s.activeTool !== prevActiveTool) {
        announce(`Tool: ${s.activeTool}`)
        prevActiveTool = s.activeTool
      }
    })
  }, [])

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme
  }, [theme])

  return (
    <div class="app" role="application" aria-label="Conway's Game of Life">
      {/* Visually-hidden live regions for screen reader announcements */}
      <div id="sr-polite" class="sr-only" aria-live="polite" aria-atomic="true" />
      <div id="sr-assertive" class="sr-only" aria-live="assertive" aria-atomic="true" />

      {/* Simulation canvas — renderer attaches here */}
      <canvas id="life-canvas" class="app__canvas" aria-hidden="true" />

      {/* Drawing toolbar (left on desktop, top strip on mobile) */}
      <nav class="app__toolbar" aria-label="Drawing tools">
        <Toolbar />
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

      {/* Keyboard shortcut cheat sheet */}
      {cheatSheetOpen && (
        <CheatSheet onClose={() => appStore.getState().setCheatSheetOpen(false)} />
      )}

      {/* HUD overlay — real-time stats */}
      <aside class="app__hud" aria-label="Simulation statistics">
        <HUD />
        <hr class="hud__divider" />
        <PerfMetrics />
        <hr class="hud__divider" />
        <PopulationSparkline />
      </aside>

      {/* Playback controls bar */}
      <footer class="app__controls" aria-label="Simulation controls">
        <TimeTravelControls />
        <button
          class="btn app__pattern-library-toggle"
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
          class="btn btn--icon app__screenshot-btn"
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
          class="btn btn--icon app__record-btn"
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
          class="btn app__settings-toggle"
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
