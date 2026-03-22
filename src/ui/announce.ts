/**
 * Screen reader announcement utility.
 *
 * Posts a message to a visually-hidden ARIA live region so that assistive
 * technologies announce important state changes without disrupting visual
 * presentation.  The live regions are injected into the DOM by the App
 * component via `<div id="sr-polite" />` and `<div id="sr-assertive" />`.
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const id = priority === 'assertive' ? 'sr-assertive' : 'sr-polite'
  const el = document.getElementById(id)
  if (!el) return
  // Clear first, then set on next frame — ensures re-announcement even for
  // identical consecutive messages (some AT implementations skip duplicates).
  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = message
  })
}
