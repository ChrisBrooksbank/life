import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebGL2Renderer, GRID_FADE_START, GRID_FADE_END } from './webgl2-renderer'
import type { Camera, RendererOptions } from './webgl2-renderer'

// ---------------------------------------------------------------------------
// Minimal WebGL2 mock
// ---------------------------------------------------------------------------

function createMockGL(canvasWidth = 800, canvasHeight = 600) {
  const uniformLocations: Record<string, object> = {
    u_resolution: { _name: 'u_resolution' },
    u_camera: { _name: 'u_camera' },
    u_zoom: { _name: 'u_zoom' },
    u_cellColor: { _name: 'u_cellColor' },
    u_gridColor: { _name: 'u_gridColor' },
    u_gridAlpha: { _name: 'u_gridAlpha' },
  }

  return {
    // Linked canvas dimensions
    canvas: { width: canvasWidth, height: canvasHeight } as HTMLCanvasElement,

    // WebGL2 constants (real values)
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

    // Shader / program
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

    // VAO
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),

    // Buffers
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),

    // Attributes
    getAttribLocation: vi.fn((_prog: unknown, name: string) => {
      const map: Record<string, number> = { a_position: 0, a_cellPos: 1 }
      return map[name] ?? -1
    }),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),

    // Uniforms
    getUniformLocation: vi.fn((_prog: unknown, name: string) => uniformLocations[name] ?? null),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    uniform4fv: vi.fn(),

    // Draw
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArraysInstanced: vi.fn(),
    drawArrays: vi.fn(),

    // Blending
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
  }
}

type MockGL = ReturnType<typeof createMockGL>

