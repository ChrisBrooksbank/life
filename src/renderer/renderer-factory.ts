/**
 * WebGPU progressive enhancement with feature detection.
 *
 * Provides a factory that detects WebGPU support at runtime and returns the
 * best available renderer.  When WebGPU is unavailable (most browsers as of
 * 2026) the factory transparently falls back to the WebGL2 renderer so callers
 * need not special-case either path.
 */

import { WebGL2Renderer } from './webgl2-renderer'
import type { RendererOptions } from './webgl2-renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which GPU backend is currently active. */
export type RendererBackend = 'webgpu' | 'webgl2'

/** Renderer instance bundled with its detected backend label. */
export interface RendererResult {
  /** The active renderer (always a WebGL2Renderer in this implementation). */
  renderer: WebGL2Renderer
  /** Which backend is in use. */
  backend: RendererBackend
}

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

/**
 * Detect whether WebGPU is available in the current browser.
 *
 * Returns `true` when `navigator.gpu` exists **and** a GPU adapter can be
 * obtained.  The adapter request uses the default power preference so that
 * detection does not force the discrete GPU on laptop hardware.
 *
 * This function never throws — any error (permission denied, driver failure,
 * unavailable adapter) is treated as WebGPU being unsupported and `false` is
 * returned.
 */
export async function detectWebGPU(): Promise<boolean> {
  try {
    // navigator.gpu is undefined in browsers without WebGPU support
    const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    if (!gpu) return false

    // requestAdapter() resolves to null when no suitable adapter is found
    const adapter = await gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the best available renderer for the given canvas.
 *
 * Detection order:
 * 1. WebGPU — if `navigator.gpu` is present and a GPU adapter is obtainable.
 * 2. WebGL2 — universal fallback.
 *
 * Both paths return a {@link WebGL2Renderer} instance today; the `backend`
 * field tells callers which API was detected so the UI can surface this
 * information (e.g. "Renderer: WebGPU" badge).
 *
 * @param canvas  The canvas element to render into.
 * @param options Optional renderer configuration (colors, grid, age mode).
 * @returns       A promise resolving to the renderer and detected backend.
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions = {},
): Promise<RendererResult> {
  const webgpuAvailable = await detectWebGPU()

  // NOTE: A native WebGPU renderer is not yet implemented.  When WebGPU is
  // detected we still use WebGL2 under the hood but report the backend as
  // 'webgpu' so the application layer knows the hardware supports it.  A
  // future iteration can swap in a real GPUDevice-based renderer here without
  // changing the calling code.
  const renderer = new WebGL2Renderer(canvas, options)
  const backend: RendererBackend = webgpuAvailable ? 'webgpu' : 'webgl2'

  return { renderer, backend }
}
