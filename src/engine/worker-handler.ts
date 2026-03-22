import { NaiveEngine } from './naive'
import type { WorkerCommand, WorkerResponse } from './worker-protocol'

const engine = new NaiveEngine()

/**
 * Handle a single command and return the response (or null for fire-and-forget commands).
 * Exported separately from simulation.worker.ts so it can be unit-tested without a real Worker.
 */
export function handleCommand(cmd: WorkerCommand): WorkerResponse | null {
  switch (cmd.type) {
    case 'SET_CELLS':
      engine.setCells(cmd.cells)
      return { type: 'STATE', generation: engine.generation, population: engine.population }

    case 'GET_CELLS':
      return { type: 'CELLS', id: cmd.id, cells: engine.getCells() }

    case 'STEP':
      engine.step(cmd.generations)
      return { type: 'STATE', generation: engine.generation, population: engine.population }

    case 'RESET':
      engine.reset()
      return { type: 'STATE', generation: engine.generation, population: engine.population }

    case 'SET_RULES':
      engine.rules = cmd.rules
      return null

    case 'GET_STATE':
      return {
        type: 'STATE_REPLY',
        id: cmd.id,
        generation: engine.generation,
        population: engine.population,
      }
  }
}
