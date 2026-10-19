import { NaiveEngine } from './naive'
import { HashLifeEngine } from './hashlife'
import type { EngineInterface } from './types'
import type { WorkerCommand, WorkerResponse, EngineType } from './worker-protocol'

const naive = new NaiveEngine()
const hashlife = new HashLifeEngine()

let activeEngine: EngineInterface = naive
let activeType: EngineType = 'naive'

/**
 * Handle a single command and return the response (or null for fire-and-forget commands).
 * Exported separately from simulation.worker.ts so it can be unit-tested without a real Worker.
 */
export function handleCommand(cmd: WorkerCommand): WorkerResponse | null {
  switch (cmd.type) {
    case 'SET_CELLS':
      activeEngine.setCells(cmd.cells)
      return {
        type: 'STATE',
        generation: activeEngine.generation,
        population: activeEngine.population,
      }

    case 'GET_CELLS':
      return { type: 'CELLS', id: cmd.id, cells: activeEngine.getCells() }

    case 'STEP':
      activeEngine.step(cmd.generations)
      return {
        type: 'STATE',
        generation: activeEngine.generation,
        population: activeEngine.population,
      }

    case 'RESET':
      naive.reset()
      hashlife.reset()
      return {
        type: 'STATE',
        generation: activeEngine.generation,
        population: activeEngine.population,
      }

    case 'SET_RULES':
      naive.rules = cmd.rules
      hashlife.rules = cmd.rules
      return null

    case 'GET_STATE':
      return {
        type: 'STATE_REPLY',
        id: cmd.id,
        generation: activeEngine.generation,
        population: activeEngine.population,
      }

    case 'SET_ENGINE': {
      if (cmd.engine === activeType) return null

      // Transfer state to the new engine
      const cells = activeEngine.getCells()
      const generation = activeEngine.generation

      if (cmd.engine === 'naive') {
        activeEngine = naive
        activeType = 'naive'
      } else {
        activeEngine = hashlife
        activeType = 'hashlife'
      }

      activeEngine.setCells(cells)
      activeEngine.setGeneration(generation)

      return {
        type: 'STATE',
        generation: activeEngine.generation,
        population: activeEngine.population,
      }
    }
  }
}
