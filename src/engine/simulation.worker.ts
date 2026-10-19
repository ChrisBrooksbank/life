import { handleCommand } from './worker-handler'
import type { WorkerCommand, WorkerResponse } from './worker-protocol'

function post(msg: WorkerResponse): void {
  ;(self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(msg)
}

self.addEventListener('message', (event: MessageEvent<WorkerCommand>) => {
  try {
    const response = handleCommand(event.data)
    if (response !== null) {
      post(response)
    }
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) })
  }
})

post({ type: 'READY' })
