import { describe, it, expect, afterEach, vi } from 'vitest'
import { render } from 'preact'
import { act } from 'preact/test-utils'
import { CheatSheet } from './CheatSheet'

let container: HTMLDivElement

function setup(onClose = vi.fn()) {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<CheatSheet onClose={onClose} />, container)
  })
  return { onClose }
}

afterEach(() => {
  if (container?.parentNode) {
    act(() => {
      render(null, container)
    })
    container.remove()
  }
})

describe('CheatSheet', () => {
  it('renders a dialog with correct aria label', () => {
    setup()
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-label')).toBe('Keyboard shortcuts')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
  })

  it('renders a close button', () => {
    setup()
    const btn = container.querySelector('button[aria-label="Close keyboard shortcuts"]')
    expect(btn).not.toBeNull()
  })

  it('calls onClose when close button is clicked', () => {
    const { onClose } = setup()
    const btn = container.querySelector(
      'button[aria-label="Close keyboard shortcuts"]',
    ) as HTMLButtonElement
    btn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const { onClose } = setup()
    const backdrop = container.querySelector('.cheat-sheet-backdrop') as HTMLElement
    act(() => {
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when the card itself is clicked', () => {
    const { onClose } = setup()
    const card = container.querySelector('.cheat-sheet') as HTMLElement
    act(() => {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    const { onClose } = setup()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders a list of keyboard shortcuts', () => {
    setup()
    const items = container.querySelectorAll('.cheat-sheet__item')
    expect(items.length).toBeGreaterThan(0)
  })

  it('each shortcut item has a kbd element and description', () => {
    setup()
    const items = container.querySelectorAll('.cheat-sheet__item')
    for (const item of items) {
      expect(item.querySelector('kbd')).not.toBeNull()
      expect(item.querySelector('.cheat-sheet__desc')).not.toBeNull()
    }
  })

  it('includes the ? shortcut entry', () => {
    setup()
    const kbds = Array.from(container.querySelectorAll('.cheat-sheet__kbd'))
    const questionMark = kbds.find((k) => k.textContent === '?')
    expect(questionMark).not.toBeNull()
  })

  it('removes Escape listener on unmount', () => {
    const { onClose } = setup()
    act(() => {
      render(null, container)
    })
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
