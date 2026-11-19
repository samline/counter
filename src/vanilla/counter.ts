import { announce } from './announce.js'
import { createAutoCounter, createCounter } from './controller.js'
import { dateValue, timeValue } from './kinds.js'
import { outputs } from './outputs.js'
import { roll } from './roll.js'
import { scramble } from './scramble.js'
import { scroll } from './scroll.js'
import { steady } from './steady.js'

export { animateNumber, defineFormat, getCounter } from './controller.js'

/**
 * Count numbers as they scroll into view.
 *
 * Render the final value in the HTML (`<span data-counter>1,234</span>`):
 * it stays visible without JavaScript and for search engines. When the
 * script runs, each element shows `from` and counts to the final value once
 * half of it is visible. With reduced motion it keeps the final value.
 *
 * Returns a controller. Call it, or its `destroy()`, to stop everything and
 * restore the original content. Elements another controller already counts
 * are left to it; when every element belongs to one controller, that
 * controller is returned.
 */
export const counter = createCounter({ time: timeValue, date: dateValue }, [
  outputs,
  steady,
  roll,
  scramble,
  scroll,
  announce,
])

/**
 * Count every `[data-counter]` element in `scope`, including elements added
 * later, and clean up elements that are removed. Returns a controller with
 * `refresh()` and `destroy()`.
 */
export const autoCounter = createAutoCounter(counter)
