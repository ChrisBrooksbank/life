import { useEffect, useRef, useState } from 'preact/hooks'
import { appStore } from '../store'

interface HUDStats {
  generation: number
  population: number
  births: number
  deaths: number
}

/**
 * HUD overlay displaying real-time simulation statistics:
 * generation counter, live cell population, and birth/death counts
 * since the previous generation.
 */
export function HUD() {
  const [stats, setStats] = useState<HUDStats>(() => ({
    generation: appStore.getState().generation,
    population: appStore.getState().population,
    births: 0,
    deaths: 0,
  }))

  // Track previous population to compute birth/death deltas
  const prevPopRef = useRef<number>(appStore.getState().population)
  const prevGenRef = useRef<number>(appStore.getState().generation)

  useEffect(() => {
    return appStore.subscribe((s) => {
      const prevPop = prevPopRef.current
      const prevGen = prevGenRef.current

      // Ignore unrelated store changes (theme, tool, etc.)
      if (s.generation === prevGen && s.population === prevPop) return

      // Only compute births/deaths when the generation actually advances
      if (s.generation !== prevGen) {
        const delta = s.population - prevPop
        setStats({
          generation: s.generation,
          population: s.population,
          births: Math.max(0, delta),
          deaths: Math.max(0, -delta),
        })
      } else {
        // Same generation (e.g. reset or cell edit) — reset deltas
        setStats({
          generation: s.generation,
          population: s.population,
          births: 0,
          deaths: 0,
        })
      }

      prevPopRef.current = s.population
      prevGenRef.current = s.generation
    })
  }, [])

  return (
    <dl class="hud" aria-label="Simulation statistics">
      <div class="hud__row">
        <dt class="hud__label">Gen</dt>
        <dd class="hud__value" aria-label={`Generation ${stats.generation}`}>
          {stats.generation.toLocaleString()}
        </dd>
      </div>
      <div class="hud__row">
        <dt class="hud__label">Pop</dt>
        <dd class="hud__value" aria-label={`Population ${stats.population}`}>
          {stats.population.toLocaleString()}
        </dd>
      </div>
      <div class="hud__row">
        <dt class="hud__label">Born</dt>
        <dd class="hud__value hud__value--births" aria-label={`Births ${stats.births}`}>
          +{stats.births.toLocaleString()}
        </dd>
      </div>
      <div class="hud__row">
        <dt class="hud__label">Died</dt>
        <dd class="hud__value hud__value--deaths" aria-label={`Deaths ${stats.deaths}`}>
          -{stats.deaths.toLocaleString()}
        </dd>
      </div>
    </dl>
  )
}
