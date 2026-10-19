/**
 * HashLife engine — memoized quadtree for O(log n) generation steps.
 *
 * Each QuadNode represents a 2^level × 2^level region of the infinite grid.
 * Level 0 = single cell (alive or dead).
 * Level 1 = 2×2 block of level-0 nodes.
 * Level n = 2×2 block of level-(n-1) nodes.
 *
 * The `result` of a level-n node (n ≥ 2) is the level-(n-1) node representing
 * the center (2^(n-1) × 2^(n-1)) region after 2^(n-2) generations.
 *
 * Memoisation is keyed on (nw, ne, sw, se) pointer identity, which gives
 * structural sharing and avoids redundant computation.
 */

import type { Cell, Rules, EngineInterface } from './types'
import { DEFAULT_RULES } from './types'

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

interface QuadNode {
  level: number
  /** For level-0 nodes: 1 if alive, 0 if dead */
  alive: number
  nw: QuadNode
  ne: QuadNode
  sw: QuadNode
  se: QuadNode
  population: bigint
}

// Sentinel used for leaf children — a level-0 node references itself.
// We build two canonical leaves below.
const DEAD_LEAF: QuadNode = {
  level: 0,
  alive: 0,
  get nw() {
    return DEAD_LEAF
  },
  get ne() {
    return DEAD_LEAF
  },
  get sw() {
    return DEAD_LEAF
  },
  get se() {
    return DEAD_LEAF
  },
  population: 0n,
}

const ALIVE_LEAF: QuadNode = {
  level: 0,
  alive: 1,
  get nw() {
    return ALIVE_LEAF
  },
  get ne() {
    return ALIVE_LEAF
  },
  get sw() {
    return ALIVE_LEAF
  },
  get se() {
    return ALIVE_LEAF
  },
  population: 1n,
}

// ---------------------------------------------------------------------------
// HashLife implementation
// ---------------------------------------------------------------------------

export class HashLifeEngine implements EngineInterface {
  private _generation = 0
  private _root: QuadNode
  private _memo = new Map<string, QuadNode>()
  private _memoSlow = new WeakMap<QuadNode, QuadNode>()
  private _birthSet: Set<number>
  private _survivalSet: Set<number>
  rules: Rules

  constructor(rules: Rules = { ...DEFAULT_RULES }) {
    this.rules = rules
    this._birthSet = new Set(rules.birth)
    this._survivalSet = new Set(rules.survival)
    // Start with a minimal empty tree at level 3 (8×8)
    this._root = this._emptyNode(3)
  }

  get generation(): number {
    return this._generation
  }

  get population(): number {
    // bigint → number (safe for any realistic population)
    return Number(this._root.population)
  }

