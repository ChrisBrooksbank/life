import { describe, it, expect } from 'vitest'
import { decodePlaintext, encodePlaintext } from './plaintext'
import type { Cell } from '../engine/types'

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

describe('encodePlaintext', () => {
  it('returns empty string for empty cells', () => {
    expect(encodePlaintext([])).toBe('')
  })

  it('encodes a single live cell', () => {
    expect(encodePlaintext([{ x: 0, y: 0 }])).toBe('O')
  })

  it('encodes a horizontal blinker', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]
    expect(encodePlaintext(cells)).toBe('OOO')
  })

  it('encodes a vertical blinker', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ]
    expect(encodePlaintext(cells)).toBe('O\nO\nO')
  })

  it('encodes a 2x2 block', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]
    expect(encodePlaintext(cells)).toBe('OO\nOO')
  })

  it('encodes a glider', () => {
    // .O.
    // ..O
    // OOO
    const cells: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]
    expect(encodePlaintext(cells)).toBe('.O\n..O\nOOO')
  })

  it('normalises coordinates to origin', () => {
    const cells: Cell[] = [
      { x: 10, y: 5 },
      { x: 11, y: 5 },
    ]
    expect(encodePlaintext(cells)).toBe('OO')
  })

  it('strips trailing dead cells from each row', () => {
    // Only left cell in a 3-wide grid
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ]
    const result = encodePlaintext(cells)
    expect(result).toBe('O\nO')
  })

  it('round-trips through decode/encode', () => {
    const original = '.O.\n..O\nOOO'
    const cells = decodePlaintext(original)
    expect(encodePlaintext(cells)).toBe('.O\n..O\nOOO')
  })
})

describe('decodePlaintext', () => {
  it('returns empty array for empty string', () => {
    expect(decodePlaintext('')).toEqual([])
  })

  it('returns empty array for comment-only input', () => {
    const text = '! name: Test\n! description: Just comments'
    expect(decodePlaintext(text)).toEqual([])
  })

  it('returns empty array for all-dead row', () => {
    const text = '...'
    expect(decodePlaintext(text)).toEqual([])
  })

  it('decodes a single live cell', () => {
    const text = 'O'
    expect(decodePlaintext(text)).toEqual([{ x: 0, y: 0 }])
  })

  it('decodes a horizontal blinker', () => {
    const text = 'OOO'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '1,0', '2,0'])
  })

  it('decodes a vertical blinker', () => {
    const text = 'O\nO\nO'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '0,1', '0,2'])
  })

  it('decodes a 2x2 block', () => {
    const text = 'OO\nOO'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  it('decodes a glider', () => {
    // Standard glider in plaintext:
    // .O.
    // ..O
    // OOO
    const text = '.O.\n..O\nOOO'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,2', '1,0', '1,2', '2,1', '2,2'])
  })

  it('ignores ! comment lines', () => {
    const text = '! Glider\n.O.\n..O\nOOO'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,2', '1,0', '1,2', '2,1', '2,2'])
  })

  it('ignores multiple comment lines before and within pattern', () => {
    const text = '! Name: Block\n! Author: Conway\nOO\nOO'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  it('handles mixed dead and live cells correctly', () => {
    // Row 0: O.O → cells at (0,0) and (2,0)
    // Row 1: .O. → cell at (1,1)
    const text = 'O.O\n.O.'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '1,1', '2,0'])
  })

  it('handles trailing newlines gracefully', () => {
    const text = 'OO\n'
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '1,0'])
  })

  it('handles Windows-style CRLF line endings', () => {
    const text = 'OO\r\nOO'
    // trimEnd() removes trailing \r
    expect(cellSet(decodePlaintext(text))).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  it('decodes a beacon (period-2 oscillator)', () => {
    // OO..
    // OO..
    // ..OO
    // ..OO
    const text = 'OO..\nOO..\n..OO\n..OO'
    const cells = decodePlaintext(text)
    expect(cellSet(cells)).toEqual(['0,0', '0,1', '1,0', '1,1', '2,2', '2,3', '3,2', '3,3'])
  })
})
