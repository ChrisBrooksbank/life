import { useEffect, useState } from 'preact/hooks'
import './app.css'
import { appStore } from './store'
import { Controls } from './ui/Controls'
import { HUD } from './ui/HUD'
import { PerfMetrics } from './ui/PerfMetrics'
import { ThemeToggle } from './ui/ThemeToggle'

export function App() {
  const [theme, setTheme] = useState(() => appStore.getState().theme)

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

      {/* HUD overlay — real-time stats */}
      <aside class="app__hud" aria-label="Simulation statistics" aria-live="polite">
        <HUD />
        <hr class="hud__divider" />
        <PerfMetrics />
      </aside>

      {/* Playback controls bar */}
      <footer class="app__controls" aria-label="Simulation controls">
        <Controls />
        <ThemeToggle />
      </footer>
    </div>
  )
}
