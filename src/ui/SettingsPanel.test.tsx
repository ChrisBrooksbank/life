import { describe, it, expect, afterEach } from 'vitest'
import { render } from 'preact'
import { SettingsPanel, rgbaToHex, hexToRgba } from './SettingsPanel'
import { appStore } from '../store'
import { DARK_THEME_COLORS } from '../renderer/themes'

let container: HTMLDivElement
const noop = () => {}

function setup(onClose = noop) {
  container = document.createElement('div')
  document.body.appendChild(container)
  render(<SettingsPanel onClose={onClose} />, container)
}

afterEach(() => {
  // Only clean up if setup() was called (container is connected to the DOM)
  if (container?.parentNode) {
    render(null, container)
    container.remove()
  }
  appStore.setState({ theme: 'dark', themeColors: DARK_THEME_COLORS, showGrid: false })
})

describe('rgbaToHex', () => {
  it('converts white to #ffffff', () => {
    expect(rgbaToHex([1, 1, 1, 1])).toBe('#ffffff')
  })

  it('converts black to #000000', () => {
    expect(rgbaToHex([0, 0, 0, 1])).toBe('#000000')
  })

  it('converts a mid-gray correctly', () => {
    expect(rgbaToHex([0.5, 0.5, 0.5, 1])).toBe('#808080')
  })
})

describe('hexToRgba', () => {
  it('converts #ffffff to [1, 1, 1, alpha]', () => {
    const result = hexToRgba('#ffffff', 1)
    expect(result[0]).toBeCloseTo(1)
    expect(result[1]).toBeCloseTo(1)
    expect(result[2]).toBeCloseTo(1)
    expect(result[3]).toBe(1)
  })

  it('converts #000000 to [0, 0, 0, alpha]', () => {
    const result = hexToRgba('#000000', 0.5)
    expect(result[0]).toBeCloseTo(0)
    expect(result[1]).toBeCloseTo(0)
    expect(result[2]).toBeCloseTo(0)
    expect(result[3]).toBe(0.5)
  })
})

describe('SettingsPanel', () => {
  it('renders a dialog', () => {
    setup()
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-label')).toBe('Settings')
  })

  it('has a close button', () => {
    setup()
    const closeBtn = container.querySelector('button[aria-label="Close settings"]')
    expect(closeBtn).not.toBeNull()
  })

  it('calls onClose when close button is clicked', () => {
    let called = false
    setup(() => {
      called = true
    })
    const closeBtn = container.querySelector(
      'button[aria-label="Close settings"]',
    ) as HTMLButtonElement
    closeBtn.click()
    expect(called).toBe(true)
  })

  it('renders theme select with current theme value', () => {
    appStore.setState({ theme: 'dark' })
    setup()
    const select = container.querySelector('select[aria-label="Theme"]') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.value).toBe('dark')
  })

  it('changing theme select updates the store', () => {
    appStore.setState({ theme: 'dark', themeColors: DARK_THEME_COLORS })
    setup()
    const select = container.querySelector('select[aria-label="Theme"]') as HTMLSelectElement
    select.value = 'light'
    select.dispatchEvent(new Event('change'))
    expect(appStore.getState().theme).toBe('light')
  })

  it('renders grid toggle checkbox', () => {
    setup()
    const checkbox = container.querySelector(
      'input[aria-label="Show grid overlay"]',
    ) as HTMLInputElement
    expect(checkbox).not.toBeNull()
    expect(checkbox.type).toBe('checkbox')
  })

  it('grid checkbox reflects store state (unchecked when false)', () => {
    appStore.setState({ showGrid: false })
    setup()
    const checkbox = container.querySelector(
      'input[aria-label="Show grid overlay"]',
    ) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('grid checkbox reflects store state (checked when true)', () => {
    appStore.setState({ showGrid: true })
    setup()
    const checkbox = container.querySelector(
      'input[aria-label="Show grid overlay"]',
    ) as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('clicking grid checkbox toggles showGrid in the store', () => {
    appStore.setState({ showGrid: false })
    setup()
    const checkbox = container.querySelector(
      'input[aria-label="Show grid overlay"]',
    ) as HTMLInputElement
    checkbox.click()
    expect(appStore.getState().showGrid).toBe(true)
  })

  it('renders cell color input', () => {
    setup()
    const input = container.querySelector('input[aria-label="Cell color"]')
    expect(input).not.toBeNull()
    expect((input as HTMLInputElement).type).toBe('color')
  })

  it('renders background color input', () => {
    setup()
    const input = container.querySelector('input[aria-label="Background color"]')
    expect(input).not.toBeNull()
  })

  it('renders grid color input', () => {
    setup()
    const input = container.querySelector('input[aria-label="Grid color"]')
    expect(input).not.toBeNull()
  })

  it('reset button resets colors to theme defaults', () => {
    appStore.setState({
      theme: 'dark',
      themeColors: { ...DARK_THEME_COLORS, cellColor: [1, 0, 0, 1] },
    })
    setup()
    const resetBtn = container.querySelector(
      'button[aria-label="Reset colors to theme defaults"]',
    ) as HTMLButtonElement
    resetBtn.click()
    expect(appStore.getState().themeColors.cellColor).toEqual(DARK_THEME_COLORS.cellColor)
  })

  it('renders keyboard shortcuts list', () => {
    setup()
    const shortcuts = container.querySelectorAll('.settings-panel__shortcut')
    expect(shortcuts.length).toBeGreaterThan(0)
  })

  it('each shortcut has a kbd element and description', () => {
    setup()
    const shortcuts = container.querySelectorAll('.settings-panel__shortcut')
    for (const shortcut of shortcuts) {
      expect(shortcut.querySelector('kbd')).not.toBeNull()
      expect(shortcut.querySelector('.settings-panel__shortcut-desc')).not.toBeNull()
    }
  })
})
