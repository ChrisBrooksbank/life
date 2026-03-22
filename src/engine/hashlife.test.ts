import { describe, it, expect, beforeEach } from 'vitest'
import { HashLifeEngine } from './hashlife'
import { NaiveEngine } from './naive'
import type { Cell } from './types'

function sortCells(cells: Cell[]): Cell[] {
  return [...cells].sort((a, b) => a.x - b.x || a.y - b.y)
}

function cellsEqual(a: Cell[], b: Cell[]): boolean {
  const sa = sortCells(a)
  const sb = sortCells(b)
  if (sa.length !== sb.length) return false
  return sa.every((c, i) => c.x === sb[i]!.x && c.y === sb[i]!.y)
}

describe('HashLifeEngine', () => {
  let engine: HashLifeEngine

  beforeEach(() => {
    engine = new HashLifeEngine()
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

    it('resets generation to 0', () => {
      engine.setCells([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ])
      engine.step(2)
      engine.setCells([{ x: 0, y: 0 }])
      expect(engine.generation).toBe(0)
    })
  })

  describe('reset', () => {
    it('clears cells and resets generation', () => {
      engine.setCells([{ x: 0, y: 0 }])
      engine.step(1)
      engine.reset()
      expect(engine.generation).toBe(0)
      expect(engine.population).toBe(0)
      expect(engine.getCells()).toHaveLength(0)
    })
  })

  describe('B3/S23 rules — known patterns', () => {
    it('block (2×2) is a still life', () => {
      const block = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ]
      engine.setCells(block)
      engine.step()
      expect(sortCells(engine.getCells())).toEqual(sortCells(block))
    })

    it('blinker oscillates: period 2', () => {
      const horizontal = [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]
      const vertical = [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]

      engine.setCells(horizontal)
      engine.step()
      expect(cellsEqual(engine.getCells(), vertical)).toBe(true)

      engine.step()
      expect(cellsEqual(engine.getCells(), horizontal)).toBe(true)
    })

    it('glider moves diagonally every 4 generations', () => {
      const glider = [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ]
      engine.setCells(glider)
      engine.step(4)
      const expected = [
        { x: 2, y: 1 },
        { x: 3, y: 2 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ]
      expect(cellsEqual(engine.getCells(), expected)).toBe(true)
    })

    it('lone cell dies', () => {
      engine.setCells([{ x: 0, y: 0 }])
      engine.step()
      expect(engine.population).toBe(0)
    })

    it('generation counter increments correctly', () => {
      engine.setCells([
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ])
      engine.step(5)
      expect(engine.generation).toBe(5)
    })
  })

  describe('matches NaiveEngine', () => {
    function compare(cells: Cell[], steps: number): void {
      const naive = new NaiveEngine()
      naive.setCells(cells)
      naive.step(steps)

      const hl = new HashLifeEngine()
      hl.setCells(cells)
      hl.step(steps)

      expect(cellsEqual(hl.getCells(), naive.getCells())).toBe(true)
    }

    it('glider — 4 steps', () => {
      compare(
        [
          { x: 1, y: 0 },
          { x: 2, y: 1 },
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        4,
      )
    })

    it('glider — 8 steps', () => {
      compare(
        [
          { x: 1, y: 0 },
          { x: 2, y: 1 },
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        8,
      )
    })

    it('blinker — 10 steps', () => {
      compare(
        [
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ],
        10,
      )
    })

    it('pulsar region — 3 steps', () => {
      // Small oscillator seed
      compare(
        [
          { x: 2, y: 0 },
          { x: 3, y: 0 },
          { x: 4, y: 0 },
          { x: 0, y: 2 },
          { x: 0, y: 3 },
          { x: 0, y: 4 },
          { x: 5, y: 2 },
          { x: 5, y: 3 },
          { x: 5, y: 4 },
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 4, y: 5 },
        ],
        3,
      )
    })
  })

  describe('configurable rules', () => {
    it('HighLife B36/S23 births with 6 neighbors', () => {
      const hl = new HashLifeEngine({ birth: [3, 6], survival: [2, 3] })
      hl.setCells([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
      ])
      hl.step()
      const cells = hl.getCells()
      const hasCenter = cells.some((c) => c.x === 1 && c.y === 1)
      expect(hasCenter).toBe(true)
    })
  })

  describe('unbounded grid', () => {
    it('supports large coordinates', () => {
      const offset = 1000
      engine.setCells([
        { x: 1 + offset, y: 0 + offset },
        { x: 2 + offset, y: 1 + offset },
        { x: 0 + offset, y: 2 + offset },
        { x: 1 + offset, y: 2 + offset },
        { x: 2 + offset, y: 2 + offset },
      ])
      engine.step(4)
      expect(engine.population).toBe(5)
    })
  })
})
