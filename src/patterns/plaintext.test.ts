import { describe, it, expect } from 'vitest'
import { decodePlaintext } from './plaintext'
import type { Cell } from '../engine/types'

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

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
