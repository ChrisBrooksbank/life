import type { Cell } from '../engine/types'

export interface Camera {
  /** World x of the top-left viewport corner */
  x: number
  /** World y of the top-left viewport corner */
  y: number
  /** Pixels per cell */
  zoom: number
}

export interface RendererOptions {
  /** RGBA cell color, default [1, 1, 1, 1] (white) */
  cellColor?: [number, number, number, number]
  /** RGBA background color, default [0, 0, 0, 1] (black) */
  backgroundColor?: [number, number, number, number]
  /** RGBA grid line color, default [0.3, 0.3, 0.3, 1] */
  gridColor?: [number, number, number, number]
  /** Whether to show the grid overlay, default false */
  showGrid?: boolean
}

// ---------------------------------------------------------------------------
// Grid fade thresholds (pixels per cell)
// ---------------------------------------------------------------------------

/** Grid starts appearing at this zoom level */
export const GRID_FADE_START = 4
/** Grid is fully visible at this zoom level */
export const GRID_FADE_END = 8

// ---------------------------------------------------------------------------
// Multi-scale rendering thresholds (pixels per cell)
// ---------------------------------------------------------------------------

/**
 * Below this zoom level, render a density heatmap instead of individual cells.
 * At 2 px/cell cells are sub-pixel on many displays, so heatmap gives more
 * visual information about population density.
 */
export const HEATMAP_ZOOM_THRESHOLD = 2

/** Maximum heatmap texture dimension in either axis */
export const HEATMAP_MAX_TEXTURE_SIZE = 256

// ---------------------------------------------------------------------------
// GLSL sources — cell rendering
// ---------------------------------------------------------------------------

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_cellPos;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;

void main() {
  vec2 worldPos = a_cellPos + a_position;
  vec2 screenPos = (worldPos - u_camera) * u_zoom;
  vec2 ndcPos = screenPos / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(ndcPos.x, -ndcPos.y, 0.0, 1.0);
}
`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform vec4 u_cellColor;
out vec4 outColor;

void main() {
  outColor = u_cellColor;
}
`

// ---------------------------------------------------------------------------
// GLSL sources — grid overlay
// ---------------------------------------------------------------------------

const GRID_VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const GRID_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;
uniform vec4 u_gridColor;
uniform float u_gridAlpha;

out vec4 outColor;

void main() {
  // Convert fragment screen coords (origin bottom-left) to world coords.
  // gl_FragCoord.y is bottom-up; we flip to match top-left camera convention.
  vec2 screenPos = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 worldPos = screenPos / u_zoom + u_camera;

  // Grid line width: 1 screen pixel expressed in world units
  float lineWorldWidth = 1.0 / u_zoom;

  vec2 f = fract(worldPos);
  float dx = min(f.x, 1.0 - f.x);
  float dy = min(f.y, 1.0 - f.y);

  if (dx < lineWorldWidth || dy < lineWorldWidth) {
    outColor = vec4(u_gridColor.rgb, u_gridColor.a * u_gridAlpha);
  } else {
    discard;
  }
}
`

// ---------------------------------------------------------------------------
// GLSL sources — heatmap overlay
// ---------------------------------------------------------------------------

const HEATMAP_VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const HEATMAP_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_heatmap;
uniform vec4 u_cellColor;
uniform vec4 u_bgColor;

out vec4 outColor;

void main() {
  // Convert fragment coords (bottom-left origin) to UV with top-left origin
  vec2 uv = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
  float density = texture(u_heatmap, uv).r;
  outColor = mix(u_bgColor, u_cellColor, density);
}
`

// Full-screen NDC quad
const GRID_QUAD_VERTICES = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${log}`)
  }
  return shader
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource)
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create program')
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link error: ${log}`)
  }
  return program
}

// Unit quad [0,1]×[0,1] as TRIANGLE_STRIP — 4 vertices, 2 triangles
const QUAD_VERTICES = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1])

const INITIAL_CAPACITY = 65536 // cells

// ---------------------------------------------------------------------------
// WebGL2Renderer
// ---------------------------------------------------------------------------

/**
 * GPU-accelerated cell renderer using WebGL2 instanced quads.
 *
 * Each live cell is drawn as a 1×1 world-unit quad via `drawArraysInstanced`.
 * One Float32Array instance buffer stores cell (x, y) positions; this buffer
 * is grown automatically as needed.
 *
 * An optional grid overlay is rendered as a full-screen procedural pass that
 * fades in between GRID_FADE_START and GRID_FADE_END pixels-per-cell.
 */
export class WebGL2Renderer {
  private readonly gl: WebGL2RenderingContext

  // Cell rendering
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly quadBuffer: WebGLBuffer
  private instanceBuffer: WebGLBuffer
  private instanceCapacity = INITIAL_CAPACITY

