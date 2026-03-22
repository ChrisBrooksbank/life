import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { appStore } from '../store'
import { DEFAULT_RULES } from '../engine/types'

// A minimal component that just mounts the hook
function ShortcutConsumer() {
  useKeyboardShortcuts()
  return null
}

function resetStore() {
  appStore.setState({
    isRunning: false,
    generation: 0,
    population: 0,
    speed: 10,
    rules: DEFAULT_RULES,
    activeTool: 'pencil',
    theme: 'dark',
    worker: null,
    cheatSheetOpen: false,
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

function pressKey(
  key: string,
  options: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }))
  })
}

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<ShortcutConsumer />, container)
  })
}

function teardown() {
  act(() => {
    render(null, container)
  })
  container.remove()
}

beforeEach(() => {
  resetStore()
  setup()
})

afterEach(teardown)

describe('useKeyboardShortcuts — play/pause', () => {
  it('Space starts simulation when paused', () => {
    pressKey(' ')
    expect(appStore.getState().isRunning).toBe(true)
  })

  it('Space pauses simulation when running', () => {
    appStore.setState({ isRunning: true })
    pressKey(' ')
    expect(appStore.getState().isRunning).toBe(false)
  })

  it('Space preventDefault is called', () => {
    const spy = vi.fn()
    act(() => {
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      Object.defineProperty(event, 'preventDefault', { value: spy })
      window.dispatchEvent(event)
    })
    expect(spy).toHaveBeenCalled()
  })
})

describe('useKeyboardShortcuts — step', () => {
  it('. steps the simulation when paused', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never })
    pressKey('.')
    expect(mockWorker.step).toHaveBeenCalledWith(1)
  })

  it('. does not step when simulation is running', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, isRunning: true })
    pressKey('.')
    expect(mockWorker.step).not.toHaveBeenCalled()
  })
})

describe('useKeyboardShortcuts — reset', () => {
  it('r resets the simulation', () => {
    const mockWorker = makeMockWorker()
    appStore.setState({ worker: mockWorker as never, isRunning: true, generation: 100 })
    pressKey('r')
    expect(appStore.getState().isRunning).toBe(false)
    expect(appStore.getState().generation).toBe(0)
  })
})

describe('useKeyboardShortcuts — tool selection', () => {
  it('p selects the pencil tool', () => {
    appStore.setState({ activeTool: 'eraser' })
    pressKey('p')
    expect(appStore.getState().activeTool).toBe('pencil')
  })

  it('e selects the eraser tool', () => {
    pressKey('e')
    expect(appStore.getState().activeTool).toBe('eraser')
  })
})

describe('useKeyboardShortcuts — theme toggle', () => {
  it('t toggles from dark to light', () => {
    appStore.setState({ theme: 'dark' })
    pressKey('t')
    expect(appStore.getState().theme).toBe('light')
  })

  it('t toggles from light to dark', () => {
    appStore.setState({ theme: 'light' })
    pressKey('t')
    expect(appStore.getState().theme).toBe('dark')
  })
})

describe('useKeyboardShortcuts — speed', () => {
  it('+ doubles the speed', () => {
    appStore.setState({ speed: 10 })
    pressKey('+')
    expect(appStore.getState().speed).toBe(20)
  })

  it('= also doubles the speed', () => {
    appStore.setState({ speed: 10 })
    pressKey('=')
    expect(appStore.getState().speed).toBe(20)
  })

  it('- halves the speed', () => {
    appStore.setState({ speed: 10 })
    pressKey('-')
    expect(appStore.getState().speed).toBe(5)
  })

  it('+ does not exceed MAX_SPEED', () => {
    appStore.setState({ speed: 800 })
    pressKey('+')
    expect(appStore.getState().speed).toBe(1000)
  })

  it('- does not go below MIN_SPEED', () => {
    appStore.setState({ speed: 1 })
    pressKey('-')
    expect(appStore.getState().speed).toBe(1)
  })
})

describe('useKeyboardShortcuts — clipboard', () => {
  it('Ctrl+C calls copyToClipboard', () => {
    const mockWorker = {
      step: vi.fn(),
      reset: vi.fn(),
      setRules: vi.fn(),
      getCells: vi.fn().mockResolvedValue([]),
      onState: null,
    }
    appStore.setState({ worker: mockWorker as never })

    const copyToClipboard = vi.fn()
    appStore.setState({ copyToClipboard } as never)

    pressKey('c', { ctrlKey: true })
    expect(copyToClipboard).toHaveBeenCalled()
  })

  it('Ctrl+V calls pasteFromClipboard', () => {
    const pasteFromClipboard = vi.fn()
    appStore.setState({ pasteFromClipboard } as never)

    pressKey('v', { ctrlKey: true })
    expect(pasteFromClipboard).toHaveBeenCalled()
  })

  it('Ctrl+C with Shift does not call copyToClipboard', () => {
    const copyToClipboard = vi.fn()
    appStore.setState({ copyToClipboard } as never)

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, shiftKey: true, bubbles: true }),
      )
    })
    expect(copyToClipboard).not.toHaveBeenCalled()
  })
})

describe('useKeyboardShortcuts — cheat sheet', () => {
  it('? opens the cheat sheet', () => {
    appStore.setState({ cheatSheetOpen: false })
    pressKey('?')
    expect(appStore.getState().cheatSheetOpen).toBe(true)
  })

  it('? toggles the cheat sheet closed when already open', () => {
    appStore.setState({ cheatSheetOpen: true })
    pressKey('?')
    expect(appStore.getState().cheatSheetOpen).toBe(false)
  })
})

describe('useKeyboardShortcuts — suppression', () => {
  it('ignores shortcuts when Ctrl is held', () => {
    pressKey(' ', { ctrlKey: true })
    expect(appStore.getState().isRunning).toBe(false)
  })

  it('ignores shortcuts when Alt is held', () => {
    pressKey(' ', { altKey: true })
    expect(appStore.getState().isRunning).toBe(false)
  })

  it('ignores shortcuts when Meta is held', () => {
    pressKey(' ', { metaKey: true })
    expect(appStore.getState().isRunning).toBe(false)
  })

  it('ignores shortcuts when an input element is focused', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    pressKey(' ')
    expect(appStore.getState().isRunning).toBe(false)
    input.remove()
  })

  it('ignores shortcuts when a textarea is focused', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    pressKey('p')
    // activeTool should remain pencil (unchanged from default)
    expect(appStore.getState().activeTool).toBe('pencil')
    ta.remove()
  })

  it('removes event listener after component unmounts', () => {
    // unmount the component — shortcuts should no longer fire
    act(() => {
      render(null, container)
    })
    pressKey(' ')
    expect(appStore.getState().isRunning).toBe(false)
  })
})
