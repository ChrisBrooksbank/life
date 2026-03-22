import { describe, it, expect } from 'vitest'
import type { Cell, Coordinate, Pattern, Rules, EngineInterface } from './types'
import { DEFAULT_RULES } from './types'

describe('types', () => {
  it('Cell satisfies shape with x and y', () => {
    const cell: Cell = { x: 1, y: 2 }
    expect(cell.x).toBe(1)
    expect(cell.y).toBe(2)
  })

  it('Coordinate is interchangeable with Cell', () => {
    const coord: Coordinate = { x: 3, y: 4 }
    const cell: Cell = coord
    expect(cell.x).toBe(3)
  })

  it('Pattern has a name and cells array', () => {
    const pattern: Pattern = {
      name: 'Glider',
      cells: [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
    }
    expect(pattern.name).toBe('Glider')
    expect(pattern.cells).toHaveLength(5)
  })
})

describe('Rules', () => {
  it('DEFAULT_RULES encodes B3/S23', () => {
    expect(DEFAULT_RULES.birth).toEqual([3])
    expect(DEFAULT_RULES.survival).toEqual([2, 3])
  })

  it('Rules can express HighLife B36/S23', () => {
    const highLife: Rules = { birth: [3, 6], survival: [2, 3] }
    expect(highLife.birth).toContain(6)
  })
})

describe('EngineInterface', () => {
  it('a mock implementation satisfies the interface', () => {
    let cells: Cell[] = []
    let gen = 0

    const engine: EngineInterface = {
      get generation() {
        return gen
      },
      get population() {
        return cells.length
      },
      rules: { ...DEFAULT_RULES },
      setCells(c) {
        cells = [...c]
      },
      getCells() {
        return [...cells]
      },
      step(n = 1) {
        gen += n
      },
      reset() {
        cells = []
        gen = 0
      },
    }

    engine.setCells([{ x: 0, y: 0 }])
    expect(engine.population).toBe(1)
    expect(engine.generation).toBe(0)

    engine.step()
    expect(engine.generation).toBe(1)

    engine.step(5)
    expect(engine.generation).toBe(6)

    engine.reset()
    expect(engine.generation).toBe(0)
    expect(engine.population).toBe(0)
    expect(engine.getCells()).toHaveLength(0)
  })
})
