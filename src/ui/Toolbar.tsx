import { useState, useEffect } from 'preact/hooks'
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

  useEffect(() => {
    return appStore.subscribe((s) => setActiveTool(s.activeTool))
  }, [])

  return (
    <div class="toolbar" role="toolbar" aria-label="Drawing tools">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          class={`toolbar__btn${activeTool === tool.id ? ' toolbar__btn--active' : ''}`}
          type="button"
          onClick={() => appStore.getState().setActiveTool(tool.id)}
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
