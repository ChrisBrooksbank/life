import { useState } from 'preact/hooks'
import { appStore } from '../store'

/**
 * Generation jump input.
 *
 * Lets the user type a target generation number and leap there via HashLife.
 * Submitting a number greater than the current generation pauses the simulation,
 * switches the engine to HashLife, and steps forward by the required delta.
 */
export function GenerationJumpInput() {
  const [value, setValue] = useState('')

  function handleSubmit(e: Event) {
    e.preventDefault()
    const target = parseInt(value, 10)
    if (isNaN(target) || target < 0) return
    appStore.getState().jumpToGeneration(target)
    setValue('')
  }

  function handleInput(e: Event) {
    setValue((e.target as HTMLInputElement).value)
  }

  return (
    <form class="gen-jump" onSubmit={handleSubmit} aria-label="Jump to generation">
      <label class="gen-jump__label">
        <span class="gen-jump__text">Jump to gen</span>
        <input
          class="gen-jump__input"
          type="number"
          min="0"
          step="1"
          value={value}
          onInput={handleInput}
          aria-label="Target generation number"
          placeholder="e.g. 1000"
        />
      </label>
      <button
        class="gen-jump__btn"
        type="submit"
        aria-label="Jump to target generation"
        disabled={value === '' || isNaN(parseInt(value, 10))}
      >
        Go
      </button>
    </form>
  )
}
