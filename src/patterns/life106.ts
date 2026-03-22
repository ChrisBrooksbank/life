import type { Cell } from '../engine/types'

/**
 * Decode a Life 1.06 (.lif) format string into an array of live cells.
 *
 * Format rules:
 *   - First line is "#Life 1.06" (header, ignored after detection)
 *   - Lines starting with '#' are comments (ignored)
 *   - Each data line contains two integers: "x y" representing a live cell
 *   - Coordinates can be negative
 */
export function decodeLife106(text: string): Cell[] {
  const cells: Cell[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) continue

    const x = parseInt(parts[0] ?? '', 10)
    const y = parseInt(parts[1] ?? '', 10)
    if (!isNaN(x) && !isNaN(y)) {
      cells.push({ x, y })
    }
  }

  return cells
}