function createMockCanvas(gl: MockGL): HTMLCanvasElement {
  return {
    getContext: vi.fn((type: string) => (type === 'webgl2' ? gl : null)),
    width: gl.canvas.width,
    height: gl.canvas.height,
  } as unknown as HTMLCanvasElement
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebGL2Renderer', () => {
  let gl: MockGL
  let canvas: HTMLCanvasElement
  let renderer: WebGL2Renderer

  beforeEach(() => {
    gl = createMockGL()
    canvas = createMockCanvas(gl)
    renderer = new WebGL2Renderer(canvas)
  })

  // --- Construction ---

  it('constructs without throwing', () => {
    expect(renderer).toBeInstanceOf(WebGL2Renderer)
  })

  it('throws when WebGL2 is not available', () => {
    const badCanvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement
    expect(() => new WebGL2Renderer(badCanvas)).toThrow('WebGL2 is not supported')
  })

  it('creates two VAOs during construction (cell + grid)', () => {
    expect(gl.createVertexArray).toHaveBeenCalledTimes(2)
  })

  it('creates three buffers during construction (quad + instance + grid quad)', () => {
    expect(gl.createBuffer).toHaveBeenCalledTimes(3)
  })

  it('marks a_cellPos as instanced (divisor 1)', () => {
    expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(1, 1)
  })

  it('accepts custom colors via options', () => {
    const options: RendererOptions = {
      cellColor: [1, 0, 0, 1],
      backgroundColor: [0, 0, 1, 1],
    }
    const r = new WebGL2Renderer(canvas, options)
    r.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: 10 })
    expect(gl.clearColor).toHaveBeenCalledWith(0, 0, 1, 1)
  })

  // --- render() with no cells ---

  it('clears the canvas even with no cells', () => {
    renderer.render([], { x: 0, y: 0, zoom: 10 })
    expect(gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 1)
    expect(gl.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT)
  })

  it('skips drawArraysInstanced when cell list is empty', () => {
    renderer.render([], { x: 0, y: 0, zoom: 10 })
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled()
  })

  // --- render() with cells ---

  it('calls drawArraysInstanced with correct instance count', () => {
    const cells = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]
    renderer.render(cells, { x: 0, y: 0, zoom: 16 })
    expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, 3)
  })

  it('uploads cell positions via bufferSubData', () => {
    renderer.render([{ x: 3, y: 7 }], { x: 0, y: 0, zoom: 10 })
    expect(gl.bufferSubData).toHaveBeenCalled()
    const [, , data] = gl.bufferSubData.mock.calls[0] as [unknown, unknown, Float32Array]
    expect(data[0]).toBe(3)
    expect(data[1]).toBe(7)
  })

  it('uploads multiple cell positions in order', () => {
    renderer.render(
      [
        { x: 1, y: 2 },
        { x: 10, y: 20 },
      ],
      { x: 0, y: 0, zoom: 8 },
    )
    const [, , data] = gl.bufferSubData.mock.calls[0] as [unknown, unknown, Float32Array]
    expect(Array.from(data)).toEqual([1, 2, 10, 20])
  })

  it('sets u_camera uniform correctly', () => {
    const camera: Camera = { x: 10, y: 20, zoom: 8 }
    renderer.render([{ x: 0, y: 0 }], camera)
    // Find the call that set u_camera (location object has _name)
    const calls = gl.uniform2f.mock.calls
    const cameraCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_camera')
    expect(cameraCall).toBeDefined()
    expect(cameraCall![1]).toBe(10)
    expect(cameraCall![2]).toBe(20)
  })

  it('sets u_zoom uniform correctly', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 24 }
    renderer.render([{ x: 0, y: 0 }], camera)
    const calls = gl.uniform1f.mock.calls
    const zoomCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_zoom')
    expect(zoomCall).toBeDefined()
    expect(zoomCall![1]).toBe(24)
  })

  it('sets u_resolution uniform with canvas dimensions', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: 10 })
    const calls = gl.uniform2f.mock.calls
    const resCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_resolution')
    expect(resCall).toBeDefined()
    expect(resCall![1]).toBe(800)
    expect(resCall![2]).toBe(600)
  })

  it('sets u_cellColor uniform', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: 10 })
    expect(gl.uniform4fv).toHaveBeenCalledWith(expect.anything(), [1, 1, 1, 1])
  })

  // --- setColors() ---

  it('setColors() updates background color on next render', () => {
    renderer.setColors({ backgroundColor: [0.1, 0.2, 0.3, 1] })
    renderer.render([], { x: 0, y: 0, zoom: 10 })
    expect(gl.clearColor).toHaveBeenCalledWith(0.1, 0.2, 0.3, 1)
  })

  it('setColors() updates cell color on next render', () => {
    renderer.setColors({ cellColor: [1, 0.5, 0, 1] })
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: 10 })
    expect(gl.uniform4fv).toHaveBeenCalledWith(expect.anything(), [1, 0.5, 0, 1])
  })

  // --- dispose() ---

  it('dispose() deletes both programs', () => {
    renderer.dispose()
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2)
  })

  it('dispose() deletes all three buffers', () => {
    renderer.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(3)
  })

  it('dispose() deletes both VAOs', () => {
    renderer.dispose()
    expect(gl.deleteVertexArray).toHaveBeenCalledTimes(2)
  })

  // --- Grid overlay ---

  it('does not call drawArrays when grid is off (default)', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: 16 })
    expect(gl.drawArrays).not.toHaveBeenCalled()
  })

  it('does not draw grid when zoom is below GRID_FADE_START', () => {
    renderer.setGrid(true)
    renderer.render([], { x: 0, y: 0, zoom: GRID_FADE_START - 1 })
    expect(gl.drawArrays).not.toHaveBeenCalled()
  })

  it('draws grid overlay when showGrid=true and zoom >= GRID_FADE_END', () => {
    renderer.setGrid(true)
    renderer.render([], { x: 0, y: 0, zoom: GRID_FADE_END })
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4)
  })

  it('draws grid overlay when showGrid=true and zoom is in fade range', () => {
    renderer.setGrid(true)
    renderer.render([], { x: 0, y: 0, zoom: (GRID_FADE_START + GRID_FADE_END) / 2 })
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4)
  })

  it('enables blending before grid draw and disables after', () => {
    renderer.setGrid(true)
    renderer.render([], { x: 0, y: 0, zoom: GRID_FADE_END })
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND)
    expect(gl.disable).toHaveBeenCalledWith(gl.BLEND)
  })

  it('sets u_gridAlpha=1 when zoom >= GRID_FADE_END', () => {
    renderer.setGrid(true)
    renderer.render([], { x: 0, y: 0, zoom: GRID_FADE_END })
    const calls = gl.uniform1f.mock.calls
    const alphaCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_gridAlpha')
    expect(alphaCall).toBeDefined()
    expect(alphaCall![1]).toBe(1)
  })

  it('sets u_gridAlpha=0.5 at midpoint of fade range', () => {
    renderer.setGrid(true)
    const midZoom = (GRID_FADE_START + GRID_FADE_END) / 2
    renderer.render([], { x: 0, y: 0, zoom: midZoom })
    const calls = gl.uniform1f.mock.calls
    const alphaCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_gridAlpha')
    expect(alphaCall).toBeDefined()
    expect(alphaCall![1]).toBeCloseTo(0.5)
  })

  it('setGrid(false) stops grid rendering', () => {
    renderer.setGrid(true)
    renderer.setGrid(false)
    renderer.render([], { x: 0, y: 0, zoom: GRID_FADE_END })
    expect(gl.drawArrays).not.toHaveBeenCalled()
  })

  it('setColors() updates grid color', () => {
    renderer.setGrid(true)
    renderer.setColors({ gridColor: [1, 0, 0, 1] })
    renderer.render([], { x: 0, y: 0, zoom: GRID_FADE_END })
    const calls = gl.uniform4fv.mock.calls
    const gridColorCall = calls.find(
      ([loc]) => (loc as Record<string, string>)._name === 'u_gridColor',
    )
    expect(gridColorCall).toBeDefined()
    expect(gridColorCall![1]).toEqual([1, 0, 0, 1])
  })

  it('accepts showGrid=true via constructor options', () => {
    const options: RendererOptions = { showGrid: true }
    const r = new WebGL2Renderer(canvas, options)
    r.render([], { x: 0, y: 0, zoom: GRID_FADE_END })
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4)
  })

  // --- gridAlpha() static helper ---

  it('gridAlpha returns 0 at or below GRID_FADE_START', () => {
    expect(WebGL2Renderer.gridAlpha(GRID_FADE_START)).toBe(0)
    expect(WebGL2Renderer.gridAlpha(0)).toBe(0)
    expect(WebGL2Renderer.gridAlpha(1)).toBe(0)
  })

  it('gridAlpha returns 1 at or above GRID_FADE_END', () => {
    expect(WebGL2Renderer.gridAlpha(GRID_FADE_END)).toBe(1)
    expect(WebGL2Renderer.gridAlpha(GRID_FADE_END + 10)).toBe(1)
  })

  it('gridAlpha returns 0.5 at midpoint', () => {
    const mid = (GRID_FADE_START + GRID_FADE_END) / 2
    expect(WebGL2Renderer.gridAlpha(mid)).toBeCloseTo(0.5)
  })

  it('gridAlpha is linear between fade bounds', () => {
    const quarter = GRID_FADE_START + (GRID_FADE_END - GRID_FADE_START) * 0.25
    expect(WebGL2Renderer.gridAlpha(quarter)).toBeCloseTo(0.25)
  })
})
