import type { Cell, Rules } from './types'

// ---------------------------------------------------------------------------
// Commands — sent from main thread to worker
// ---------------------------------------------------------------------------

export type WorkerCommand =
  | { type: 'SET_CELLS'; cells: Cell[] }
  | { type: 'GET_CELLS'; id: number }
  | { type: 'STEP'; generations: number }
  | { type: 'RESET' }
  | { type: 'SET_RULES'; rules: Rules }
  | { type: 'GET_STATE'; id: number }

// ---------------------------------------------------------------------------
// Responses — sent from worker to main thread
// ---------------------------------------------------------------------------

export type WorkerResponse =
  | { type: 'READY' }
  | { type: 'STATE'; generation: number; population: number }
  | { type: 'CELLS'; id: number; cells: Cell[] }
  | { type: 'STATE_REPLY'; id: number; generation: number; population: number }
  | { type: 'ERROR'; message: string }
