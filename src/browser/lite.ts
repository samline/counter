import { animateNumber, autoCounter, counter, getCounter } from '../lite/index.js'
import { install } from './install.js'

/**
 * The lite classic script: `window.Counter` with plain numbers only, started
 * on its own. Load it instead of `counter.global.js`, not with it.
 */
install({ counter, autoCounter, animateNumber, getCounter })

export { animateNumber, autoCounter, counter, getCounter }
