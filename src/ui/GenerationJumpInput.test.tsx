import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { GenerationJumpInput } from './GenerationJumpInput'
import { appStore } from '../store'
import { DEFAULT_RULES } from '../engine/types'

function makeMockWorker() {
  return {
    step: vi.fn(),
    reset: vi.fn(),
    setRules: vi.fn(),
    setEngine: vi.fn(),
    getCells: vi.fn().mockResolvedValue([]),
    setCells: vi.fn(),
    onState: null,
  }
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

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<GenerationJumpInput />, container)
  })
}

function teardown() {
  act(() => {
    render(null, container)
  })
  container.remove()
}

describe('GenerationJumpInput — rendering', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a number input', () => {
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    expect(input).not.toBeNull()
    expect(input?.type).toBe('number')
  })

  it('renders a Go button', () => {
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Jump to target generation"]',
    )
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe('Go')
  })

  it('Go button is initially disabled with empty input', () => {
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Jump to target generation"]',
    )
    expect(btn?.disabled).toBe(true)
  })

  it('has accessible form label', () => {
    const form = container.querySelector('[aria-label="Jump to generation"]')
    expect(form).not.toBeNull()
  })
})

describe('GenerationJumpInput — interactions', () => {
  let mockWorker: ReturnType<typeof makeMockWorker>

  beforeEach(() => {
    resetStore()
    mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, generation: 100 })
    setup()
  })
  afterEach(teardown)

  it('Go button enabled after typing a valid number', () => {
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    act(() => {
      if (input) {
        input.value = '500'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    act(() => {
      render(<GenerationJumpInput />, container)
    })
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Jump to target generation"]',
    )
    expect(btn?.disabled).toBe(false)
  })

  it('submitting calls worker.setEngine("hashlife") and worker.step(delta)', () => {
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    act(() => {
      if (input) {
        input.value = '200'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    const form = container.querySelector('form')
    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true }))
    })
    expect(mockWorker.setEngine).toHaveBeenCalledWith('hashlife')
    expect(mockWorker.step).toHaveBeenCalledWith(100) // 200 - 100 = 100
  })

  it('pauses simulation on jump', () => {
    appStore.setState({ isRunning: true })
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    act(() => {
      if (input) {
        input.value = '200'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    const form = container.querySelector('form')
    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true }))
    })
    expect(appStore.getState().isRunning).toBe(false)
  })

  it('does nothing when target <= current generation', () => {
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    act(() => {
      if (input) {
        input.value = '50' // less than current generation 100
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    const form = container.querySelector('form')
    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true }))
    })
    expect(mockWorker.step).not.toHaveBeenCalled()
  })

  it('does nothing when worker is null', () => {
    appStore.setState({ worker: null })
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    act(() => {
      if (input) {
        input.value = '500'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    const form = container.querySelector('form')
    expect(() =>
      act(() => {
        form?.dispatchEvent(new Event('submit', { bubbles: true }))
      }),
    ).not.toThrow()
  })

  it('clears input after successful jump', () => {
    const input = container.querySelector<HTMLInputElement>(
      '[aria-label="Target generation number"]',
    )
    act(() => {
      if (input) {
        input.value = '500'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    const form = container.querySelector('form')
    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true }))
    })
    // After submit the controlled input value should be empty
    expect(input?.value).toBe('')
  })
})

describe('GenerationJumpInput — store jumpToGeneration action', () => {
  beforeEach(() => resetStore())

  it('jumpToGeneration calls setEngine and step with correct delta', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, generation: 10 })
    appStore.getState().jumpToGeneration(110)
    expect(mockWorker.setEngine).toHaveBeenCalledWith('hashlife')
    expect(mockWorker.step).toHaveBeenCalledWith(100)
  })

  it('jumpToGeneration does nothing when target equals current generation', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, generation: 50 })
    appStore.getState().jumpToGeneration(50)
    expect(mockWorker.step).not.toHaveBeenCalled()
  })

  it('jumpToGeneration does nothing when target is less than current generation', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, generation: 50 })
    appStore.getState().jumpToGeneration(20)
    expect(mockWorker.step).not.toHaveBeenCalled()
  })

  it('jumpToGeneration sets isRunning to false', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, generation: 0, isRunning: true })
    appStore.getState().jumpToGeneration(1000)
    expect(appStore.getState().isRunning).toBe(false)
  })
})
