# CLAUDE.md

## Project Overview

Conway's Game of Life simulator — GPU-accelerated via WebGL2, HashLife engine for fast computation, infinite canvas, drawing toolkit, time travel, pattern library, and RLE import/export.

**Live:** https://conways-life-sim.netlify.app

## Tech Stack

- Vite + Preact + TypeScript
- Zustand (state management)
- WebGL2 (GPU-accelerated rendering)
- PWA

## Development Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Lint + typecheck + test + format
npm run test:e2e     # Playwright e2e tests
```

## Architecture

- `src/engine/` — HashLife algorithm implementation
- `src/renderer/` — WebGL2 rendering pipeline
- `src/drawing/` — Drawing tools (pencil, line, rectangle, fill)
- `src/patterns/` — Built-in pattern library (RLE format)
- `src/store/` — Zustand state management

## Key Technical Notes

- WebGL2 is required — check browser compatibility before targeting old browsers
- HashLife enables computing states billions of generations in the future by exploiting spatial/temporal redundancy
- RLE (Run Length Encoded) is the standard format for sharing Life patterns

## Deployment

Deployed on Netlify. Auto-deploys from main branch.
