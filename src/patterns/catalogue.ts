import { decodeRle } from './rle'
import type { Cell } from '../engine/types'

export type PatternCategory =
  | 'still-life'
  | 'oscillator'
  | 'spaceship'
  | 'gun'
  | 'methuselah'
  | 'other'

export interface CataloguePattern {
  name: string
  category: PatternCategory
  cells: Cell[]
  description: string
  discoverer?: string
  year?: number
  /** Oscillation period (undefined for aperiodic/methuselahs) */
  period?: number
  /** Initial or stable population */
  population?: number
}

/** Parse a bare RLE body (no header needed; body must end with `!`). */
function rle(body: string): Cell[] {
  return decodeRle(`x = 0, y = 0, rule = B3/S23\n${body}`)
}

// ---------------------------------------------------------------------------
// Still lifes (12)
// ---------------------------------------------------------------------------

const block: CataloguePattern = {
  name: 'Block',
  category: 'still-life',
  description: 'The simplest stable pattern — a 2×2 square that lives forever unchanged.',
  discoverer: 'John Conway',
  year: 1970,
  population: 4,
  cells: rle('2o$2o!'),
}

const beehive: CataloguePattern = {
  name: 'Beehive',
  category: 'still-life',
  description:
    'A 6-cell hexagonal still life; one of the most common objects produced by random soups.',
  year: 1970,
  population: 6,
  cells: rle('b2o$o2bo$b2o!'),
}

const loaf: CataloguePattern = {
  name: 'Loaf',
  category: 'still-life',
  description: 'A 7-cell still life shaped like a loaf of bread.',
  year: 1970,
  population: 7,
  cells: rle('b2o$o2bo$bobo$2bo!'),
}

const boat: CataloguePattern = {
  name: 'Boat',
  category: 'still-life',
  description: 'A 5-cell still life resembling a small boat.',
  year: 1970,
  population: 5,
  cells: rle('2o$obo$bo!'),
}

const tub: CataloguePattern = {
  name: 'Tub',
  category: 'still-life',
  description: 'A 4-cell diamond-shaped still life, also called a "diamond".',
  year: 1970,
  population: 4,
  cells: rle('bo$obo$bo!'),
}

const ship: CataloguePattern = {
  name: 'Ship',
  category: 'still-life',
  description: 'A 6-cell still life — two boats fused at the corner.',
  year: 1970,
  population: 6,
  cells: rle('2o$obo$b2o!'),
}

const barge: CataloguePattern = {
  name: 'Barge',
  category: 'still-life',
  description: 'A 6-cell still life shaped like an elongated boat.',
  year: 1970,
  population: 6,
  cells: rle('bo$obo$bobo$2bo!'),
}

const longBoat: CataloguePattern = {
  name: 'Long Boat',
  category: 'still-life',
  description: 'A 7-cell still life — an extended version of the boat.',
  year: 1970,
  population: 7,
  cells: rle('2o$obo$bobo$2bo!'),
}

const pond: CataloguePattern = {
  name: 'Pond',
  category: 'still-life',
  description: 'An 8-cell still life with 4-fold symmetry, resembling a square pond.',
  year: 1970,
  population: 8,
  cells: rle('b2o$o2bo$o2bo$b2o!'),
}

const eater1: CataloguePattern = {
  name: 'Eater 1',
  category: 'still-life',
  description:
    'A 7-cell still life (fishhook) that can absorb gliders without being permanently damaged.',
  discoverer: 'Bill Gosper',
  year: 1971,
  population: 7,
  cells: rle('2o$obo$2bo$2b2o!'),
}

const longBarge: CataloguePattern = {
  name: 'Long Barge',
  category: 'still-life',
  description: 'An 8-cell still life — an extended barge.',
  year: 1970,
  population: 8,
  cells: rle('bo$obo$bobo$bobo$2bo!'),
}

const longShip: CataloguePattern = {
  name: 'Long Ship',
  category: 'still-life',
  description: 'An 8-cell still life — an extended ship.',
  year: 1970,
  population: 8,
  cells: rle('2o$obo$bobo$b2o!'),
}

// ---------------------------------------------------------------------------
// Oscillators (15)
// ---------------------------------------------------------------------------

const blinker: CataloguePattern = {
  name: 'Blinker',
  category: 'oscillator',
  description: 'The smallest and most common period-2 oscillator — three cells in a row.',
  discoverer: 'John Conway',
  year: 1970,
  period: 2,
  population: 3,
  cells: rle('3o!'),
}

