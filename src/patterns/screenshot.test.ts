import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  readWebGL2Pixels,
  canvasToDataUrl,
  triggerDownload,
  downloadCanvasAsPng,
} from './screenshot'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(width = 4, height = 4): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Build a minimal WebGL2 context mock that returns a flat colour image. */
function makeMockGL(
  width: number,
  height: number,
  fillRgba: [number, number, number, number] = [255, 0, 0, 255],
): WebGL2RenderingContext {
  const pixels = new Uint8Array(width * height * 4)
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = fillRgba[0]
    pixels[i + 1] = fillRgba[1]
    pixels[i + 2] = fillRgba[2]
    pixels[i + 3] = fillRgba[3]
  }

  return {
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    readPixels: vi.fn(
      (
        _x: number,
        _y: number,
        _w: number,
        _h: number,
        _format: number,
        _type: number,
        buf: Uint8Array,
      ) => buf.set(pixels),
    ),
  } as unknown as WebGL2RenderingContext
}

/** Patch document.createElement so offscreen <canvas> elements return a
 *  stubbed toDataURL.  Returns a restore function. */
function mockOffscreenCanvas(dataUrl = 'data:image/png;base64,FAKE'): () => void {
  const original = document.createElement.bind(document)
  const stub = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = original(tag)
    if (tag === 'canvas') {
      vi.spyOn(el as HTMLCanvasElement, 'toDataURL').mockReturnValue(dataUrl)
      const ctx2d = {
        createImageData: vi.fn((_w: number, _h: number) => ({
          data: new Uint8ClampedArray(_w * _h * 4),
          width: _w,
          height: _h,
        })),
        putImageData: vi.fn(),
      }
      vi.spyOn(el as HTMLCanvasElement, 'getContext').mockReturnValue(
        ctx2d as unknown as CanvasRenderingContext2D,
      )
    }
    return el
  })
  return () => stub.mockRestore()
}

// ---------------------------------------------------------------------------
// readWebGL2Pixels
// ---------------------------------------------------------------------------

describe('readWebGL2Pixels', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the data URL from the offscreen canvas', () => {
    const restore = mockOffscreenCanvas('data:image/png;base64,TESTPNG')
    const gl = makeMockGL(2, 2)
    const result = readWebGL2Pixels(gl, 2, 2)
    restore()
    expect(result).toBe('data:image/png;base64,TESTPNG')
  })

  it('calls gl.readPixels with the correct dimensions', () => {
    const restore = mockOffscreenCanvas()
    const gl = makeMockGL(8, 6)
    readWebGL2Pixels(gl, 8, 6)
    restore()
    expect(gl.readPixels).toHaveBeenCalledWith(
      0,
      0,
      8,
      6,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      expect.any(Uint8Array),
    )
  })

  it('allocates a pixel buffer of width * height * 4 bytes', () => {
    const restore = mockOffscreenCanvas()
    const gl = makeMockGL(3, 5)
    const spy = vi.spyOn(gl, 'readPixels')
    readWebGL2Pixels(gl, 3, 5)
    restore()
    const buf = (spy.mock.calls[0] as unknown[])[6] as Uint8Array
    expect(buf.length).toBe(3 * 5 * 4)
  })
})

// ---------------------------------------------------------------------------
// canvasToDataUrl
// ---------------------------------------------------------------------------

describe('canvasToDataUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the WebGL2 path when a webgl2 context is available', () => {
    const restore = mockOffscreenCanvas('data:image/png;base64,WEBGL')
    const canvas = makeCanvas(2, 2)
    const mockGL = makeMockGL(2, 2)
    vi.spyOn(canvas, 'getContext').mockImplementation((id: string) => {
      if (id === 'webgl2') return mockGL as unknown as WebGL2RenderingContext
      return null
    })
    const result = canvasToDataUrl(canvas)
    restore()
    expect(mockGL.readPixels).toHaveBeenCalled()
    expect(result).toBe('data:image/png;base64,WEBGL')
  })

  it('falls back to toDataURL when no webgl2 context is present', () => {
    const canvas = makeCanvas(2, 2)
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    const toDataUrlSpy = vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc')
    const result = canvasToDataUrl(canvas)
    expect(toDataUrlSpy).toHaveBeenCalledWith('image/png')
    expect(result).toBe('data:image/png;base64,abc')
  })
})

// ---------------------------------------------------------------------------
// triggerDownload
// ---------------------------------------------------------------------------

describe('triggerDownload', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    clickSpy = vi.fn()
    originalCreateElement = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const link = originalCreateElement('a')
        vi.spyOn(link, 'click').mockImplementation(clickSpy)
        return link
      }
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an anchor element and clicks it', () => {
    triggerDownload('data:image/png;base64,abc', 'test.png')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('sets the download attribute to the given filename', () => {
    const createdLinks: HTMLAnchorElement[] = []
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        createdLinks.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {})
      }
      return el
    })
    triggerDownload('data:image/png;base64,abc', 'my-file.png')
    expect(createdLinks[0]?.download).toBe('my-file.png')
  })

  it('sets the href attribute to the data URL', () => {
    const createdLinks: HTMLAnchorElement[] = []
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        createdLinks.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {})
      }
      return el
    })
    triggerDownload('data:image/png;base64,xyz', 'shot.png')
    expect(createdLinks[0]?.href).toContain('data:image/png;base64,xyz')
  })
})

// ---------------------------------------------------------------------------
// downloadCanvasAsPng
// ---------------------------------------------------------------------------

describe('downloadCanvasAsPng', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the canvas data URL and triggers a download', () => {
    const canvas = makeCanvas(2, 2)
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc')

    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickSpy)
      return el
    })

    downloadCanvasAsPng(canvas, 'snapshot.png')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('uses the default filename "life.png" when none is provided', () => {
    const canvas = makeCanvas(2, 2)
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc')

    const createdLinks: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        createdLinks.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {})
      }
      return el
    })

    downloadCanvasAsPng(canvas)
    expect(createdLinks[0]?.download).toBe('life.png')
  })
})