  setCells(cells: Cell[]): void {
    this._memo.clear()
    this._memoSlow = new WeakMap()
    this._generation = 0

    if (cells.length === 0) {
      this._root = this._emptyNode(3)
      return
    }

    // Find bounding box
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const { x, y } of cells) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }

    // Determine required level: the tree root represents [-2^(level-1), 2^(level-1))
    // We need at least level 3 (covering ±4) and must cover all cells plus margin.
    let level = 3
    while (true) {
      const half = 1 << (level - 1)
      if (minX >= -half && maxX < half && minY >= -half && maxY < half) break
      level++
    }
    // Add one extra level for room to expand
    level++

    const cellSet = new Set<string>()
    for (const { x, y } of cells) {
      cellSet.add(`${x},${y}`)
    }

    this._root = this._buildNode(level, -(1 << (level - 1)), -(1 << (level - 1)), cellSet)
  }

  getCells(): Cell[] {
    const result: Cell[] = []
    this._collectCells(
      this._root,
      -(1 << (this._root.level - 1)),
      -(1 << (this._root.level - 1)),
      result,
    )
    return result
  }

  step(generations = 1): void {
    // Update rules sets in case rules changed
    this._birthSet = new Set(this.rules.birth)
    this._survivalSet = new Set(this.rules.survival)

    for (let i = 0; i < generations; i++) {
      this._stepOne()
    }
  }

  reset(): void {
    this._generation = 0
    this._memo.clear()
    this._memoSlow = new WeakMap()
    this._root = this._emptyNode(3)
  }

  setGeneration(generation: number): void {
    this._generation = generation
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _stepOne(): void {
    // Ensure there's enough padding around the pattern so the result is valid.
    // The result of a level-n node covers the inner (2^(n-1))×(2^(n-1)) region.
    // We need at least level 3 and the border must be empty.
    while (this._root.level < 3 || this._needsExpansion()) {
      this._root = this._expand(this._root)
    }
    // One extra expand ensures a ≥1-cell gap between live cells and the result
    // boundary (±2^(level-2)), so births at the boundary aren't silently dropped.
    this._root = this._expand(this._root)

    const result = this._nodeResultSlow(this._root)
    // result covers the inner half after exactly 1 generation.
    // We wrap it back into a new root so coordinates stay aligned.
    this._root = this._expand(result)
    this._generation++
  }

  /** True if the border quarter-nodes of root have any live cells. */
  private _needsExpansion(): boolean {
    const { nw, ne, sw, se } = this._root
    return (
      nw.nw.population > 0n ||
      nw.ne.population > 0n ||
      nw.sw.population > 0n ||
      ne.nw.population > 0n ||
      ne.ne.population > 0n ||
      ne.se.population > 0n ||
      sw.nw.population > 0n ||
      sw.sw.population > 0n ||
      sw.se.population > 0n ||
      se.ne.population > 0n ||
      se.sw.population > 0n ||
      se.se.population > 0n
    )
  }

  /** Wrap a node in an empty border one level up. */
  private _expand(node: QuadNode): QuadNode {
    const empty = this._emptyNode(node.level - 1)
    const nw = this._join(empty, empty, empty, node.nw)
    const ne = this._join(empty, empty, node.ne, empty)
    const sw = this._join(empty, node.sw, empty, empty)
    const se = this._join(node.se, empty, empty, empty)
    return this._join(nw, ne, sw, se)
  }

  /**
   * Canonical node constructor with memoisation.
   * Key is pointer-based so identity sharing is preserved.
   */
  private _join(nw: QuadNode, ne: QuadNode, sw: QuadNode, se: QuadNode): QuadNode {
    const key = `${this._id(nw)},${this._id(ne)},${this._id(sw)},${this._id(se)}`
    const cached = this._memo.get(key)
    if (cached) return cached

    const level = nw.level + 1
    const population = nw.population + ne.population + sw.population + se.population
    const node: QuadNode = { level, alive: 0, nw, ne, sw, se, population }
    this._memo.set(key, node)
    return node
  }

  // Simple object identity counter
  private _idMap = new WeakMap<QuadNode, number>()
  private _idCounter = 2 // 0 = DEAD_LEAF, 1 = ALIVE_LEAF

  private _id(node: QuadNode): number {
    if (node === DEAD_LEAF) return 0
    if (node === ALIVE_LEAF) return 1
    let id = this._idMap.get(node)
    if (id === undefined) {
      id = this._idCounter++
      this._idMap.set(node, id)
    }
    return id
  }

  private _emptyNode(level: number): QuadNode {
    if (level === 0) return DEAD_LEAF
    const child = this._emptyNode(level - 1)
    return this._join(child, child, child, child)
  }

  /**
   * Single-step variant: returns the inner (2^(level-1))×(2^(level-1)) center
   * after exactly 1 generation. Only valid for level >= 2.
   *
   * For level 2: delegates to the standard level-2 base case (1 generation).
   * For level n > 2: decomposes into 9 overlapping level-(n-1) sub-nodes,
   * computes their single-step results (level-(n-2) each), then assembles
   * the inner corners into a level-(n-1) result — without the second recursive
   * result call that would otherwise add another 2^(n-3) generations.
   */
  private _nodeResultSlow(node: QuadNode): QuadNode {
    const cached = this._memoSlow.get(node)
    if (cached) return cached

    let result: QuadNode

    if (node.level === 2) {
      result = this._level2Result(node)
    } else {
      const { nw, ne, sw, se } = node

      const n00 = nw
      const n10 = this._join(nw.ne, ne.nw, nw.se, ne.sw)
      const n20 = ne
      const n01 = this._join(nw.sw, nw.se, sw.nw, sw.ne)
      const n11 = this._join(nw.se, ne.sw, sw.ne, se.nw)
      const n21 = this._join(ne.sw, ne.se, se.nw, se.ne)
      const n02 = sw
      const n12 = this._join(sw.ne, se.nw, sw.se, se.sw)
      const n22 = se

      // Each ri is a level-(node.level-2) node representing the inner center
      // of its parent after 1 generation.
      const r00 = this._nodeResultSlow(n00)
      const r10 = this._nodeResultSlow(n10)
      const r20 = this._nodeResultSlow(n20)
      const r01 = this._nodeResultSlow(n01)
      const r11 = this._nodeResultSlow(n11)
      const r21 = this._nodeResultSlow(n21)
      const r02 = this._nodeResultSlow(n02)
      const r12 = this._nodeResultSlow(n12)
      const r22 = this._nodeResultSlow(n22)

      // Assemble the 4 quadrants of the result by taking inner-corner children
      // of the 9 sub-results. This advances exactly 1 generation total.
      result = this._join(
        this._join(r00.se, r10.sw, r01.ne, r11.nw),
        this._join(r10.se, r20.sw, r11.ne, r21.nw),
        this._join(r01.se, r11.sw, r02.ne, r12.nw),
        this._join(r11.se, r21.sw, r12.ne, r22.nw),
      )
    }

    this._memoSlow.set(node, result)
    return result
  }

  /**
   * Level-2 base case: given a 4×4 node, compute the 2×2 center after 1 step.
   * We extract all 16 bits, apply B/S rules to the inner 2×2 cells.
   */
  private _level2Result(node: QuadNode): QuadNode {
    // Flatten the 4×4 into a 16-bit integer (row-major, NW corner = bit 15)
    const bits = this._flattenLevel2(node)

    const cells: [number, number, number, number] = [0, 0, 0, 0]
    // Inner 2×2: rows 1-2, cols 1-2 (0-indexed in a 4×4 grid)
    // Row order: top to bottom, left to right
    const positions = [
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ] as const

    for (let i = 0; i < 4; i++) {
      const [row, col] = positions[i]!
      let neighbors = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const r = row + dr
          const c = col + dc
          if (bits & (1 << (15 - (r * 4 + c)))) neighbors++
        }
      }
      const alive = !!(bits & (1 << (15 - (row * 4 + col))))
      if (alive) {
        cells[i] = this._survivalSet.has(neighbors) ? 1 : 0
      } else {
        cells[i] = this._birthSet.has(neighbors) ? 1 : 0
      }
    }

    // cells[0]=nw, cells[1]=ne, cells[2]=sw, cells[3]=se
    return this._join(
      cells[0] ? ALIVE_LEAF : DEAD_LEAF,
      cells[1] ? ALIVE_LEAF : DEAD_LEAF,
      cells[2] ? ALIVE_LEAF : DEAD_LEAF,
      cells[3] ? ALIVE_LEAF : DEAD_LEAF,
    )
  }

  /** Extract the 16 cells of a level-2 node as a bitmask (bit 15 = NW corner). */
  private _flattenLevel2(node: QuadNode): number {
    // Each child is a level-1 (2×2) node whose children are level-0 leaves.
    const { nw, ne, sw, se } = node
    // Layout in 4×4:
    // nw.nw nw.ne | ne.nw ne.ne
    // nw.sw nw.se | ne.sw ne.se
    // --------------------------
    // sw.nw sw.ne | se.nw se.ne
    // sw.sw sw.se | se.sw se.se
    const rows = [
      [nw.nw, nw.ne, ne.nw, ne.ne],
      [nw.sw, nw.se, ne.sw, ne.se],
      [sw.nw, sw.ne, se.nw, se.ne],
      [sw.sw, sw.se, se.sw, se.se],
    ]
    let bits = 0
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (rows[r]![c]!.alive) {
          bits |= 1 << (15 - (r * 4 + c))
        }
      }
    }
    return bits
  }

  /** Recursively collect all live cells, offsetting by (originX, originY). */
  private _collectCells(node: QuadNode, originX: number, originY: number, result: Cell[]): void {
    if (node.population === 0n) return
    if (node.level === 0) {
      // alive === 1
      result.push({ x: originX, y: originY })
      return
    }
    const half = 1 << (node.level - 1)
    this._collectCells(node.nw, originX, originY, result)
    this._collectCells(node.ne, originX + half, originY, result)
    this._collectCells(node.sw, originX, originY + half, result)
    this._collectCells(node.se, originX + half, originY + half, result)
  }

  /** Build a quadtree node for the region [originX, originX+size) × [originY, originY+size). */
  private _buildNode(
    level: number,
    originX: number,
    originY: number,
    cells: Set<string>,
  ): QuadNode {
    if (level === 0) {
      return cells.has(`${originX},${originY}`) ? ALIVE_LEAF : DEAD_LEAF
    }
    const half = 1 << (level - 1)
    const nw = this._buildNode(level - 1, originX, originY, cells)
    const ne = this._buildNode(level - 1, originX + half, originY, cells)
    const sw = this._buildNode(level - 1, originX, originY + half, cells)
    const se = this._buildNode(level - 1, originX + half, originY + half, cells)
    return this._join(nw, ne, sw, se)
  }
}
