import { describe, it, expect } from 'vitest'
import type { Cell, Coordinate, Pattern } from './types'

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
