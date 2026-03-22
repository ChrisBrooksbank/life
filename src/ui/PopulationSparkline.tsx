import { useEffect, useRef, useState } from 'preact/hooks'
import { appStore } from '../store'

const MAX_POINTS = 100
const SVG_WIDTH = 200
const SVG_HEIGHT = 40

/**
 * SVG sparkline displaying population over the last MAX_POINTS generations.
 * Records one data point per generation advance from the store.
 */
export function PopulationSparkline() {
  const [history, setHistory] = useState<number[]>([])
  const prevGenRef = useRef<number>(appStore.getState().generation)

  useEffect(() => {
    return appStore.subscribe((s) => {
      if (s.generation !== prevGenRef.current) {
        prevGenRef.current = s.generation
        setHistory((prev) => {
          const next = [...prev, s.population]
          return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
        })
      }
    })
  }, [])

  const lastValue: number | undefined = history[history.length - 1]
  const ariaLabel =
    lastValue === undefined
      ? 'Population over time, no data yet'
      : `Population over time, current: ${lastValue.toLocaleString()}`

  let polylinePoints = ''
  if (history.length >= 2) {
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1
    polylinePoints = history
      .map((p, i) => {
        const x = (i / (history.length - 1)) * SVG_WIDTH
        const y = SVG_HEIGHT - ((p - min) / range) * SVG_HEIGHT
        return `${x},${y}`
      })
      .join(' ')
  }

  return (
    <div class="sparkline" aria-label={ariaLabel} role="img">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={SVG_HEIGHT}
        aria-hidden="true"
      >
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  )
}
