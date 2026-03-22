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
    expect(buttons.length).toBe(6)
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

describe('Toolbar — roving tabindex', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('active tool button has tabIndex 0', () => {
    const btn = container.querySelector<HTMLButtonElement>('[aria-label="Pencil — draw cells"]')
    expect(btn?.tabIndex).toBe(0)
  })

  it('inactive tool buttons have tabIndex -1', () => {
    const btn = container.querySelector<HTMLButtonElement>('[aria-label="Eraser — remove cells"]')
    expect(btn?.tabIndex).toBe(-1)
  })

  it('tabIndex updates when active tool changes', () => {
    act(() => {
      appStore.setState({ activeTool: 'eraser' })
      render(<Toolbar />, container)
    })
    const pencil = container.querySelector<HTMLButtonElement>('[aria-label="Pencil — draw cells"]')
    const eraser = container.querySelector<HTMLButtonElement>(
      '[aria-label="Eraser — remove cells"]',
    )
    expect(pencil?.tabIndex).toBe(-1)
    expect(eraser?.tabIndex).toBe(0)
  })
})

describe('Toolbar — arrow key navigation', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('ArrowRight moves focus to the next tool button', () => {
    const pencilBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Pencil — draw cells"]',
    )
    pencilBtn?.focus()
    act(() => {
      pencilBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Eraser — remove cells')
  })

  it('ArrowLeft moves focus to the previous tool button', () => {
    const eraserBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Eraser — remove cells"]',
    )
    eraserBtn?.focus()
    act(() => {
      eraserBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Pencil — draw cells')
  })

  it('ArrowRight wraps from the last tool to the first', () => {
    const fillBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Fill — flood fill enclosed region"]',
    )
    fillBtn?.focus()
    act(() => {
      fillBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Pencil — draw cells')
  })

  it('ArrowLeft wraps from the first tool to the last', () => {
    const pencilBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Pencil — draw cells"]',
    )
    pencilBtn?.focus()
    act(() => {
      pencilBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Fill — flood fill enclosed region',
    )
  })

  it('Home moves focus to the first tool button', () => {
    const eraserBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Eraser — remove cells"]',
    )
    eraserBtn?.focus()
    act(() => {
      eraserBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Pencil — draw cells')
  })

  it('End moves focus to the last tool button', () => {
    const pencilBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Pencil — draw cells"]',
    )
    pencilBtn?.focus()
    act(() => {
      pencilBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Fill — flood fill enclosed region',
    )
  })
})
