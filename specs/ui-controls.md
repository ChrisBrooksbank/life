# UI & Controls

## Overview

The user interface layer providing simulation controls, statistics, settings, and an accessible, responsive layout.

## User Stories

- As a user, I want intuitive playback controls so that I can run and observe the simulation
- As a user, I want to see stats about the simulation so that I can understand what's happening
- As a user, I want keyboard shortcuts for everything so that I can work efficiently
- As a user, I want the app to work on mobile so that I can explore Life anywhere

## Requirements

- [ ] Play / Pause / Step buttons for simulation control
- [ ] Variable speed slider (logarithmic, 1 gen/sec to max HashLife speed)
- [ ] Generation counter display
- [ ] Rewind / time travel via snapshot history
- [ ] Generation jump input (type a number, leap there via HashLife)
- [ ] Toolbar for drawing tool selection
- [ ] HUD overlay: generation, population, birth/death rate
- [ ] Performance metrics: generations/sec, render FPS, memory usage
- [ ] Population sparkline graph over time
- [ ] Settings panel: theme, grid toggle, colors, key bindings
- [ ] Keyboard shortcut cheat sheet (press `?`)
- [ ] Full keyboard navigation with visible focus indicators
- [ ] ARIA labels on all controls, screen reader announcements for generation changes
- [ ] Touch support: draw with finger, pinch-to-zoom, two-finger pan
- [ ] Responsive layout for mobile, tablet, and desktop
- [ ] Zustand store for global state management
- [ ] Root App component composing all UI panels

## Acceptance Criteria

- [ ] Play/pause/step correctly control simulation state
- [ ] Speed slider smoothly adjusts generation rate
- [ ] Stats update in real-time during simulation
- [ ] Keyboard shortcuts work for all major actions
- [ ] Layout adapts cleanly from mobile (360px) to desktop (1920px+)
- [ ] Screen reader can navigate and understand all controls
- [ ] Time travel correctly restores previous simulation states

## Out of Scope

- Simulation computation (handled by simulation-engine spec)
- Rendering pipeline (handled by rendering spec)
- Pattern file I/O (handled by pattern-library spec)
- Audio/sonification (stretch goal, not in core specs)
