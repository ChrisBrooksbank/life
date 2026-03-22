import { describe, it, expect } from 'vitest'
import { decodeLife106 } from './life106'
import type { Cell } from '../engine/types'

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

describe('decodeLife106', () => {
  it('returns empty array for empty string', () => {
    expect(decodeLife106('')).toEqual([])
  })

  it('returns empty array for header-only input', () => {
    const text = '#Life 1.06'
    expect(decodeLife106(text)).toEqual([])
  })

  it('returns empty array for comment-only input', () => {
    const text = '#Life 1.06\n# This is a comment\n# Another comment'
    expect(decodeLife106(text)).toEqual([])
  })

  it('decodes a single live cell at origin', () => {
    const text = '#Life 1.06\n0 0'
    expect(decodeLife106(text)).toEqual([{ x: 0, y: 0 }])
  })

  it('decodes multiple cells', () => {
    const text = '#Life 1.06\n1 2\n3 4\n5 6'
    expect(cellSet(decodeLife106(text))).toEqual(['1,2', '3,4', '5,6'])
  })

  it('decodes negative coordinates', () => {
    const text = '#Life 1.06\n-5 -3\n0 0\n10 -7'
    expect(cellSet(decodeLife106(text))).toEqual(['-5,-3', '0,0', '10,-7'])
  })

  it('decodes a glider', () => {
    // Glider in Life 1.06 format
    const text = '#Life 1.06\n1 0\n2 1\n0 2\n1 2\n2 2'
    expect(cellSet(decodeLife106(text))).toEqual(['0,2', '1,0', '1,2', '2,1', '2,2'])
  })

  it('ignores comment lines mixed with data', () => {
    const text = '#Life 1.06\n# Blinker\n0 0\n1 0\n2 0'
    expect(cellSet(decodeLife106(text))).toEqual(['0,0', '1,0', '2,0'])
  })

  it('handles extra whitespace between coordinates', () => {
    const text = '#Life 1.06\n1  2\n3\t4'
    expect(cellSet(decodeLife106(text))).toEqual(['1,2', '3,4'])
  })

  it('handles Windows-style CRLF line endings', () => {
    const text = '#Life 1.06\r\n0 0\r\n1 1'
    expect(cellSet(decodeLife106(text))).toEqual(['0,0', '1,1'])
  })

  it('handles trailing newlines gracefully', () => {
    const text = '#Life 1.06\n0 0\n1 1\n'
    expect(cellSet(decodeLife106(text))).toEqual(['0,0', '1,1'])
  })

  it('decodes a 2x2 block', () => {
    const text = '#Life 1.06\n0 0\n1 0\n0 1\n1 1'
    expect(cellSet(decodeLife106(text))).toEqual(['0,0', '0,1', '1,0', '1,1'])
  })

  it('handles input without header line', () => {
    // Should still parse coordinate lines even without header
    const text = '0 0\n1 1'
    expect(cellSet(decodeLife106(text))).toEqual(['0,0', '1,1'])
  })
})
