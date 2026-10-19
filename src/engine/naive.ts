import type { Cell, Rules, EngineInterface } from './types'
import { DEFAULT_RULES } from './types'

function key(x: number, y: number): string {
  return `${x},${y}`
}

function parseKey(k: string): { x: number; y: number } {
  const comma = k.indexOf(',')
  return { x: parseInt(k.slice(0, comma), 10), y: parseInt(k.slice(comma + 1), 10) }
}

export class NaiveEngine implements EngineInterface {
  private _cells: Set<string> = new Set()
  /** Maps cell key → number of consecutive generations it has been alive (0 = born this step). */
  private _ages: Map<string, number> = new Map()
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
    this._ages = new Map(cells.map(({ x, y, age }) => [key(x, y), age ?? 0]))
  }

  getCells(): Cell[] {
    return Array.from(this._cells).map((k) => {
      const { x, y } = parseKey(k)
      return { x, y, age: this._ages.get(k) ?? 0 }
    })
  }

  step(generations = 1): void {
    for (let i = 0; i < generations; i++) {
      this._stepOnce()
      this._generation++
    }
  }

  reset(): void {
    this._cells = new Set()
    this._ages = new Map()
    this._generation = 0
  }

  setGeneration(generation: number): void {
    this._generation = generation
  }

  private _stepOnce(): void {
    // Count neighbors for every cell adjacent to a live cell
    const neighborCount = new Map<string, number>()

    for (const k of this._cells) {
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
    const nextAges = new Map<string, number>()

    for (const [k, count] of neighborCount) {
      if (this._cells.has(k)) {
        // Survival
        if (this.rules.survival.includes(count)) {
          next.add(k)
          nextAges.set(k, (this._ages.get(k) ?? 0) + 1)
        }
      } else {
        // Birth
        if (this.rules.birth.includes(count)) {
          next.add(k)
          nextAges.set(k, 0)
        }
      }
    }

    this._cells = next
    this._ages = nextAges
  }
}
