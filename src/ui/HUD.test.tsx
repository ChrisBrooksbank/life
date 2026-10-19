import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { HUD } from './HUD'
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
    render(<HUD />, container)
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

describe('HUD — initial rendering', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a dl element with aria-label', () => {
    const el = container.querySelector('[aria-label="Simulation statistics"]')
    expect(el).not.toBeNull()
    expect(el?.tagName.toLowerCase()).toBe('dl')
  })

  it('displays generation 0 initially', () => {
    const el = container.querySelector('[aria-label="Generation 0"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('0')
  })

  it('displays population 0 initially', () => {
    const el = container.querySelector('[aria-label="Population 0"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('0')
  })

  it('displays births 0 initially', () => {
    const el = container.querySelector('[aria-label="Births 0"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('+0')
  })

  it('displays deaths 0 initially', () => {
    const el = container.querySelector('[aria-label="Deaths 0"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('-0')
  })
})

describe('HUD — updates from store', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('updates generation when store changes', () => {
    act(() => {
      appStore.getState().updateSimState(5, 100)
      render(<HUD />, container)
    })
    const el = container.querySelector('[aria-label="Generation 5"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('5')
  })

  it('updates population when store changes', () => {
    act(() => {
      appStore.getState().updateSimState(1, 42)
      render(<HUD />, container)
    })
    const el = container.querySelector('[aria-label="Population 42"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('42')
  })

  it('computes births when population increases', () => {
    act(() => {
      // gen 0 → 1: pop goes from 0 to 10 (10 births, 0 deaths)
      appStore.getState().updateSimState(1, 10)
      render(<HUD />, container)
    })
    const el = container.querySelector('[aria-label="Births 10"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('+10')
  })

  it('computes deaths when population decreases', () => {
    act(() => {
      appStore.getState().updateSimState(1, 50)
      render(<HUD />, container)
    })
    act(() => {
      // gen 1 → 2: pop goes from 50 to 30 (0 births, 20 deaths)
      appStore.getState().updateSimState(2, 30)
      render(<HUD />, container)
    })
    const el = container.querySelector('[aria-label="Deaths 20"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('-20')
  })

  it('resets births/deaths to 0 when generation does not change', () => {
    act(() => {
      appStore.getState().updateSimState(1, 50)
      render(<HUD />, container)
    })
    act(() => {
      // Same generation (e.g. cell edit) — population changes but gen stays at 1
      appStore.setState({ generation: 1, population: 60 })
      render(<HUD />, container)
    })
    const births = container.querySelector('[aria-label="Births 0"]')
    const deaths = container.querySelector('[aria-label="Deaths 0"]')
    expect(births).not.toBeNull()
    expect(deaths).not.toBeNull()
  })

  it('births is non-negative even when population drops', () => {
    act(() => {
      appStore.getState().updateSimState(1, 100)
      render(<HUD />, container)
    })
    act(() => {
      appStore.getState().updateSimState(2, 50)
      render(<HUD />, container)
    })
    const births = container.querySelector('[aria-label="Births 0"]')
    expect(births).not.toBeNull()
    expect(births?.textContent).toBe('+0')
  })

  it('deaths is non-negative even when population grows', () => {
    act(() => {
      appStore.getState().updateSimState(1, 10)
      render(<HUD />, container)
    })
    act(() => {
      appStore.getState().updateSimState(2, 50)
      render(<HUD />, container)
    })
    const deaths = container.querySelector('[aria-label="Deaths 0"]')
    expect(deaths).not.toBeNull()
    expect(deaths?.textContent).toBe('-0')
  })
})

describe('HUD — label visibility', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders Gen label', () => {
    const labels = Array.from(container.querySelectorAll('.hud__label'))
    const genLabel = labels.find((el) => el.textContent === 'Gen')
    expect(genLabel).not.toBeUndefined()
  })

  it('renders Pop label', () => {
    const labels = Array.from(container.querySelectorAll('.hud__label'))
    const popLabel = labels.find((el) => el.textContent === 'Pop')
    expect(popLabel).not.toBeUndefined()
  })

  it('renders Born label', () => {
    const labels = Array.from(container.querySelectorAll('.hud__label'))
    const bornLabel = labels.find((el) => el.textContent === 'Born')
    expect(bornLabel).not.toBeUndefined()
  })

  it('renders Died label', () => {
    const labels = Array.from(container.querySelectorAll('.hud__label'))
    const diedLabel = labels.find((el) => el.textContent === 'Died')
    expect(diedLabel).not.toBeUndefined()
  })
})