const toad: CataloguePattern = {
  name: 'Toad',
  category: 'oscillator',
  description: 'A period-2 oscillator with 6 cells discovered by Simon Norton.',
  discoverer: 'Simon Norton',
  year: 1970,
  period: 2,
  population: 6,
  cells: rle('b3o$3o!'),
}

const beacon: CataloguePattern = {
  name: 'Beacon',
  category: 'oscillator',
  description: 'Two touching 2×2 blocks that flash on alternate generations (period 2).',
  discoverer: 'John Conway',
  year: 1970,
  period: 2,
  population: 8,
  cells: rle('2o$2o$2b2o$2b2o!'),
}

const pulsar: CataloguePattern = {
  name: 'Pulsar',
  category: 'oscillator',
  description:
    'A stunning period-3 oscillator with 4-fold symmetry and 48 cells — one of the most beautiful patterns in Life.',
  discoverer: 'John Conway',
  year: 1970,
  period: 3,
  population: 48,
  cells: rle(
    '2b3o3b3o$$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o$$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo$$2b3o3b3o!',
  ),
}

const pentadecathlon: CataloguePattern = {
  name: 'Pentadecathlon',
  category: 'oscillator',
  description:
    'A period-15 oscillator with 10 cells — the longest period among naturally-occurring oscillators.',
  discoverer: 'John Conway',
  year: 1970,
  period: 15,
  population: 10,
  cells: rle('3bo4bo$b3o4b3o$3bo4bo!'),
}

const clock: CataloguePattern = {
  name: 'Clock',
  category: 'oscillator',
  description: 'A period-2 oscillator with 8 cells that rotates 90° each generation.',
  discoverer: 'John Conway',
  year: 1970,
  period: 2,
  population: 8,
  cells: rle('2bo$b3o$3o$bo!'),
}

const tumbler: CataloguePattern = {
  name: 'Tumbler',
  category: 'oscillator',
  description: 'A period-14 oscillator with 12 cells discovered by George Collins.',
  discoverer: 'George Collins',
  year: 1971,
  period: 14,
  population: 12,
  cells: rle('b2ob2o$o4bo$o4bo$bo2bo$2b2o!'),
}

const figureEight: CataloguePattern = {
  name: 'Figure Eight',
  category: 'oscillator',
  description: 'A period-8 oscillator composed of two 3×3 blocks in an offset arrangement.',
  discoverer: 'Simon Norton',
  year: 1970,
  period: 8,
  population: 18,
  cells: rle('3o$3o$3o$3b3o$3b3o$3b3o!'),
}

const queenBeeShuttle: CataloguePattern = {
  name: 'Queen Bee Shuttle',
  category: 'oscillator',
  description:
    'A period-30 oscillator in which a queen bee bounces between two blocks. A component of the Gosper Glider Gun.',
  discoverer: 'Bill Gosper',
  year: 1970,
  period: 30,
  population: 20,
  cells: rle('9bo$7bobo$6bobo$2o3bo2bo$2o4bobo$6bobo$7bo!'),
}

const octagonII: CataloguePattern = {
  name: 'Octagon II',
  category: 'oscillator',
  description: 'A period-5 oscillator with 16 cells and octagonal symmetry.',
  discoverer: 'John Conway',
  year: 1971,
  period: 5,
  population: 16,
  cells: rle('3b2o$2bo2bo$bo4bo$o6bo$o6bo$bo4bo$2bo2bo$3b2o!'),
}

const caterer: CataloguePattern = {
  name: 'Caterer',
  category: 'oscillator',
  description: 'A period-3 oscillator with 10 cells discovered by Dean Hickerson.',
  discoverer: 'Dean Hickerson',
  year: 1992,
  period: 3,
  population: 10,
  cells: rle('3o$ob2o$o3b2o$3b2o!'),
}

const kokotoClock: CataloguePattern = {
  name: 'Kokoto',
  category: 'oscillator',
  description: 'A period-8 oscillator.',
  year: 1971,
  period: 8,
  population: 8,
  cells: rle('2o$2o2$3b2o$3b2o!'),
}

const figure8variant: CataloguePattern = {
  name: 'Bi-clock',
  category: 'oscillator',
  description: 'Two clocks interacting to form a period-2 oscillator with 16 cells.',
  year: 1971,
  period: 2,
  population: 16,
  cells: rle('2bo$b3o$3o$bo3$3b2o$2b3o$4bo$3bo!'),
}

