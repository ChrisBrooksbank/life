import { useState, useEffect } from 'preact/hooks'
import { appStore } from '../store'
import type { Snapshot } from '../engine/snapshot-history'

/**
 * Time-travel / rewind controls.
 *
 * Shows a slider over the available snapshots so the user can scrub back in
 * time.  A "Rewind" button steps back to the immediately preceding snapshot.
 * Both controls are hidden when no snapshots are available.
 */
export function TimeTravelControls() {
  const [snapshots, setSnapshots] = useState<readonly Snapshot[]>(
    () => appStore.getState().snapshots,
  )
  const [canRewind, setCanRewind] = useState(() => appStore.getState().canRewind)

  useEffect(() => {
    return appStore.subscribe((s) => {
      setSnapshots(s.snapshots)
      setCanRewind(s.canRewind)
    })
  }, [])

  if (!canRewind || snapshots.length === 0) return null

  const lastIndex = snapshots.length - 1
  const oldest = snapshots[0]!.generation
  const newest = snapshots[lastIndex]!.generation

  function handleSliderChange(e: Event) {
    const idx = Number((e.target as HTMLInputElement).value)
    appStore.getState().rewindTo(idx)
  }

  function handleRewind() {
    // Step back one snapshot (the most recent one that was recorded before
    // the current state; rewindTo trims history so the current latest minus
    // one is the logical predecessor).
    appStore.getState().rewindTo(lastIndex)
  }

  return (
    <div class="time-travel" role="group" aria-label="Time travel controls">
      <button
        class="time-travel__btn"
        type="button"
        onClick={handleRewind}
        aria-label="Rewind to previous snapshot"
        title={`Rewind to generation ${snapshots[lastIndex]!.generation}`}
      >
        ⏮ Rewind
      </button>
      <label
        class="time-travel__label"
        aria-label={`Time travel: generation ${oldest} to ${newest}, ${snapshots.length} snapshots`}
      >
        <input
          class="time-travel__slider"
          type="range"
          min="0"
          max={lastIndex}
          step="1"
          defaultValue={lastIndex}
          onInput={handleSliderChange}
          aria-label="Time travel slider"
          aria-valuemin={oldest}
          aria-valuemax={newest}
          aria-valuenow={newest}
          aria-valuetext={`Generation ${newest}`}
        />
        <span class="time-travel__info">
          {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} (gen {oldest}–{newest})
        </span>
      </label>
    </div>
  )
}
