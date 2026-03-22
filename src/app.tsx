import './app.css'
import { Controls } from './ui/Controls'

export function App() {
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
        {/* Generation / population counters added in later tasks */}
      </aside>

      {/* Playback controls bar */}
      <footer class="app__controls" aria-label="Simulation controls">
        <Controls />
      </footer>
    </div>
  )
}
