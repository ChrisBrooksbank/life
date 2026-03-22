# Editor

## Overview

A full-featured interactive editor for creating and modifying patterns on the Game of Life grid.

## User Stories

- As a user, I want to draw cells with various tools so that I can create patterns intuitively
- As a user, I want to select, copy, and transform regions so that I can build complex patterns efficiently
- As a user, I want undo/redo so that I can experiment without fear of losing work

## Requirements

- [ ] Pencil tool to toggle individual cells on click/drag
- [ ] Line tool to draw straight lines of cells
- [ ] Rectangle tool to draw filled or outline rectangles
- [ ] Circle/ellipse tool to draw filled or outline circles
- [ ] Fill tool (flood fill) for enclosed regions
- [ ] Eraser tool to remove cells
- [ ] Rectangular selection with move, copy, cut, delete
- [ ] Freeform lasso selection
- [ ] Transform selected region: rotate 90/180/270, flip horizontal/vertical
- [ ] Copy/paste with clipboard support (RLE format)
- [ ] Smart paste with live preview before placement
- [ ] Undo/redo stack with Ctrl+Z / Ctrl+Shift+Z
- [ ] Tool state management (current tool, tool options)

## Acceptance Criteria

- [ ] Each drawing tool creates the expected pattern of cells
- [ ] Selection tools correctly identify and highlight selected cells
- [ ] Transforms produce geometrically correct results
- [ ] Undo/redo correctly reverses and re-applies all editor operations
- [ ] Paste preview follows the cursor and places correctly on click
- [ ] All tools work during pause (editing while simulation is stopped)

## Out of Scope

- Pattern file import/export (handled by pattern-library spec)
- Simulation controls (handled by ui-controls spec)
- Rendering of the editor UI chrome (handled by ui-controls spec)
