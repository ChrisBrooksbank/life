import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { PatternLibrary } from './PatternLibrary'
import { appStore } from '../store'
import { CATALOGUE } from '../patterns/catalogue'

let container: HTMLDivElement
const onClose = vi.fn()

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<PatternLibrary onClose={onClose} />, container)
  })
}

function teardown() {
  act(() => {
    render(null, container)
  })
  container.remove()
  onClose.mockReset()
}

describe('PatternLibrary — rendering', () => {
  beforeEach(setup)
  afterEach(teardown)

  it('renders an aside with aria-label "Pattern library"', () => {
    const aside = container.querySelector('aside[aria-label="Pattern library"]')
    expect(aside).not.toBeNull()
  })

  it('renders a search input', () => {
    const input = container.querySelector('input[type="search"]')
    expect(input).not.toBeNull()
  })

  it('renders "All" category filter button', () => {
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'All',
    )
    expect(btn).not.toBeNull()
  })

  it('renders category filter buttons for all categories', () => {
    const categories = ['Still Lifes', 'Oscillators', 'Spaceships', 'Guns', 'Methuselahs', 'Other']
    for (const cat of categories) {
      const btn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === cat,
      )
      expect(btn, `Expected category button: ${cat}`).not.toBeNull()
    }
  })

  it('renders a close button', () => {
    const btn = container.querySelector('[aria-label="Close pattern library"]')
    expect(btn).not.toBeNull()
  })

  it('renders all catalogue patterns by default', () => {
    const items = container.querySelectorAll('.pattern-library__item')
    expect(items.length).toBe(CATALOGUE.length)
  })

  it('shows a pattern count', () => {
    const count = container.querySelector('.pattern-library__count')
    expect(count?.textContent).toContain(`${CATALOGUE.length}`)
  })
})

describe('PatternLibrary — search', () => {
  beforeEach(setup)
  afterEach(teardown)

  it('filters patterns by name when text is typed', () => {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!
    act(() => {
      input.value = 'glider'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const items = container.querySelectorAll('.pattern-library__item')
    // "Glider", "Gosper Glider Gun", "Simkin Glider Gun", "Canada Goose" (has "glider" in desc)
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(CATALOGUE.length)
  })

  it('shows all patterns when search is cleared', () => {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!
    act(() => {
      input.value = 'glider'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const items = container.querySelectorAll('.pattern-library__item')
    expect(items.length).toBe(CATALOGUE.length)
  })

  it('shows empty message when no patterns match', () => {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!
    act(() => {
      input.value = 'zzznomatch999'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const empty = container.querySelector('.pattern-library__empty')
    expect(empty).not.toBeNull()
    const items = container.querySelectorAll('.pattern-library__item')
    expect(items.length).toBe(0)
  })

  it('searches by description text', () => {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!
    act(() => {
      input.value = 'metastable'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const items = container.querySelectorAll('.pattern-library__item')
    expect(items.length).toBeGreaterThan(0)
  })
})

describe('PatternLibrary — category filters', () => {
  beforeEach(setup)
  afterEach(teardown)

  it('"All" filter is active by default (aria-pressed=true)', () => {
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'All',
    )!
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('clicking "Oscillators" shows only oscillator patterns', () => {
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Oscillators',
    )!
    act(() => btn.click())
    const items = container.querySelectorAll('.pattern-library__item')
    const oscillatorCount = CATALOGUE.filter((p) => p.category === 'oscillator').length
    expect(items.length).toBe(oscillatorCount)
  })

  it('active category filter has aria-pressed=true', () => {
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Spaceships',
    )!
    act(() => btn.click())
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('inactive category filters have aria-pressed=false', () => {
    const oscillatorBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Oscillators',
    )!
    act(() => oscillatorBtn.click())
    const allBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'All',
    )!
    expect(allBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking "All" after a category shows all patterns', () => {
    const oscillatorBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Oscillators',
    )!
    act(() => oscillatorBtn.click())
    const allBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'All',
    )!
    act(() => allBtn.click())
    const items = container.querySelectorAll('.pattern-library__item')
    expect(items.length).toBe(CATALOGUE.length)
  })

  it('category filter combined with search narrows results further', () => {
    const spaceshipBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Spaceships',
    )!
    act(() => spaceshipBtn.click())
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!
    act(() => {
      input.value = 'glider'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const items = container.querySelectorAll('.pattern-library__item')
    const expected = CATALOGUE.filter(
      (p) => p.category === 'spaceship' && matchesSearchForTest(p, 'glider'),
    ).length
    expect(items.length).toBe(expected)
  })
})

describe('PatternLibrary — pattern selection', () => {
  beforeEach(setup)
  afterEach(teardown)

  it('clicking a pattern calls startPastePreview with its cells', () => {
    const startPastePreview = vi.spyOn(appStore.getState(), 'startPastePreview')
    const gliderBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Load pattern: Glider"]',
    )!
    expect(gliderBtn).not.toBeNull()
    act(() => gliderBtn.click())
    const glider = CATALOGUE.find((p) => p.name === 'Glider')!
    expect(startPastePreview).toHaveBeenCalledWith(glider.cells)
    startPastePreview.mockRestore()
  })

  it('clicking a pattern calls onClose', () => {
    const gliderBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Load pattern: Glider"]',
    )!
    act(() => gliderBtn.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PatternLibrary — close button', () => {
  beforeEach(setup)
  afterEach(teardown)

  it('clicking close button calls onClose', () => {
    const closeBtn = container.querySelector<HTMLButtonElement>(
      '[aria-label="Close pattern library"]',
    )!
    act(() => closeBtn.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// Helper that mirrors the component's matchesSearch logic for test assertions
function matchesSearchForTest(
  pattern: { name: string; description: string; discoverer?: string },
  query: string,
): boolean {
  const q = query.toLowerCase()
  return (
    pattern.name.toLowerCase().includes(q) ||
    pattern.description.toLowerCase().includes(q) ||
    (pattern.discoverer?.toLowerCase().includes(q) ?? false)
  )
}
