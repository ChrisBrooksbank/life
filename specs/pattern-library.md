# Pattern Library

## Overview

A curated, searchable library of famous Game of Life patterns with full import/export support.

## User Stories

- As a user, I want to browse and search a library of famous patterns so that I can explore Life's rich ecosystem
- As a user, I want to import pattern files so that I can load patterns from external sources
- As a user, I want to export and share my patterns so that others can see my creations

## Requirements

- [ ] Built-in catalogue of 50+ patterns organized by category (still lifes, oscillators, spaceships, guns, puffers, methuselahs, engineered)
- [ ] Each pattern includes: name, description, discoverer, year, bounding box, period, population stats
- [ ] Searchable sidebar with category filters and text search
- [ ] Pattern preview thumbnails in the library
- [ ] RLE format parser (import)
- [ ] Plaintext (.cells) format parser (import)
- [ ] Life 1.06 (.lif) format parser (import)
- [ ] RLE format exporter
- [ ] Plaintext format exporter
- [ ] PNG screenshot export of current view
- [ ] Animated GIF/WebM export of simulation
- [ ] Drag-and-drop file import
- [ ] URL hash encoding for small pattern sharing
- [ ] Copy pattern to clipboard in RLE format

## Acceptance Criteria

- [ ] Library contains at least 50 correctly defined patterns
- [ ] Search finds patterns by name, category, and description
- [ ] All three import formats parse correctly for standard test files
- [ ] Exported RLE can be re-imported with identical results
- [ ] URL sharing round-trips correctly (encode -> share -> decode -> identical pattern)
- [ ] Drag-and-drop works for .rle, .cells, and .lif files

## Out of Scope

- Pattern editing (handled by editor spec)
- Server-side storage or user accounts
- Gallery of user-submitted patterns (Phase 4 stretch goal)
