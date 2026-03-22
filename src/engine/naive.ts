import type { Cell, Rules, EngineInterface } from './types'
import { DEFAULT_RULES } from './types'

function key(x: number, y: number): string {
  return `${x},${y}`
}

function parseKey(k: string): Cell {
  const comma = k.indexOf(',')
  return { x: parseInt(k.slice(0, comma), 10), y: parseInt(k.slice(comma + 1), 10) }
}

export class NaiveEngine implements EngineInterface {
  private _cells: Set<string> = new Set()
  private _generation = 0
  rules: Rules

  constructor(rules: Rules = { ...DEFAULT_RULES }) {
    this.rules = rules
  }

  get generation(): number {
    return this._generation
  }

  get population(): number {
    return this._cells.size
  }

  setCells(cells: Cell[]): void {
    this._cells = new Set(cells.map(({ x, y }) => key(x, y)))
  }

  getCells(): Cell[] {
    return Array.from(this._cells).map(parseKey)
  }

  step(generations = 1): void {
    for (let i = 0; i < generations; i++) {
      this._cells = this._stepOnce(this._cells)
      this._generation++
    }
  }

  reset(): void {
    this._cells = new Set()
    this._generation = 0
  }

  private _stepOnce(current: Set<string>): Set<string> {
    // Count neighbors for every cell adjacent to a live cell
    const neighborCount = new Map<string, number>()

    for (const k of current) {
      const { x, y } = parseKey(k)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue
          const nk = key(x + dx, y + dy)
          neighborCount.set(nk, (neighborCount.get(nk) ?? 0) + 1)
        }
      }
    }

    const next = new Set<string>()

    for (const [k, count] of neighborCount) {
      if (current.has(k)) {
        // Survival
        if (this.rules.survival.includes(count)) {
          next.add(k)
        }
      } else {
        // Birth
        if (this.rules.birth.includes(count)) {
          next.add(k)
        }
      }
    }

    return next
  }
}
