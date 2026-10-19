import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSupportedMimeType, downloadBlob, startRecording } from './video-export'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(
  width = 4,
  height = 4,
  captureStreamImpl?: (fps?: number) => MediaStream,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  if (captureStreamImpl !== undefined) {
    Object.defineProperty(canvas, 'captureStream', {
      value: captureStreamImpl,
      configurable: true,
    })
  }
  return canvas
}

interface MockTrack {
  stop: ReturnType<typeof vi.fn>
}

interface MockStream {
  getTracks: ReturnType<typeof vi.fn>
  _tracks: MockTrack[]
}

interface MockRecorderInstance {
  ondataavailable: ((e: { data: Blob }) => void) | null
  onstop: (() => void) | null
  state: string
  mimeType: string
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

function makeMockStream(): MockStream {
  const track: MockTrack = { stop: vi.fn() }
  return {
    _tracks: [track],
    getTracks: vi.fn(() => [track]),
  }
}

function makeMockRecorderClass(stream: MockStream): {
  MockRecorder: new (s: unknown, opts?: { mimeType?: string }) => MockRecorderInstance
  instance: MockRecorderInstance | null
} {
  let instance: MockRecorderInstance | null = null

  class MockRecorder {
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    state = 'recording'
    mimeType: string

    start = vi.fn(() => {
      this.state = 'recording'
    })
    stop = vi.fn(() => {
      this.state = 'inactive'
      // simulate dataavailable then onstop
      const fakeBlob = new Blob(['fake'], { type: 'video/webm' })
      this.ondataavailable?.({ data: fakeBlob })
      this.onstop?.()
    })

    constructor(_s: unknown, opts?: { mimeType?: string }) {
      void stream
      this.mimeType = opts?.mimeType ?? 'video/webm'
      instance = this as MockRecorderInstance
    }

    static isTypeSupported(type: string): boolean {
      return type === 'video/webm;codecs=vp9' || type === 'video/webm'
    }
  }

  return { MockRecorder, instance }
}

// ---------------------------------------------------------------------------
// getSupportedMimeType
// ---------------------------------------------------------------------------

describe('getSupportedMimeType', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a webm MIME type', () => {
    const result = getSupportedMimeType()
    expect(result).toMatch(/^video\/webm/)
  })

  it('returns the fallback when MediaRecorder is undefined', () => {
    const original = globalThis.MediaRecorder
    // @ts-expect-error -- intentionally removing global
    delete globalThis.MediaRecorder
    const result = getSupportedMimeType()
    globalThis.MediaRecorder = original
    expect(result).toBe('video/webm')
  })
})

// ---------------------------------------------------------------------------
// downloadBlob
// ---------------------------------------------------------------------------

describe('downloadBlob', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>
  let createObjectURLSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    clickSpy = vi.fn()
    createObjectURLSpy = vi.fn(() => 'blob:fake-url')
    revokeObjectURLSpy = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    })

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickSpy)
      }
      return el
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('creates an object URL from the blob', () => {
    const blob = new Blob(['data'], { type: 'video/webm' })
    downloadBlob(blob, 'test.webm')
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
  })

  it('clicks the download link', () => {
    downloadBlob(new Blob(['data']), 'test.webm')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('sets the download attribute to the given filename', () => {
    const links: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        links.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(vi.fn())
      }
      return el
    })
    downloadBlob(new Blob(['data']), 'my-video.webm')
    expect(links[0]?.download).toBe('my-video.webm')
  })

  it('revokes the object URL after a timeout', () => {
    downloadBlob(new Blob(['data']), 'test.webm')
    expect(revokeObjectURLSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url')
  })
})

// ---------------------------------------------------------------------------
// startRecording
// ---------------------------------------------------------------------------

