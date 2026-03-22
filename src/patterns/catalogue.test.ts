import { describe, it, expect } from 'vitest'
import { CATALOGUE, type PatternCategory } from './catalogue'

const VALID_CATEGORIES: PatternCategory[] = [
  'still-life',
  'oscillator',
  'spaceship',
  'gun',
  'methuselah',
  'other',
]

describe('CATALOGUE', () => {
  it('contains at least 50 patterns', () => {
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(50)
  })

  it('every pattern has a non-empty name', () => {
    for (const p of CATALOGUE) {
      expect(p.name.length, `pattern name should not be empty`).toBeGreaterThan(0)
    }
  })

  it('every pattern has a non-empty description', () => {
    for (const p of CATALOGUE) {
      expect(p.description.length, `"${p.name}" should have a description`).toBeGreaterThan(0)
    }
  })

  it('every pattern has a valid category', () => {
    for (const p of CATALOGUE) {
      expect(VALID_CATEGORIES, `"${p.name}" has invalid category "${p.category}"`).toContain(
        p.category,
      )
    }
  })

  it('every pattern has at least one cell', () => {
    for (const p of CATALOGUE) {
      expect(p.cells.length, `"${p.name}" should have at least one cell`).toBeGreaterThan(0)
    }
  })

  it('every pattern has unique cell coordinates', () => {
    for (const p of CATALOGUE) {
      const seen = new Set<string>()
      for (const cell of p.cells) {
        const key = `${cell.x},${cell.y}`
        expect(seen.has(key), `Duplicate cell ${key} in pattern "${p.name}"`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('all pattern names are unique', () => {
    const names = CATALOGUE.map((p) => p.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('period field is positive when present', () => {
    for (const p of CATALOGUE) {
      if (p.period !== undefined) {
        expect(p.period, `"${p.name}" period should be positive`).toBeGreaterThan(0)
      }
    }
  })

  it('population field is positive when present', () => {
    for (const p of CATALOGUE) {
      if (p.population !== undefined) {
        expect(p.population, `"${p.name}" population should be positive`).toBeGreaterThan(0)
      }
    }
  })

  it('year field is plausible when present', () => {
    for (const p of CATALOGUE) {
      if (p.year !== undefined) {
        expect(p.year, `"${p.name}" year should be after 1960`).toBeGreaterThan(1960)
        expect(p.year, `"${p.name}" year should not be in the future`).toBeLessThanOrEqual(2030)
      }
    }
  })

  it('all cell coordinates are finite integers', () => {
    for (const p of CATALOGUE) {
      for (const cell of p.cells) {
        expect(Number.isFinite(cell.x), `"${p.name}" cell.x should be finite`).toBe(true)
        expect(Number.isFinite(cell.y), `"${p.name}" cell.y should be finite`).toBe(true)
        expect(Number.isInteger(cell.x), `"${p.name}" cell.x should be integer`).toBe(true)
        expect(Number.isInteger(cell.y), `"${p.name}" cell.y should be integer`).toBe(true)
      }
    }
  })
})

describe('CATALOGUE categories', () => {
  it('contains still lifes', () => {
    expect(CATALOGUE.some((p) => p.category === 'still-life')).toBe(true)
  })

  it('contains oscillators', () => {
    expect(CATALOGUE.some((p) => p.category === 'oscillator')).toBe(true)
  })

  it('contains spaceships', () => {
    expect(CATALOGUE.some((p) => p.category === 'spaceship')).toBe(true)
  })

  it('contains guns', () => {
    expect(CATALOGUE.some((p) => p.category === 'gun')).toBe(true)
  })

  it('contains methuselahs', () => {
    expect(CATALOGUE.some((p) => p.category === 'methuselah')).toBe(true)
  })

  it('has at least 5 patterns in each major category (still-life, oscillator, spaceship, methuselah)', () => {
    const counts: Record<string, number> = {}
    for (const p of CATALOGUE) {
      counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    expect(counts['still-life']).toBeGreaterThanOrEqual(5)
    expect(counts['oscillator']).toBeGreaterThanOrEqual(5)
    expect(counts['spaceship']).toBeGreaterThanOrEqual(3)
    expect(counts['methuselah']).toBeGreaterThanOrEqual(5)
  })
})

describe('CATALOGUE named patterns', () => {
  const find = (name: string) => CATALOGUE.find((p) => p.name === name)

  it('includes the classic seed patterns', () => {
    expect(find('Block')).toBeDefined()
    expect(find('Blinker')).toBeDefined()
    expect(find('Glider')).toBeDefined()
    expect(find('LWSS')).toBeDefined()
    expect(find('Pulsar')).toBeDefined()
    expect(find('Gosper Glider Gun')).toBeDefined()
    expect(find('R-pentomino')).toBeDefined()
    expect(find('Acorn')).toBeDefined()
    expect(find('Beacon')).toBeDefined()
    expect(find('Toad')).toBeDefined()
  })

  it('Block is a still-life with 4 cells', () => {
    const p = find('Block')!
    expect(p.category).toBe('still-life')
    expect(p.cells).toHaveLength(4)
  })

  it('Glider is a spaceship with 5 cells', () => {
    const p = find('Glider')!
    expect(p.category).toBe('spaceship')
    expect(p.cells).toHaveLength(5)
    expect(p.period).toBe(4)
  })

  it('Pulsar is an oscillator with period 3 and 48 cells', () => {
    const p = find('Pulsar')!
    expect(p.category).toBe('oscillator')
    expect(p.period).toBe(3)
    expect(p.cells).toHaveLength(48)
  })

  it('Gosper Glider Gun is a gun with period 30', () => {
    const p = find('Gosper Glider Gun')!
    expect(p.category).toBe('gun')
    expect(p.period).toBe(30)
    expect(p.cells.length).toBeGreaterThan(0)
  })

  it('R-pentomino is a methuselah with 5 cells', () => {
    const p = find('R-pentomino')!
    expect(p.category).toBe('methuselah')
    expect(p.cells).toHaveLength(5)
  })

  it('Acorn is a methuselah with 7 cells', () => {
    const p = find('Acorn')!
    expect(p.category).toBe('methuselah')
    expect(p.cells).toHaveLength(7)
  })

  it('Pentadecathlon is an oscillator with period 15 and 10 cells', () => {
    const p = find('Pentadecathlon')!
    expect(p.category).toBe('oscillator')
    expect(p.period).toBe(15)
    expect(p.cells).toHaveLength(10)
  })
})
