export interface Cell {
  x: number
  y: number
}

export type Coordinate = Cell

export interface Pattern {
  name: string
  cells: Cell[]
}

export interface Rules {
  /** Neighbor counts that cause a dead cell to become alive */
  birth: number[]
  /** Neighbor counts that allow a live cell to survive */
  survival: number[]
}

/** Default Conway's Game of Life rules: B3/S23 */
export const DEFAULT_RULES: Rules = {
  birth: [3],
  survival: [2, 3],
}

export interface EngineInterface {
  /** Current generation count */
  readonly generation: number
  /** Current live cell count */
  readonly population: number
  /** Active rules */
  rules: Rules
  /** Replace all live cells */
  setCells(cells: Cell[]): void
  /** Return all current live cells */
  getCells(): Cell[]
  /** Advance the simulation by the given number of generations (default 1) */
  step(generations?: number): void
  /** Reset to generation 0 with no live cells */
  reset(): void
}
