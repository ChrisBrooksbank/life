import { describe, it, expect } from 'vitest'
import { parseFile } from './useFileDrop'

describe('parseFile', () => {
  it('parses .rle files using decodeRle', () => {
    const rle = 'x = 3, y = 1, rule = B3/S23\n3o!'
    const cells = parseFile('pattern.rle', rle)
    expect(cells).not.toBeNull()
    expect(cells!.length).toBe(3)
  })

  it('parses .cells files using decodePlaintext', () => {
    const plaintext = 'OOO\n'
    const cells = parseFile('pattern.cells', plaintext)
    expect(cells).not.toBeNull()
    expect(cells!.length).toBe(3)
  })

  it('parses .lif files using decodeLife106', () => {
    const lif = '#Life 1.06\n0 0\n1 0\n2 0\n'
    const cells = parseFile('pattern.lif', lif)
    expect(cells).not.toBeNull()
    expect(cells!.length).toBe(3)
  })

  it('returns null for unknown file extensions', () => {
    const cells = parseFile('pattern.txt', 'some content')
    expect(cells).toBeNull()
  })

  it('is case-insensitive for file extensions', () => {
    const rle = 'x = 1, y = 1, rule = B3/S23\no!'
    const cells = parseFile('PATTERN.RLE', rle)
    expect(cells).not.toBeNull()
    expect(cells!.length).toBe(1)
  })

  it('returns empty array for .rle file with no live cells', () => {
    const rle = 'x = 0, y = 0, rule = B3/S23\n!'
    const cells = parseFile('empty.rle', rle)
    expect(cells).not.toBeNull()
    expect(cells!.length).toBe(0)
  })
})
