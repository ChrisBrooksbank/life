import { describe, it, expect, afterEach } from 'vitest'
import { render } from 'preact'
import { AgeColorToggle } from './AgeColorToggle'
import { appStore } from '../store'

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  render(<AgeColorToggle />, container)
}

afterEach(() => {
  render(null, container)
  container.remove()
  appStore.setState({ ageColorMode: false })
})

describe('AgeColorToggle', () => {
  it('renders a button', () => {
    setup()
    const btn = container.querySelector('button')
    expect(btn).not.toBeNull()
  })

  it('button has aria-pressed=false when age color mode is off', () => {
    setup()
    const btn = container.querySelector('button')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking the button enables age color mode in the store', () => {
    setup()
    const btn = container.querySelector('button') as HTMLButtonElement
    btn.click()
    expect(appStore.getState().ageColorMode).toBe(true)
  })

  it('clicking twice toggles age color mode back off', () => {
    setup()
    const btn = container.querySelector('button') as HTMLButtonElement
    btn.click()
    btn.click()
    expect(appStore.getState().ageColorMode).toBe(false)
  })
})
