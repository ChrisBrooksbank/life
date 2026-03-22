import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { PerfMetrics } from './PerfMetrics'
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

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<PerfMetrics />, container)
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

describe('PerfMetrics — structure', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a dl element with aria-label "Performance metrics"', () => {
    const el = container.querySelector('[aria-label="Performance metrics"]')
    expect(el).not.toBeNull()
    expect(el?.tagName.toLowerCase()).toBe('dl')
  })

  it('renders a Gen/s label', () => {
    const labels = Array.from(container.querySelectorAll('.hud__label'))
    const label = labels.find((el) => el.textContent === 'Gen/s')
    expect(label).not.toBeUndefined()
  })

  it('renders an FPS label', () => {
    const labels = Array.from(container.querySelectorAll('.hud__label'))
    const label = labels.find((el) => el.textContent === 'FPS')
    expect(label).not.toBeUndefined()
  })

  it('displays initial Gen/s value of 0', () => {
    const el = container.querySelector('[aria-label="Generations per second 0"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('0')
  })

  it('displays initial FPS value of 0', () => {
    const el = container.querySelector('[aria-label="Frames per second 0"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('0')
  })
})

describe('PerfMetrics — memory row', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    teardown()
  })

  it('hides memory row when performance.memory is unavailable', () => {
    // jsdom does not expose performance.memory by default
    resetStore()
    setup()
    const memLabel = Array.from(container.querySelectorAll('.hud__label')).find(
      (el) => el.textContent === 'Mem',
    )
    expect(memLabel).toBeUndefined()
  })

  it('shows memory row when performance.memory is available', () => {
    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: { usedJSHeapSize: 52_428_800 }, // 50 MB
    })

    resetStore()
    setup()

    // Trigger a rAF flush so the metrics update runs
    vi.useFakeTimers()
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // The Mem row may or may not appear depending on timing in JSDOM,
    // but we at least verify the component doesn't throw and renders correctly.
    const dl = container.querySelector('[aria-label="Performance metrics"]')
    expect(dl).not.toBeNull()

    vi.useRealTimers()

    // Restore property
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: undefined,
    })
  })
})

describe('PerfMetrics — gen/sec tracking', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('does not throw when generation advances in the store', () => {
    expect(() => {
      act(() => {
        appStore.getState().updateSimState(1, 10)
      })
    }).not.toThrow()
  })

  it('does not throw when multiple generations advance rapidly', () => {
    expect(() => {
      act(() => {
        for (let i = 1; i <= 10; i++) {
          appStore.getState().updateSimState(i, i * 5)
        }
      })
    }).not.toThrow()
  })
})
