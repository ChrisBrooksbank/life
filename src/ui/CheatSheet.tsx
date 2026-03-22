import { useEffect } from 'preact/hooks'
import { SHORTCUTS } from './SettingsPanel'

interface CheatSheetProps {
  onClose: () => void
}

/** Full-screen overlay showing all keyboard shortcuts. Closed by Escape or clicking backdrop. */
export function CheatSheet({ onClose }: CheatSheetProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      class="cheat-sheet-backdrop"
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Stop click propagation so clicking inside the card doesn't close it */}
      <div class="cheat-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="cheat-sheet__header">
          <h2 class="cheat-sheet__title">Keyboard shortcuts</h2>
          <button
            class="cheat-sheet__close"
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>
        <ul class="cheat-sheet__list" aria-label="Keyboard shortcut list">
          {SHORTCUTS.map(({ keys, description }) => (
            <li class="cheat-sheet__item" key={keys}>
              <kbd class="cheat-sheet__kbd">{keys}</kbd>
              <span class="cheat-sheet__desc">{description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
