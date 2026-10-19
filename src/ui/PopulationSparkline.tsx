import { useEffect, useRef, useState } from 'preact/hooks'
import { appStore } from '../store'

const MAX_POINTS = 100
const SVG_WIDTH = 200
const SVG_HEIGHT = 40

export function PopulationSparkline() {
  const [history, setHistory] = useState<number[]>([])
  const prevGenRef = useRef<number>(appStore.getState().generation)

  useEffect(() => {
    return appStore.subscribe((s) => {
      if (s.generation !== prevGenRef.current) {
        prevGenRef.current = s.generation
        setHistory((prev) => {
          if (prev.length >= MAX_POINTS) {
            const next = prev.slice(1)
            next.push(s.population)
            return next
          }
          return [...prev, s.population]
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