  private readonly uResolution: WebGLUniformLocation
  private readonly uCamera: WebGLUniformLocation
  private readonly uZoom: WebGLUniformLocation
  private readonly uCellColor: WebGLUniformLocation

  private cellColor: [number, number, number, number]
  private backgroundColor: [number, number, number, number]

  // Grid overlay
  private readonly gridProgram: WebGLProgram
  private readonly gridVao: WebGLVertexArrayObject
  private readonly gridQuadBuffer: WebGLBuffer

  private readonly uGridResolution: WebGLUniformLocation
  private readonly uGridCamera: WebGLUniformLocation
  private readonly uGridZoom: WebGLUniformLocation
  private readonly uGridColor: WebGLUniformLocation
  private readonly uGridAlpha: WebGLUniformLocation

  private gridColor: [number, number, number, number]
  private showGrid: boolean

  // Heatmap rendering
  private readonly heatmapProgram: WebGLProgram
  private readonly heatmapVao: WebGLVertexArrayObject
  private readonly heatmapQuadBuffer: WebGLBuffer
  private heatmapTexture: WebGLTexture | null = null
  private heatmapTexWidth = 0
  private heatmapTexHeight = 0

  private readonly uHeatmapResolution: WebGLUniformLocation
  private readonly uHeatmapTex: WebGLUniformLocation
  private readonly uHeatmapCellColor: WebGLUniformLocation
  private readonly uHeatmapBgColor: WebGLUniformLocation

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.cellColor = options.cellColor ?? [1, 1, 1, 1]
    this.backgroundColor = options.backgroundColor ?? [0, 0, 0, 1]
    this.gridColor = options.gridColor ?? [0.3, 0.3, 0.3, 1]
    this.showGrid = options.showGrid ?? false

    const gl = canvas.getContext('webgl2')
    if (!gl) throw new Error('WebGL2 is not supported')
    this.gl = gl

