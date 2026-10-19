import { useEffect, useRef, useState } from 'preact/hooks'
import { appStore } from '../store'

interface PerfState {
  genPerSec: number
  fps: number
  memMB: number | null
}

/**
 * Performance metrics overlay: generations/sec, render FPS, memory usage.
 *
 * - gen/sec: counts store generation increments within a sliding 1-second window
 * - FPS: counts requestAnimationFrame callbacks per second
 * - Memory: reads performance.memory.usedJSHeapSize (Chrome only; hidden otherwise)
 */
export function PerfMetrics() {
  const [perf, setPerf] = useState<PerfState>({ genPerSec: 0, fps: 0, memMB: null })

  // Timestamps of recent generation advances (ms, kept within 1-second window)
  const genTimestampsRef = useRef<number[]>([])
  // Track previous generation to detect advances
  const prevGenRef = useRef<number>(appStore.getState().generation)

  // Subscribe to store to record timestamps whenever generation advances
  useEffect(() => {
    return appStore.subscribe((s) => {
      const prevGen = prevGenRef.current
      if (s.generation !== prevGen) {
        const now = performance.now()
        genTimestampsRef.current.push(now)
        prevGenRef.current = s.generation
      }
    })
  }, [])

  // rAF loop: update FPS + gen/sec metrics every ~500 ms
  useEffect(() => {
    let rafId: number
    let frameCount = 0
    let lastUpdate = performance.now()

    function tick() {
      frameCount++
      const now = performance.now()

      if (now - lastUpdate >= 500) {
        const elapsed = now - lastUpdate
        const fps = Math.round((frameCount / elapsed) * 1000)

        // Prune timestamps older than 1 second and count remaining
        const cutoff = now - 1000
        genTimestampsRef.current = genTimestampsRef.current.filter((t) => t > cutoff)
        const genPerSec = genTimestampsRef.current.length

        // Chrome-only memory API
        const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory
        const memMB = mem != null ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null

        setPerf({ genPerSec, fps, memMB })
        frameCount = 0
        lastUpdate = now
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <dl class="hud" aria-label="Performance metrics">
      <div class="hud__row">
        <dt class="hud__label">Gen/s</dt>
        <dd class="hud__value" aria-label={`Generations per second ${perf.genPerSec}`}>
          {perf.genPerSec.toLocaleString()}
        </dd>
      </div>
      <div class="hud__row">
        <dt class="hud__label">FPS</dt>
        <dd class="hud__value" aria-label={`Frames per second ${perf.fps}`}>
          {perf.fps}
        </dd>
      </div>
      {perf.memMB !== null && (
        <div class="hud__row">
          <dt class="hud__label">Mem</dt>
          <dd class="hud__value" aria-label={`Memory ${perf.memMB} megabytes`}>
            {perf.memMB} MB
          </dd>
        </div>
      )}
    </dl>
  )
}
