import type { AutoInitController } from '../core/counter.js'
import type { animateNumber, getCounter } from '../vanilla/controller.js'
import type { autoCounter, counter } from '../vanilla/counter.js'

interface Api {
  counter: typeof counter
  autoCounter: typeof autoCounter
  animateNumber: typeof animateNumber
  getCounter: typeof getCounter
}

/**
 * Define `window.Counter` for pages without a build step and count every
 * `[data-counter]` element as soon as the DOM is ready, including elements
 * added later. Add `data-manual` to the script tag to start it yourself with
 * `Counter.auto()`; calling `Counter.auto()` before the DOM is ready also
 * replaces the automatic start.
 */
export const install = (members: Api) => {
  const script = typeof document !== 'undefined' ? document.currentScript : null
  const manual = script?.hasAttribute('data-manual') ?? false

  let controller: AutoInitController | null = null

  const api = {
    ...members,
    /** Start (or restart) automatic counting. Returns the controller. */
    auto: (options?: Parameters<Api['autoCounter']>[0]) => {
      controller?.destroy()
      controller = members.autoCounter(options)
      return controller
    },
    /** The controller of the automatic run, or `null`. */
    get controller() {
      return controller
    },
  }

  const scope = globalThis as typeof globalThis & { Counter?: typeof api }
  scope.Counter = api

  if (!manual && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      // A page script may already have started it with its own options.
      document.addEventListener('DOMContentLoaded', () => controller ?? api.auto(), { once: true })
    } else {
      api.auto()
    }
  }
  return api
}
