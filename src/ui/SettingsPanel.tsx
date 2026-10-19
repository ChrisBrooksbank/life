import { useState, useEffect, useRef } from 'preact/hooks'
import { appStore } from '../store'
import type { RgbaColor } from '../renderer/themes'
import { THEME_COLORS } from '../renderer/themes'
import { useFocusTrap } from './useFocusTrap'

interface SettingsPanelProps {
  onClose: () => void
}

/** Convert a [0–1] RGBA tuple to a CSS hex color string (ignores alpha). */
export function rgbaToHex(rgba: RgbaColor): string {
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`
}

/** Convert a CSS hex color string to a [0–1] RGBA tuple, preserving the given alpha. */
export function hexToRgba(hex: string, alpha: number): RgbaColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, alpha]
}

export const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: 'Space', description: 'Play / Pause' },
  { keys: '.', description: 'Step forward' },
  { keys: 'R', description: 'Reset' },
  { keys: 'P', description: 'Pencil tool' },
  { keys: 'E', description: 'Eraser tool' },
  { keys: 'T', description: 'Toggle theme' },
  { keys: '+', description: 'Speed up' },
  { keys: '-', description: 'Slow down' },
  { keys: 'Ctrl+Z', description: 'Undo' },
  { keys: 'Ctrl+Shift+Z', description: 'Redo' },
  { keys: 'Ctrl+C', description: 'Copy selection (RLE)' },
  { keys: 'Ctrl+V', description: 'Paste (RLE)' },
  { keys: '?', description: 'Show keyboard shortcuts' },
]

/** Settings panel: theme, grid toggle, colors, and keyboard shortcut reference. */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef)

  const [theme, setThemeState] = useState(() => appStore.getState().theme)
  const [showGrid, setShowGridState] = useState(() => appStore.getState().showGrid)
  const [themeColors, setThemeColorsState] = useState(() => appStore.getState().themeColors)

  useEffect(() => {
    return appStore.subscribe((s) => {
      setThemeState(s.theme)
      setShowGridState(s.showGrid)
      setThemeColorsState(s.themeColors)
    })
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleThemeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as 'dark' | 'light'
    appStore.getState().setTheme(val)
  }

  function handleGridToggle() {
    appStore.getState().setShowGrid(!appStore.getState().showGrid)
  }

  function handleCellColorChange(e: Event) {
    const hex = (e.target as HTMLInputElement).value
    appStore.getState().setThemeColors({ cellColor: hexToRgba(hex, themeColors.cellColor[3]) })
  }

  function handleBgColorChange(e: Event) {
    const hex = (e.target as HTMLInputElement).value
    appStore
      .getState()
      .setThemeColors({ backgroundColor: hexToRgba(hex, themeColors.backgroundColor[3]) })
  }

  function handleGridColorChange(e: Event) {
    const hex = (e.target as HTMLInputElement).value
    appStore.getState().setThemeColors({ gridColor: hexToRgba(hex, themeColors.gridColor[3]) })
  }

  function handleResetColors() {
    appStore.getState().setTheme(appStore.getState().theme)
  }

  return (
    <div
      class="settings-panel"
      role="dialog"
      aria-label="Settings"
      aria-modal="true"
      ref={panelRef}
    >
      <div class="settings-panel__header">
        <h2 class="settings-panel__title">Settings</h2>
        <button
          class="settings-panel__close"
          type="button"
          onClick={onClose}
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      <div class="settings-panel__body">
        <section class="settings-panel__section" aria-label="Appearance settings">
          <h3 class="settings-panel__section-title">Appearance</h3>

          <label class="settings-panel__row">
            <span class="settings-panel__label">Theme</span>
            <select
              class="settings-panel__select"
              value={theme}
              onChange={handleThemeChange}
              aria-label="Theme"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>

          <label class="settings-panel__row">
            <span class="settings-panel__label">Show grid</span>
            <input
              type="checkbox"
              class="settings-panel__checkbox"
              checked={showGrid}
              onChange={handleGridToggle}
              aria-label="Show grid overlay"
            />
          </label>

          <label class="settings-panel__row">
            <span class="settings-panel__label">Cell color</span>
            <input
              type="color"
              class="settings-panel__color"
              value={rgbaToHex(themeColors.cellColor)}
              onInput={handleCellColorChange}
              aria-label="Cell color"
            />
          </label>

          <label class="settings-panel__row">
            <span class="settings-panel__label">Background</span>
            <input
              type="color"
              class="settings-panel__color"
              value={rgbaToHex(themeColors.backgroundColor)}
              onInput={handleBgColorChange}
              aria-label="Background color"
            />
          </label>

          <label class="settings-panel__row">
            <span class="settings-panel__label">Grid color</span>
            <input
              type="color"
              class="settings-panel__color"
              value={rgbaToHex(themeColors.gridColor)}
              onInput={handleGridColorChange}
              aria-label="Grid color"
            />
          </label>

          <button
            class="btn settings-panel__reset"
            type="button"
            onClick={handleResetColors}
            aria-label="Reset colors to theme defaults"
          >
            Reset to defaults
          </button>
        </section>

        <section class="settings-panel__section" aria-label="Keyboard shortcuts">
          <h3 class="settings-panel__section-title">Keyboard shortcuts</h3>
          <ul class="settings-panel__shortcuts" aria-label="Keyboard shortcut list">
            {SHORTCUTS.map(({ keys, description }) => (
              <li class="settings-panel__shortcut" key={keys}>
                <kbd class="settings-panel__kbd">{keys}</kbd>
                <span class="settings-panel__shortcut-desc">{description}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export { THEME_COLORS }
