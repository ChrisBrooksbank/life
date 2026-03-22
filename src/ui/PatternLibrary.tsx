import { useState } from 'preact/hooks'
import { CATALOGUE, type CataloguePattern, type PatternCategory } from '../patterns/catalogue'
import { appStore } from '../store'

const ALL_CATEGORIES: PatternCategory[] = [
  'still-life',
  'oscillator',
  'spaceship',
  'gun',
  'methuselah',
  'other',
]

const CATEGORY_LABELS: Record<PatternCategory, string> = {
  'still-life': 'Still Lifes',
  oscillator: 'Oscillators',
  spaceship: 'Spaceships',
  gun: 'Guns',
  methuselah: 'Methuselahs',
  other: 'Other',
}

function matchesSearch(pattern: CataloguePattern, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    pattern.name.toLowerCase().includes(q) ||
    pattern.description.toLowerCase().includes(q) ||
    (pattern.discoverer?.toLowerCase().includes(q) ?? false)
  )
}

interface PatternLibraryProps {
  onClose: () => void
}

/** Sidebar showing searchable, filterable pattern catalogue. */
export function PatternLibrary({ onClose }: PatternLibraryProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<PatternCategory | 'all'>('all')

  const filtered = CATALOGUE.filter((p) => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false
    return matchesSearch(p, query)
  })

  function handleSelect(pattern: CataloguePattern) {
    appStore.getState().startPastePreview(pattern.cells)
    onClose()
  }

  return (
    <aside class="pattern-library" aria-label="Pattern library">
      <div class="pattern-library__header">
        <h2 class="pattern-library__title">Patterns</h2>
        <button
          class="pattern-library__close"
          type="button"
          onClick={onClose}
          aria-label="Close pattern library"
        >
          ✕
        </button>
      </div>

      <input
        class="pattern-library__search"
        type="search"
        placeholder="Search patterns…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        aria-label="Search patterns"
      />

      <div class="pattern-library__filters" role="group" aria-label="Category filters">
        <button
          class={`pattern-library__filter${activeCategory === 'all' ? ' pattern-library__filter--active' : ''}`}
          type="button"
          onClick={() => setActiveCategory('all')}
          aria-pressed={activeCategory === 'all'}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            class={`pattern-library__filter${activeCategory === cat ? ' pattern-library__filter--active' : ''}`}
            type="button"
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div class="pattern-library__count" aria-live="polite" aria-atomic="true">
        {filtered.length} pattern{filtered.length !== 1 ? 's' : ''}
      </div>

      <ul class="pattern-library__list" role="list">
        {filtered.map((pattern) => (
          <li key={pattern.name} class="pattern-library__item">
            <button
              class="pattern-library__item-btn"
              type="button"
              onClick={() => handleSelect(pattern)}
              aria-label={`Load pattern: ${pattern.name}`}
            >
              <span class="pattern-library__item-name">{pattern.name}</span>
              <span class="pattern-library__item-meta">
                <span class="pattern-library__item-category">
                  {CATEGORY_LABELS[pattern.category]}
                </span>
                {pattern.population !== undefined && (
                  <span class="pattern-library__item-pop">{pattern.population} cells</span>
                )}
                {pattern.year !== undefined && (
                  <span class="pattern-library__item-year">{pattern.year}</span>
                )}
              </span>
              <span class="pattern-library__item-desc">{pattern.description}</span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p class="pattern-library__empty">No patterns match your search.</p>
      )}
    </aside>
  )
}
