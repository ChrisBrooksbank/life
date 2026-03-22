import { describe, it, expect } from 'vitest'
import { SEED_PATTERNS } from './seeds'
import { NaiveEngine } from '../engine/naive'

describe('SEED_PATTERNS', () => {
  it('contains exactly 10 patterns', () => {
    expect(SEED_PATTERNS).toHaveLength(10)
  })

  it('includes all required seed pattern names', () => {
    const names = SEED_PATTERNS.map((p) => p.name)
    expect(names).toContain('Block')
    expect(names).toContain('Blinker')
    expect(names).toContain('Glider')
    expect(names).toContain('LWSS')
    expect(names).toContain('Pulsar')
    expect(names).toContain('Gosper Glider Gun')
    expect(names).toContain('R-pentomino')
    expect(names).toContain('Acorn')
    expect(names).toContain('Beacon')
    expect(names).toContain('Toad')
  })

  it('every pattern has a non-empty name', () => {
    for (const p of SEED_PATTERNS) {
      expect(p.name.length).toBeGreaterThan(0)
    }
  })

  it('every pattern has at least one cell', () => {
    for (const p of SEED_PATTERNS) {
      expect(p.cells.length).toBeGreaterThan(0)
    }
  })

  it('every pattern has unique cell coordinates', () => {
    for (const p of SEED_PATTERNS) {
      const seen = new Set<string>()
      for (const cell of p.cells) {
        const key = `${cell.x},${cell.y}`
        expect(seen.has(key), `Duplicate cell ${key} in pattern "${p.name}"`).toBe(false)
        seen.add(key)
      }
    }
  })
})

// --- Per-pattern structural checks ---

describe('Block', () => {
  it('has 4 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Block')!
    expect(p.cells).toHaveLength(4)
  })

  it('is a still life (survives unchanged after 1 step)', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Block')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    const before = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    engine.step()
    const after = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    expect(after).toEqual(before)
  })
})

describe('Blinker', () => {
  it('has 3 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Blinker')!
    expect(p.cells).toHaveLength(3)
  })

  it('returns to its initial state after 2 steps', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Blinker')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    const before = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    engine.step()
    engine.step()
    const after = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    expect(after).toEqual(before)
  })
})

describe('Toad', () => {
  it('has 6 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Toad')!
    expect(p.cells).toHaveLength(6)
  })

  it('returns to its initial state after 2 steps', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Toad')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    const before = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    engine.step()
    engine.step()
    const after = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    expect(after).toEqual(before)
  })
})

describe('Beacon', () => {
  it('has 8 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Beacon')!
    expect(p.cells).toHaveLength(8)
  })

  it('returns to its initial state after 2 steps', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Beacon')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    const before = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    engine.step()
    engine.step()
    const after = new Set(engine.getCells().map((c) => `${c.x},${c.y}`))
    expect(after).toEqual(before)
  })
})

describe('Glider', () => {
  it('has 5 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Glider')!
    expect(p.cells).toHaveLength(5)
  })

  it('has 5 cells after 4 steps (one full cycle)', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Glider')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    engine.step(4)
    expect(engine.getCells()).toHaveLength(5)
  })
})

describe('LWSS', () => {
  it('has 9 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'LWSS')!
    expect(p.cells).toHaveLength(9)
  })

  it('has 9 cells after 4 steps (one full cycle)', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'LWSS')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    engine.step(4)
    expect(engine.getCells()).toHaveLength(9)
  })
})

describe('Pulsar', () => {
  it('has 48 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Pulsar')!
    expect(p.cells).toHaveLength(48)
  })

  it('returns to its initial shape after 3 steps', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Pulsar')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    engine.step(3)
    expect(engine.getCells()).toHaveLength(48)
  })
})

describe('Gosper Glider Gun', () => {
  it('has 36 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Gosper Glider Gun')!
    expect(p.cells).toHaveLength(36)
  })

  it('population grows after 30 steps (gun fires a glider)', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Gosper Glider Gun')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    const initialPop = engine.population
    engine.step(30)
    expect(engine.population).toBeGreaterThan(initialPop)
  })
})

describe('R-pentomino', () => {
  it('has 5 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'R-pentomino')!
    expect(p.cells).toHaveLength(5)
  })

  it('is not stable (population changes after 1 step)', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'R-pentomino')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    const before = engine.population
    engine.step()
    // R-pentomino is a methuselah — it should not stay at 5 cells
    expect(engine.population).not.toBe(before)
  })
})

describe('Acorn', () => {
  it('has 7 cells', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Acorn')!
    expect(p.cells).toHaveLength(7)
  })

  it('grows significantly after 100 steps', () => {
    const p = SEED_PATTERNS.find((p) => p.name === 'Acorn')!
    const engine = new NaiveEngine()
    engine.setCells(p.cells)
    engine.step(100)
    expect(engine.population).toBeGreaterThan(7)
  })
})
