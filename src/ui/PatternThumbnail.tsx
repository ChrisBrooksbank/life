import { useEffect, useRef } from 'preact/hooks'
import type { Cell } from '../engine/types'

const CANVAS_SIZE = 48
const PADDING = 2

interface PatternThumbnailProps {
  cells: Cell[]
}

/** Small canvas preview of a pattern's live cells. */
export function PatternThumbnail({ cells }: PatternThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    if (cells.length === 0) return

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const { x, y } of cells) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const patternW = maxX - minX + 1
    const patternH = maxY - minY + 1
    const available = CANVAS_SIZE - PADDING * 2
    const cellSize = Math.max(1, Math.floor(Math.min(available / patternW, available / patternH)))

    const drawW = patternW * cellSize
    const drawH = patternH * cellSize
    const offsetX = Math.floor((CANVAS_SIZE - drawW) / 2)
    const offsetY = Math.floor((CANVAS_SIZE - drawH) / 2)

    ctx.fillStyle = 'currentColor'
    for (const { x, y } of cells) {
      ctx.fillRect(
        offsetX + (x - minX) * cellSize,
        offsetY + (y - minY) * cellSize,
        cellSize,
        cellSize,
      )
    }
  }, [cells])

  return (
    <canvas
      ref={canvasRef}
      class="pattern-thumbnail"
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      aria-hidden="true"
    />
  )
}
