import { createAutoCounter, createCounter } from '../vanilla/controller.js'

export { animateNumber, getCounter } from '../vanilla/controller.js'
export {
  EASINGS,
  cubicBezier,
  isEasing,
  STARTS,
  REDUCED_MOTIONS,
  parseNumber,
  digitValue,
  numberingSystem,
  readShape,
  ATTRIBUTE,
  STATE_ATTRIBUTE,
  EVENT_PREFIX,
} from '../core/counter.js'
export type {
  EasingName,
  Easing,
  AnimateNumberOptions,
  NumberAnimation,
  NumberShape,
  CounterState,
  CounterStart,
  CounterReducedMotion,
  CounterEvent,
  CounterEventDetail,
  CounterListener,
  CounterSnapshot,
  CounterController,
  CounterOptions,
  AutoCounterOptions,
  AutoInitController,
  ElementTarget,
} from '../core/counter.js'

/**
 * `counter()` for plain numbers, without clocks and dates (`as: 'time'` and
 * `as: 'date'` elements stay as rendered), `cssVars`, `output`, `steady` and
 * `announce`. Everything else works as in the main entry: formatting,
 * easings, speed, stagger, live values, the controller and the label for
 * screen readers.
 */
export const counter = createCounter({}, [])

/** `autoCounter()` with the lite `counter()`. */
export const autoCounter = createAutoCounter(counter)

export default counter
