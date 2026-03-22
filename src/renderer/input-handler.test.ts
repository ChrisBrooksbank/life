import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createInputHandler } from './input-handler'
import type { Camera } from './webgl2-renderer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  // jsdom returns all-zeros from getBoundingClientRect by default,
  // so clientX/Y === canvas-local screenX/Y for all test events.
  return canvas
}

function makeCamera(overrides: Partial<Camera> = {}): Camera {
  return { x: 0, y: 0, zoom: 16, ...overrides }
}

// Dispatch a WheelEvent on an element.
function wheel(target: EventTarget, clientX: number, clientY: number, deltaY: number) {
  target.dispatchEvent(
    new WheelEvent('wheel', { clientX, clientY, deltaY, bubbles: true, cancelable: true }),
  )
}

// Dispatch mouse events (mousedown on canvas, move/up on window).
function mouseDown(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX, clientY, button: 0, bubbles: true }))
}
function mouseMove(clientX: number, clientY: number) {
  window.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }))
}
function mouseUp() {
  window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

// Minimal Touch factory — jsdom does not expose the Touch constructor,
// so we build a plain object that satisfies the Touch interface.
function makeTouch(id: number, clientX: number, clientY: number): Touch {
  return {
    identifier: id,
    target: document.body,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
  } as unknown as Touch
}

function touchStart(canvas: HTMLCanvasElement, touches: Touch[]) {
  canvas.dispatchEvent(
    new TouchEvent('touchstart', {
      changedTouches: touches,
      touches,
      cancelable: true,
      bubbles: true,
    }),
  )
}

function touchMove(canvas: HTMLCanvasElement, touches: Touch[], allTouches: Touch[]) {
  canvas.dispatchEvent(
    new TouchEvent('touchmove', {
      changedTouches: touches,
      touches: allTouches,
      cancelable: true,
      bubbles: true,
    }),
  )
}

function touchEnd(canvas: HTMLCanvasElement, ended: Touch[], remaining: Touch[]) {
  canvas.dispatchEvent(
    new TouchEvent('touchend', {
      changedTouches: ended,
      touches: remaining,
      cancelable: true,
      bubbles: true,
    }),
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createInputHandler', () => {
  let canvas: HTMLCanvasElement
  let camera: Camera
  let setCamera: ReturnType<typeof vi.fn>
  let dispose: () => void
  let rafCallbacks: Array<(ts: number) => void>

  beforeEach(() => {
    canvas = makeCanvas()
    camera = makeCamera()
    setCamera = vi.fn((c: Camera) => {
      camera = c
    })

    rafCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    dispose = createInputHandler(canvas, () => camera, setCamera)
  })

  afterEach(() => {
    dispose()
    vi.unstubAllGlobals()
  })

  /** Flush all pending RAF callbacks once. */
  function flushRAF(timestamp = 16) {
    const cbs = rafCallbacks.splice(0)
    for (const cb of cbs) cb(timestamp)
  }

  // ── Wheel zoom ──────────────────────────────────────────────────────────

  it('wheel scroll-up zooms in', () => {
    wheel(canvas, 0, 0, -100)
    expect(setCamera).toHaveBeenCalledOnce()
    expect(camera.zoom).toBeGreaterThan(16)
  })

  it('wheel scroll-down zooms out', () => {
    wheel(canvas, 0, 0, 100)
    expect(setCamera).toHaveBeenCalledOnce()
    expect(camera.zoom).toBeLessThan(16)
  })

  it('wheel zoom keeps the anchor world point fixed', () => {
    // Zoom centered on screen point (100, 200)
    const cam0: Camera = { x: 0, y: 0, zoom: 16 }
    camera = cam0
    // World point under cursor before zoom
    const worldXBefore = 100 / cam0.zoom + cam0.x // = 6.25
    const worldYBefore = 200 / cam0.zoom + cam0.y // = 12.5

    wheel(canvas, 100, 200, -100) // zoom in

    // World point under the same screen position after zoom must be the same
    const worldXAfter = 100 / camera.zoom + camera.x
    const worldYAfter = 200 / camera.zoom + camera.y
    expect(worldXAfter).toBeCloseTo(worldXBefore, 5)
    expect(worldYAfter).toBeCloseTo(worldYBefore, 5)
  })

  it('wheel event has preventDefault called', () => {
    const evt = new WheelEvent('wheel', {
      clientX: 0,
      clientY: 0,
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    })
    const spy = vi.spyOn(evt, 'preventDefault')
    canvas.dispatchEvent(evt)
    expect(spy).toHaveBeenCalled()
  })

  // ── Mouse drag pan ──────────────────────────────────────────────────────

  it('mouse drag pans the camera', () => {
    mouseDown(canvas, 100, 100)
    mouseMove(120, 110) // +20 right, +10 down → camera moves left/up

    expect(setCamera).toHaveBeenCalledOnce()
    // pan(cam, 20, 10) → x = 0 - 20/16, y = 0 - 10/16
    expect(camera.x).toBeCloseTo(-20 / 16)
    expect(camera.y).toBeCloseTo(-10 / 16)
  })

  it('no pan without mousedown', () => {
    mouseMove(200, 300)
    expect(setCamera).not.toHaveBeenCalled()
  })

  it('mouse drag with non-primary button does nothing', () => {
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 0, clientY: 0, button: 2, bubbles: true }),
    )
    mouseMove(50, 50)
    expect(setCamera).not.toHaveBeenCalled()
  })

  it('multiple mousemove events accumulate pan', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(10, 0)
    mouseMove(20, 0)
    // Two pan calls of 10px each
    expect(setCamera).toHaveBeenCalledTimes(2)
    expect(camera.x).toBeCloseTo(-20 / 16)
  })

  it('no pan after mouseup', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(10, 10)
    mouseUp()
    setCamera.mockClear()
    // Flush the inertia RAF that mouseUp schedules, to isolate
    rafCallbacks.splice(0)
    mouseMove(100, 100)
    expect(setCamera).not.toHaveBeenCalled()
  })

  // ── Inertia ─────────────────────────────────────────────────────────────

  it('mouseup with velocity starts inertia RAF', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(20, 0) // gives velX = 12 (alpha=0.6 * 20)
    mouseUp()
    expect(rafCallbacks.length).toBe(1)
  })

  it('inertia pans camera each frame', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(50, 0)
    mouseUp()

    const camBeforeInertia = { ...camera }
    flushRAF()

    // Camera should have moved further in the same direction
    expect(camera.x).toBeLessThan(camBeforeInertia.x) // panned more left
  })

  it('inertia stops after enough frames', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(10, 0) // modest velocity
    mouseUp()

    // Keep flushing until no more RAF callbacks
    let frames = 0
    while (rafCallbacks.length > 0 && frames < 100) {
      flushRAF()
      frames++
    }
    expect(rafCallbacks.length).toBe(0)
    expect(frames).toBeLessThan(100)
  })

  it('starting a new drag cancels in-flight inertia', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(30, 0)
    mouseUp()

    expect(rafCallbacks.length).toBe(1)
    // Start a new drag — should cancel the RAF
    mouseDown(canvas, 50, 50)
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  // ── Touch single-finger pan ─────────────────────────────────────────────

  it('single-finger touch pans the camera', () => {
    const t = makeTouch(1, 100, 100)
    touchStart(canvas, [t])

    const t2 = makeTouch(1, 120, 110)
    touchMove(canvas, [t2], [t2])

    expect(setCamera).toHaveBeenCalledOnce()
    expect(camera.x).toBeCloseTo(-20 / 16)
    expect(camera.y).toBeCloseTo(-10 / 16)
  })

  it('single-finger touchend starts inertia', () => {
    const t = makeTouch(1, 0, 0)
    touchStart(canvas, [t])
    const t2 = makeTouch(1, 20, 0)
    touchMove(canvas, [t2], [t2])
    touchEnd(canvas, [t2], [])

    expect(rafCallbacks.length).toBe(1)
  })

  // ── Pinch-to-zoom ───────────────────────────────────────────────────────

  it('pinch-apart zooms in', () => {
    // Two fingers start 100px apart
    const t1 = makeTouch(1, 350, 300) // left of center
    const t2 = makeTouch(2, 450, 300) // right of center
    touchStart(canvas, [t1, t2])

    // Spread to 200px apart (centroid stays at 400, 300)
    const t1b = makeTouch(1, 300, 300)
    const t2b = makeTouch(2, 500, 300)
    touchMove(canvas, [t1b, t2b], [t1b, t2b])

    expect(camera.zoom).toBeGreaterThan(16)
  })

  it('pinch-together zooms out', () => {
    const t1 = makeTouch(1, 300, 300)
    const t2 = makeTouch(2, 500, 300)
    touchStart(canvas, [t1, t2])

    // Squeeze to 100px apart
    const t1b = makeTouch(1, 350, 300)
    const t2b = makeTouch(2, 450, 300)
    touchMove(canvas, [t1b, t2b], [t1b, t2b])

    expect(camera.zoom).toBeLessThan(16)
  })

  it('two-finger pan translates camera', () => {
    // Two fingers, centroid at (400, 300)
    const t1 = makeTouch(1, 350, 280)
    const t2 = makeTouch(2, 450, 320)
    touchStart(canvas, [t1, t2])

    // Both fingers move +10 right, centroid shifts to (410, 300)
    const t1b = makeTouch(1, 360, 280)
    const t2b = makeTouch(2, 460, 320)
    touchMove(canvas, [t1b, t2b], [t1b, t2b])

    // pan(cam, +10, 0) → camera.x decreases
    expect(camera.x).toBeCloseTo(-10 / 16)
  })

  // ── Dispose ─────────────────────────────────────────────────────────────

  it('dispose stops inertia', () => {
    mouseDown(canvas, 0, 0)
    mouseMove(30, 0)
    mouseUp()

    expect(rafCallbacks.length).toBe(1)
    dispose()
    expect(cancelAnimationFrame).toHaveBeenCalled()
    // Re-assign dispose to a no-op so afterEach doesn't double-call
    dispose = () => {}
  })

  it('dispose removes wheel listener', () => {
    dispose()
    dispose = () => {}
    setCamera.mockClear()
    wheel(canvas, 0, 0, -100)
    expect(setCamera).not.toHaveBeenCalled()
  })

  it('dispose removes mouse listener', () => {
    dispose()
    dispose = () => {}
    setCamera.mockClear()
    mouseDown(canvas, 0, 0)
    mouseMove(50, 50)
    expect(setCamera).not.toHaveBeenCalled()
  })
})
