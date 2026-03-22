import type { Cell } from '../engine/types'

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
