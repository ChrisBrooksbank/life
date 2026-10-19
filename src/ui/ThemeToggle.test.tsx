import { describe, it, expect, afterEach } from 'vitest'
import { render } from 'preact'
import { ThemeToggle } from './ThemeToggle'
import { appStore } from '../store'
import { DARK_THEME_COLORS } from '../renderer/themes'

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  render(<ThemeToggle />, container)
}

afterEach(() => {
  render(null, container)
  container.remove()
  appStore.setState({ theme: 'dark', themeColors: DARK_THEME_COLORS })
})

describe('ThemeToggle', () => {
  it('renders a button', () => {
    setup()
    const btn = container.querySelector('button')
    expect(btn).not.toBeNull()
  })

  it('has accessible aria-label for dark theme', () => {
    appStore.setState({ theme: 'dark', themeColors: DARK_THEME_COLORS })
    setup()
    const btn = container.querySelector('button')
    expect(btn?.getAttribute('aria-label')).toBe('Switch to light theme')
  })

  it('has accessible aria-label for light theme', () => {
    appStore.setState({ theme: 'light', themeColors: DARK_THEME_COLORS })
    setup()
    const btn = container.querySelector('button')
    expect(btn?.getAttribute('aria-label')).toBe('Switch to dark theme')
  })

  it('clicking switches from dark to light', () => {
    appStore.setState({ theme: 'dark', themeColors: DARK_THEME_COLORS })
    setup()
    const btn = container.querySelector('button') as HTMLButtonElement
    btn.click()
    expect(appStore.getState().theme).toBe('light')
  })

  it('clicking switches from light to dark', () => {
    appStore.setState({ theme: 'light', themeColors: DARK_THEME_COLORS })
    setup()
    const btn = container.querySelector('button') as HTMLButtonElement
    btn.click()
    expect(appStore.getState().theme).toBe('dark')
  })
})
