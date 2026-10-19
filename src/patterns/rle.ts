import type { Cell } from '../engine/types'

/**
 * Encode an array of live cells into RLE format.
 * Cells may be at any coordinates; they are normalised to origin (0, 0).
 * Returns a complete RLE string including the header line.
 */
export function encodeRle(cells: Cell[]): string {
  if (cells.length === 0) return 'x = 0, y = 0, rule = B3/S23\n!'

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const c of cells) {
    if (c.x < minX) minX = c.x
    if (c.y < minY) minY = c.y
    if (c.x > maxX) maxX = c.x
    if (c.y > maxY) maxY = c.y
  }

  const width = maxX - minX + 1
  const height = maxY - minY + 1

  const cellSet = new Set<string>()
  for (const c of cells) {
    cellSet.add(`${c.x - minX},${c.y - minY}`)
  }

  /** Append a run of `count` copies of `ch` to `out`. */
  function appendRun(out: string[], count: number, ch: string): void {
    if (count === 1) {
      out.push(ch)
    } else {
      out.push(`${count}${ch}`)
    }
  }

  const rowParts: string[] = []
  for (let y = 0; y < height; y++) {
    const parts: string[] = []
    let col = 0
    while (col < width) {
      const alive = cellSet.has(`${col},${y}`)
      let run = 1
      while (col + run < width && cellSet.has(`${col + run},${y}`) === alive) {
        run++
      }
      appendRun(parts, run, alive ? 'o' : 'b')
      col += run
    }

    // Strip trailing dead-cell runs (they are implicit in RLE)
    let rowStr = parts.join('')
    rowStr = rowStr.replace(/(\d*b)+$/, '')
    rowParts.push(rowStr)
  }

  // Strip trailing empty rows
  while (rowParts.length > 0 && rowParts[rowParts.length - 1] === '') {
    rowParts.pop()
  }

  const header = `x = ${width}, y = ${height}, rule = B3/S23`
  const body = rowParts.join('$') + '!'
  return `${header}\n${body}`
}

/**
 * Decode an RLE string into an array of live cells.
 * Cells are returned with coordinates starting at (0, 0).
 * Comment lines (starting with `#`) and the header line are ignored.
 * Returns an empty array if the input is empty or contains no live cells.
 */
export function decodeRle(rle: string): Cell[] {
  const lines = rle.split('\n')

  // Collect body lines: skip comments and the header
  const bodyLines: string[] = []
  let headerSeen = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) continue
    if (!headerSeen && (trimmed.includes('x =') || trimmed.includes('x='))) {
      headerSeen = true
      continue
    }
    bodyLines.push(trimmed)
  }

  const body = bodyLines.join('')

  const cells: Cell[] = []
  let x = 0
  let y = 0
  let runStr = ''

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      runStr += ch
    } else if (ch === 'o' || ch === 'O') {
      const run = runStr ? parseInt(runStr, 10) : 1
      runStr = ''
      for (let i = 0; i < run; i++) {
        cells.push({ x: x + i, y })
      }
      x += run
    } else if (ch === 'b' || ch === 'B' || ch === '.') {
      const run = runStr ? parseInt(runStr, 10) : 1
      runStr = ''
      x += run
    } else if (ch === '$') {
      const run = runStr ? parseInt(runStr, 10) : 1
      runStr = ''
      y += run
      x = 0
    } else if (ch === '!') {
      break
    }
    // Ignore whitespace and unrecognised characters
  }

  return cells
}
