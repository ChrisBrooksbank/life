import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { Controls } from './Controls'
import { appStore } from '../store'
import { DEFAULT_RULES } from '../engine/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeMockWorker() {
  return {
    step: vi.fn(),
    reset: vi.fn(),
    setRules: vi.fn(),
    onState: null,
  }
}

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<Controls />, container)
  })
}

function teardown() {
  act(() => {
    render(null, container)
  })
  container.remove()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Controls — rendering', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a Play button when paused', () => {
    const btn = container.querySelector('[aria-label="Play simulation"]')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe('Play')
  })

  it('renders a Step button', () => {
    const btn = container.querySelector('[aria-label="Step simulation forward one generation"]')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe('Step')
  })

  it('marks Play button with aria-pressed=false when paused', () => {
    const btn = container.querySelector('[aria-label="Play simulation"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })

  it('Step button is enabled when paused', () => {
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Step simulation forward one generation"]',
    )
    expect(btn?.disabled).toBe(false)
  })
})

describe('Controls — rendering when running', () => {
  beforeEach(() => {
    resetStore()
    appStore.setState({ isRunning: true })
    setup()
  })
  afterEach(teardown)

  it('renders a Pause button when running', () => {
    const btn = container.querySelector('[aria-label="Pause simulation"]')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe('Pause')
  })

  it('marks the toggle button with aria-pressed=true when running', () => {
    const btn = container.querySelector('[aria-pressed="true"]')
    expect(btn).not.toBeNull()
  })

  it('Step button is disabled when running', () => {
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Step simulation forward one generation"]',
    )
    expect(btn?.disabled).toBe(true)
  })
})

describe('Controls — play / pause interactions', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('clicking Play sets isRunning to true', () => {
    const btn = container.querySelector<HTMLButtonElement>('[aria-label="Play simulation"]')
    act(() => btn?.click())
    expect(appStore.getState().isRunning).toBe(true)
  })

  it('clicking Pause sets isRunning to false', () => {
    appStore.setState({ isRunning: true })
    // Re-render with updated state
    act(() => {
      render(<Controls />, container)
    })
    const btn = container.querySelector<HTMLButtonElement>('[aria-label="Pause simulation"]')
    act(() => btn?.click())
    expect(appStore.getState().isRunning).toBe(false)
  })
})

describe('Controls — step interaction', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('clicking Step calls worker.step(1)', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never })
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Step simulation forward one generation"]',
    )
    act(() => btn?.click())
    expect(mockWorker.step).toHaveBeenCalledWith(1)
  })

  it('clicking Step does not throw when worker is null', () => {
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Step simulation forward one generation"]',
    )
    expect(() => act(() => btn?.click())).not.toThrow()
  })
})

describe('Controls — simulation tick loop', () => {
  beforeEach(() => {
    resetStore()
    vi.useFakeTimers()
    setup()
  })
  afterEach(() => {
    vi.useRealTimers()
    teardown()
  })

  it('calls worker.step(1) on each tick when running', () => {
    const mockWorker = makeMockWorker()
    act(() => {
      appStore.setState({ worker: mockWorker as never, isRunning: true, speed: 10 })
      render(<Controls />, container)
    })
    // speed=10 → 100ms interval; advance 300ms → 3 ticks
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockWorker.step).toHaveBeenCalledTimes(3)
    expect(mockWorker.step).toHaveBeenCalledWith(1)
  })

  it('stops calling worker.step when paused', () => {
    const mockWorker = makeMockWorker()
    act(() => {
      appStore.setState({ worker: mockWorker as never, isRunning: true, speed: 10 })
      render(<Controls />, container)
    })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    const callsBefore = mockWorker.step.mock.calls.length
    // Pause
    act(() => {
      appStore.setState({ isRunning: false })
      render(<Controls />, container)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockWorker.step.mock.calls.length).toBe(callsBefore)
  })

  it('does not tick when worker is null', () => {
    act(() => {
      appStore.setState({ worker: null, isRunning: true, speed: 10 })
      render(<Controls />, container)
    })
    // Should not throw
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(300)
      }),
    ).not.toThrow()
  })
})
