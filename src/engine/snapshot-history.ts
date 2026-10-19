import type { Cell } from './types'

export interface Snapshot {
  generation: number
  cells: Cell[]
}

/**
 * A fixed-capacity ring buffer of simulation snapshots for time travel.
 *
 * Snapshots are pushed while the simulation runs and can be restored to
 * travel back in time.  Once the capacity is reached the oldest snapshot
 * is discarded.
 */
export class SnapshotHistory {
  private _snapshots: Snapshot[] = []
  readonly capacity: number

  constructor(capacity = 100) {
    this.capacity = capacity
  }

  /** All stored snapshots, oldest first. */
  get snapshots(): readonly Snapshot[] {
    return this._snapshots
  }

  /** Number of snapshots currently stored. */
  get size(): number {
    return this._snapshots.length
  }

  /** True when there is at least one snapshot to restore. */
  get canRewind(): boolean {
    return this._snapshots.length > 0
  }

  /**
   * Push a new snapshot.  If the buffer is full the oldest entry is evicted.
   * Duplicate generations are ignored (no-op).
   */
  push(generation: number, cells: Cell[]): void {
    if (
      this._snapshots.length > 0 &&
      this._snapshots[this._snapshots.length - 1]!.generation === generation
    ) {
      return
    }
    if (this._snapshots.length >= this.capacity) {
      this._snapshots.shift()
    }
    this._snapshots.push({ generation, cells: cells.slice() })
  }

  /**
   * Return the snapshot at `index` (0 = oldest) without modifying the buffer.
   * Returns `undefined` for out-of-range indices.
   */
  get(index: number): Snapshot | undefined {
    return this._snapshots[index]
  }

  /**
   * Pop and return the most recent snapshot, removing it from the buffer.
   * Returns `undefined` when empty.
   */
  pop(): Snapshot | undefined {
    return this._snapshots.pop()
  }

  /** Remove all snapshots. */
  clear(): void {
    this._snapshots = []
  }
}
