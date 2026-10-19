import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { Controls, sliderToSpeed, speedToSlider, MIN_SPEED, MAX_SPEED } from './Controls'
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

describe('sliderToSpeed / speedToSlider helpers', () => {
  it('slider position 0 maps to MIN_SPEED', () => {
    expect(sliderToSpeed(0)).toBe(MIN_SPEED)
  })

  it('slider position 100 maps to MAX_SPEED', () => {
    expect(sliderToSpeed(100)).toBe(MAX_SPEED)
  })

  it('slider position 50 maps to geometric mean of min and max', () => {
    const expected = Math.round(Math.sqrt(MIN_SPEED * MAX_SPEED))
    expect(sliderToSpeed(50)).toBe(expected)
  })

  it('speedToSlider(MIN_SPEED) returns 0', () => {
    expect(speedToSlider(MIN_SPEED)).toBeCloseTo(0, 5)
  })

  it('speedToSlider(MAX_SPEED) returns 100', () => {
    expect(speedToSlider(MAX_SPEED)).toBeCloseTo(100, 5)
  })

  it('round-trips: speedToSlider(sliderToSpeed(pos)) ≈ pos within 2 units', () => {
    for (const pos of [0, 25, 50, 75, 100]) {
      const roundTrip = speedToSlider(sliderToSpeed(pos))
      expect(Math.abs(roundTrip - pos)).toBeLessThan(2)
    }
  })
})

describe('Controls — generation counter', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a generation counter element', () => {
    const el = container.querySelector('[aria-label="Generation counter"]')
    expect(el).not.toBeNull()
  })

  it('displays generation 0 initially', () => {
    const el = container.querySelector('[aria-label="Generation counter"]')
    expect(el?.textContent?.trim()).toBe('Gen 0')
  })

  it('displays updated generation from the store', () => {
    act(() => {
      appStore.setState({ generation: 42 })
      render(<Controls />, container)
    })
    const el = container.querySelector('[aria-label="Generation counter"]')
    expect(el?.textContent?.trim()).toBe('Gen 42')
  })

  it('has aria-live="polite" for screen reader announcements', () => {
    const el = container.querySelector('[aria-label="Generation counter"]')
    expect(el?.getAttribute('aria-live')).toBe('polite')
  })
})

describe('Controls — speed slider rendering', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a speed slider input', () => {
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Simulation speed"]')
    expect(slider).not.toBeNull()
    expect(slider?.type).toBe('range')
  })

  it('slider reflects the current speed from the store', () => {
    appStore.setState({ speed: MAX_SPEED })
    act(() => {
      render(<Controls />, container)
    })
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Simulation speed"]')
    expect(Number(slider?.value)).toBeCloseTo(100, 0)
  })

  it('displays current speed as text', () => {
    const label = container.querySelector('.controls__speed-value')
    expect(label?.textContent).toContain('10 gen/s')
  })

  it('changing slider updates store speed', () => {
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Simulation speed"]')
    act(() => {
      if (slider) {
        slider.value = '100'
        slider.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    expect(appStore.getState().speed).toBe(MAX_SPEED)
  })

  it('slider has correct ARIA value attributes', () => {
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Simulation speed"]')
    expect(Number(slider?.getAttribute('aria-valuemin'))).toBe(MIN_SPEED)
    expect(Number(slider?.getAttribute('aria-valuemax'))).toBe(MAX_SPEED)
    expect(Number(slider?.getAttribute('aria-valuenow'))).toBe(10)
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