const pulsarQuadrant: CataloguePattern = {
  name: 'Caterpillar Oscillator',
  category: 'oscillator',
  description: 'A period-2 oscillator with 12 cells.',
  year: 1971,
  period: 2,
  population: 12,
  cells: rle('b3o$o2bo$bo$bo$o2bo$b3o!'),
}

const fencepost: CataloguePattern = {
  name: 'Traffic Light',
  category: 'oscillator',
  description:
    'Four blinkers arranged symmetrically in a cross — a period-2 oscillator with 12 cells.',
  year: 1971,
  period: 2,
  population: 12,
  cells: rle('3o$b3$b3o$3b!'),
}

// ---------------------------------------------------------------------------
// Spaceships (9)
// ---------------------------------------------------------------------------

const glider: CataloguePattern = {
  name: 'Glider',
  category: 'spaceship',
  description:
    'The smallest and most common spaceship — 5 cells travelling diagonally at c/4. Discovered by Richard Guy.',
  discoverer: 'Richard Guy',
  year: 1970,
  period: 4,
  population: 5,
  cells: rle('bo$2bo$3o!'),
}

const lwss: CataloguePattern = {
  name: 'LWSS',
  category: 'spaceship',
  description:
    'Lightweight Spaceship — the smallest orthogonal spaceship (9 cells), travelling at c/2.',
  discoverer: 'John Conway',
  year: 1970,
  period: 4,
  population: 9,
  cells: rle('bo2bo$o$o3bo$4o!'),
}

const mwss: CataloguePattern = {
  name: 'MWSS',
  category: 'spaceship',
  description: 'Medium-weight Spaceship — 11 cells travelling orthogonally at c/2.',
  discoverer: 'John Conway',
  year: 1970,
  period: 4,
  population: 11,
  cells: rle('3bo$bo3bo$o$o4bo$5o!'),
}

const hwss: CataloguePattern = {
  name: 'HWSS',
  category: 'spaceship',
  description: 'Heavy-weight Spaceship — 13 cells travelling orthogonally at c/2.',
  discoverer: 'John Conway',
  year: 1970,
  period: 4,
  population: 13,
  cells: rle('3b2o$bo4bo$o$o5bo$6o!'),
}

const copperhead: CataloguePattern = {
  name: 'Copperhead',
  category: 'spaceship',
  description:
    'A c/10 orthogonal spaceship discovered in 2016 — the first new naturally small spaceship found since the 1970s.',
  discoverer: 'zdr',
  year: 2016,
  period: 10,
  population: 28,
  cells: rle('b2ob2o$obo2bo$obo2bo$b2ob2o$4b2o$2b4o$2bo2bo$4b2o$2b2ob2o$2bo3bo!'),
}

const loafer: CataloguePattern = {
  name: 'Loafer',
  category: 'spaceship',
  description:
    'A c/7 orthogonal spaceship discovered in 2013 — the first new spaceship velocity since 1971.',
  discoverer: 'Josh Ball',
  year: 2013,
  period: 7,
  population: 20,
  cells: rle('b2obo$o2b2o$bobo$2bo$2b2o$4bobo$4b2obo$4bo2bo$5b2o!'),
}

const weekender: CataloguePattern = {
  name: 'Weekender',
  category: 'spaceship',
  description:
    'A c/7 spaceship with bilateral symmetry discovered in 2000. It was the first c/7 spaceship found.',
  discoverer: 'David Eppstein',
  year: 2000,
  period: 7,
  population: 36,
  cells: rle(
    '2b2o6b2o$2b2o6b2o$b10o$b2ob4ob2o$3b2o2b2o$b3ob2ob3o$o3b4o3bo$3b6o$b4o2b4o$2bo6bo$3b2o2b2o$4bo2bo!',
  ),
}

const dart: CataloguePattern = {
  name: 'Dart',
  category: 'spaceship',
  description:
    'A c/3 orthogonal spaceship discovered in 1989 — one of the smallest known c/3 ships.',
  discoverer: 'Paul Tooke',
  year: 1989,
  period: 3,
  population: 23,
  cells: rle('2bobo$b2ob2o$2b3o$2b3o$bo3bo$o5bo$o5bo$b2ob2o$3bo!'),
}

