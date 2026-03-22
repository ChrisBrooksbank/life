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
}

// ---------------------------------------------------------------------------
// GLSL sources
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
 */
export class WebGL2Renderer {
  private readonly gl: WebGL2RenderingContext
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

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.cellColor = options.cellColor ?? [1, 1, 1, 1]
    this.backgroundColor = options.backgroundColor ?? [0, 0, 0, 1]

    const gl = canvas.getContext('webgl2')
    if (!gl) throw new Error('WebGL2 is not supported')
    this.gl = gl

    this.program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)

    // --- VAO ---
    const vao = gl.createVertexArray()
    if (!vao) throw new Error('Failed to create VAO')
    this.vao = vao
    gl.bindVertexArray(vao)

    // Base quad buffer (per-vertex)
    const quadBuffer = gl.createBuffer()
    if (!quadBuffer) throw new Error('Failed to create quad buffer')
    this.quadBuffer = quadBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    // divisor 0 (default) → advances per vertex

    // Instance buffer (per-instance cell positions)
    const instanceBuffer = gl.createBuffer()
    if (!instanceBuffer) throw new Error('Failed to create instance buffer')
    this.instanceBuffer = instanceBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceCapacity * 2 * 4, gl.DYNAMIC_DRAW)

    const cellPosLoc = gl.getAttribLocation(this.program, 'a_cellPos')
    gl.enableVertexAttribArray(cellPosLoc)
    gl.vertexAttribPointer(cellPosLoc, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(cellPosLoc, 1) // advances per instance

    gl.bindVertexArray(null)

    // --- Uniforms ---
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
  }

  /** Update cell and/or background colors. Takes effect on next render(). */
  setColors(options: RendererOptions): void {
    if (options.cellColor) this.cellColor = options.cellColor
    if (options.backgroundColor) this.backgroundColor = options.backgroundColor
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

    // Viewport + clear
    const canvas = gl.canvas as HTMLCanvasElement
    gl.viewport(0, 0, canvas.width, canvas.height)
    const [br, bg, bb, ba] = this.backgroundColor
    gl.clearColor(br, bg, bb, ba)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (count === 0) return

    // Draw
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.uniform2f(this.uResolution, canvas.width, canvas.height)
    gl.uniform2f(this.uCamera, camera.x, camera.y)
    gl.uniform1f(this.uZoom, camera.zoom)
    gl.uniform4fv(this.uCellColor, this.cellColor)

    // 4 vertices per quad (TRIANGLE_STRIP), `count` instances
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)

    gl.bindVertexArray(null)
  }

  /** Release all GPU resources. */
  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteBuffer(this.instanceBuffer)
    gl.deleteVertexArray(this.vao)
  }
}
