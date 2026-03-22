# Simulation Engine

## Overview

The core simulation engine that computes Game of Life generations using HashLife and naive algorithms, running off the main thread via Web Workers.

## User Stories

- As a user, I want the simulation to run smoothly without freezing the UI so that I can interact while it computes
- As a user, I want to simulate massive patterns efficiently so that I can explore complex Life constructs
- As a user, I want to use custom birth/survival rules so that I can explore cellular automata beyond standard Life

## Requirements

- [ ] Naive engine using Set<string> for cell storage, suitable for small patterns and real-time editing
- [ ] HashLife engine with memoized quadtree enabling O(log n) generation steps
- [ ] Web Worker wrapper so simulation runs off the main thread
- [ ] Configurable rules via Birth/Survival strings (default B3/S23)
- [ ] Engine interface/type definitions shared between naive and HashLife implementations
- [ ] Ability to switch between engines at runtime (naive for editing, HashLife for fast-forward)
- [ ] Generation step function that returns the new cell state
- [ ] Support for unbounded grid (no fixed size limits)

## Acceptance Criteria

- [ ] Naive engine correctly computes B3/S23 for known patterns (blinker, glider, block)
- [ ] HashLife engine produces identical results to naive engine for the same inputs
- [ ] Web Worker communication works without blocking the main thread
- [ ] Custom rules (e.g., B36/S23 "HighLife") produce correct results
- [ ] HashLife can compute 10,000+ generations/sec for large repetitive patterns

## Out of Scope

- Rendering (handled by rendering spec)
- UI controls for speed/play/pause (handled by ui-controls spec)
- Pattern loading/saving (handled by pattern-library spec)
