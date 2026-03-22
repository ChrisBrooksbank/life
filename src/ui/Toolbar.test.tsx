import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { Toolbar } from './Toolbar'
import { appStore } from '../store'
import { DEFAULT_RULES } from '../engine/types'

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
    render(<Toolbar />, container)
  })
}

function teardown() {
  act(() => {
    render(null, container)
  })
  container.remove()
}

describe('Toolbar — rendering', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders a toolbar element with role="toolbar"', () => {
    const toolbar = container.querySelector('[role="toolbar"]')
    expect(toolbar).not.toBeNull()
  })

  it('has aria-label "Drawing tools"', () => {
    const toolbar = container.querySelector('[role="toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('Drawing tools')
  })

  it('renders a button for each tool', () => {
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(5)
  })

  it('renders pencil button', () => {
    const btn = container.querySelector('[aria-label="Pencil — draw cells"]')
    expect(btn).not.toBeNull()
  })

  it('renders eraser button', () => {
    const btn = container.querySelector('[aria-label="Eraser — remove cells"]')
    expect(btn).not.toBeNull()
  })

  it('renders line button', () => {
    const btn = container.querySelector('[aria-label="Line — draw straight lines"]')
    expect(btn).not.toBeNull()
  })
})

describe('Toolbar — active tool state', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('pencil button has aria-pressed=true when pencil is active', () => {
    const btn = container.querySelector('[aria-label="Pencil — draw cells"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('eraser button has aria-pressed=false when pencil is active', () => {
    const btn = container.querySelector('[aria-label="Eraser — remove cells"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })

  it('eraser button has aria-pressed=true when eraser is active', () => {
    act(() => {
      appStore.setState({ activeTool: 'eraser' })
      render(<Toolbar />, container)
    })
    const btn = container.querySelector('[aria-label="Eraser — remove cells"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('pencil button has aria-pressed=false when eraser is active', () => {
    act(() => {
      appStore.setState({ activeTool: 'eraser' })
      render(<Toolbar />, container)
    })
    const btn = container.querySelector('[aria-label="Pencil — draw cells"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })

  it('active tool button has --active modifier class', () => {
    const btn = container.querySelector('[aria-label="Pencil — draw cells"]')
    expect(btn?.classList.contains('toolbar__btn--active')).toBe(true)
  })

  it('inactive tool button does not have --active modifier class', () => {
    const btn = container.querySelector('[aria-label="Eraser — remove cells"]')
    expect(btn?.classList.contains('toolbar__btn--active')).toBe(false)
  })
})

describe('Toolbar — tool selection interactions', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('clicking eraser sets activeTool to eraser in the store', () => {
    const btn = container.querySelector<HTMLButtonElement>('[aria-label="Eraser — remove cells"]')
    act(() => btn?.click())
    expect(appStore.getState().activeTool).toBe('eraser')
  })

  it('clicking pencil sets activeTool to pencil in the store', () => {
    appStore.setState({ activeTool: 'eraser' })
    act(() => {
      render(<Toolbar />, container)
    })
    const btn = container.querySelector<HTMLButtonElement>('[aria-label="Pencil — draw cells"]')
    act(() => btn?.click())
    expect(appStore.getState().activeTool).toBe('pencil')
  })
})
