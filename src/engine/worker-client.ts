import type { Cell, Rules } from './types'
import type { WorkerCommand, WorkerResponse, EngineType } from './worker-protocol'

export type StateCallback = (generation: number, population: number) => void

/**
 * Main-thread client for the simulation Web Worker.
 *
 * Usage:
 *   const client = new WorkerClient()
 *   await client.ready()
 *   client.onState = (gen, pop) => { ... }
 *   client.step(1)
 *   const cells = await client.getCells()
 */
export class WorkerClient {
  private readonly worker: Worker
  private _ready: Promise<void>
  private _pending = new Map<number, (response: WorkerResponse) => void>()
  private _nextId = 1

  /** Called whenever STATE is emitted (after SET_CELLS, STEP, or RESET). */
  onState: StateCallback | null = null

  constructor(workerFactory?: () => Worker) {
    if (workerFactory) {
      this.worker = workerFactory()
    } else {
      // Vite worker import syntax — resolved at build time
      this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
        type: 'module',
      })
    }

    this._ready = new Promise((resolve) => {
      const handleReady = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'READY') {
          this.worker.removeEventListener('message', handleReady)
          resolve()
        }
      }
      this.worker.addEventListener('message', handleReady)
    })

    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this._handleResponse(event.data)
    })
  }

  /** Resolves once the worker has initialised and sent READY. */
  ready(): Promise<void> {
    return this._ready
  }

  /** Replace all live cells. Triggers onState callback. */
  setCells(cells: Cell[]): void {
    this._send({ type: 'SET_CELLS', cells })
  }

  /** Retrieve all current live cells. */
  getCells(): Promise<Cell[]> {
    const id = this._nextId++
    return new Promise((resolve) => {
      this._pending.set(id, (resp) => {
        if (resp.type === 'CELLS') resolve(resp.cells)
      })
      this._send({ type: 'GET_CELLS', id })
    })
  }

  /** Advance by the given number of generations. Triggers onState callback. */
  step(generations = 1): void {
    this._send({ type: 'STEP', generations })
  }

  /** Reset to generation 0 with no live cells. Triggers onState callback. */
  reset(): void {
    this._send({ type: 'RESET' })
  }

  /** Update the active rules (takes effect on the next step). */
  setRules(rules: Rules): void {
    this._send({ type: 'SET_RULES', rules })
  }

  /**
   * Switch the active simulation engine.
   * 'naive' is used for real-time editing; 'hashlife' for fast-forward.
   * Cell state and generation are preserved across the switch. Triggers onState callback.
   */
  setEngine(engine: EngineType): void {
    this._send({ type: 'SET_ENGINE', engine })
  }

  /** Request the current generation and population. */
  getState(): Promise<{ generation: number; population: number }> {
    const id = this._nextId++
    return new Promise((resolve) => {
      this._pending.set(id, (resp) => {
        if (resp.type === 'STATE_REPLY') {
          resolve({ generation: resp.generation, population: resp.population })
        }
      })
      this._send({ type: 'GET_STATE', id })
    })
  }

  /** Terminate the worker. */
  terminate(): void {
    this.worker.terminate()
  }

  private _send(cmd: WorkerCommand): void {
    this.worker.postMessage(cmd)
  }

  private _handleResponse(resp: WorkerResponse): void {
    switch (resp.type) {
      case 'STATE':
        this.onState?.(resp.generation, resp.population)
        break

      case 'CELLS': {
        const cb = this._pending.get(resp.id)
        if (cb) {
          this._pending.delete(resp.id)
          cb(resp)
        }
        break
      }

      case 'STATE_REPLY': {
        const cb = this._pending.get(resp.id)
        if (cb) {
          this._pending.delete(resp.id)
          cb(resp)
        }
        break
      }

      case 'ERROR':
        console.error('[SimWorker]', resp.message)
        break

      case 'READY':
        // Handled in constructor
        break
    }
  }
}
