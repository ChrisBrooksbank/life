import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleCommand } from './worker-handler'
import { WorkerClient } from './worker-client'
import type { WorkerResponse } from './worker-protocol'

// ---------------------------------------------------------------------------
// Unit tests for the worker command handler (no real Worker needed)
// ---------------------------------------------------------------------------

describe('handleCommand — SET_CELLS / STEP / GET_CELLS / RESET / GET_STATE', () => {
  // Each test runs against a fresh module instance — but since the module keeps
  // module-level state we reset via RESET before each test.
  beforeEach(() => {
    handleCommand({ type: 'RESET' })
  })

  it('returns STATE after RESET', () => {
    const resp = handleCommand({ type: 'RESET' })
    expect(resp).toEqual({ type: 'STATE', generation: 0, population: 0 })
  })

  it('returns STATE after SET_CELLS', () => {
    const resp = handleCommand({
      type: 'SET_CELLS',
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    })
    expect(resp).toEqual({ type: 'STATE', generation: 0, population: 2 })
  })

  it('returns CELLS after GET_CELLS', () => {
    handleCommand({ type: 'SET_CELLS', cells: [{ x: 3, y: 4 }] })
    const resp = handleCommand({ type: 'GET_CELLS', id: 42 })
    expect(resp).toMatchObject({ type: 'CELLS', id: 42 })
    if (resp?.type === 'CELLS') {
      expect(resp.cells).toEqual([{ x: 3, y: 4 }])
    }
  })

  it('advances generation after STEP', () => {
    // Blinker — oscillates with period 2
    handleCommand({
      type: 'SET_CELLS',
      cells: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    })
    const resp = handleCommand({ type: 'STEP', generations: 1 })
    expect(resp).toMatchObject({ type: 'STATE', generation: 1, population: 3 })
  })

  it('returns null after SET_RULES', () => {
    const resp = handleCommand({ type: 'SET_RULES', rules: { birth: [3], survival: [2, 3] } })
    expect(resp).toBeNull()
  })

  it('returns STATE_REPLY with correct id after GET_STATE', () => {
    handleCommand({ type: 'SET_CELLS', cells: [{ x: 0, y: 0 }] })
    const resp = handleCommand({ type: 'GET_STATE', id: 7 })
    expect(resp).toMatchObject({ type: 'STATE_REPLY', id: 7, generation: 0, population: 1 })
  })

  it('STEP respects custom rules', () => {
    // B3/S23 but switch to empty rule — nothing should survive
    handleCommand({ type: 'SET_RULES', rules: { birth: [], survival: [] } })
    handleCommand({
      type: 'SET_CELLS',
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
    })
    handleCommand({ type: 'STEP', generations: 1 })
    const resp = handleCommand({ type: 'GET_CELLS', id: 1 })
    // Restore default for subsequent tests
    handleCommand({ type: 'SET_RULES', rules: { birth: [3], survival: [2, 3] } })
    expect(resp?.type).toBe('CELLS')
    if (resp?.type === 'CELLS') {
      expect(resp.cells).toHaveLength(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Engine switching tests
// ---------------------------------------------------------------------------

describe('handleCommand — SET_ENGINE', () => {
  beforeEach(() => {
    handleCommand({ type: 'RESET' })
    // Ensure we start on naive engine
    handleCommand({ type: 'SET_ENGINE', engine: 'naive' })
  })

  it('returns STATE after switching to hashlife', () => {
    handleCommand({
      type: 'SET_CELLS',
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    })
    const resp = handleCommand({ type: 'SET_ENGINE', engine: 'hashlife' })
    expect(resp).toMatchObject({ type: 'STATE', population: 2 })
  })

  it('returns null when switching to the already-active engine', () => {
    const resp = handleCommand({ type: 'SET_ENGINE', engine: 'naive' })
    expect(resp).toBeNull()
  })

  it('preserves cells when switching from naive to hashlife', () => {
    const cells = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ]
    handleCommand({ type: 'SET_CELLS', cells })
    handleCommand({ type: 'SET_ENGINE', engine: 'hashlife' })
    const resp = handleCommand({ type: 'GET_CELLS', id: 10 })
    expect(resp?.type).toBe('CELLS')
    if (resp?.type === 'CELLS') {
      const sorted = (arr: { x: number; y: number }[]) =>
        [...arr].sort((a, b) => a.x - b.x || a.y - b.y)
      expect(sorted(resp.cells)).toEqual(sorted(cells))
    }
  })

  it('preserves cells when switching from hashlife back to naive', () => {
    const cells = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]
    handleCommand({ type: 'SET_CELLS', cells })
    handleCommand({ type: 'SET_ENGINE', engine: 'hashlife' })
    handleCommand({ type: 'SET_ENGINE', engine: 'naive' })
    const resp = handleCommand({ type: 'GET_CELLS', id: 11 })
    expect(resp?.type).toBe('CELLS')
    if (resp?.type === 'CELLS') {
      expect(resp.cells).toHaveLength(2)
    }
  })

  it('preserves generation when switching engines', () => {
    // Blinker — step a few generations on naive, then switch to hashlife
    handleCommand({
      type: 'SET_CELLS',
      cells: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    })
    handleCommand({ type: 'STEP', generations: 3 })
    handleCommand({ type: 'SET_ENGINE', engine: 'hashlife' })
    const resp = handleCommand({ type: 'GET_STATE', id: 99 })
    expect(resp?.type).toBe('STATE_REPLY')
    if (resp?.type === 'STATE_REPLY') {
      expect(resp.generation).toBe(3)
    }
  })

  it('applies rules on both engines after SET_RULES', () => {
    handleCommand({ type: 'SET_RULES', rules: { birth: [], survival: [] } })
    handleCommand({ type: 'SET_CELLS', cells: [{ x: 0, y: 0 }] })
    handleCommand({ type: 'SET_ENGINE', engine: 'hashlife' })
    handleCommand({ type: 'STEP', generations: 1 })
    const resp = handleCommand({ type: 'GET_CELLS', id: 20 })
    // Restore
    handleCommand({ type: 'SET_RULES', rules: { birth: [3], survival: [2, 3] } })
    expect(resp?.type).toBe('CELLS')
    if (resp?.type === 'CELLS') {
      expect(resp.cells).toHaveLength(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Integration tests for WorkerClient using a mock Worker
// ---------------------------------------------------------------------------

function createMockWorkerFactory(
  onMessage: (cmd: unknown, postBack: (resp: WorkerResponse) => void) => void,
) {
  return () => {
    const listeners = new Map<string, ((e: MessageEvent) => void)[]>()

    const post = (resp: WorkerResponse) => {
      const handlers = listeners.get('message') ?? []
      for (const h of handlers) h({ data: resp } as MessageEvent)
    }

    const mockWorker = {
      postMessage(cmd: unknown) {
        onMessage(cmd, post)
      },
      addEventListener(event: string, handler: (e: MessageEvent) => void) {
        if (!listeners.has(event)) listeners.set(event, [])
        listeners.get(event)!.push(handler)
      },
      removeEventListener(event: string, handler: (e: MessageEvent) => void) {
        const arr = listeners.get(event) ?? []
        const idx = arr.indexOf(handler)
        if (idx !== -1) arr.splice(idx, 1)
      },
      terminate: vi.fn(),
    }

    // Immediately fire READY so the client resolves
    setTimeout(() => post({ type: 'READY' }), 0)

    return mockWorker as unknown as Worker
  }
}

describe('WorkerClient', () => {
  it('resolves ready() after READY message', async () => {
    const factory = createMockWorkerFactory((_cmd, post) => {
      post({ type: 'READY' })
    })
    const client = new WorkerClient(factory)
    await expect(client.ready()).resolves.toBeUndefined()
    client.terminate()
  })

  it('calls onState after SET_CELLS', async () => {
    const factory = createMockWorkerFactory((cmd, post) => {
      const c = cmd as { type: string }
      if (c.type === 'SET_CELLS') {
        post({ type: 'STATE', generation: 0, population: 2 })
      }
    })
    const client = new WorkerClient(factory)
    await client.ready()

    const stateCb = vi.fn()
    client.onState = stateCb
    client.setCells([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ])

    await new Promise((r) => setTimeout(r, 10))
    expect(stateCb).toHaveBeenCalledWith(0, 2)
    client.terminate()
  })

  it('resolves getCells() with cell array', async () => {
    const factory = createMockWorkerFactory((cmd, post) => {
      const c = cmd as { type: string; id: number }
      if (c.type === 'GET_CELLS') {
        post({ type: 'CELLS', id: c.id, cells: [{ x: 5, y: 6 }] })
      }
    })
    const client = new WorkerClient(factory)
    await client.ready()

    const cells = await client.getCells()
    expect(cells).toEqual([{ x: 5, y: 6 }])
    client.terminate()
  })

  it('resolves getState() with generation and population', async () => {
    const factory = createMockWorkerFactory((cmd, post) => {
      const c = cmd as { type: string; id: number }
      if (c.type === 'GET_STATE') {
        post({ type: 'STATE_REPLY', id: c.id, generation: 42, population: 100 })
      }
    })
    const client = new WorkerClient(factory)
    await client.ready()

    const state = await client.getState()
    expect(state).toEqual({ generation: 42, population: 100 })
    client.terminate()
  })
})
