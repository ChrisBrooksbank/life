import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { PopulationSparkline } from './PopulationSparkline'
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
    render(<PopulationSparkline />, container)
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

describe('PopulationSparkline — initial rendering', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a div with role="img"', () => {
    const el = container.querySelector('[role="img"]')
    expect(el).not.toBeNull()
  })

  it('renders an SVG element', () => {
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('has aria-label indicating no data yet', () => {
    const el = container.querySelector('[role="img"]')
    expect(el?.getAttribute('aria-label')).toContain('Population over time')
  })

  it('renders no polyline initially (no data)', () => {
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeNull()
  })
})

describe('PopulationSparkline — data accumulation', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('does not render a polyline when only one generation has advanced', () => {
    act(() => {
      appStore.getState().updateSimState(1, 10)
      render(<PopulationSparkline />, container)
    })
    // Need at least 2 points for a line
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeNull()
  })

  it('renders a polyline after two generation advances', () => {
    act(() => {
      appStore.getState().updateSimState(1, 10)
      render(<PopulationSparkline />, container)
    })
    act(() => {
      appStore.getState().updateSimState(2, 20)
      render(<PopulationSparkline />, container)
    })
    const polyline = container.querySelector('polyline')
    expect(polyline).not.toBeNull()
  })

  it('updates aria-label to include current population', () => {
    act(() => {
      appStore.getState().updateSimState(1, 42)
      render(<PopulationSparkline />, container)
    })
    const el = container.querySelector('[role="img"]')
    expect(el?.getAttribute('aria-label')).toContain('42')
  })

  it('does not record a data point when generation stays the same', () => {
    act(() => {
      appStore.getState().updateSimState(1, 10)
      render(<PopulationSparkline />, container)
    })
    // Same generation, different population (cell edit)
    act(() => {
      appStore.setState({ generation: 1, population: 99 })
      render(<PopulationSparkline />, container)
    })
    // Still only one point recorded, no polyline
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeNull()
  })
})

describe('PopulationSparkline — polyline geometry', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('polyline points attribute is non-empty after data accumulates', () => {
    act(() => {
      appStore.getState().updateSimState(1, 5)
      render(<PopulationSparkline />, container)
    })
    act(() => {
      appStore.getState().updateSimState(2, 15)
      render(<PopulationSparkline />, container)
    })
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('points')).toBeTruthy()
  })

  it('polyline has fill="none"', () => {
    act(() => {
      appStore.getState().updateSimState(1, 5)
      render(<PopulationSparkline />, container)
    })
    act(() => {
      appStore.getState().updateSimState(2, 15)
      render(<PopulationSparkline />, container)
    })
    const polyline = container.querySelector('polyline')
    expect(polyline?.getAttribute('fill')).toBe('none')
  })
})

describe('PopulationSparkline — accessibility', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('SVG has aria-hidden="true"', () => {
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('wrapper div has role="img"', () => {
    const el = container.querySelector('[role="img"]')
    expect(el).not.toBeNull()
    expect(el?.tagName.toLowerCase()).toBe('div')
  })
})
