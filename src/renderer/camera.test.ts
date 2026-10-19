import { describe, it, expect } from 'vitest'
import { screenToWorld, worldToScreen, zoomAt, pan, centerOn, MIN_ZOOM, MAX_ZOOM } from './camera'
import type { Camera } from './webgl2-renderer'

describe('screenToWorld', () => {
  const cam: Camera = { x: 10, y: 20, zoom: 16 }

  it('converts screen origin to camera position', () => {
    const result = screenToWorld(cam, 0, 0)
    expect(result.x).toBe(10)
    expect(result.y).toBe(20)
  })

  it('converts a screen pixel offset to world coords', () => {
    // 32px at zoom 16 = 2 cells, 48px = 3 cells
    const result = screenToWorld(cam, 32, 48)
    expect(result.x).toBe(12) // 32/16 + 10
    expect(result.y).toBe(23) // 48/16 + 20
  })

  it('handles fractional screen coordinates', () => {
    const result = screenToWorld({ x: 0, y: 0, zoom: 10 }, 5, 5)
    expect(result.x).toBeCloseTo(0.5)
    expect(result.y).toBeCloseTo(0.5)
  })
})

describe('worldToScreen', () => {
  const cam: Camera = { x: 10, y: 20, zoom: 16 }

  it('converts camera origin to screen origin', () => {
    const result = worldToScreen(cam, 10, 20)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('converts a world cell to screen pixels', () => {
    const result = worldToScreen(cam, 12, 23)
    expect(result.x).toBe(32) // (12 - 10) * 16
    expect(result.y).toBe(48) // (23 - 20) * 16
  })

  it('is the inverse of screenToWorld', () => {
    const world = screenToWorld(cam, 100, 200)
    const screen = worldToScreen(cam, world.x, world.y)
    expect(screen.x).toBeCloseTo(100)
    expect(screen.y).toBeCloseTo(200)
  })

  it('screenToWorld is the inverse of worldToScreen', () => {
    const screen = worldToScreen(cam, 15, 25)
    const world = screenToWorld(cam, screen.x, screen.y)
    expect(world.x).toBeCloseTo(15)
    expect(world.y).toBeCloseTo(25)
  })
})

describe('zoomAt', () => {
  const cam: Camera = { x: 10, y: 20, zoom: 16 }

  it('doubles the zoom level', () => {
    const result = zoomAt(cam, 0, 0, 2)
    expect(result.zoom).toBe(32)
  })

  it('halves the zoom level', () => {
    const result = zoomAt(cam, 0, 0, 0.5)
    expect(result.zoom).toBe(8)
  })

  it('keeps the anchor world point fixed under screen point', () => {
    const screenX = 64
    const screenY = 96
    const worldBefore = screenToWorld(cam, screenX, screenY)
    const newCam = zoomAt(cam, screenX, screenY, 2)
    const worldAfter = screenToWorld(newCam, screenX, screenY)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y)
  })

  it('keeps anchor fixed when zooming out', () => {
    const screenX = 50
    const screenY = 50
    const worldBefore = screenToWorld(cam, screenX, screenY)
    const newCam = zoomAt(cam, screenX, screenY, 0.5)
    const worldAfter = screenToWorld(newCam, screenX, screenY)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y)
  })

  it('clamps zoom to MIN_ZOOM', () => {
    const tiny: Camera = { x: 0, y: 0, zoom: MIN_ZOOM }
    const result = zoomAt(tiny, 0, 0, 0.01)
    expect(result.zoom).toBe(MIN_ZOOM)
  })

  it('clamps zoom to MAX_ZOOM', () => {
    const big: Camera = { x: 0, y: 0, zoom: MAX_ZOOM }
    const result = zoomAt(big, 0, 0, 100)
    expect(result.zoom).toBe(MAX_ZOOM)
  })

  it('does not mutate the original camera', () => {
    const original = { x: 5, y: 5, zoom: 16 }
    zoomAt(original, 10, 10, 2)
    expect(original.zoom).toBe(16)
  })
})

describe('pan', () => {
  const cam: Camera = { x: 10, y: 20, zoom: 16 }

  it('pans right and down (positive delta)', () => {
    // 32px right at zoom 16 = 2 cells; 48px down = 3 cells
    const result = pan(cam, 32, 48)
    expect(result.x).toBe(8) // 10 - 32/16
    expect(result.y).toBe(17) // 20 - 48/16
  })

  it('pans left and up (negative delta)', () => {
    const result = pan(cam, -16, -32)
    expect(result.x).toBe(11) // 10 - (-16)/16
    expect(result.y).toBe(22) // 20 - (-32)/16
  })

  it('preserves zoom', () => {
    const result = pan(cam, 100, 200)
    expect(result.zoom).toBe(cam.zoom)
  })

  it('does not mutate the original camera', () => {
    const original = { x: 10, y: 20, zoom: 16 }
    pan(original, 50, 50)
    expect(original.x).toBe(10)
    expect(original.y).toBe(20)
  })

  it('zero delta returns same position', () => {
    const result = pan(cam, 0, 0)
    expect(result.x).toBe(cam.x)
    expect(result.y).toBe(cam.y)
  })
})

describe('centerOn', () => {
  it('centers camera on a world point', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 10 }
    const result = centerOn(cam, 50, 50, 200, 100)
    // x = 50 - 200 / (2 * 10) = 50 - 10 = 40
    // y = 50 - 100 / (2 * 10) = 50 - 5  = 45
    expect(result.x).toBe(40)
    expect(result.y).toBe(45)
  })

  it('places the world point at the screen center', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 16 }
    const canvasW = 800
    const canvasH = 600
    const wx = 100
    const wy = 200
    const newCam = centerOn(cam, wx, wy, canvasW, canvasH)
    const screen = worldToScreen(newCam, wx, wy)
    expect(screen.x).toBeCloseTo(canvasW / 2)
    expect(screen.y).toBeCloseTo(canvasH / 2)
  })

  it('preserves zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 32 }
    const result = centerOn(cam, 0, 0, 800, 600)
    expect(result.zoom).toBe(32)
  })
})
