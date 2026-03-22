import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  WebGL2Renderer,
  GRID_FADE_START,
  GRID_FADE_END,
  HEATMAP_ZOOM_THRESHOLD,
  HEATMAP_MAX_TEXTURE_SIZE,
} from './webgl2-renderer'
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
    u_heatmap: { _name: 'u_heatmap' },
    u_bgColor: { _name: 'u_bgColor' },
    u_maxAge: { _name: 'u_maxAge' },
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
      const map: Record<string, number> = { a_position: 0, a_cellPos: 1, a_age: 2 }
      return map[name] ?? -1
    }),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),

    // Uniforms
    getUniformLocation: vi.fn((_prog: unknown, name: string) => uniformLocations[name] ?? null),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
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

    // Textures
    createTexture: vi.fn(() => ({})),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texImage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    texParameteri: vi.fn(),
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

  it('creates four VAOs during construction (cell + age + grid + heatmap)', () => {
    expect(gl.createVertexArray).toHaveBeenCalledTimes(4)
  })

  it('creates five buffers during construction (quad + instance + age-instance + grid quad + heatmap quad)', () => {
    expect(gl.createBuffer).toHaveBeenCalledTimes(5)
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

  it('dispose() deletes all four programs', () => {
    renderer.dispose()
    expect(gl.deleteProgram).toHaveBeenCalledTimes(4)
  })

  it('dispose() deletes all five buffers', () => {
    renderer.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(5)
  })

  it('dispose() deletes all four VAOs', () => {
    renderer.dispose()
    expect(gl.deleteVertexArray).toHaveBeenCalledTimes(4)
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

  // --- Multi-scale rendering: heatmap mode ---

  it('HEATMAP_ZOOM_THRESHOLD is a positive number less than GRID_FADE_START', () => {
    expect(HEATMAP_ZOOM_THRESHOLD).toBeGreaterThan(0)
    expect(HEATMAP_ZOOM_THRESHOLD).toBeLessThan(GRID_FADE_START)
  })

  it('HEATMAP_MAX_TEXTURE_SIZE is a positive integer', () => {
    expect(HEATMAP_MAX_TEXTURE_SIZE).toBeGreaterThan(0)
    expect(Number.isInteger(HEATMAP_MAX_TEXTURE_SIZE)).toBe(true)
  })

  it('does NOT call drawArraysInstanced when zoom < HEATMAP_ZOOM_THRESHOLD', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled()
  })

  it('calls drawArraysInstanced when zoom >= HEATMAP_ZOOM_THRESHOLD', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD })
    expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, 1)
  })

  it('calls drawArrays (heatmap fullscreen quad) when zoom < HEATMAP_ZOOM_THRESHOLD and cells exist', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4)
  })

  it('skips heatmap draw when zoom < HEATMAP_ZOOM_THRESHOLD but no cells', () => {
    renderer.render([], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    expect(gl.drawArrays).not.toHaveBeenCalled()
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled()
  })

  it('creates a texture on first heatmap render', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    expect(gl.createTexture).toHaveBeenCalledTimes(1)
    expect(gl.texImage2D).toHaveBeenCalledTimes(1)
  })

  it('reuses existing texture on subsequent heatmap renders with same canvas size', () => {
    const cam: Camera = { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 }
    renderer.render([{ x: 0, y: 0 }], cam)
    renderer.render([{ x: 0, y: 0 }], cam)
    // texImage2D allocates; texSubImage2D updates — second call should use texSubImage2D
    expect(gl.createTexture).toHaveBeenCalledTimes(1)
    expect(gl.texImage2D).toHaveBeenCalledTimes(1)
    expect(gl.texSubImage2D).toHaveBeenCalledTimes(1)
  })

  it('sets u_bgColor uniform during heatmap render', () => {
    renderer.setColors({ backgroundColor: [0.1, 0.2, 0.3, 1] })
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    const calls = gl.uniform4fv.mock.calls
    const bgCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_bgColor')
    expect(bgCall).toBeDefined()
    expect(bgCall![1]).toEqual([0.1, 0.2, 0.3, 1])
  })

  it('sets u_cellColor uniform during heatmap render', () => {
    renderer.setColors({ cellColor: [1, 0, 0, 1] })
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    const calls = gl.uniform4fv.mock.calls
    const colorCall = calls.find(([loc]) => (loc as Record<string, string>)._name === 'u_cellColor')
    expect(colorCall).toBeDefined()
    expect(colorCall![1]).toEqual([1, 0, 0, 1])
  })

  it('disposes heatmap texture when created', () => {
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    renderer.dispose()
    expect(gl.deleteTexture).toHaveBeenCalledTimes(1)
  })

  it('does not draw grid overlay in heatmap mode', () => {
    renderer.setGrid(true)
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: HEATMAP_ZOOM_THRESHOLD - 0.5 })
    // drawArrays is called once for heatmap, not for the grid
    // verify grid-specific uniform (u_gridAlpha) was never set
    const calls = gl.uniform1f.mock.calls
    const gridAlphaCall = calls.find(
      ([loc]) => (loc as Record<string, string>)._name === 'u_gridAlpha',
    )
    expect(gridAlphaCall).toBeUndefined()
  })

  // --- Age color mode ---

  it('setAgeColorMode(true) switches to age-heat-map rendering', () => {
    renderer.setAgeColorMode(true)
    renderer.render([{ x: 0, y: 0, age: 0 }], { x: 0, y: 0, zoom: 16 })
    // Should still call drawArraysInstanced for one cell
    expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, 1)
  })

  it('age color mode uploads age buffer data', () => {
    renderer.setAgeColorMode(true)
    renderer.render(
      [
        { x: 0, y: 0, age: 0 },
        { x: 1, y: 0, age: 10 },
      ],
      { x: 0, y: 0, zoom: 16 },
    )
    // bufferSubData should be called twice: once for positions, once for ages
    expect(gl.bufferSubData).toHaveBeenCalledTimes(2)
  })

  it('age color mode accepted via constructor options', () => {
    const r = new WebGL2Renderer(canvas, { ageColorMode: true })
    r.render([{ x: 0, y: 0, age: 5 }], { x: 0, y: 0, zoom: 16 })
    expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, 1)
  })

  it('setAgeColorMode(false) reverts to uniform-color rendering', () => {
    renderer.setAgeColorMode(true)
    renderer.setAgeColorMode(false)
    renderer.render([{ x: 0, y: 0, age: 5 }], { x: 0, y: 0, zoom: 16 })
    // In normal mode, only one bufferSubData call (positions only)
    expect(gl.bufferSubData).toHaveBeenCalledTimes(1)
    // And u_cellColor should be set
    expect(gl.uniform4fv).toHaveBeenCalledWith(expect.anything(), [1, 1, 1, 1])
  })

  it('age color mode: cells without age field default to age 0', () => {
    renderer.setAgeColorMode(true)
    // Cell has no age property
    renderer.render([{ x: 0, y: 0 }], { x: 0, y: 0, zoom: 16 })
    expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, 1)
  })

  it('age color mode: normalises ages so max age maps to 1.0', () => {
    renderer.setAgeColorMode(true)
    renderer.render(
      [
        { x: 0, y: 0, age: 0 },
        { x: 1, y: 0, age: 50 },
        { x: 2, y: 0, age: 100 },
      ],
      { x: 0, y: 0, zoom: 16 },
    )
    // Second bufferSubData call carries the normalised age floats
    const ageCalls = gl.bufferSubData.mock.calls
    const ageCall = ageCalls[1] as [unknown, unknown, Float32Array]
    expect(ageCall).toBeDefined()
    const ageData = ageCall[2]
    expect(ageData[0]).toBeCloseTo(0)
    expect(ageData[1]).toBeCloseTo(0.5)
    expect(ageData[2]).toBeCloseTo(1.0)
  })

  it('age color mode: all-zero ages results in all-zero normalised values', () => {
    renderer.setAgeColorMode(true)
    renderer.render(
      [
        { x: 0, y: 0, age: 0 },
        { x: 1, y: 0, age: 0 },
      ],
      { x: 0, y: 0, zoom: 16 },
    )
    const ageCalls = gl.bufferSubData.mock.calls
    const ageCall = ageCalls[1] as [unknown, unknown, Float32Array]
    const ageData = ageCall[2]
    expect(ageData[0]).toBe(0)
    expect(ageData[1]).toBe(0)
  })
})
