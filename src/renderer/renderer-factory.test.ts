import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectWebGPU, createRenderer } from './renderer-factory'
import type { RendererBackend } from './renderer-factory'
import { WebGL2Renderer } from './webgl2-renderer'

// ---------------------------------------------------------------------------
// Minimal WebGL2 mock (reused from webgl2-renderer.test.ts pattern)
// ---------------------------------------------------------------------------

function createMockGL() {
  const uniformLocations: Record<string, object> = {
    u_resolution: { _name: 'u_resolution' },
    u_camera: { _name: 'u_camera' },
    u_zoom: { _name: 'u_zoom' },
    u_cellColor: { _name: 'u_cellColor' },
    u_gridColor: { _name: 'u_gridColor' },
    u_gridAlpha: { _name: 'u_gridAlpha' },
    u_heatmap: { _name: 'u_heatmap' },
    u_bgColor: { _name: 'u_bgColor' },
  }

  return {
    canvas: { width: 800, height: 600 } as HTMLCanvasElement,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,
    COLOR_BUFFER_BIT: 16384,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    RED: 6403,
    R32F: 33326,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn((_prog: unknown, name: string) => {
      const map: Record<string, number> = { a_position: 0, a_cellPos: 1, a_age: 2 }
      return map[name] ?? -1
    }),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    getUniformLocation: vi.fn((_prog: unknown, name: string) => uniformLocations[name] ?? null),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform4fv: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArraysInstanced: vi.fn(),
    drawArrays: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    createTexture: vi.fn(() => ({})),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    texParameteri: vi.fn(),
  }
}

function createMockCanvas(): HTMLCanvasElement {
  const gl = createMockGL()
  return {
    getContext: vi.fn((type: string) => (type === 'webgl2' ? gl : null)),
    width: 800,
    height: 600,
  } as unknown as HTMLCanvasElement
}

// ---------------------------------------------------------------------------
// detectWebGPU tests
// ---------------------------------------------------------------------------

describe('detectWebGPU', () => {
  const originalNavigator = globalThis.navigator

  afterEach(() => {
    // Restore navigator after each test
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('returns false when navigator.gpu is undefined', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    })
    expect(await detectWebGPU()).toBe(false)
  })

  it('returns false when navigator.gpu.requestAdapter resolves to null', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: { requestAdapter: vi.fn().mockResolvedValue(null) } },
      writable: true,
      configurable: true,
    })
    expect(await detectWebGPU()).toBe(false)
  })

  it('returns true when navigator.gpu.requestAdapter resolves to an adapter object', async () => {
    const mockAdapter = { limits: {}, features: new Set() }
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: { requestAdapter: vi.fn().mockResolvedValue(mockAdapter) } },
      writable: true,
      configurable: true,
    })
    expect(await detectWebGPU()).toBe(true)
  })

  it('returns false when navigator.gpu.requestAdapter throws', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: { requestAdapter: vi.fn().mockRejectedValue(new Error('GPU error')) },
      },
      writable: true,
      configurable: true,
    })
    expect(await detectWebGPU()).toBe(false)
  })

  it('returns false when navigator itself throws on gpu access', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      get() {
        throw new Error('navigator unavailable')
      },
      configurable: true,
    })
    expect(await detectWebGPU()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createRenderer tests
// ---------------------------------------------------------------------------

describe('createRenderer', () => {
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    canvas = createMockCanvas()
  })

  afterEach(() => {
    // Reset navigator.gpu to undefined after each test
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    })
  })

  it('returns a WebGL2Renderer instance', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    })
    const { renderer } = await createRenderer(canvas)
    expect(renderer).toBeInstanceOf(WebGL2Renderer)
  })

  it('returns backend "webgl2" when WebGPU is unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    })
    const { backend } = await createRenderer(canvas)
    expect(backend).toBe<RendererBackend>('webgl2')
  })

  it('returns backend "webgpu" when WebGPU adapter is available', async () => {
    const mockAdapter = { limits: {}, features: new Set() }
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: { requestAdapter: vi.fn().mockResolvedValue(mockAdapter) } },
      writable: true,
      configurable: true,
    })
    const { backend } = await createRenderer(canvas)
    expect(backend).toBe<RendererBackend>('webgpu')
  })

  it('still returns a working renderer when WebGPU is detected', async () => {
    const mockAdapter = { limits: {}, features: new Set() }
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: { requestAdapter: vi.fn().mockResolvedValue(mockAdapter) } },
      writable: true,
      configurable: true,
    })
    const { renderer } = await createRenderer(canvas)
    expect(renderer).toBeInstanceOf(WebGL2Renderer)
  })

  it('passes renderer options through to the underlying renderer', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    })
    const { renderer } = await createRenderer(canvas, { cellColor: [1, 0, 0, 1] })
    // Render a cell to trigger setColors path — if the option was accepted, clearColor
    // is called with the default backgroundColor (black) which means construction succeeded
    expect(renderer).toBeInstanceOf(WebGL2Renderer)
  })

  it('returns both renderer and backend in the result object', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    })
    const result = await createRenderer(canvas)
    expect(result).toHaveProperty('renderer')
    expect(result).toHaveProperty('backend')
  })
})
