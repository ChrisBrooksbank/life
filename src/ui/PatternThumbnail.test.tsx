import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { PatternThumbnail } from './PatternThumbnail'
import type { Cell } from '../engine/types'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => {
    render(null, container)
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('PatternThumbnail', () => {
  it('renders a canvas element with class "pattern-thumbnail"', () => {
    act(() => {
      render(<PatternThumbnail cells={[{ x: 0, y: 0 }]} />, container)
    })
    const canvas = container.querySelector('canvas.pattern-thumbnail')
    expect(canvas).not.toBeNull()
  })

  it('has aria-hidden="true" on the canvas', () => {
    act(() => {
      render(<PatternThumbnail cells={[]} />, container)
    })
    expect(container.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders without error for empty cells list', () => {
    expect(() => {
      act(() => {
        render(<PatternThumbnail cells={[]} />, container)
      })
    }).not.toThrow()
  })

  it('renders without error for a single cell', () => {
    expect(() => {
      act(() => {
        render(<PatternThumbnail cells={[{ x: 5, y: 3 }]} />, container)
      })
    }).not.toThrow()
  })

  it('calls fillRect once per cell when context is available', () => {
    const mockFillRect = vi.fn()
    const mockCtx = {
      clearRect: vi.fn(),
      fillRect: mockFillRect,
      fillStyle: '',
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    )

    const cells: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]

    act(() => {
      render(<PatternThumbnail cells={cells} />, container)
    })

    expect(mockFillRect).toHaveBeenCalledTimes(cells.length)
  })

  it('calls clearRect on every render', () => {
    const mockClearRect = vi.fn()
    const mockCtx = {
      clearRect: mockClearRect,
      fillRect: vi.fn(),
      fillStyle: '',
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    )

    act(() => {
      render(<PatternThumbnail cells={[{ x: 0, y: 0 }]} />, container)
    })

    expect(mockClearRect).toHaveBeenCalledTimes(1)
  })

  it('does not call fillRect when cells is empty', () => {
    const mockFillRect = vi.fn()
    const mockCtx = {
      clearRect: vi.fn(),
      fillRect: mockFillRect,
      fillStyle: '',
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    )

    act(() => {
      render(<PatternThumbnail cells={[]} />, container)
    })

    expect(mockFillRect).not.toHaveBeenCalled()
  })

  it('handles gracefully when getContext returns null', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    expect(() => {
      act(() => {
        render(<PatternThumbnail cells={[{ x: 0, y: 0 }]} />, container)
      })
    }).not.toThrow()
  })
})
