import type { Camera } from './webgl2-renderer'
import { zoomAt, pan } from './camera'

export interface InputHandlerOptions {
  /**
   * Zoom multiplier per 100 units of wheel deltaY.
   * Default: 1.15 (15% zoom per scroll notch).
   */
  wheelZoomFactor?: number
  /**
   * Fraction of velocity retained each inertia frame (0–1).
   * Default: 0.85
   */
  inertiaFriction?: number
  /**
   * Stop inertia when the pixel-per-frame speed drops below this value.
   * Default: 0.5
   */
  inertiaMinVelocity?: number
  /**
   * Called on mousedown to decide whether a pan gesture should begin.
   * When omitted, panning is always allowed.
   * Return false to suppress pan (e.g. when a drawing tool is active).
   */
  shouldPan?: () => boolean
  /**
   * When provided and returns true, a single-finger touch gesture dispatches
   * synthetic mouse events (mousedown/mousemove/mouseup) so that drawing tools
   * receive touch input. Two-finger gestures always pan/zoom regardless.
   * When omitted or returns false, single-finger touch pans as before.
   */
  shouldDraw?: () => boolean
}

/**
 * Attach mouse/touch/wheel input handlers to a canvas that update the camera.
 *
 * Supports:
 * - Mouse wheel zoom (cursor-anchored)
 * - Mouse drag pan with inertia
 * - Touch pan (one finger) with inertia
 * - Pinch-to-zoom + two-finger pan
 *
 * Returns a dispose function that removes all event listeners and cancels
 * any in-flight animation frame.
 */
