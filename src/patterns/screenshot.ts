/**
 * PNG screenshot export of the current canvas view.
 *
 * WebGL2 canvases created without `preserveDrawingBuffer: true` cannot be
 * captured via `canvas.toDataURL()` after compositing.  This module reads
 * pixel data directly from the framebuffer with `gl.readPixels()` and
 * redraws it onto a temporary 2D canvas (flipping the Y axis, since WebGL
 * uses a bottom-left origin) before exporting as PNG.
 */

/**
 * Read the current WebGL2 framebuffer into a PNG data URL.
 * The Y axis is flipped to convert from WebGL (bottom-left) to the standard
 * top-left origin used by the PNG format.
 *
 * @internal exposed for testing
 */
export function readWebGL2Pixels(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): string {
  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const ctx = offscreen.getContext('2d')
  if (!ctx) return ''

  const imageData = ctx.createImageData(width, height)

  // Flip Y axis: WebGL row 0 is bottom, canvas 2D row 0 is top
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 4
    const dstRow = y * width * 4
    for (let x = 0; x < width * 4; x++) {
      imageData.data[dstRow + x] = pixels[srcRow + x]!
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return offscreen.toDataURL('image/png')
}

/**
 * Convert a canvas to a PNG data URL.
 *
 * Automatically handles WebGL2 canvases by reading pixels from the
 * framebuffer.  Falls back to the standard `toDataURL` for 2D canvases.
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  const gl = canvas.getContext('webgl2')
  if (gl) {
    return readWebGL2Pixels(gl, canvas.width, canvas.height)
  }
  return canvas.toDataURL('image/png')
}

/**
 * Trigger a browser file-download of `dataUrl` with the given `filename`.
 *
 * @internal exposed for testing
 */
export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

/**
 * Export the current view of `canvas` as a PNG and trigger a file download.
 *
 * @param canvas    The canvas element to capture (typically `#life-canvas`).
 * @param filename  Suggested download filename (default: `'life.png'`).
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename = 'life.png'): void {
  const dataUrl = canvasToDataUrl(canvas)
  triggerDownload(dataUrl, filename)
}
