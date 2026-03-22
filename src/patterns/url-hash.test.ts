import { describe, it, expect } from 'vitest'
import { encodePatternToHash, decodePatternFromHash } from './url-hash'
import type { Cell } from '../engine/types'

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

describe('encodePatternToHash', () => {
  it('returns a string starting with #p=', () => {
    const hash = encodePatternToHash([{ x: 0, y: 0 }])
    expect(hash).toMatch(/^#p=/)
  })

  it('encodes payload without URL-unsafe base64 characters', () => {
    const glider: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]
    const hash = encodePatternToHash(glider)
    // Extract payload after '#p='
    const payload = hash.slice('#p='.length)
    // Payload must not contain +, /, or = (standard base64 chars replaced in base64url)
    expect(payload).not.toMatch(/[+/=]/)
  })

  it('encodes empty cells without throwing', () => {
    const hash = encodePatternToHash([])
    expect(hash).toMatch(/^#p=/)
  })
})

describe('decodePatternFromHash', () => {
  it('returns null for an empty string', () => {
    expect(decodePatternFromHash('')).toBeNull()
  })

  it('returns null for a hash without the p= prefix', () => {
    expect(decodePatternFromHash('#other=abc')).toBeNull()
  })

  it('returns null for an invalid base64 payload', () => {
    expect(decodePatternFromHash('#p=!!!invalid!!!')).toBeNull()
  })

  it('returns empty array for an empty-pattern hash', () => {
    const hash = encodePatternToHash([])
    const result = decodePatternFromHash(hash)
    expect(result).toEqual([])
  })
})

describe('encodePatternToHash / decodePatternFromHash round-trip', () => {
  function roundTrip(cells: Cell[]): Cell[] | null {
    return decodePatternFromHash(encodePatternToHash(cells))
  }

  it('round-trips a single cell', () => {
    const cells: Cell[] = [{ x: 0, y: 0 }]
    expect(cellSet(roundTrip(cells)!)).toEqual(['0,0'])
  })

  it('round-trips a glider', () => {
    const glider: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]
    expect(cellSet(roundTrip(glider)!)).toEqual(cellSet(glider))
  })

  it('round-trips a 2x2 block', () => {
    const block: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]
    expect(cellSet(roundTrip(block)!)).toEqual(cellSet(block))
  })

  it('normalises cell coordinates to origin on decode', () => {
    // Cells offset from origin get normalised by encodeRle
    const cells: Cell[] = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ]
    expect(cellSet(roundTrip(cells)!)).toEqual(['0,0', '1,0'])
  })
})
