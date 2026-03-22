# Conway's Game of Life — The Definitive Edition

## Vision

Build the most polished, performant, and feature-rich implementation of Conway's Game of Life ever created as a web application. Combine the algorithmic power of HashLife with GPU-accelerated rendering, an intuitive editor, and a deep pattern library — all in a responsive, beautiful interface that runs in any modern browser.

---

## Core Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Build | Vite |
| Rendering | WebGL2 (WebGPU progressive enhancement) |
| State management | Zustand |
| UI framework | Preact (lightweight, fast) |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |

### Project Structure

```
src/
├── engine/            # Simulation core (zero DOM dependencies)
│   ├── hashlife.ts    # HashLife algorithm with memoized quad-trees
│   ├── naive.ts       # Simple HashMap engine (for small patterns / editing)
│   ├── types.ts       # Cell, Coordinate, Pattern types
│   └── worker.ts      # Web Worker wrapper for off-main-thread simulation
├── renderer/
│   ├── webgl.ts       # WebGL2 instanced rendering pipeline
│   ├── webgpu.ts      # WebGPU renderer (feature-detected)
│   ├── camera.ts      # Zoom, pan, coordinate transforms
│   └── shaders/       # GLSL / WGSL shader sources
├── editor/
│   ├── tools.ts       # Draw, erase, select, paste, fill
│   ├── clipboard.ts   # Copy/cut/paste with rotation & flip
│   └── history.ts     # Undo/redo stack
├── patterns/
│   ├── library.ts     # Built-in pattern catalogue
│   ├── parser.ts      # RLE, Plaintext, Life 1.06 import
│   └── exporter.ts    # Export to RLE, Plaintext, PNG, GIF
├── ui/
│   ├── App.tsx         # Root component
│   ├── Controls.tsx    # Play/pause/step/speed/generation controls
│   ├── Toolbar.tsx     # Drawing tools & pattern picker
│   ├── Stats.tsx       # Population, generation, perf overlay
│   ├── PatternDrawer.tsx # Searchable pattern library sidebar
│   └── Settings.tsx    # Theme, grid, colors, key bindings
├── audio/
│   └── sonification.ts # Optional: map cell activity to ambient sound
├── main.ts
└── index.html
```

---

## Features

### 1. Simulation Engine

- **HashLife algorithm** — memoized quadtree enabling O(log n) generation steps for repetitive regions. Capable of computing 2^128 generations of a Turing machine pattern in seconds.
- **Fallback naive engine** — simple `Set<string>` approach for small patterns and real-time editing feedback.
- **Web Worker execution** — simulation runs off the main thread; the UI never freezes.
- **Configurable rules** — support arbitrary Birth/Survival rule strings (B3/S23 default, but any totalistic rule).

### 2. Rendering

- **WebGL2 instanced rendering** — draw millions of cells at 60fps using instanced quads.
- **WebGPU progressive enhancement** — detect and use compute shaders for even faster rendering when available.
- **Multi-scale rendering** — at low zoom, use density heatmaps instead of individual cells.
- **Smooth zoom & pan** — inertial scrolling, pinch-to-zoom, keyboard shortcuts.
- **Grid overlay** — toggleable grid lines that fade at high zoom levels.
- **Dark & light themes** — with customizable cell/background/grid colors.

### 3. Interactive Editor

- **Drawing tools** — pencil, line, rectangle, circle, fill.
- **Selection** — rectangular & freeform lasso select, with move/copy/paste.
- **Transform** — rotate 90°/180°/270°, flip horizontal/vertical.
- **Undo/redo** — full history stack with Ctrl+Z / Ctrl+Shift+Z.
- **Smart paste** — paste patterns with live preview before placement.

### 4. Pattern Library

A curated, searchable library of famous patterns organized by category:

- **Still lifes** — block, beehive, loaf, boat, tub, pond, ship, barge…
- **Oscillators** — blinker, toad, beacon, pulsar, pentadecathlon, Kok's galaxy…
- **Spaceships** — glider, LWSS, MWSS, HWSS, copperhead, loafer, weekender…
- **Guns** — Gosper glider gun, Simkin glider gun, period-46 gun…
- **Puffers & rakes** — backrake, spacefiller…
- **Methuselahs** — R-pentomino, acorn, Diehard, rabbits…
- **Engineered** — Turing machines, prime calculators, digital clocks, Gemini (self-replicating spaceship)…

