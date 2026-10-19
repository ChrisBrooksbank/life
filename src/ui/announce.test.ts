import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { announce } from './announce'

describe('announce', () => {
  let politeEl: HTMLDivElement
  let assertiveEl: HTMLDivElement

  beforeEach(() => {
    politeEl = document.createElement('div')
    politeEl.id = 'sr-polite'
    document.body.appendChild(politeEl)

    assertiveEl = document.createElement('div')
    assertiveEl.id = 'sr-assertive'
    document.body.appendChild(assertiveEl)

    vi.useFakeTimers()
  })

  afterEach(() => {
    politeEl.remove()
    assertiveEl.remove()
    vi.useRealTimers()
  })

  it('clears the polite region immediately', () => {
    politeEl.textContent = 'old message'
    announce('new message')
    expect(politeEl.textContent).toBe('')
  })

  it('sets message in polite region on next animation frame', () => {
    announce('hello')
    // Flush rAF
    vi.runAllTimers()
    expect(politeEl.textContent).toBe('hello')
  })

  it('uses assertive region when priority is assertive', () => {
    announce('urgent', 'assertive')
    vi.runAllTimers()
    expect(assertiveEl.textContent).toBe('urgent')
    expect(politeEl.textContent).toBe('')
  })

  it('defaults to polite priority', () => {
    announce('default')
    vi.runAllTimers()
    expect(politeEl.textContent).toBe('default')
  })

  it('does not throw when live region elements are absent', () => {
    politeEl.remove()
    assertiveEl.remove()
    expect(() => announce('test')).not.toThrow()
    // Restore so afterEach does not error on remove
    document.body.appendChild(politeEl)
    document.body.appendChild(assertiveEl)
  })

  it('clears then re-sets to allow duplicate message re-announcement', () => {
    politeEl.textContent = 'same message'
    announce('same message')
    expect(politeEl.textContent).toBe('')
    vi.runAllTimers()
    expect(politeEl.textContent).toBe('same message')
  })
})
