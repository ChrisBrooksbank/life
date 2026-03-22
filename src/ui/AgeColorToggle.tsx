import { useState, useEffect } from 'preact/hooks'
import { appStore } from '../store'

/** Button that toggles cell age heat-map coloring on and off. */
export function AgeColorToggle() {
  const [ageColorMode, setAgeColorMode] = useState(() => appStore.getState().ageColorMode)

  useEffect(() => {
    return appStore.subscribe((s) => setAgeColorMode(s.ageColorMode))
  }, [])

  function toggle() {
    appStore.getState().setAgeColorMode(!appStore.getState().ageColorMode)
  }

  return (
    <button
      class={`age-color-toggle${ageColorMode ? ' age-color-toggle--active' : ''}`}
      type="button"
      onClick={toggle}
      aria-label={ageColorMode ? 'Disable age color mode' : 'Enable age color mode'}
      aria-pressed={ageColorMode}
      title={ageColorMode ? 'Age colors: on' : 'Age colors: off'}
    >
      Age
    </button>
  )
}