Each pattern includes: name, description, discoverer, year, bounding box, period, and population stats.

### 5. Time Controls

- **Play / Pause / Step** — standard transport controls.
- **Variable speed** — logarithmic slider from 1 gen/sec to maximum HashLife speed.
- **Rewind** — snapshot-based time travel; scrub backwards through history.
- **Generation jump** — type a target generation number and leap there instantly (HashLife).

### 6. Import / Export

- **Import** — drag-and-drop or paste RLE, Plaintext (.cells), Life 1.06 (.lif) files.
- **Export** — save as RLE, Plaintext, PNG screenshot, or animated GIF/WebM.
- **URL sharing** — encode small patterns in the URL hash for instant sharing.
- **Clipboard** — copy patterns to clipboard in RLE format.

### 7. Statistics & Analysis

- **HUD overlay** — current generation, population count, birth/death rate.
- **Performance metrics** — generations/sec, render FPS, memory usage.
- **Population graph** — sparkline showing population over time.
- **Cell age coloring** — optional mode where cell color indicates how many generations a cell has been alive (heat map effect).

### 8. Accessibility & UX

- **Keyboard-first** — full keyboard navigation with visible focus indicators and shortcut cheat sheet (press `?`).
- **Touch support** — draw with finger, pinch to zoom, two-finger pan.
- **Responsive** — works on mobile, tablet, and desktop.
- **Screen reader** — ARIA labels on all controls, status announcements for generation changes.

### 9. Audio (Stretch Goal)

- **Sonification** — map spatial cell density to ambient tones, creating a unique soundscape for each pattern's evolution.

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Render FPS (1M visible cells) | 60fps |
| Generations/sec (HashLife, large pattern) | 10,000+ |
| Initial load (gzipped) | < 100 KB |
| Time to interactive | < 1 second |
| Memory (10M alive cells) | < 500 MB |

---

## Implementation Phases

### Phase 1 — Core (MVP)
- [ ] Project setup (Vite + TypeScript + Preact)
- [ ] Naive simulation engine with Web Worker
- [ ] WebGL2 renderer with zoom/pan
- [ ] Basic controls (play/pause/step/speed)
- [ ] Draw tool (toggle cells)
- [ ] 10 built-in patterns

### Phase 2 — Power Features
- [ ] HashLife engine
- [ ] Full editor (line, rect, select, transform, undo)
- [ ] Pattern library (50+ patterns, searchable sidebar)
- [ ] RLE import/export
- [ ] URL sharing
- [ ] Stats overlay & population graph

### Phase 3 — Polish
- [ ] WebGPU renderer
- [ ] Cell age coloring & density heatmaps
- [ ] Time travel / rewind
- [ ] Animated GIF/WebM export
- [ ] Dark/light themes & custom colors
- [ ] Keyboard shortcut cheat sheet
- [ ] Touch & mobile optimization

### Phase 4 — Delight
- [ ] Sonification
- [ ] Guided tour / interactive tutorial
- [ ] "Interesting finds" random pattern generator
- [ ] Shareable gallery of user creations
- [ ] PWA (installable, works offline)

---

## What Makes This "The Best"

1. **HashLife** — most web implementations use naive algorithms that choke on large patterns. HashLife makes this version orders of magnitude faster.
2. **GPU rendering** — WebGL2/WebGPU means millions of cells rendered smoothly, not a sluggish canvas.
3. **Real editor** — not just click-to-toggle. A full creative tool with selection, transforms, undo, and a pattern library.
4. **Time travel** — rewind the universe. No other web Life implementation does this well.
5. **Production quality** — responsive, accessible, fast-loading, installable as a PWA. Not a toy demo, but a tool you'd bookmark.
6. **Depth** — from casual exploration to engineering Turing machines, this serves every level of curiosity.
