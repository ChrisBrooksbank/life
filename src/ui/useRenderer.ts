import { useEffect, useRef } from 'preact/hooks'
import { WebGL2Renderer } from '../renderer/webgl2-renderer'
import type { Camera } from '../renderer/webgl2-renderer'
import { createInputHandler } from '../renderer/input-handler'
import { createPencilTool } from '../editor/pencil-tool'
import { createEraserTool } from '../editor/eraser-tool'
import { createLineTool } from '../editor/line-tool'
import { createRectTool } from '../editor/rect-tool'
import { createEllipseTool } from '../editor/ellipse-tool'
import { createFillTool } from '../editor/fill-tool'
import { createSelectionTool } from '../editor/selection-tool'
import { createLassoTool } from '../editor/lasso-tool'
import { createPastePreview } from '../editor/paste-preview'
import { historyManager } from '../editor/history'
import { WorkerClient } from '../engine/worker-client'
import { appStore } from '../store'
import type { DrawingTool } from '../store'

/** Tools that handle left-click themselves (suppress mouse-drag pan). */
const DRAWING_TOOLS = new Set<DrawingTool>([
  'pencil',
  'eraser',
  'line',
  'rect',
  'ellipse',
  'fill',
  'select',
  'lasso',
])

/**
 * Hook that initialises the WebGL2 renderer, simulation worker, camera,
 * input handling, and editor tools. Runs the render loop via
 * requestAnimationFrame and keeps everything in sync with the app store.
 */
export function useRenderer() {
  const cameraRef = useRef<Camera>({ x: -25, y: -25, zoom: 10 })
  const rendererRef = useRef<WebGL2Renderer | null>(null)
  const cellsCacheRef = useRef<import('../engine/types').Cell[]>([])

  useEffect(() => {
    const canvas = document.getElementById('life-canvas') as HTMLCanvasElement | null
    if (!canvas) return

    // ── Resize canvas to match display size ───────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas!.width = canvas!.clientWidth * dpr
      canvas!.height = canvas!.clientHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Renderer ──────────────────────────────────────────────────────────
    const state = appStore.getState()
    const renderer = new WebGL2Renderer(canvas, {
      cellColor: state.themeColors.cellColor,
      backgroundColor: state.themeColors.backgroundColor,
      gridColor: state.themeColors.gridColor,
      showGrid: state.showGrid,
      ageColorMode: state.ageColorMode,
    })
    rendererRef.current = renderer

    // ── Worker ────────────────────────────────────────────────────────────
    const worker = new WorkerClient()
    worker.ready().then(() => {
      appStore.getState().setWorker(worker)
    })

    // ── Camera helpers ────────────────────────────────────────────────────
    const getCamera = () => cameraRef.current
    const setCamera = (cam: Camera) => {
      cameraRef.current = cam
    }

    // ── Input handler (pan / zoom) ────────────────────────────────────────
    const disposeInput = createInputHandler(canvas, getCamera, setCamera, {
      // Suppress mouse-drag pan when a drawing tool is active
      shouldPan: () => !DRAWING_TOOLS.has(appStore.getState().activeTool),
      // Single-finger touch should dispatch synthetic mouse events for drawing tools
      shouldDraw: () => DRAWING_TOOLS.has(appStore.getState().activeTool),
    })

    // ── Shared tool options ───────────────────────────────────────────────
    const getActiveTool = () => appStore.getState().activeTool
    const getCells = () => worker.getCells()
    const setCells = (cells: import('../engine/types').Cell[]) => worker.setCells(cells)
    const onBeforeChange = (snapshot: import('../engine/types').Cell[]) => {
      historyManager.push(snapshot)
    }

    const toolOpts = { getCamera, getActiveTool, getCells, setCells, onBeforeChange }

    // ── Editor tools ──────────────────────────────────────────────────────
    const disposePencil = createPencilTool(canvas, toolOpts)
    const disposeEraser = createEraserTool(canvas, toolOpts)
    const disposeLine = createLineTool(canvas, toolOpts)
    const disposeRect = createRectTool(canvas, { ...toolOpts, getRectFilled: () => true })
    const disposeEllipse = createEllipseTool(canvas, { ...toolOpts, getEllipseFilled: () => true })
    const disposeFill = createFillTool(canvas, toolOpts)

    const selectionHandler = createSelectionTool(canvas, {
      ...toolOpts,
      onSelectionChange: (rect) => {
        if (rect) {
          appStore.getState()._setClipboardCopySource(() => selectionHandler.copySelection())
        } else {
          appStore.getState()._setClipboardCopySource(null)
        }
      },
    })

    const lassoHandler = createLassoTool(canvas, {
      ...toolOpts,
      onLassoChange: (lasso) => {
        if (lasso) {
          appStore.getState()._setClipboardCopySource(() => lassoHandler.copySelection())
        } else {
          appStore.getState()._setClipboardCopySource(null)
        }
      },
    })

    // ── Paste preview ─────────────────────────────────────────────────────
    let disposePaste: (() => void) | null = null
    const unsubPaste = appStore.subscribe((s) => {
      if (s.pastePreviewCells && !disposePaste) {
        const pp = createPastePreview(canvas, s.pastePreviewCells, {
          getCamera,
          getCells,
          setCells,
          onBeforeChange,
          onCommit: () => {
            appStore.getState().cancelPastePreview()
          },
          onCancel: () => {
            appStore.getState().cancelPastePreview()
          },
        })
        disposePaste = pp.dispose
      } else if (!s.pastePreviewCells && disposePaste) {
        disposePaste()
        disposePaste = null
      }
    })

    // ── Sync store → renderer ─────────────────────────────────────────────
    const unsubTheme = appStore.subscribe((s) => {
      renderer.setColors({
        cellColor: s.themeColors.cellColor,
        backgroundColor: s.themeColors.backgroundColor,
        gridColor: s.themeColors.gridColor,
      })
      renderer.setGrid(s.showGrid)
      renderer.setAgeColorMode(s.ageColorMode)
    })

    // ── Render loop ───────────────────────────────────────────────────────
    let rafId: number
    let lastCellFetchTime = 0
    const CELL_FETCH_INTERVAL = 16 // ~60fps cell updates

    function loop(now: number) {
      rafId = requestAnimationFrame(loop)

      // Resize if needed
      resize()

      // Fetch cells periodically
      if (now - lastCellFetchTime > CELL_FETCH_INTERVAL) {
        lastCellFetchTime = now
        worker.getCells().then((cells) => {
          cellsCacheRef.current = cells
        })
      }

      renderer.render(cellsCacheRef.current, cameraRef.current)
    }

    // Wait for worker to be ready before starting the loop
    worker.ready().then(() => {
      rafId = requestAnimationFrame(loop)
    })

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      disposeInput()
      disposePencil()
      disposeEraser()
      disposeLine()
      disposeRect()
      disposeEllipse()
      disposeFill()
      selectionHandler.dispose()
      lassoHandler.dispose()
      disposePaste?.()
      unsubPaste()
      unsubTheme()
      renderer.dispose()
    }
  }, [])
}
