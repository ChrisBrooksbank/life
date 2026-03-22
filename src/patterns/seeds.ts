import type { Pattern } from '../engine/types'

/**
 * Block — 2×2 still life.
 * The simplest stable pattern; lives forever unchanged.
 */
const block: Pattern = {
  name: 'Block',
  cells: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
}

/**
 * Blinker — period-2 oscillator.
 * The smallest and most common oscillator.
 */
const blinker: Pattern = {
  name: 'Blinker',
  cells: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
}

/**
 * Glider — period-4 spaceship.
 * The smallest and most common spaceship; travels diagonally.
 */
const glider: Pattern = {
  name: 'Glider',
  cells: [
    { x: 1, y: 0 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
}

/**
 * LWSS (Lightweight Spaceship) — period-4 spaceship.
 * Travels horizontally; discovered by John Conway in 1970.
 */
const lwss: Pattern = {
  name: 'LWSS',
  cells: [
    { x: 1, y: 0 },
    { x: 4, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 4, y: 2 },
    { x: 0, y: 3 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
  ],
}

/**
 * Pulsar — period-3 oscillator.
 * A large, beautiful 13×13 oscillator with 4-fold symmetry.
 */
const pulsar: Pattern = {
  name: 'Pulsar',
  cells: [
    // Rows 0, 5, 7, 12 — horizontal bars
    ...([0, 5, 7, 12] as const).flatMap((y) => [
      { x: 2, y },
      { x: 3, y },
      { x: 4, y },
      { x: 8, y },
      { x: 9, y },
      { x: 10, y },
    ]),
    // Rows 2, 3, 4, 8, 9, 10 — vertical bar endpoints
    ...([2, 3, 4, 8, 9, 10] as const).flatMap((y) => [
      { x: 0, y },
      { x: 5, y },
      { x: 7, y },
      { x: 12, y },
    ]),
  ],
}

/**
 * Gosper Glider Gun — period-30 glider gun.
 * The first gun pattern ever discovered, by Bill Gosper in 1970.
 * Produces a new glider every 30 generations.
 *
 * 36 cells, bounding box 36×9.
 */
const gosperGliderGun: Pattern = {
  name: 'Gosper Glider Gun',
  cells: [
    // Left 2×2 block
    { x: 0, y: 4 },
    { x: 1, y: 4 },
    { x: 0, y: 5 },
    { x: 1, y: 5 },

    // Left queen bee shuttle
    { x: 10, y: 4 },
    { x: 10, y: 5 },
    { x: 10, y: 6 },
    { x: 11, y: 3 },
    { x: 11, y: 7 },
    { x: 12, y: 2 },
    { x: 12, y: 8 },
    { x: 13, y: 2 },
    { x: 13, y: 8 },
    { x: 14, y: 5 },
    { x: 15, y: 3 },
    { x: 15, y: 7 },
    { x: 16, y: 4 },
    { x: 16, y: 5 },
    { x: 16, y: 6 },
    { x: 17, y: 5 },

    // Right queen bee shuttle
    { x: 20, y: 2 },
    { x: 20, y: 3 },
    { x: 20, y: 4 },
    { x: 21, y: 2 },
    { x: 21, y: 3 },
    { x: 21, y: 4 },
    { x: 22, y: 1 },
    { x: 22, y: 5 },
    { x: 24, y: 0 },
    { x: 24, y: 1 },
    { x: 24, y: 5 },
    { x: 24, y: 6 },

    // Right 2×2 block
    { x: 34, y: 2 },
    { x: 34, y: 3 },
    { x: 35, y: 2 },
    { x: 35, y: 3 },
  ],
}

/**
 * R-pentomino — 5-cell methuselah.
 * Lives for 1103 generations before stabilising; one of the most-studied small patterns.
 */
const rPentomino: Pattern = {
  name: 'R-pentomino',
  cells: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ],
}

/**
 * Acorn — 7-cell methuselah.
 * Takes 5206 generations to stabilise; produces 633 cells in the process.
 */
const acorn: Pattern = {
  name: 'Acorn',
  cells: [
    { x: 1, y: 0 },
    { x: 3, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
  ],
}

/**
 * Beacon — period-2 oscillator.
 * Two touching 2×2 blocks that flash on alternate generations.
 */
const beacon: Pattern = {
  name: 'Beacon',
  cells: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
  ],
}

/**
 * Toad — period-2 oscillator.
 * A simple 6-cell oscillator discovered by Simon Norton in 1970.
 */
const toad: Pattern = {
  name: 'Toad',
  cells: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
}

/** All 10 built-in seed patterns, in display order. */
export const SEED_PATTERNS: Pattern[] = [
  block,
  blinker,
  toad,
  beacon,
  glider,
  lwss,
  pulsar,
  gosperGliderGun,
  rPentomino,
  acorn,
]
