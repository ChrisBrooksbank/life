import type { Cell } from '../engine/types'

/**
 * Encode an array of live cells into Plaintext (.cells) format.
 * Cells may be at any coordinates; they are normalised to origin (0, 0).
 * Returns a string where 'O' represents a live cell and '.' represents a dead cell.
 */
export function encodePlaintext(cells: Cell[]): string {
  if (cells.length === 0) return ''

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

  const rows: string[] = []
  for (let y = 0; y < height; y++) {
    let row = ''
    for (let x = 0; x < width; x++) {
      row += cellSet.has(`${x},${y}`) ? 'O' : '.'
    }
    // Strip trailing dead cells (dots) from each row
    rows.push(row.replace(/\.+$/, ''))
  }

  return rows.join('\n')
}

/**
 * Decode a Plaintext (.cells) format string into an array of live cells.
 *
 * Format rules:
 *   - Lines starting with '!' are comments (ignored)
 *   - 'O' (uppercase letter O) represents a live cell
 *   - '.' represents a dead cell
 *   - Rows are separated by newlines
 *   - Cells are returned with coordinates starting at (0, 0)
 */
export function decodePlaintext(text: string): Cell[] {
  const cells: Cell[] = []
  const lines = text.split('\n')

  let row = 0
  for (const line of lines) {
    const trimmed = line.trimEnd()

    // Skip comment lines
    if (trimmed.startsWith('!')) continue

    // Process cell row
    for (let col = 0; col < trimmed.length; col++) {
      const ch = trimmed[col]
      if (ch === 'O') {
        cells.push({ x: col, y: row })
      }
      // '.' is dead — skip. Any other character is also skipped.
    }
    row++
  }

  return cells
}