const canadaGoose: CataloguePattern = {
  name: 'Canada Goose',
  category: 'spaceship',
  description:
    'A c/4 diagonal spaceship that consists of a glider and a separated tagalong component.',
  discoverer: 'Jason Summers',
  year: 2000,
  period: 4,
  population: 26,
  cells: rle('bo$obo$o2bo$b4o$3b3o$4bo2bo$4bo3bo$5b3obo$6bob2o$9bo$9b2o$9bo!'),
}

// ---------------------------------------------------------------------------
// Guns (3)
// ---------------------------------------------------------------------------

const gosperGliderGun: CataloguePattern = {
  name: 'Gosper Glider Gun',
  category: 'gun',
  description:
    'The first gun ever discovered — fires a new glider every 30 generations. Proved that Life populations can grow without bound.',
  discoverer: 'Bill Gosper',
  year: 1970,
  period: 30,
  population: 36,
  cells: rle(
    '24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!',
  ),
}

const simkinGliderGun: CataloguePattern = {
  name: 'Simkin Glider Gun',
  category: 'gun',
  description:
    'The smallest known glider gun by bounding box area, with period 120. Discovered in 2015.',
  discoverer: 'Michael Simkin',
  year: 2015,
  period: 120,
  population: 36,
  cells: rle('2o5b2o$2o5b2o$2$4b2o$4b2o5$2ob2obo$o2bob2o2b2o$2obo5b2o$3bo$4b3o$6bo!'),
}

const pufferGun: CataloguePattern = {
  name: 'Puffer Train',
  category: 'gun',
  description:
    'The first puffer — a pattern that moves indefinitely, leaving a trail of debris (blocks and blinkers) behind.',
  discoverer: 'Bill Gosper',
  year: 1971,
  period: 128,
  population: 18,
  cells: rle('3bo4b$bobo3b$o6b$o4b2o$6o2b2o$o4b2o2b$o6b2b$bobo4b$3bo4b!'),
}

// ---------------------------------------------------------------------------
// Methuselahs (10)
// ---------------------------------------------------------------------------

const rPentomino: CataloguePattern = {
  name: 'R-pentomino',
  category: 'methuselah',
  description:
    'A 5-cell methuselah that lives for 1,103 generations before stabilising — one of the most studied small patterns.',
  discoverer: 'John Conway',
  year: 1970,
  population: 5,
  cells: rle('b2o$2o$bo!'),
}

const acorn: CataloguePattern = {
  name: 'Acorn',
  category: 'methuselah',
  description:
    'A 7-cell methuselah that takes 5,206 generations to stabilise, producing 633 live cells in the process.',
  discoverer: 'Charles Corderman',
  year: 1971,
  population: 7,
  cells: rle('bo5b$3bo3b$2o2b3o!'),
}

const diehard: CataloguePattern = {
  name: 'Diehard',
  category: 'methuselah',
  description:
    'A 7-cell pattern that takes exactly 130 generations to completely vanish — the longest-lived 7-cell diehard.',
  year: 1971,
  population: 7,
  cells: rle('6bo$2o$bo3b3o!'),
}

const piHeptomino: CataloguePattern = {
  name: 'Pi Heptomino',
  category: 'methuselah',
  description:
    'A 7-cell methuselah shaped like the Greek letter π. Stabilises after 173 generations.',
  year: 1970,
  population: 7,
  cells: rle('3o$obo$3o!'),
}

const bHeptomino: CataloguePattern = {
  name: 'B-heptomino',
  category: 'methuselah',
  description: 'A 7-cell methuselah that stabilises after 148 generations.',
  year: 1970,
  population: 7,
  cells: rle('b2o$2ob$b2o$bo!'),
}

const century: CataloguePattern = {
  name: 'Century',
  category: 'methuselah',
  description:
    'A 9-cell methuselah that stabilises after 103 generations, producing 3 blocks, a ship and 2 gliders.',
  year: 1971,
  population: 9,
  cells: rle('b3o$3ob$b3o!'),
}

const thunderbird: CataloguePattern = {
  name: 'Thunderbird',
  category: 'methuselah',
  description: 'A 7-cell methuselah that takes 243 generations to stabilise.',
  year: 1971,
  population: 7,
  cells: rle('3o$bo$bo$bo!'),
}

