# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Tech Stack

- TypeScript (strict mode), Preact, Zustand, Vite
- WebGL2 rendering (WebGPU progressive enhancement)
- Vitest + Playwright for testing

## Build Commands

```bash
npm run build          # Production build
npm run dev            # Development server
```

## Test Commands

```bash
npm test               # Run tests (watch mode)
npm run test:run       # Run tests once
npm run test:coverage  # Coverage report
```

## Lint & Format

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # tsc --noEmit
```

## Validation (run before committing)

```bash
npm run check          # Run ALL checks (typecheck, lint, format, tests)
```

## Project Structure

```
src/
├── engine/       # Simulation core (hashlife, naive, worker)
├── renderer/     # WebGL2/WebGPU rendering pipeline
├── editor/       # Drawing tools, clipboard, undo/redo
├── patterns/     # Pattern library, parser, exporter
├── ui/           # Preact components
├── audio/        # Sonification (stretch goal)
└── main.ts       # Entry point
```

## Project Notes

- Simulation engine must have ZERO DOM dependencies
- Simulation runs in a Web Worker (off main thread)
- HashLife is the primary engine; naive engine for small patterns/editing
- All patterns support RLE format as the canonical interchange format
