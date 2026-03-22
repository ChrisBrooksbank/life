/**
 * Animated WebM export of the simulation canvas.
 *
 * Uses the browser's native MediaRecorder API with captureStream() to record
 * the canvas as a WebM video file, then triggers a download when stopped.
 */

export interface RecordingOptions {
  /** Frames per second for the captured stream (default: 30) */
  fps?: number
  /** Override the MIME type (default: auto-detected best supported type) */
  mimeType?: string
  /** Base filename without extension (default: 'life-recording') */
  filename?: string
}

export interface RecordingSession {
  /** Stop recording and trigger the file download. */
  stop: () => void
}

/**
 * Return the best WebM MIME type supported by this browser's MediaRecorder.
 */
export function getSupportedMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  if (typeof MediaRecorder !== 'undefined') {
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
  }
  return 'video/webm'
}

/**
 * Trigger a browser download for a Blob.
 *
 * @internal exposed for testing
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Start recording the canvas as a WebM video.
 *
 * Returns a {@link RecordingSession} whose `stop()` method ends the recording
 * and downloads the resulting `.webm` file.  Returns `null` if the browser
 * does not support `canvas.captureStream` or `MediaRecorder`.
 *
 * @param canvas  The canvas element to record (typically `#life-canvas`).
 * @param options Optional recording configuration.
 */
export function startRecording(
  canvas: HTMLCanvasElement,
  options: RecordingOptions = {},
): RecordingSession | null {
  if (typeof canvas.captureStream !== 'function') return null
  if (typeof MediaRecorder === 'undefined') return null

  const fps = options.fps ?? 30
  const mimeType = options.mimeType ?? getSupportedMimeType()
  const filename = options.filename ?? 'life-recording'

  const stream = canvas.captureStream(fps)
  const chunks: Blob[] = []

  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType })
  } catch {
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      return null
    }
  }

  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType })
    downloadBlob(blob, `${filename}.webm`)
  }

  recorder.start()

  return {
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop()
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}