describe('startRecording', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns null when captureStream is not available', () => {
    // makeCanvas without captureStreamImpl leaves the property absent
    const canvas = makeCanvas()
    const session = startRecording(canvas)
    expect(session).toBeNull()
  })

  it('returns null when MediaRecorder is undefined', () => {
    const mockStream = makeMockStream()
    const canvas = makeCanvas(
      4,
      4,
      vi.fn(() => mockStream as unknown as MediaStream),
    )

    const original = globalThis.MediaRecorder
    // @ts-expect-error intentionally removing global
    delete globalThis.MediaRecorder
    const session = startRecording(canvas)
    globalThis.MediaRecorder = original

    expect(session).toBeNull()
  })

  it('returns a session with a stop method', () => {
    const mockStream = makeMockStream()
    const canvas = makeCanvas(
      4,
      4,
      vi.fn(() => mockStream as unknown as MediaStream),
    )

    const { MockRecorder } = makeMockRecorderClass(mockStream)
    vi.stubGlobal('MediaRecorder', MockRecorder)

    const session = startRecording(canvas)
    expect(session).not.toBeNull()
    expect(typeof session?.stop).toBe('function')
  })

  it('calls captureStream with the configured fps', () => {
    const mockStream = makeMockStream()
    const captureStreamSpy = vi.fn(() => mockStream as unknown as MediaStream)
    const canvas = makeCanvas(4, 4, captureStreamSpy)

    const { MockRecorder } = makeMockRecorderClass(mockStream)
    vi.stubGlobal('MediaRecorder', MockRecorder)

    startRecording(canvas, { fps: 24 })
    expect(captureStreamSpy).toHaveBeenCalledWith(24)
  })

  it('starts the recorder immediately', () => {
    const mockStream = makeMockStream()
    const canvas = makeCanvas(
      4,
      4,
      vi.fn(() => mockStream as unknown as MediaStream),
    )

    let capturedInstance: MockRecorderInstance | null = null
    const { MockRecorder } = makeMockRecorderClass(mockStream)
    // Wrap constructor to capture the instance
    const WrappedRecorder = class extends MockRecorder {
      constructor(s: unknown, opts?: { mimeType?: string }) {
        super(s, opts)
        capturedInstance = this as unknown as MockRecorderInstance
      }
    }
    vi.stubGlobal('MediaRecorder', WrappedRecorder)

    startRecording(canvas)
    expect((capturedInstance as MockRecorderInstance | null)?.start).toHaveBeenCalled()
  })

  it('stop() stops the recorder and stream tracks', () => {
    const mockStream = makeMockStream()
    const canvas = makeCanvas(
      4,
      4,
      vi.fn(() => mockStream as unknown as MediaStream),
    )

    const { MockRecorder } = makeMockRecorderClass(mockStream)
    vi.stubGlobal('MediaRecorder', MockRecorder)

    // Stub URL and download link to avoid errors
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    })
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(vi.fn())
      return el
    })

    const session = startRecording(canvas)
    session?.stop()

    expect(mockStream.getTracks).toHaveBeenCalled()
    expect(mockStream._tracks[0]?.stop).toHaveBeenCalled()
  })

  it('stop() triggers a download of a webm file', () => {
    const mockStream = makeMockStream()
    const canvas = makeCanvas(
      4,
      4,
      vi.fn(() => mockStream as unknown as MediaStream),
    )

    const { MockRecorder } = makeMockRecorderClass(mockStream)
    vi.stubGlobal('MediaRecorder', MockRecorder)

    const createObjectURLSpy = vi.fn(() => 'blob:video')
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    })

    const links: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        links.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(vi.fn())
      }
      return el
    })

    const session = startRecording(canvas, { filename: 'my-sim' })
    session?.stop()

    expect(links[0]?.download).toBe('my-sim.webm')
    expect(createObjectURLSpy).toHaveBeenCalled()
  })

  it('uses default filename "life-recording" when none given', () => {
    const mockStream = makeMockStream()
    const canvas = makeCanvas(
      4,
      4,
      vi.fn(() => mockStream as unknown as MediaStream),
    )

    const { MockRecorder } = makeMockRecorderClass(mockStream)
    vi.stubGlobal('MediaRecorder', MockRecorder)

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    })

    const links: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        links.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(vi.fn())
      }
      return el
    })

    const session = startRecording(canvas)
    session?.stop()

    expect(links[0]?.download).toBe('life-recording.webm')
  })
})
