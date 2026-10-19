import { useEffect, useState } from 'preact/hooks'
import { decodeRle } from '../patterns/rle'
import { decodePlaintext } from '../patterns/plaintext'
import { decodeLife106 } from '../patterns/life106'
import { appStore } from '../store'
import type { Cell } from '../engine/types'

/** Returns true while a dragged file is hovering over the window. */
export function useFileDrop(): boolean {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let dragDepth = 0

    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth++
      setIsDragging(true)
    }

    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
    }

    function onDragLeave() {
      dragDepth--
      if (dragDepth <= 0) {
        dragDepth = 0
        setIsDragging(false)
      }
    }

    async function onDrop(e: DragEvent) {
      dragDepth = 0
      setIsDragging(false)
      if (!e.dataTransfer?.files.length) return
      e.preventDefault()

      const file = e.dataTransfer.files[0]
      if (!file) return

      const text = await file.text()
      const cells = parseFile(file.name, text)
      if (cells && cells.length > 0) {
        appStore.getState().startPastePreview(cells)
      }
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return isDragging
}

/** Parse file content based on file extension. Returns null for unknown formats. */
export function parseFile(filename: string, content: string): Cell[] | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.rle')) return decodeRle(content)
  if (lower.endsWith('.cells')) return decodePlaintext(content)
  if (lower.endsWith('.lif')) return decodeLife106(content)
  return null
}

function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer != null && Array.from(e.dataTransfer.types).includes('Files')
}
