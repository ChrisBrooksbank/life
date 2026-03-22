import { describe, it, expect, beforeEach } from 'vitest'
import { NaiveEngine } from './naive'
import type { Cell } from './types'

function sortCells(cells: Cell[]): Cell[] {
  return [...cells].sort((a, b) => a.x - b.x || a.y - b.y)
}

describe('NaiveEngine', () => {
  let engine: NaiveEngine

  beforeEach(() => {
    engine = new NaiveEngine()
  })

  describe('initial state', () => {
    it('starts at generation 0', () => {
      expect(engine.generation).toBe(0)
    })

    it('starts with population 0', () => {
      expect(engine.population).toBe(0)
    })

    it('getCells returns empty array', () => {
      expect(engine.getCells()).toHaveLength(0)
    })
  })

  describe('setCells / getCells', () => {
    it('round-trips cells correctly', () => {
      const cells: Cell[] = [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: -3, y: -4 },
      ]
      engine.setCells(cells)
      expect(sortCells(engine.getCells())).toEqual(sortCells(cells))
    })

    it('updates population', () => {
      engine.setCells([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ])
      expect(engine.population).toBe(2)
    })

    it('replaces previous cells', () => {
      engine.setCells([{ x: 0, y: 0 }])
      engine.setCells([
        { x: 5, y: 5 },
        { x: 6, y: 6 },
      ])
      expect(engine.population).toBe(2)
    })
  })

  describe('reset', () => {
    it('clears cells and resets generation to 0', () => {
      engine.setCells([{ x: 0, y: 0 }])
      engine.step(3)
      engine.reset()
      expect(engine.generation).toBe(0)
      expect(engine.population).toBe(0)
    })
  })

  describe('B3/S23 rules — known patterns', () => {
    it('block (2x2) is a still life', () => {
      engine.setCells([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ])
      engine.step()
      expect(sortCells(engine.getCells())).toEqual(
        sortCells([
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
        ]),
      )
    })

    it('blinker oscillates with period 2', () => {
      // Horizontal blinker
      engine.setCells([
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ])

      // After 1 step: vertical blinker
      engine.step()
      expect(sortCells(engine.getCells())).toEqual(
        sortCells([
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
        ]),
      )

      // After 2 steps: back to horizontal
      engine.step()
      expect(sortCells(engine.getCells())).toEqual(
        sortCells([
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ]),
      )
    })

    it('glider moves diagonally every 4 generations', () => {
      // Standard glider at origin
      engine.setCells([
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ])
      engine.step(4)
      // Glider moves +1x, +1y per 4 steps (diagonal)
      expect(sortCells(engine.getCells())).toEqual(
        sortCells([
          { x: 2, y: 1 },
          { x: 3, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
        ]),
      )
    })

    it('lone cell dies (underpopulation)', () => {
      engine.setCells([{ x: 0, y: 0 }])
      engine.step()
      expect(engine.population).toBe(0)
    })

    it('generation counter increments correctly', () => {
      engine.setCells([{ x: 0, y: 0 }])
      engine.step(5)
      expect(engine.generation).toBe(5)
    })

    it('step(n) is equivalent to calling step() n times', () => {
      const cells = [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]

      const engineA = new NaiveEngine()
      engineA.setCells(cells)
      engineA.step()
      engineA.step()
      engineA.step()

      const engineB = new NaiveEngine()
      engineB.setCells(cells)
      engineB.step(3)

      expect(sortCells(engineA.getCells())).toEqual(sortCells(engineB.getCells()))
    })
  })

  describe('configurable rules', () => {
    it('HighLife B36/S23 births with 6 neighbors', () => {
      // 6 live cells surrounding one dead cell → dead cell should be born under B36
      const engine = new NaiveEngine({ birth: [3, 6], survival: [2, 3] })
      // Arrange exactly 6 neighbors around (1,1):
      engine.setCells([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
      ])
      engine.step()
      const cells = engine.getCells()
      const hasCenter = cells.some((c) => c.x === 1 && c.y === 1)
      expect(hasCenter).toBe(true)
    })

    it('custom rule B12/S1 births with 1 or 2 neighbors', () => {
      const engine = new NaiveEngine({ birth: [1, 2], survival: [1] })
      // Two adjacent cells: each has 1 neighbor
      engine.setCells([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ])
      engine.step()
      // Both cells survive (S1), and cells with 1-2 live neighbors are born
      const cells = engine.getCells()
      // At least the original cells survive and some neighbors are born
      expect(cells.length).toBeGreaterThan(2)
    })
  })

  describe('unbounded grid', () => {
    it('supports large negative coordinates', () => {
      engine.setCells([{ x: -1000000, y: -1000000 }])
      expect(engine.population).toBe(1)
    })

    it('patterns can migrate far from origin', () => {
      // Glider at a far offset
      const offset = 10000
      engine.setCells([
        { x: 1 + offset, y: 0 + offset },
        { x: 2 + offset, y: 1 + offset },
        { x: 0 + offset, y: 2 + offset },
        { x: 1 + offset, y: 2 + offset },
        { x: 2 + offset, y: 2 + offset },
      ])
      engine.step(4)
      expect(engine.population).toBe(5)
      const cells = engine.getCells()
      expect(cells.every((c) => c.x > offset - 1 && c.y > offset - 1)).toBe(true)
    })
  })
})
