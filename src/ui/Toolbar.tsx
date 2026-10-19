import { useState, useEffect, useRef } from 'preact/hooks'
import { appStore } from '../store'
import type { DrawingTool } from '../store'

interface ToolConfig {
  id: DrawingTool
  label: string
  title: string
}

const TOOLS: ToolConfig[] = [
  { id: 'pencil', label: '✏', title: 'Pencil — draw cells' },
  { id: 'eraser', label: '⌫', title: 'Eraser — remove cells' },
  { id: 'line', label: '╱', title: 'Line — draw straight lines' },
  { id: 'rect', label: '▭', title: 'Rectangle — draw rectangles' },
  { id: 'ellipse', label: '◯', title: 'Ellipse — draw ellipses' },
  { id: 'fill', label: '⬛', title: 'Fill — flood fill enclosed region' },
]

/** Toolbar for selecting the active drawing tool. */
export function Toolbar() {
  const [activeTool, setActiveTool] = useState<DrawingTool>(() => appStore.getState().activeTool)
  const [rovingIndex, setRovingIndex] = useState(() => {
    const idx = TOOLS.findIndex((t) => t.id === appStore.getState().activeTool)
    return idx >= 0 ? idx : 0
  })
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    return appStore.subscribe((s) => setActiveTool(s.activeTool))
  }, [])

  // Keep roving index in sync when the active tool changes (e.g. via keyboard shortcut)
  useEffect(() => {
    const idx = TOOLS.findIndex((t) => t.id === activeTool)
    if (idx >= 0) setRovingIndex(idx)
  }, [activeTool])

  function handleKeyDown(e: KeyboardEvent, index: number): void {
    let next = index

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      next = (index + 1) % TOOLS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      next = (index - 1 + TOOLS.length) % TOOLS.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      next = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      next = TOOLS.length - 1
    } else {
      return
    }

    setRovingIndex(next)
    buttonRefs.current[next]?.focus()
  }

  return (
    <div class="toolbar" role="toolbar" aria-label="Drawing tools">
      {TOOLS.map((tool, index) => (
        <button
          key={tool.id}
          ref={(el) => {
            buttonRefs.current[index] = el as HTMLButtonElement | null
          }}
          class={`btn btn--icon toolbar__btn${activeTool === tool.id ? ' toolbar__btn--active' : ''}`}
          type="button"
          tabIndex={rovingIndex === index ? 0 : -1}
          onClick={() => appStore.getState().setActiveTool(tool.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          aria-label={tool.title}
          aria-pressed={activeTool === tool.id}
          title={tool.title}
        >
          {tool.label}
        </button>
      ))}
    </div>
  )
}
