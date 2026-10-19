import type { Camera } from './webgl2-renderer'

/** Minimum and maximum zoom levels (pixels per cell). */
export const MIN_ZOOM = 1
export const MAX_ZOOM = 128

/**
 * Convert a screen-space pixel coordinate to a world-space cell coordinate.
 * Screen origin (0, 0) is the top-left corner of the canvas.
 */
export function screenToWorld(
  camera: Camera,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: screenX / camera.zoom + camera.x,
    y: screenY / camera.zoom + camera.y,
  }
}

/**
 * Convert a world-space cell coordinate to a screen-space pixel coordinate.
 */
export function worldToScreen(
  camera: Camera,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * camera.zoom,
    y: (worldY - camera.y) * camera.zoom,
  }
}

/**
 * Return a new camera zoomed by `factor` around the given screen point.
 * The world coordinate under (screenX, screenY) remains fixed after zoom.
 * Zoom is clamped to [MIN_ZOOM, MAX_ZOOM].
 */
export function zoomAt(camera: Camera, screenX: number, screenY: number, factor: number): Camera {
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor))
  // World point that must stay fixed under the screen anchor
  const worldX = screenX / camera.zoom + camera.x
  const worldY = screenY / camera.zoom + camera.y
  return {
    x: worldX - screenX / newZoom,
    y: worldY - screenY / newZoom,
    zoom: newZoom,
  }
}

/**
 * Return a new camera panned by (dx, dy) screen pixels.
 * Positive dx moves the viewport right (world scrolls left).
 */
export function pan(camera: Camera, dx: number, dy: number): Camera {
  return {
    x: camera.x - dx / camera.zoom,
    y: camera.y - dy / camera.zoom,
    zoom: camera.zoom,
  }
}

/**
 * Return a new camera centered on the given world coordinate.
 */
export function centerOn(
  camera: Camera,
  worldX: number,
  worldY: number,
  canvasWidth: number,
  canvasHeight: number,
): Camera {
  return {
    x: worldX - canvasWidth / (2 * camera.zoom),
    y: worldY - canvasHeight / (2 * camera.zoom),
    zoom: camera.zoom,
  }
}
