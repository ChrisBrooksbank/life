import { render } from 'preact'
import { App } from './app'

const appEl = document.getElementById('app')
if (appEl) {
  render(<App />, appEl)
}
