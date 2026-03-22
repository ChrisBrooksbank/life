# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 0
- Last updated: 2026-03-22

## Notes

### Architecture (from plan.md)
- **Language:** TypeScript (strict mode)
- **Build:** Vite
- **Rendering:** WebGL2 (WebGPU progressive enhancement)
- **State:** Zustand
- **UI:** Preact (lightweight, fast)
- **Testing:** Vitest + Playwright

### Project Structure
```
src/
├── engine/            # Naive + HashLife engines, types, Web Worker
├── renderer/          # WebGL2/WebGPU pipeline, camera, shaders/
├── editor/            # Tools, clipboard, undo/redo history
├── patterns/          # Library catalogue, parser, exporter
├── ui/                # App, Controls, Toolbar, Stats, PatternDrawer, Settings
├── main.ts
└── index.html
```

### Key Constraints
- Simulation must run off main thread (Web Worker)
- HashLife must be validated against naive engine for correctness
- 60fps target for up to 1M visible cells
- HashLife must reach 10,000+ gen/sec on large repetitive patterns
- Each task below = one build iteration

---

## Tasks

### Phase 1 — Core MVP

- [x] Project setup: Vite + TypeScript strict + Preact + Vitest + Playwright (spec: plan.md)
- [ ] Engine shared types and interfaces: Cell, Coordinate, Pattern, EngineInterface (spec: simulation-engine.md)
- [ ] Naive simulation engine (Set<string> storage, B3/S23, unbounded grid) (spec: simulation-engine.md)
- [ ] Configurable rules via Birth/Survival strings (default B3/S23) (spec: simulation-engine.md)
- [ ] Web Worker wrapper: off-main-thread simulation with message protocol (spec: simulation-engine.md)
- [ ] WebGL2 renderer: GLSL shaders + instanced quad pipeline for cell drawing (spec: rendering.md)
- [ ] Camera system: zoom, pan, screen↔world coordinate transforms (spec: rendering.md)
- [ ] Mouse wheel zoom + inertial pan + pinch-to-zoom gesture support (spec: rendering.md)
- [ ] Zustand store for global app state (spec: ui-controls.md)
- [ ] Root App component + responsive layout skeleton (spec: ui-controls.md)
- [ ] Play / Pause / Step controls wired to simulation (spec: ui-controls.md)
- [ ] Variable speed slider (logarithmic, 1 gen/sec to max) (spec: ui-controls.md)
- [ ] Generation counter display (spec: ui-controls.md)
- [ ] Pencil tool: toggle cells on click/drag (spec: editor.md)
- [ ] Eraser tool: remove cells on click/drag (spec: editor.md)
- [ ] 10 built-in seed patterns (block, blinker, glider, LWSS, pulsar, Gosper gun, R-pentomino, acorn, beacon, toad) (spec: pattern-library.md)

### Phase 2 — Power Features

- [ ] HashLife engine: memoized quadtree with O(log n) generation steps (spec: simulation-engine.md)
- [ ] Engine runtime switching: naive for editing, HashLife for fast-forward (spec: simulation-engine.md)
- [ ] Toggleable grid overlay with zoom-based fade (spec: rendering.md)
- [ ] Dark and light themes with customizable cell/background/grid colors (spec: rendering.md)
- [ ] HUD overlay: generation, population, birth/death rate (spec: ui-controls.md)
- [ ] Performance metrics display: gen/sec, render FPS, memory usage (spec: ui-controls.md)
- [ ] Population sparkline graph over time (spec: ui-controls.md)
- [ ] Toolbar for drawing tool selection (spec: ui-controls.md)
- [ ] Keyboard shortcuts for all major actions (spec: ui-controls.md)
- [ ] Line drawing tool (spec: editor.md)
- [ ] Rectangle drawing tool (filled or outline) (spec: editor.md)
- [ ] Circle/ellipse drawing tool (filled or outline) (spec: editor.md)
- [ ] Fill tool (flood fill for enclosed regions) (spec: editor.md)
- [ ] Undo/redo stack: Ctrl+Z / Ctrl+Shift+Z for all editor operations (spec: editor.md)
- [ ] Rectangular selection: move, copy, cut, delete (spec: editor.md)
- [ ] Freeform lasso selection (spec: editor.md)
- [ ] Transform: rotate 90/180/270°, flip horizontal/vertical (spec: editor.md)
- [ ] Copy/paste with clipboard support in RLE format (spec: editor.md)
- [ ] Smart paste: live preview follows cursor, places on click (spec: editor.md)
- [ ] RLE format parser (import) (spec: pattern-library.md)
- [ ] Plaintext (.cells) format parser (import) (spec: pattern-library.md)
- [ ] Life 1.06 (.lif) format parser (import) (spec: pattern-library.md)
- [ ] RLE format exporter (spec: pattern-library.md)
- [ ] Plaintext format exporter (spec: pattern-library.md)
- [ ] Built-in catalogue of 50+ patterns with full metadata (name, description, discoverer, year, period, population) (spec: pattern-library.md)
- [ ] Searchable pattern library sidebar with category filters and text search (spec: pattern-library.md)
- [ ] Pattern preview thumbnails in library (spec: pattern-library.md)
- [ ] Drag-and-drop file import (.rle, .cells, .lif) (spec: pattern-library.md)
- [ ] URL hash encoding for small pattern sharing (spec: pattern-library.md)
- [ ] Copy pattern to clipboard in RLE format (spec: pattern-library.md)

### Phase 3 — Polish

- [ ] Rewind / time travel via snapshot history (spec: ui-controls.md)
- [ ] Generation jump input: type number, leap via HashLife (spec: ui-controls.md)
- [ ] Multi-scale rendering: density heatmaps at low zoom, individual cells at high zoom (spec: rendering.md)
- [ ] Cell age coloring mode: heat map based on generations alive (spec: rendering.md)
- [ ] WebGPU progressive enhancement with feature detection (spec: rendering.md)
- [ ] Touch support: draw with finger, two-finger pan (spec: ui-controls.md)
- [ ] PNG screenshot export of current view (spec: pattern-library.md)
- [ ] Animated GIF/WebM export of simulation (spec: pattern-library.md)
- [ ] Settings panel: theme, grid toggle, colors, key bindings (spec: ui-controls.md)
- [ ] Keyboard shortcut cheat sheet (press `?`) (spec: ui-controls.md)
- [ ] Full keyboard navigation with visible focus indicators (spec: ui-controls.md)
- [ ] ARIA labels on all controls + screen reader announcements (spec: ui-controls.md)
- [ ] Responsive layout: mobile (360px) to desktop (1920px+) (spec: ui-controls.md)

## Completed

<!-- Completed tasks move here -->
