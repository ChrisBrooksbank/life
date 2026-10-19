import { useState, useEffect } from 'preact/hooks'
import { appStore } from '../store'
import type { Theme } from '../renderer/themes'

/** Button that toggles between dark and light themes. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => appStore.getState().theme)

  useEffect(() => {
    return appStore.subscribe((s) => setTheme(s.theme))
  }, [])

  function toggle() {
    appStore.getState().setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      class="btn btn--icon theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
