import { useEffect } from 'preact/hooks'
import { appStore } from '../store'
import { MIN_SPEED, MAX_SPEED } from './Controls'

/** Keys that are considered "modifier-only" shortcuts (no ctrl/alt/meta). */
const SHORTCUTS: Record<string, () => void> = {
  ' ': () => {
    const { isRunning, play, pause } = appStore.getState()
    if (isRunning) {
      pause()
    } else {
      play()
    }
  },
  '.': () => {
    const { isRunning, step } = appStore.getState()
    if (!isRunning) step()
  },
  r: () => {
    appStore.getState().reset()
  },
  p: () => {
    appStore.getState().setActiveTool('pencil')
  },
  e: () => {
    appStore.getState().setActiveTool('eraser')
  },
  t: () => {
    const { theme, setTheme } = appStore.getState()
    setTheme(theme === 'dark' ? 'light' : 'dark')
  },
  '+': () => {
    const { speed, setSpeed } = appStore.getState()
    setSpeed(Math.min(MAX_SPEED, Math.round(speed * 2)))
  },
  '=': () => {
    // Same as + (without shift)
    const { speed, setSpeed } = appStore.getState()
    setSpeed(Math.min(MAX_SPEED, Math.round(speed * 2)))
  },
  '-': () => {
    const { speed, setSpeed } = appStore.getState()
    setSpeed(Math.max(MIN_SPEED, Math.round(speed / 2)))
  },
}

/** Returns true when keyboard events should be ignored (e.g. user is typing). */
function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el as HTMLElement).isContentEditable
  )
}

/**
 * Registers global keyboard shortcuts for simulation and editor actions.
 * Shortcuts are suppressed when an interactive input element has focus.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (isInputFocused()) return

      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        appStore.getState().undo()
        return
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        appStore.getState().redo()
        return
      }

      // Ignore other combinations with modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const handler = SHORTCUTS[e.key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
