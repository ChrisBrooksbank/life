# Conway's Game of Life

A GPU-accelerated Conway's Game of Life simulator with an infinite canvas, HashLife engine, and full drawing toolkit.

**Live:** https://conways-life-sim.netlify.app

## Features

- **WebGL2 renderer** — GPU-accelerated rendering for massive grids
- **HashLife engine** — Exponential speedup for computation of distant future states
- **Infinite canvas** — Pan and zoom freely, no grid size limits
- **Drawing toolkit** — Draw cells, lines, rectangles, and fill regions
- **Time travel** — Step forward and backward through history
- **Pattern library** — Built-in collection of classic patterns
- **RLE import/export** — Standard Run Length Encoded format support

## Tech Stack

- Vite + Preact + TypeScript
- Zustand (state management)
- WebGL2 (GPU rendering)
- PWA

## Development

```bash
npm install
npm run dev        # Start dev server
npm run build      # Production build
npm run check      # Lint, typecheck, test, format
npm run test:e2e   # Playwright end-to-end tests
```

## Deployment

Deployed on Netlify. Auto-deploys from main branch.
