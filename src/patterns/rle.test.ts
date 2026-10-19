import { describe, it, expect } from 'vitest'
import { encodeRle, decodeRle } from './rle'
import type { Cell } from '../engine/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellSet(cells: Cell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).sort()
}

// ---------------------------------------------------------------------------
// encodeRle
// ---------------------------------------------------------------------------

describe('encodeRle', () => {
  it('returns minimal header for empty input', () => {
    const out = encodeRle([])
    expect(out).toContain('x = 0, y = 0')
    expect(out).toContain('!')
  })

  it('encodes a single live cell', () => {
    const out = encodeRle([{ x: 0, y: 0 }])
    expect(out).toMatch(/x = 1, y = 1/)
    expect(out).toContain('o!')
  })

  it('encodes a horizontal blinker', () => {
    // Three cells in a row: (0,0) (1,0) (2,0) → "3o!"
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]
    const out = encodeRle(cells)
    expect(out).toMatch(/x = 3, y = 1/)
    expect(out).toContain('3o!')
  })

  it('encodes a glider', () => {
    const cells: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]
    const out = encodeRle(cells)
    expect(out).toMatch(/x = 3, y = 3/)
    // Trailing dead cells are stripped, so row 0 is "bo" not "bob"
    expect(out).toContain('bo$2bo$3o!')
  })

  it('normalises cells that do not start at origin', () => {
    const cells: Cell[] = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ]
    const out = encodeRle(cells)
    expect(out).toMatch(/x = 2, y = 1/)
    expect(out).toContain('2o!')
  })

  it('includes the rule string B3/S23', () => {
    const out = encodeRle([{ x: 0, y: 0 }])
    expect(out).toContain('rule = B3/S23')
  })

  it('omits trailing dead cells within a row', () => {
    // Only one live cell in the middle — trailing dead cells should be stripped
    const cells: Cell[] = [{ x: 0, y: 0 }]
    const out = encodeRle(cells)
    // Should not contain trailing 'b' before '!'
    expect(out).not.toMatch(/b!$/)
  })

  it('encodes a 2×2 block correctly', () => {
    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]
    const out = encodeRle(cells)
    expect(out).toMatch(/x = 2, y = 2/)
    expect(out).toContain('2o$2o!')
  })
})

// ---------------------------------------------------------------------------
// decodeRle
// ---------------------------------------------------------------------------

describe('decodeRle', () => {
  it('returns empty array for empty string', () => {
    expect(decodeRle('')).toEqual([])
  })

  it('returns empty array for header-only input (no body)', () => {
    const rle = 'x = 3, y = 3, rule = B3/S23\n!'
    expect(decodeRle(rle)).toEqual([])
  })

  it('decodes a single live cell', () => {
    const rle = 'x = 1, y = 1, rule = B3/S23\no!'
    expect(decodeRle(rle)).toEqual([{ x: 0, y: 0 }])
  })

  it('decodes a horizontal blinker', () => {
    const rle = 'x = 3, y = 1, rule = B3/S23\n3o!'
    const cells = decodeRle(rle)
    expect(cellSet(cells)).toEqual(['0,0', '1,0', '2,0'])
  })

  it('decodes a glider', () => {
    const rle = 'x = 3, y = 3, rule = B3/S23\nbob$2bo$3o!'
    const cells = decodeRle(rle)
    expect(cellSet(cells)).toEqual(['0,2', '1,0', '1,2', '2,1', '2,2'])
  })

  it('ignores # comment lines', () => {
    const rle = '# This is a comment\n# Another comment\nx = 1, y = 1\no!'
    const cells = decodeRle(rle)
    expect(cells).toEqual([{ x: 0, y: 0 }])
  })

  it('handles multi-row $ separator', () => {
    // Two cells with 2 empty rows between them
    const rle = 'x = 1, y = 4, rule = B3/S23\no$2$o!'
    const cells = decodeRle(rle)
    expect(cellSet(cells)).toEqual(['0,0', '0,3'])
  })

  it('stops at ! and ignores trailing content', () => {
    const rle = 'x = 2, y = 1\n2o!extra stuff'
    const cells = decodeRle(rle)
    expect(cellSet(cells)).toEqual(['0,0', '1,0'])
  })

  it('handles whitespace in body gracefully', () => {
    const rle = 'x = 3, y = 1\n3o !'
    const cells = decodeRle(rle)
    expect(cellSet(cells)).toEqual(['0,0', '1,0', '2,0'])
  })
})

// ---------------------------------------------------------------------------
// Round-trip: encodeRle ↔ decodeRle
// ---------------------------------------------------------------------------

describe('encodeRle / decodeRle round-trip', () => {
  function roundTrip(cells: Cell[]): Cell[] {
    return decodeRle(encodeRle(cells))
  }

  it('round-trips an empty pattern', () => {
    expect(roundTrip([])).toEqual([])
  })

  it('round-trips a single cell', () => {
    expect(cellSet(roundTrip([{ x: 0, y: 0 }]))).toEqual(['0,0'])
  })

  it('round-trips a glider', () => {
    const glider: Cell[] = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]
    expect(cellSet(roundTrip(glider))).toEqual(cellSet(glider))
  })

  it('round-trips offset cells (normalises to origin)', () => {
    const cells: Cell[] = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 6 },
    ]
    // After round-trip, cells are at origin
    expect(cellSet(roundTrip(cells))).toEqual(['0,0', '0,1', '1,0'])
  })

  it('round-trips a large pattern without loss', () => {
    // 10×10 checkerboard
    const cells: Cell[] = []
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if ((x + y) % 2 === 0) cells.push({ x, y })
      }
    }
    const result = roundTrip(cells)
    expect(cellSet(result)).toEqual(cellSet(cells))
  })
})
