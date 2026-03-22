import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { TimeTravelControls } from './TimeTravelControls'
import { appStore } from '../store'
import { DEFAULT_RULES } from '../engine/types'
import { SnapshotHistory } from '../engine/snapshot-history'

function resetStore() {
  const history = new SnapshotHistory()
  appStore.setState({
    isRunning: false,
    generation: 0,
    population: 0,
    speed: 10,
    rules: DEFAULT_RULES,
    activeTool: 'pencil',
    worker: null,
    snapshots: [],
    canRewind: false,
    _snapshotHistory: history,
  } as never)
}

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<TimeTravelControls />, container)
  })
}

function teardown() {
  act(() => {
    render(null, container)
  })
  container.remove()
}

describe('TimeTravelControls — hidden when no snapshots', () => {
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(teardown)

  it('renders nothing when canRewind is false', () => {
    expect(container.innerHTML).toBe('')
  })
})

describe('TimeTravelControls — visible when snapshots exist', () => {
  beforeEach(() => {
    resetStore()
    const history = new SnapshotHistory()
    history.push(0, [])
    history.push(50, [{ x: 1, y: 1 }])
    appStore.setState({
      snapshots: history.snapshots.slice(),
      canRewind: true,
      _snapshotHistory: history,
    } as never)
    setup()
  })
  afterEach(teardown)

  it('renders the rewind button', () => {
    const btn = container.querySelector('[aria-label="Rewind to previous snapshot"]')
    expect(btn).not.toBeNull()
  })

  it('renders the time travel slider', () => {
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Time travel slider"]')
    expect(slider).not.toBeNull()
    expect(slider?.type).toBe('range')
  })

  it('slider max equals last snapshot index', () => {
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Time travel slider"]')
    expect(Number(slider?.max)).toBe(1) // 2 snapshots → max index = 1
  })

  it('shows snapshot count and generation range', () => {
    const info = container.querySelector('.time-travel__info')
    expect(info?.textContent).toContain('2 snapshots')
    expect(info?.textContent).toContain('gen 0')
    expect(info?.textContent).toContain('50')
  })

  it('has accessible group label', () => {
    const group = container.querySelector('[role="group"]')
    expect(group?.getAttribute('aria-label')).toBe('Time travel controls')
  })
})

describe('TimeTravelControls — rewind interactions', () => {
  let mockWorker: {
    step: ReturnType<typeof vi.fn>
    reset: ReturnType<typeof vi.fn>
    setRules: ReturnType<typeof vi.fn>
    getCells: ReturnType<typeof vi.fn>
    setCells: ReturnType<typeof vi.fn>
    onState: null
  }

  beforeEach(() => {
    resetStore()
    mockWorker = {
      step: vi.fn(),
      reset: vi.fn(),
      setRules: vi.fn(),
      getCells: vi.fn().mockResolvedValue([]),
      setCells: vi.fn(),
      onState: null,
    }
    const history = new SnapshotHistory()
    history.push(0, [{ x: 0, y: 0 }])
    history.push(100, [{ x: 1, y: 1 }])
    appStore.setState({
      worker: mockWorker as never,
      snapshots: history.snapshots.slice(),
      canRewind: true,
      _snapshotHistory: history,
      isRunning: true,
    } as never)
    setup()
  })
  afterEach(teardown)

  it('clicking Rewind calls rewindTo with the last index', () => {
    const btn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Rewind to previous snapshot"]',
    )
    act(() => btn?.click())
    // rewindTo(1) → restores gen 100 snapshot and trims to only gen 0
    expect(mockWorker.setCells).toHaveBeenCalledWith([{ x: 1, y: 1 }])
    expect(appStore.getState().isRunning).toBe(false)
  })

  it('dragging the slider calls rewindTo with slider index', () => {
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Time travel slider"]')
    act(() => {
      if (slider) {
        slider.value = '0'
        slider.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    // rewindTo(0) → restores gen 0 snapshot
    expect(mockWorker.setCells).toHaveBeenCalledWith([{ x: 0, y: 0 }])
  })
})
