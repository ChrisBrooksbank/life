export interface Cell {
  x: number
  y: number
}

export type Coordinate = Cell

export interface Pattern {
  name: string
  cells: Cell[]
}
