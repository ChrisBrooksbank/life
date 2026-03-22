import { describe, it, expect, afterEach } from 'vitest'
import { render } from 'preact'
import { App } from './app'

let container: HTMLDivElement

function setup() {
  container = document.createElement('div')
  document.body.appendChild(container)
  render(<App />, container)
}

afterEach(() => {
  render(null, container)
  container.remove()
})

describe('App layout skeleton', () => {
  it('renders the simulation canvas', () => {
    setup()
    const canvas = container.querySelector('#life-canvas')
    expect(canvas).not.toBeNull()
    expect(canvas?.tagName).toBe('CANVAS')
  })

  it('marks the canvas as decorative (aria-hidden)', () => {
    setup()
    const canvas = container.querySelector('#life-canvas')
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the drawing tools toolbar with accessible label', () => {
    setup()
    const toolbar = container.querySelector('nav[aria-label="Drawing tools"]')
    expect(toolbar).not.toBeNull()
  })

  it('renders the HUD aside with accessible label', () => {
    setup()
    const hud = container.querySelector('aside[aria-label="Simulation statistics"]')
    expect(hud).not.toBeNull()
  })

  it('renders a polite screen reader live region', () => {
    setup()
    const region = container.querySelector('#sr-polite')
    expect(region).not.toBeNull()
    expect(region?.getAttribute('aria-live')).toBe('polite')
    expect(region?.getAttribute('aria-atomic')).toBe('true')
  })

  it('renders an assertive screen reader live region', () => {
    setup()
    const region = container.querySelector('#sr-assertive')
    expect(region).not.toBeNull()
    expect(region?.getAttribute('aria-live')).toBe('assertive')
    expect(region?.getAttribute('aria-atomic')).toBe('true')
  })

  it('screen reader live regions have sr-only class', () => {
    setup()
    expect(container.querySelector('#sr-polite')?.classList.contains('sr-only')).toBe(true)
    expect(container.querySelector('#sr-assertive')?.classList.contains('sr-only')).toBe(true)
  })

  it('renders the controls footer with accessible label', () => {
    setup()
    const controls = container.querySelector('footer[aria-label="Simulation controls"]')
    expect(controls).not.toBeNull()
  })

  it('wraps everything in an application role element', () => {
    setup()
    const app = container.querySelector('[role="application"]')
    expect(app).not.toBeNull()
    expect(app?.getAttribute('aria-label')).toBe("Conway's Game of Life")
  })

  it('applies the app CSS class to the root element', () => {
    setup()
    const app = container.firstElementChild
    expect(app?.classList.contains('app')).toBe(true)
  })
})