    // ---- Cell program ----
    this.program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)

    const vao = gl.createVertexArray()
    if (!vao) throw new Error('Failed to create VAO')
    this.vao = vao
    gl.bindVertexArray(vao)

    const quadBuffer = gl.createBuffer()
    if (!quadBuffer) throw new Error('Failed to create quad buffer')
    this.quadBuffer = quadBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const instanceBuffer = gl.createBuffer()
    if (!instanceBuffer) throw new Error('Failed to create instance buffer')
    this.instanceBuffer = instanceBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceCapacity * 2 * 4, gl.DYNAMIC_DRAW)

    const cellPosLoc = gl.getAttribLocation(this.program, 'a_cellPos')
    gl.enableVertexAttribArray(cellPosLoc)
    gl.vertexAttribPointer(cellPosLoc, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(cellPosLoc, 1)

    gl.bindVertexArray(null)

    const uResolution = gl.getUniformLocation(this.program, 'u_resolution')
    const uCamera = gl.getUniformLocation(this.program, 'u_camera')
    const uZoom = gl.getUniformLocation(this.program, 'u_zoom')
    const uCellColor = gl.getUniformLocation(this.program, 'u_cellColor')

    if (!uResolution || !uCamera || !uZoom || !uCellColor) {
      throw new Error('Failed to get one or more uniform locations')
    }

    this.uResolution = uResolution
    this.uCamera = uCamera
    this.uZoom = uZoom
    this.uCellColor = uCellColor

    // ---- Grid program ----
    this.gridProgram = createProgram(gl, GRID_VERTEX_SHADER_SOURCE, GRID_FRAGMENT_SHADER_SOURCE)

    const gridVao = gl.createVertexArray()
    if (!gridVao) throw new Error('Failed to create grid VAO')
    this.gridVao = gridVao
    gl.bindVertexArray(gridVao)

    const gridQuadBuffer = gl.createBuffer()
    if (!gridQuadBuffer) throw new Error('Failed to create grid quad buffer')
    this.gridQuadBuffer = gridQuadBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, gridQuadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, GRID_QUAD_VERTICES, gl.STATIC_DRAW)

    const gridPosLoc = gl.getAttribLocation(this.gridProgram, 'a_position')
    gl.enableVertexAttribArray(gridPosLoc)
    gl.vertexAttribPointer(gridPosLoc, 2, gl.FLOAT, false, 0, 0)

    gl.bindVertexArray(null)

    const uGridResolution = gl.getUniformLocation(this.gridProgram, 'u_resolution')
    const uGridCamera = gl.getUniformLocation(this.gridProgram, 'u_camera')
    const uGridZoom = gl.getUniformLocation(this.gridProgram, 'u_zoom')
    const uGridColor = gl.getUniformLocation(this.gridProgram, 'u_gridColor')
    const uGridAlpha = gl.getUniformLocation(this.gridProgram, 'u_gridAlpha')

    if (!uGridResolution || !uGridCamera || !uGridZoom || !uGridColor || !uGridAlpha) {
      throw new Error('Failed to get one or more grid uniform locations')
    }

    this.uGridResolution = uGridResolution
    this.uGridCamera = uGridCamera
    this.uGridZoom = uGridZoom
    this.uGridColor = uGridColor
    this.uGridAlpha = uGridAlpha

    // ---- Heatmap program ----
    this.heatmapProgram = createProgram(
      gl,
      HEATMAP_VERTEX_SHADER_SOURCE,
      HEATMAP_FRAGMENT_SHADER_SOURCE,
    )

    const heatmapVao = gl.createVertexArray()
    if (!heatmapVao) throw new Error('Failed to create heatmap VAO')
    this.heatmapVao = heatmapVao
    gl.bindVertexArray(heatmapVao)

    const heatmapQuadBuffer = gl.createBuffer()
    if (!heatmapQuadBuffer) throw new Error('Failed to create heatmap quad buffer')
    this.heatmapQuadBuffer = heatmapQuadBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, heatmapQuadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, GRID_QUAD_VERTICES, gl.STATIC_DRAW)

    const heatmapPosLoc = gl.getAttribLocation(this.heatmapProgram, 'a_position')
    gl.enableVertexAttribArray(heatmapPosLoc)
    gl.vertexAttribPointer(heatmapPosLoc, 2, gl.FLOAT, false, 0, 0)

    gl.bindVertexArray(null)

    const uHeatmapResolution = gl.getUniformLocation(this.heatmapProgram, 'u_resolution')
    const uHeatmapTex = gl.getUniformLocation(this.heatmapProgram, 'u_heatmap')
    const uHeatmapCellColor = gl.getUniformLocation(this.heatmapProgram, 'u_cellColor')
    const uHeatmapBgColor = gl.getUniformLocation(this.heatmapProgram, 'u_bgColor')

    if (!uHeatmapResolution || !uHeatmapTex || !uHeatmapCellColor || !uHeatmapBgColor) {
      throw new Error('Failed to get one or more heatmap uniform locations')
    }

    this.uHeatmapResolution = uHeatmapResolution
    this.uHeatmapTex = uHeatmapTex
    this.uHeatmapCellColor = uHeatmapCellColor
    this.uHeatmapBgColor = uHeatmapBgColor
  }

  /** Update cell and/or background and/or grid colors. Takes effect on next render(). */
  setColors(options: RendererOptions): void {
    if (options.cellColor) this.cellColor = options.cellColor
    if (options.backgroundColor) this.backgroundColor = options.backgroundColor
    if (options.gridColor) this.gridColor = options.gridColor
  }

  /** Toggle the grid overlay on or off. Takes effect on next render(). */
  setGrid(show: boolean): void {
    this.showGrid = show
  }

  /**
   * Compute the grid fade alpha for a given zoom level.
   * Returns 0 below GRID_FADE_START, 1 above GRID_FADE_END, linear between.
   */
  static gridAlpha(zoom: number): number {
    if (zoom <= GRID_FADE_START) return 0
    if (zoom >= GRID_FADE_END) return 1
    return (zoom - GRID_FADE_START) / (GRID_FADE_END - GRID_FADE_START)
  }

  /**
   * Render a frame.
   *
   * @param cells  Live cells in world coordinates.
   * @param camera Camera describing the visible region.
   */
  render(cells: Cell[], camera: Camera): void {
    const gl = this.gl
    const count = cells.length
    const canvas = gl.canvas as HTMLCanvasElement

    // Viewport + clear
    gl.viewport(0, 0, canvas.width, canvas.height)
    const [br, bg, bb, ba] = this.backgroundColor
    gl.clearColor(br, bg, bb, ba)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (camera.zoom < HEATMAP_ZOOM_THRESHOLD) {
      // Heatmap mode: density visualization for zoomed-out views
      if (count > 0) {
        this.renderHeatmap(cells, camera)
      }
    } else {
      // Individual cell mode: instanced quad rendering

      // Grow instance buffer if necessary
      if (count > this.instanceCapacity) {
        this.instanceCapacity = Math.max(count, this.instanceCapacity * 2)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, this.instanceCapacity * 2 * 4, gl.DYNAMIC_DRAW)
      }

      // Upload cell positions
      if (count > 0) {
        const data = new Float32Array(count * 2)
        for (let i = 0; i < count; i++) {
          const cell = cells[i]!
          data[i * 2] = cell.x
          data[i * 2 + 1] = cell.y
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data)
      }

      // Draw cells
      if (count > 0) {
        gl.useProgram(this.program)
        gl.bindVertexArray(this.vao)

        gl.uniform2f(this.uResolution, canvas.width, canvas.height)
        gl.uniform2f(this.uCamera, camera.x, camera.y)
        gl.uniform1f(this.uZoom, camera.zoom)
        gl.uniform4fv(this.uCellColor, this.cellColor)

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
        gl.bindVertexArray(null)
      }

      // Draw grid overlay (only in individual-cell mode where grid is meaningful)
      if (this.showGrid) {
        const alpha = WebGL2Renderer.gridAlpha(camera.zoom)
        if (alpha > 0) {
          gl.enable(gl.BLEND)
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

          gl.useProgram(this.gridProgram)
          gl.bindVertexArray(this.gridVao)

          gl.uniform2f(this.uGridResolution, canvas.width, canvas.height)
          gl.uniform2f(this.uGridCamera, camera.x, camera.y)
          gl.uniform1f(this.uGridZoom, camera.zoom)
          gl.uniform4fv(this.uGridColor, this.gridColor)
          gl.uniform1f(this.uGridAlpha, alpha)

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
          gl.bindVertexArray(null)

          gl.disable(gl.BLEND)
        }
      }
    }
  }

  /**
   * Render a density heatmap for zoomed-out views.
   *
   * Bins live cells into a low-resolution texture grid covering the visible
   * world area. Each texel stores a normalised density value [0, 1].
   * A full-screen quad samples the texture and linearly interpolates between
   * background and cell color based on density.
   */
  private renderHeatmap(cells: Cell[], camera: Camera): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement

    // Choose texture dimensions (cap at HEATMAP_MAX_TEXTURE_SIZE)
    const texW = Math.min(HEATMAP_MAX_TEXTURE_SIZE, canvas.width)
    const texH = Math.min(HEATMAP_MAX_TEXTURE_SIZE, canvas.height)

    // Visible world region
    const worldW = canvas.width / camera.zoom
    const worldH = canvas.height / camera.zoom
    const worldLeft = camera.x
    const worldTop = camera.y
    const cellWorldW = worldW / texW
    const cellWorldH = worldH / texH

    // Accumulate density counts per texel
    const density = new Float32Array(texW * texH)
    for (const cell of cells) {
      const tx = Math.floor((cell.x - worldLeft) / cellWorldW)
      const ty = Math.floor((cell.y - worldTop) / cellWorldH)
      if (tx >= 0 && tx < texW && ty >= 0 && ty < texH) {
        const idx = ty * texW + tx
        density[idx] = (density[idx] ?? 0) + 1
      }
    }

    // Normalise to [0, 1]
    let maxDensity = 1
    for (let i = 0; i < density.length; i++) {
      if (density[i]! > maxDensity) maxDensity = density[i]!
    }
    for (let i = 0; i < density.length; i++) {
      density[i] = density[i]! / maxDensity
    }

    // Upload density data to a R32F texture
    const TEXTURE_UNIT = 0
    gl.activeTexture(gl.TEXTURE0 + TEXTURE_UNIT)

    if (!this.heatmapTexture || this.heatmapTexWidth !== texW || this.heatmapTexHeight !== texH) {
      if (this.heatmapTexture) gl.deleteTexture(this.heatmapTexture)
      const tex = gl.createTexture()
      if (!tex) throw new Error('Failed to create heatmap texture')
      this.heatmapTexture = tex
      this.heatmapTexWidth = texW
      this.heatmapTexHeight = texH
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, texW, texH, 0, gl.RED, gl.FLOAT, density)
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.heatmapTexture)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texW, texH, gl.RED, gl.FLOAT, density)
    }

    // Render fullscreen quad sampling from the heatmap texture
    gl.useProgram(this.heatmapProgram)
    gl.bindVertexArray(this.heatmapVao)

    gl.uniform2f(this.uHeatmapResolution, canvas.width, canvas.height)
    gl.uniform1i(this.uHeatmapTex, TEXTURE_UNIT)
    gl.uniform4fv(this.uHeatmapCellColor, this.cellColor)
    gl.uniform4fv(this.uHeatmapBgColor, this.backgroundColor)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
  }

  /** Release all GPU resources. */
  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteBuffer(this.instanceBuffer)
    gl.deleteVertexArray(this.vao)
    gl.deleteProgram(this.gridProgram)
    gl.deleteBuffer(this.gridQuadBuffer)
    gl.deleteVertexArray(this.gridVao)
    gl.deleteProgram(this.heatmapProgram)
    gl.deleteBuffer(this.heatmapQuadBuffer)
    gl.deleteVertexArray(this.heatmapVao)
    if (this.heatmapTexture) {
      gl.deleteTexture(this.heatmapTexture)
      this.heatmapTexture = null
    }
  }
}
