import { useState, useEffect } from 'preact/hooks'
import { appStore } from '../store'

/**
 * Play / Pause / Step playback controls.
 *
 * Also owns the simulation tick loop: while `isRunning` is true and a worker
 * is attached, this component fires `worker.step(1)` at the configured speed.
 */
export function Controls() {
  const [isRunning, setIsRunning] = useState(() => appStore.getState().isRunning)
  const [speed, setSpeed] = useState(() => appStore.getState().speed)
  const [worker, setWorker] = useState(() => appStore.getState().worker)

  // Keep local state in sync with the store
  useEffect(() => {
    return appStore.subscribe((s) => {
      setIsRunning(s.isRunning)
      setSpeed(s.speed)
      setWorker(s.worker)
    })
  }, [])

  // Tick loop — advance one generation per interval while running
  useEffect(() => {
    if (!isRunning || !worker) return
    const ms = Math.max(1, Math.round(1000 / speed))
    const id = setInterval(() => worker.step(1), ms)
    return () => clearInterval(id)
  }, [isRunning, speed, worker])

  const { play, pause, step } = appStore.getState()

  return (
    <div class="controls" role="group" aria-label="Playback controls">
      <button
        class="controls__btn"
        type="button"
        onClick={() => (isRunning ? pause() : play())}
        aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
        aria-pressed={isRunning}
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>
      <button
        class="controls__btn"
        type="button"
        onClick={() => step()}
        aria-label="Step simulation forward one generation"
        disabled={isRunning}
      >
        Step
      </button>
    </div>
  )
}
