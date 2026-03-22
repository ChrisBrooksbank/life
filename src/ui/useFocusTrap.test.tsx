import { describe, it, expect, afterEach } from 'vitest'
import { render, type ComponentChildren } from 'preact'
import { useRef } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { useFocusTrap } from './useFocusTrap'

let container: HTMLDivElement

function teardown() {
  if (container?.parentNode) {
    act(() => {
      render(null, container)
    })
    container.remove()
  }
}

afterEach(teardown)

/** Minimal component that applies useFocusTrap to its root div. */
function TrapFixture({ children }: { children?: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  return (
    <div ref={ref} id="trap-root">
      {children}
    </div>
  )
}

function setup(children?: ComponentChildren) {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    render(<TrapFixture>{children}</TrapFixture>, container)
  })
}

describe('useFocusTrap — auto-focus on mount', () => {
  it('moves focus to the first focusable element on mount', () => {
    setup(
      <>
        <button id="btn-a">A</button>
        <button id="btn-b">B</button>
      </>,
    )
    expect(document.activeElement?.id).toBe('btn-a')
  })

  it('does nothing when there are no focusable elements', () => {
    const before = document.activeElement
    setup(<span>no buttons</span>)
    // Focus should not throw and should remain wherever it was
    expect(document.activeElement).toBe(before)
  })
})

describe('useFocusTrap — Tab key cycling', () => {
  it('wraps Tab from the last focusable element to the first', () => {
    setup(
      <>
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      </>,
    )
    // Simulate Tab pressed while last element is focused
    const last = document.getElementById('last') as HTMLButtonElement
    last.focus()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(document.activeElement?.id).toBe('first')
  })

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    setup(
      <>
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      </>,
    )
    // Focus is on first after mount; press Shift+Tab
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      )
    })
    expect(document.activeElement?.id).toBe('last')
  })

  it('does not intercept Tab when not on a boundary element', () => {
    setup(
      <>
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      </>,
    )
    const middle = document.getElementById('middle') as HTMLButtonElement
    middle.focus()
    // Tab from middle should not be intercepted — still on middle after event
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    // Focus naturally moves to last (browser does it), but jsdom won't do that
    // — we just verify that the trap did NOT move it to first.
    expect(document.activeElement?.id).not.toBe('first')
  })
})

describe('useFocusTrap — focus restoration on unmount', () => {
  it('restores focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    trigger.id = 'trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement?.id).toBe('trigger')

    setup(<button id="inside">Inside</button>)
    expect(document.activeElement?.id).toBe('inside')

    // Unmount the trap
    act(() => {
      render(null, container)
    })
    expect(document.activeElement?.id).toBe('trigger')

    trigger.remove()
  })
})
