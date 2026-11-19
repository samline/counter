import { animateNumber, autoCounter, counter, defineFormat, getCounter } from '../vanilla/index.js'
import { install } from './install.js'

/** Classic script for pages without a build step: `window.Counter`, started on its own. */
const api = install({ counter, autoCounter, animateNumber, getCounter, defineFormat })

export type CounterGlobal = typeof api

export { animateNumber, autoCounter, counter, defineFormat, getCounter }
