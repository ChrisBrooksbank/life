import { describe, it, expect, beforeEach, vi } from 'vitest'
import { appStore } from './store'
import type { AppState } from './store'
import { DEFAULT_RULES } from './engine/types'
import type { StateCallback } from './engine/worker-client'

function getStore(): AppState {
  return appStore.getState()
}

function resetStore() {
  appStore.setState({
    isRunning: false,
    generation: 0,
    population: 0,
    speed: 10,
    rules: DEFAULT_RULES,
    activeTool: 'pencil',
    worker: null,
  })
}

describe('appStore — initial state', () => {
  beforeEach(resetStore)

  it('starts paused', () => {
    expect(getStore().isRunning).toBe(false)
  })

  it('starts at generation 0', () => {
    expect(getStore().generation).toBe(0)
  })

  it('starts with population 0', () => {
    expect(getStore().population).toBe(0)
  })

  it('has default speed of 10', () => {
    expect(getStore().speed).toBe(10)
  })

  it('uses default B3/S23 rules', () => {
    expect(getStore().rules).toEqual(DEFAULT_RULES)
  })

  it('defaults activeTool to pencil', () => {
    expect(getStore().activeTool).toBe('pencil')
  })

  it('has no worker initially', () => {
    expect(getStore().worker).toBeNull()
  })
})

describe('appStore — play / pause', () => {
  beforeEach(resetStore)

  it('play() sets isRunning to true', () => {
    getStore().play()
    expect(getStore().isRunning).toBe(true)
  })

  it('pause() sets isRunning to false', () => {
    getStore().play()
    getStore().pause()
    expect(getStore().isRunning).toBe(false)
  })
})

describe('appStore — step', () => {
  beforeEach(resetStore)

  it('step() calls worker.step(1) when worker is present', () => {
    const mockWorker = { step: vi.fn(), reset: vi.fn(), setRules: vi.fn(), onState: null }
    appStore.setState({ worker: mockWorker as never })
    getStore().step()
    expect(mockWorker.step).toHaveBeenCalledWith(1)
  })

  it('step() does not throw when worker is null', () => {
    expect(() => getStore().step()).not.toThrow()
  })
})

describe('appStore — reset', () => {
  beforeEach(resetStore)

  it('reset() stops simulation and zeroes counters', () => {
    appStore.setState({ isRunning: true, generation: 42, population: 99 })
    getStore().reset()
    const s = getStore()
    expect(s.isRunning).toBe(false)
    expect(s.generation).toBe(0)
    expect(s.population).toBe(0)
  })

  it('reset() calls worker.reset() when worker is present', () => {
    const mockWorker = { step: vi.fn(), reset: vi.fn(), setRules: vi.fn(), onState: null }
    appStore.setState({ worker: mockWorker as never })
    getStore().reset()
    expect(mockWorker.reset).toHaveBeenCalled()
  })
})

describe('appStore — setSpeed', () => {
  beforeEach(resetStore)

  it('updates speed', () => {
    getStore().setSpeed(60)
    expect(getStore().speed).toBe(60)
  })
})

describe('appStore — setActiveTool', () => {
  beforeEach(resetStore)

  it('switches to eraser', () => {
    getStore().setActiveTool('eraser')
    expect(getStore().activeTool).toBe('eraser')
  })

  it('switches back to pencil', () => {
    getStore().setActiveTool('eraser')
    getStore().setActiveTool('pencil')
    expect(getStore().activeTool).toBe('pencil')
  })
})

describe('appStore — setRules', () => {
  beforeEach(resetStore)

  it('updates rules in state', () => {
    const newRules = { birth: [3, 6], survival: [2, 3, 6] }
    getStore().setRules(newRules)
    expect(getStore().rules).toEqual(newRules)
  })

  it('calls worker.setRules() when worker is present', () => {
    const mockWorker = { step: vi.fn(), reset: vi.fn(), setRules: vi.fn(), onState: null }
    appStore.setState({ worker: mockWorker as never })
    const newRules = { birth: [3, 6], survival: [2, 3, 6] }
    getStore().setRules(newRules)
    expect(mockWorker.setRules).toHaveBeenCalledWith(newRules)
  })
})

describe('appStore — updateSimState', () => {
  beforeEach(resetStore)

  it('updates generation and population', () => {
    getStore().updateSimState(100, 500)
    const s = getStore()
    expect(s.generation).toBe(100)
    expect(s.population).toBe(500)
  })
})

describe('appStore — setWorker', () => {
  beforeEach(resetStore)

  it('stores the worker reference', () => {
    const mockWorker = { step: vi.fn(), reset: vi.fn(), setRules: vi.fn(), onState: null }
    getStore().setWorker(mockWorker as never)
    expect(getStore().worker).toBe(mockWorker)
  })

  it('wires worker.onState to updateSimState', () => {
    const mockWorker = {
      step: vi.fn(),
      reset: vi.fn(),
      setRules: vi.fn(),
      onState: null as StateCallback | null,
    }
    getStore().setWorker(mockWorker as never)
    // Simulate the worker firing an onState callback
    mockWorker.onState!(42, 123)
    const s = getStore()
    expect(s.generation).toBe(42)
    expect(s.population).toBe(123)
  })
})