export function createInputHandler(
  canvas: HTMLCanvasElement,
  getCamera: () => Camera,
  setCamera: (camera: Camera) => void,
  options: InputHandlerOptions = {},
): () => void {
  const wheelZoomFactor = options.wheelZoomFactor ?? 1.15
  const inertiaFriction = options.inertiaFriction ?? 0.85
  const inertiaMinVelocity = options.inertiaMinVelocity ?? 0.5
  const shouldPan = options.shouldPan
  const shouldDraw = options.shouldDraw

  // ── Inertia state ──────────────────────────────────────────────────────────
  // Velocity is in pixels per frame (updated on each pointer move via EMA).
  let velX = 0
  let velY = 0
  let rafId: number | null = null

  function stopInertia() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function stepInertia() {
    velX *= inertiaFriction
    velY *= inertiaFriction
    if (Math.sqrt(velX * velX + velY * velY) < inertiaMinVelocity) {
      rafId = null
      return
    }
    setCamera(pan(getCamera(), velX, velY))
    rafId = requestAnimationFrame(stepInertia)
  }

  function startInertia() {
    if (Math.sqrt(velX * velX + velY * velY) >= inertiaMinVelocity) {
      rafId = requestAnimationFrame(stepInertia)
    }
  }

  // ── Mouse drag state ───────────────────────────────────────────────────────
  let isDragging = false
  let lastX = 0
  let lastY = 0

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const factor = Math.pow(wheelZoomFactor, -e.deltaY / 100)
    setCamera(zoomAt(getCamera(), screenX, screenY, factor))
  }

  // ── Mouse pan ──────────────────────────────────────────────────────────────
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    if (shouldPan && !shouldPan()) return
    // Suppress pan when a touch-draw is in progress (the event is synthetic)
    if (isTouchDrawing) return
    stopInertia()
    isDragging = true
    lastX = e.clientX
    lastY = e.clientY
    velX = 0
    velY = 0
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    setCamera(pan(getCamera(), dx, dy))
    // Exponential moving average for smooth inertia launch velocity
    const alpha = 0.6
    velX = alpha * dx + (1 - alpha) * velX
    velY = alpha * dy + (1 - alpha) * velY
    lastX = e.clientX
    lastY = e.clientY
  }

  function onMouseUp() {
    if (!isDragging) return
    isDragging = false
    startInertia()
  }

  function onMouseLeave() {
    onMouseUp()
  }

  // ── Touch state ────────────────────────────────────────────────────────────
  interface TouchPoint {
    /** Canvas-relative x */
    x: number
    /** Canvas-relative y */
    y: number
    /** Page-level clientX (for synthetic mouse events) */
    clientX: number
    /** Page-level clientY (for synthetic mouse events) */
    clientY: number
  }

  const activeTouches = new Map<number, TouchPoint>()
  let lastPinchDist = 0
  let lastPinchCx = 0
  let lastPinchCy = 0
  /** True while a single-finger draw gesture is in progress. */
  let isTouchDrawing = false

  function pinchState(): { dist: number; cx: number; cy: number } | null {
    const pts = Array.from(activeTouches.values())
    if (pts.length !== 2) return null
    const [a, b] = pts as [TouchPoint, TouchPoint]
    const dx = b.x - a.x
    const dy = b.y - a.y
    return {
      dist: Math.sqrt(dx * dx + dy * dy),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    }
  }

  function recordTouches(changedTouches: TouchList) {
    const rect = canvas.getBoundingClientRect()
    for (const t of Array.from(changedTouches)) {
      activeTouches.set(t.identifier, {
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
        clientX: t.clientX,
        clientY: t.clientY,
      })
    }
  }

  function cancelTouchDraw() {
    if (isTouchDrawing) {
      isTouchDrawing = false
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    }
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault()
    stopInertia()
    recordTouches(e.changedTouches)

    if (activeTouches.size === 1) {
      const [pt] = Array.from(activeTouches.values()) as [TouchPoint]
      lastX = pt.x
      lastY = pt.y
      velX = 0
      velY = 0

      if (shouldDraw?.()) {
        // Single-finger draw: dispatch synthetic mousedown so drawing tools activate
        isTouchDrawing = true
        canvas.dispatchEvent(
          new MouseEvent('mousedown', {
            clientX: pt.clientX,
            clientY: pt.clientY,
            button: 0,
            bubbles: true,
            cancelable: true,
          }),
        )
      }
    } else if (activeTouches.size === 2) {
      // If a draw was in progress, cancel it before switching to two-finger pan
      cancelTouchDraw()
      const s = pinchState()!
      lastPinchDist = s.dist
      lastPinchCx = s.cx
      lastPinchCy = s.cy
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault()
    recordTouches(e.changedTouches)

    if (activeTouches.size === 1) {
      const [pt] = Array.from(activeTouches.values()) as [TouchPoint]

      if (isTouchDrawing) {
        // Forward movement to drawing tools via synthetic mousemove
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: pt.clientX,
            clientY: pt.clientY,
            bubbles: true,
          }),
        )
      } else {
        // Pan the camera
        const dx = pt.x - lastX
        const dy = pt.y - lastY
        setCamera(pan(getCamera(), dx, dy))
        const alpha = 0.6
        velX = alpha * dx + (1 - alpha) * velX
        velY = alpha * dy + (1 - alpha) * velY
      }
      lastX = pt.x
      lastY = pt.y
    } else if (activeTouches.size === 2) {
      const s = pinchState()!
      // Pinch-to-zoom centered on the midpoint between fingers
      if (lastPinchDist > 0) {
        const factor = s.dist / lastPinchDist
        setCamera(zoomAt(getCamera(), s.cx, s.cy, factor))
      }
      // Two-finger pan by centroid delta
      const panDx = s.cx - lastPinchCx
      const panDy = s.cy - lastPinchCy
      if (panDx !== 0 || panDy !== 0) {
        setCamera(pan(getCamera(), panDx, panDy))
      }
      lastPinchDist = s.dist
      lastPinchCx = s.cx
      lastPinchCy = s.cy
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      activeTouches.delete(t.identifier)
    }

    if (activeTouches.size === 0) {
      if (isTouchDrawing) {
        // End the draw stroke
        isTouchDrawing = false
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      } else {
        startInertia()
      }
    } else if (activeTouches.size === 1) {
      // Transition from two-finger back to one-finger: reset single-touch pan baseline
      const [pt] = Array.from(activeTouches.values()) as [TouchPoint]
      lastX = pt.x
      lastY = pt.y
      velX = 0
      velY = 0
    }
  }

  // ── Register listeners ─────────────────────────────────────────────────────
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('mouseleave', onMouseLeave)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false })

  // ── Dispose ────────────────────────────────────────────────────────────────
  return function dispose() {
    stopInertia()
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('mouseleave', onMouseLeave)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    canvas.removeEventListener('touchcancel', onTouchEnd)
  }
}