const rabbits: CataloguePattern = {
  name: 'Rabbits',
  category: 'methuselah',
  description:
    'A 9-cell methuselah that takes 17,331 generations to stabilise — one of the longest-lived small patterns.',
  discoverer: 'Andrew Trevorrow',
  year: 1986,
  population: 9,
  cells: rle('o5bo$2bo3b2o$3o2bobo!'),
}

const bunnies: CataloguePattern = {
  name: 'Bunnies',
  category: 'methuselah',
  description:
    'A 9-cell pattern that runs for 17,332 generations before stabilising — one generation longer than Rabbits.',
  discoverer: 'Robert Wainwright',
  year: 1984,
  population: 9,
  cells: rle('o5bo$b2o2b2o$2o4bo!'),
}

const lidka: CataloguePattern = {
  name: 'Lidka',
  category: 'methuselah',
  description: 'A 13-cell methuselah that stabilises after 29,055 generations.',
  discoverer: 'Lidka Schefcsik',
  year: 1971,
  population: 13,
  cells: rle('bo$bo$bo$3bo$b3o$b3o$b3o$bo!'),
}

// ---------------------------------------------------------------------------
// Other / engineered (5)
// ---------------------------------------------------------------------------

const switchEngine: CataloguePattern = {
  name: 'Switch Engine',
  category: 'other',
  description:
    'A 6-cell pattern that, with a proper seed, creates a puffer train capable of infinite population growth.',
  discoverer: 'Charles Corderman',
  year: 1971,
  population: 6,
  cells: rle('obo$2bo$bo3bo$4bo$4bobo$4b2o!'),
}

const snark: CataloguePattern = {
  name: 'Snark',
  category: 'other',
  description:
    'The smallest known stable glider reflector (period-1 reflector), discovered in 2013 by Mike Playle.',
  discoverer: 'Mike Playle',
  year: 2013,
  population: 17,
  cells: rle('3bo$b3o$o$ob2o4b2o$6ob2o$o$b3o$3bo!'),
}

const eater2: CataloguePattern = {
  name: 'Eater 2',
  category: 'other',
  description:
    'A 20-cell still-life that can absorb gliders, LWSSs and other objects without being destroyed.',
  discoverer: 'Bill Gosper',
  year: 1971,
  population: 20,
  cells: rle('2o$obo$2bo$2b2o4b2o$6bobo$6bo2bo$7b2o!'),
}

const herschel: CataloguePattern = {
  name: 'Herschel',
  category: 'other',
  description:
    'A naturally-occurring 7-cell metastable pattern that frequently appears in ash and is used as a signal carrier in logic circuits.',
  year: 1971,
  population: 7,
  cells: rle('o$3o$obo$2bo!'),
}

const blockOnBlock: CataloguePattern = {
  name: 'Integral Sign',
  category: 'other',
  description:
    'A 12-cell period-2 oscillator shaped like an integral sign, produced by two interacting LWSS.',
  year: 1970,
  period: 2,
  population: 12,
  cells: rle('b3o$o2bo$o2bo$b3o3$b3o$o2bo$o2bo$b3o!'),
}

// ---------------------------------------------------------------------------
// Catalogue export
// ---------------------------------------------------------------------------

/**
 * Complete built-in pattern catalogue with full metadata.
 * Contains 50+ patterns spanning still lifes, oscillators, spaceships,
 * guns, methuselahs and other engineered patterns.
 */
export const CATALOGUE: CataloguePattern[] = [
  // Still lifes (12)
  block,
  beehive,
  loaf,
  boat,
  tub,
  ship,
  barge,
  longBoat,
  pond,
  eater1,
  longBarge,
  longShip,
  // Oscillators (15)
  blinker,
  toad,
  beacon,
  pulsar,
  pentadecathlon,
  clock,
  tumbler,
  figureEight,
  queenBeeShuttle,
  octagonII,
  caterer,
  kokotoClock,
  figure8variant,
  pulsarQuadrant,
  fencepost,
  // Spaceships (9)
  glider,
  lwss,
  mwss,
  hwss,
  copperhead,
  loafer,
  weekender,
  dart,
  canadaGoose,
  // Guns (3)
  gosperGliderGun,
  simkinGliderGun,
  pufferGun,
  // Methuselahs (10)
  rPentomino,
  acorn,
  diehard,
  piHeptomino,
  bHeptomino,
  century,
  thunderbird,
  rabbits,
  bunnies,
  lidka,
  // Other / engineered (5)
  switchEngine,
  snark,
  eater2,
  herschel,
  blockOnBlock,
]
