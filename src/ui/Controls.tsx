import { useState, useEffect } from 'preact/hooks'
import { appStore } from '../store'

/** Minimum and maximum simulation speed in generations per second. */
export const MIN_SPEED = 1
export const MAX_SPEED = 1000

/**
 * Convert a linear slider position [0, 100] to a speed value [MIN_SPEED, MAX_SPEED]
 * using a logarithmic scale.
 */
export function sliderToSpeed(position: number): number {
  const t = position / 100
  return Math.round(MIN_SPEED * Math.pow(MAX_SPEED / MIN_SPEED, t))
}

/**
 * Convert a speed value [MIN_SPEED, MAX_SPEED] to a linear slider position [0, 100]
 * using a logarithmic scale.
 */
export function speedToSlider(speed: number): number {
  return (Math.log(speed / MIN_SPEED) / Math.log(MAX_SPEED / MIN_SPEED)) * 100
}

/**
 * Play / Pause / Step playback controls.
 *
 * Also owns the simulation tick loop: while `isRunning` is true and a worker
 * is attached, this component fires `worker.step(1)` at the configured speed.
 */
export function Controls() {
  const [isRunning, setIsRunning] = useState(() => appStore.getState().isRunning)
  const [speed, setSpeedState] = useState(() => appStore.getState().speed)
  const [worker, setWorker] = useState(() => appStore.getState().worker)
  const [generation, setGeneration] = useState(() => appStore.getState().generation)

  // Keep local state in sync with the store
  useEffect(() => {
    return appStore.subscribe((s) => {
      setIsRunning(s.isRunning)
      setSpeedState(s.speed)
      setWorker(s.worker)
      setGeneration(s.generation)
    })
  }, [])

  // Tick loop — advance one generation per interval while running
  useEffect(() => {
    if (!isRunning || !worker) return
    const ms = Math.max(1, Math.round(1000 / speed))
    const id = setInterval(() => worker.step(1), ms)
    return () => clearInterval(id)
  }, [isRunning, speed, worker])

  const { play, pause, step, setSpeed } = appStore.getState()

  const sliderPos = speedToSlider(speed)

  function handleSpeedChange(e: Event) {
    const pos = Number((e.target as HTMLInputElement).value)
    setSpeed(sliderToSpeed(pos))
  }

  return (
    <div class="controls" role="group" aria-label="Playback controls">
      <output class="controls__generation" aria-label="Generation counter" aria-live="polite">
        Gen {generation}
      </output>
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
      <label class="controls__speed" aria-label={`Speed: ${speed} generations per second`}>
        <input
          class="controls__slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={sliderPos}
          onInput={handleSpeedChange}
          aria-label="Simulation speed"
          aria-valuemin={MIN_SPEED}
          aria-valuemax={MAX_SPEED}
          aria-valuenow={speed}
          aria-valuetext={`${speed} gen/s`}
        />
        <span class="controls__speed-value">{speed} gen/s</span>
      </label>
    </div>
  )
}
