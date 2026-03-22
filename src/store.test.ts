import { describe, it, expect, beforeEach, vi } from 'vitest'
import { appStore } from './store'
import type { AppState } from './store'
import { DEFAULT_RULES } from './engine/types'
import type { StateCallback } from './engine/worker-client'
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from './renderer/themes'

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
    theme: 'dark',
    themeColors: DARK_THEME_COLORS,
    worker: null,
    pastePreviewCells: null,
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

describe('appStore — theme', () => {
  beforeEach(resetStore)

  it('defaults to dark theme', () => {
    expect(getStore().theme).toBe('dark')
  })

  it('defaults themeColors to dark preset', () => {
    expect(getStore().themeColors).toEqual(DARK_THEME_COLORS)
  })

  it('setTheme("light") switches theme and colors', () => {
    getStore().setTheme('light')
    const s = getStore()
    expect(s.theme).toBe('light')
    expect(s.themeColors).toEqual(LIGHT_THEME_COLORS)
  })

  it('setTheme("dark") restores dark theme colors', () => {
    getStore().setTheme('light')
    getStore().setTheme('dark')
    const s = getStore()
    expect(s.theme).toBe('dark')
    expect(s.themeColors).toEqual(DARK_THEME_COLORS)
  })

  it('setThemeColors() overrides individual color fields', () => {
    const customCell: [number, number, number, number] = [1, 0, 0, 1]
    getStore().setThemeColors({ cellColor: customCell })
    expect(getStore().themeColors.cellColor).toEqual(customCell)
    // Other fields remain unchanged
    expect(getStore().themeColors.backgroundColor).toEqual(DARK_THEME_COLORS.backgroundColor)
  })

  it('setTheme() after setThemeColors() resets to preset colors', () => {
    getStore().setThemeColors({ cellColor: [0.5, 0.5, 0.5, 1] })
    getStore().setTheme('light')
    expect(getStore().themeColors).toEqual(LIGHT_THEME_COLORS)
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

describe('appStore — pastePreviewCells', () => {
  beforeEach(resetStore)

  it('starts as null (no active preview)', () => {
    expect(getStore().pastePreviewCells).toBeNull()
  })

  it('startPastePreview sets pastePreviewCells', () => {
    const cells = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    getStore().startPastePreview(cells)
    expect(getStore().pastePreviewCells).toEqual(cells)
  })

  it('cancelPastePreview clears pastePreviewCells', () => {
    getStore().startPastePreview([{ x: 0, y: 0 }])
    getStore().cancelPastePreview()
    expect(getStore().pastePreviewCells).toBeNull()
  })
})

describe('appStore — pasteFromClipboard (smart paste)', () => {
  beforeEach(resetStore)

  it('pasteFromClipboard enters preview mode via startPastePreview', async () => {
    // Provide a valid RLE string on the clipboard
    const rle = 'x = 2, y = 1, rule = B3/S23\noo!'
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn().mockResolvedValue(rle),
      },
    })

    getStore().pasteFromClipboard()
    await Promise.resolve()
    await Promise.resolve()

    expect(getStore().pastePreviewCells).not.toBeNull()
    expect(getStore().pastePreviewCells).toHaveLength(2)

    vi.unstubAllGlobals()
  })

  it('pasteFromClipboard does nothing when clipboard is empty', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn().mockResolvedValue(''),
      },
    })

    getStore().pasteFromClipboard()
    await Promise.resolve()
    await Promise.resolve()

    expect(getStore().pastePreviewCells).toBeNull()

    vi.unstubAllGlobals()
  })

  it('pasteFromClipboard does nothing when RLE decodes to no cells', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn().mockResolvedValue('x = 0, y = 0, rule = B3/S23\n!'),
      },
    })

    getStore().pasteFromClipboard()
    await Promise.resolve()
    await Promise.resolve()

    expect(getStore().pastePreviewCells).toBeNull()

    vi.unstubAllGlobals()
  })
})

describe('appStore — copyToClipboard', () => {
  beforeEach(resetStore)

  it('writes RLE of all live cells to clipboard via worker', async () => {
    const cells = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    const mockWorker = {
      step: vi.fn(),
      reset: vi.fn(),
      setRules: vi.fn(),
      getCells: vi.fn().mockResolvedValue(cells),
      onState: null,
    }
    appStore.setState({ worker: mockWorker as never })

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    getStore().copyToClipboard()
    await Promise.resolve()
    await Promise.resolve()

    expect(writeText).toHaveBeenCalledOnce()
    const written = writeText.mock.calls[0]![0] as string
    expect(written).toContain('x = 2, y = 1')
    expect(written).toContain('2o!')

    vi.unstubAllGlobals()
  })

  it('does nothing when worker is null and no copy source', () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    getStore().copyToClipboard()

    expect(writeText).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('uses _clipboardCopySource when registered', () => {
    const selectedCells = [{ x: 5, y: 5 }]
    getStore()._setClipboardCopySource(() => selectedCells)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    getStore().copyToClipboard()

    expect(writeText).toHaveBeenCalledOnce()
    const written = writeText.mock.calls[0]![0] as string
    expect(written).toContain('x = 1, y = 1')

    vi.unstubAllGlobals()
  })

  it('falls back to worker when _clipboardCopySource returns null', async () => {
    const cells = [{ x: 0, y: 0 }]
    const mockWorker = {
      step: vi.fn(),
      reset: vi.fn(),
      setRules: vi.fn(),
      getCells: vi.fn().mockResolvedValue(cells),
      onState: null,
    }
    appStore.setState({ worker: mockWorker as never })
    getStore()._setClipboardCopySource(() => null)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    getStore().copyToClipboard()
    await Promise.resolve()
    await Promise.resolve()

    expect(mockWorker.getCells).toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('_setClipboardCopySource registers a source function', () => {
    const source = vi.fn().mockReturnValue(null)
    getStore()._setClipboardCopySource(source)
    expect(getStore()._clipboardCopySource).toBe(source)
  })

  it('_setClipboardCopySource can clear the source', () => {
    getStore()._setClipboardCopySource(() => [])
    getStore()._setClipboardCopySource(null)
    expect(getStore()._clipboardCopySource).toBeNull()
  })

  it('does not throw when clipboard is unavailable', async () => {
    const cells = [{ x: 0, y: 0 }]
    const mockWorker = {
      step: vi.fn(),
      reset: vi.fn(),
      setRules: vi.fn(),
      getCells: vi.fn().mockResolvedValue(cells),
      onState: null,
    }
    appStore.setState({ worker: mockWorker as never })
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    await expect(
      (async () => {
        getStore().copyToClipboard()
        await Promise.resolve()
        await Promise.resolve()
      })(),
    ).resolves.not.toThrow()

    vi.unstubAllGlobals()
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
