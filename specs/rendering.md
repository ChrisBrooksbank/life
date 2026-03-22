# Rendering

## Overview

GPU-accelerated rendering pipeline that displays the Game of Life grid at high performance using WebGL2, with WebGPU as a progressive enhancement.

## User Stories

- As a user, I want to see millions of cells rendered smoothly so that I can explore large patterns
- As a user, I want to zoom and pan fluidly so that I can navigate the infinite grid
- As a user, I want visual customization (themes, colors, grid) so that the experience feels personal

## Requirements

- [ ] WebGL2 instanced rendering pipeline for drawing cells as quads
- [ ] Camera system with zoom, pan, and coordinate transforms (screen <-> world)
- [ ] Smooth zoom with mouse wheel and pinch-to-zoom gesture support
- [ ] Inertial panning with mouse drag and two-finger drag
- [ ] Toggleable grid overlay that fades at high zoom levels
- [ ] Dark and light themes with customizable cell/background/grid colors
- [ ] Multi-scale rendering: density heatmaps at low zoom, individual cells at high zoom
- [ ] WebGPU progressive enhancement with feature detection
- [ ] Cell age coloring mode (heat map based on generations alive)
- [ ] GLSL shaders for WebGL2 rendering
- [ ] 60fps target for up to 1M visible cells

## Acceptance Criteria

- [ ] WebGL2 renderer draws cells correctly and matches simulation state
- [ ] Zoom/pan is smooth at 60fps with no jank
- [ ] Grid lines appear/disappear appropriately at different zoom levels
- [ ] Theme switching works without re-creating the GL context
- [ ] Renders 1M visible cells at 60fps on mid-range hardware

## Out of Scope

- Simulation computation (handled by simulation-engine spec)
- UI components for controls (handled by ui-controls spec)
- Audio/sonification (handled separately)
