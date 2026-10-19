import { useEffect } from 'preact/hooks'
import type { RefObject } from 'preact'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Traps keyboard focus within the referenced container element.
 *
 * On mount: moves focus to the first focusable child.
 * On Tab / Shift+Tab: cycles focus within the container.
 * On unmount: restores focus to the element that was active before the trap.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus into the container
    const focusable = getFocusableElements(container)
    focusable[0]?.focus()

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Tab') return

      const items = getFocusableElements(container!)
      if (items.length === 0) {
        e.preventDefault()
        return
      }

      const first = items[0]!
      const last = items[items.length - 1]!

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [])
}
