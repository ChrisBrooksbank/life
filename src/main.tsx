import { render } from 'preact'

const appEl = document.getElementById('app')
if (appEl) {
  render(<h1>Game of Life</h1>, appEl)
}
