// DOM-free part of counter: types, constants and pure helpers. The DOM
// controller lives in src/vanilla/counter.ts.
import { type AutoInitController, type ElementTarget } from '@samline/internal'

export type { AutoInitController, ElementTarget }

/* ------------------------------------------------------------------------ */
/* Number tween                                                              */
/* ------------------------------------------------------------------------ */

export const EASINGS = {
  linear: (t: number) => t,
  'ease-out': (t: number) => 1 - (1 - t) ** 3,
  'ease-in-out': (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
} as const

export type EasingName = keyof typeof EASINGS

/** A named easing or a function from progress (`0`–`1`) to eased progress. */
export type Easing = EasingName | ((progress: number) => number)

export const isEasingName = (value: unknown): value is EasingName =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(EASINGS, value)

export interface AnimateNumberOptions {
  /** Defaults to `0`. */
  from?: number
  to: number
  /** Milliseconds. Defaults to `2000`. */
  duration?: number
  /** Milliseconds before starting. Defaults to `0`. */
  delay?: number
  /** Defaults to `'ease-out'`. */
  easing?: Easing
  /** Called on every frame with the current value, and once with `to` at the end. */
  onUpdate: (value: number) => void
  /** Called once `to` has been reached. Not called when cancelled. */
  onComplete?: () => void
}

/**
 * What `animateNumber` returns: call it (or `cancel()`) to stop. `retarget`
 * glides from the current value to a new one.
 */
export interface NumberAnimation {
  (): void
  cancel: () => void
  pause: () => void
  /** Continue after `pause()`; time spent paused does not count. */
  resume: () => void
  /** Count from the current value to `to`, over `duration` (the original one by default). */
  retarget: (to: number, duration?: number) => void
  /** The last value sent to `onUpdate`. */
  getValue: () => number
  isRunning: () => boolean
}

export const resolveEasing = (easing: Easing = 'ease-out') =>
  typeof easing === 'function'
    ? easing
    : isEasingName(easing)
      ? EASINGS[easing]
      : EASINGS['ease-out']

/* ------------------------------------------------------------------------ */
/* Parsing and formatting                                                    */
/* ------------------------------------------------------------------------ */

export const decimalSeparator = (locale: string | undefined) =>
  new Intl.NumberFormat(locale).formatToParts(1.5).find(part => part.type === 'decimal')?.value ??
  '.'

export const fractionDigits = (normalized: string) => normalized.split('.')[1]?.length ?? 0

/**
 * Read a number written for people in `locale`: `"1,234.5"` in English,
 * `"1.234,5"` in German, `"−12 %"`. Returns the value and its decimals.
 */
export const parseNumber = (
  text: string,
  locale?: string
): { value: number; decimals: number } | null => {
  const decimal = decimalSeparator(locale)
  let normalized = ''
  for (const char of text.trim()) {
    if (char >= '0' && char <= '9') normalized += char
    else if (char === decimal) normalized += '.'
    else if ((char === '-' || char === '−') && normalized === '') normalized = '-'
  }
  if (!/\d/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? { value, decimals: fractionDigits(normalized) } : null
}

/** The text around the number in a rendered value, and how its digits are written. */
export interface NumberShape {
  /** Text before the number, without its sign: `'$'` in `'$8,000'`. */
  prefix: string
  /** Text after the number: `' €'` in `'8.000,45 €'`. */
  suffix: string
  /** Digits before the decimal separator. */
  integerDigits: number
  /** Whether those digits are written with a group separator (`8,000`, not `8000`). */
  grouped: boolean
}

const isDigit = (char: string | undefined) => char !== undefined && char >= '0' && char <= '9'

/**
 * Describe how a number is written in `text`: `'$8,000'` has the prefix `'$'`
 * and grouped digits, `'8000 visits'` the suffix `' visits'` and ungrouped
 * digits. Returns `null` when the text has no digit.
 */
export const readShape = (text: string, locale?: string): NumberShape | null => {
  let first = -1
  let last = -1
  for (let i = 0; i < text.length; i++) {
    if (!isDigit(text[i])) continue
    if (first < 0) first = i
    last = i
  }
  if (first < 0) return null
  const decimal = text.indexOf(decimalSeparator(locale), first)
  const integer = text.slice(first, decimal > first && decimal < last ? decimal : last + 1)
  let start = first
  if (text[start - 1] === '-' || text[start - 1] === '−') start--
  return {
    prefix: text.slice(0, start),
    suffix: text.slice(last + 1),
    integerDigits: integer.replace(/\D/g, '').length,
    grouped: /\D/.test(integer),
  }
}

/* ------------------------------------------------------------------------ */
/* Clocks and dates                                                          */
/* ------------------------------------------------------------------------ */

/** How a clock is written: `'23:59:59'` has three fields, `'90:00'` two. */
export interface ClockShape {
  /** Total seconds. */
  seconds: number
  /** `3` for `h:mm:ss`, `2` for `m:ss`. */
  fields: 2 | 3
  /** Whether the first field is written with two digits (`01:05:00`, not `1:05:00`). */
  padded: boolean
  prefix: string
  suffix: string
}

const CLOCK = /(\d+):(\d{1,2})(?::(\d{1,2}))?/

/**
 * Read a clock written in `text`: `'23:59:59'` is 86399 seconds in hours,
 * minutes and seconds; `'90:00'` is 5400 seconds in minutes and seconds.
 * Returns `null` without one.
 */
export const readClock = (text: string): ClockShape | null => {
  const match = CLOCK.exec(text)
  if (!match) return null
  const [whole, first = '', second = '', third] = match
  const fields = third === undefined ? 2 : 3
  const seconds =
    fields === 3
      ? Number(first) * 3600 + Number(second) * 60 + Number(third)
      : Number(first) * 60 + Number(second)
  return {
    seconds,
    fields,
    padded: first.length >= 2,
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + whole.length),
  }
}

/** Write `seconds` as a clock with `fields` fields, using `digits` for each number. */
export const writeClock = (
  seconds: number,
  fields: 2 | 3,
  padded: boolean,
  digits: (value: number, pad: boolean) => string
) => {
  const total = Math.max(0, Math.floor(seconds))
  const parts =
    fields === 3
      ? [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
      : [Math.floor(total / 60), total % 60]
  return parts.map((part, i) => digits(part, i > 0 || padded)).join(':')
}

export const DAY = 86_400_000

/** A date written as `2026-12-31`, without a time, is a calendar day in UTC. */
export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim())

/** Milliseconds of a date string or timestamp, or `null`. */
export const readDate = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const time = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(time) ? time : null
}

export const safeLocale = (locale: string | undefined) => {
  try {
    return Intl.NumberFormat.supportedLocalesOf(locale ?? []).length ? locale : undefined
  } catch {
    return undefined
  }
}

/* ------------------------------------------------------------------------ */
/* Counter                                                                   */
/* ------------------------------------------------------------------------ */

/** `pending` (showing `from`), `counting`, `paused` or `done`. */
export type CounterState = 'pending' | 'counting' | 'paused' | 'done'

export const STARTS = ['visible', 'load', 'manual'] as const

export const KINDS = ['number', 'time', 'date'] as const

/**
 * What the number means: a plain `number` (default), a `time` in seconds
 * shown as a clock (`23:59:59`), or a `date` counted day by day.
 */
export type CounterKind = (typeof KINDS)[number]

export const DATE_STYLES = ['full', 'long', 'medium', 'short'] as const

/**
 * When counting starts: once the element is `visible` (default), on `load`
 * (as soon as it is set up), or `manual` (when you call `start()`).
 */
export type CounterStart = (typeof STARTS)[number]

export interface CounterOptions {
  /**
   * What the number means. `'time'` counts seconds and shows a clock in the
   * pattern of the text (`23:59:59` or `90:00`); `'date'` counts days between
   * two dates. Defaults to `'number'`.
   */
  as?: CounterKind
  /**
   * Starting value. Defaults to `0`. Seconds with `as: 'time'`; a timestamp
   * in milliseconds with `as: 'date'`, where it defaults to January 1 of the
   * final date's year.
   */
  from?: number
  /**
   * Final value when the element has no number in `data-counter`. By default
   * it is read from the element's text, formatted for its locale. A timestamp
   * in milliseconds with `as: 'date'`, where `datetime` comes first.
   */
  to?: number
  /**
   * Show only whole steps of the count: `5` counts 0, 5, 10… Seconds with
   * `as: 'time'` (default `1`) and days with `as: 'date'` (default `1`).
   * The final value is always shown exactly.
   */
  step?: number
  /** `Intl.DateTimeFormat` options for `as: 'date'`. Defaults to `{ dateStyle: 'long' }`. */
  dateFormat?: Intl.DateTimeFormatOptions
  /** Milliseconds. Defaults to `2000`. */
  duration?: number
  /** Milliseconds before counting starts. Defaults to `0`. */
  delay?: number
  /** Defaults to `'ease-out'`. */
  easing?: Easing
  /** Decimals to show. Defaults to the decimals of the final value. */
  decimals?: number
  /**
   * Group separators: `'auto'` (default) writes digits the way the HTML does,
   * so `8000` stays `8000` and `8,000` stays `8,000`; `true` groups as the
   * locale does (`8,000` in English); `false` never groups.
   */
  grouping?: boolean | 'auto'
  /** BCP 47 locale for formatting. Defaults to the closest `lang` attribute. */
  locale?: string
  /** Extra `Intl.NumberFormat` options, for example `{ style: 'percent' }` or `{ notation: 'compact' }`. */
  format?: Intl.NumberFormatOptions
  /** Full control over the text. Replaces `locale`, `decimals` and `format`. */
  formatter?: (value: number, element: Element) => string
  /** Count again every time the element enters. Defaults to `false`. */
  repeat?: boolean
  /** When counting starts. Defaults to `'visible'`. */
  start?: CounterStart
  /**
   * Count to the new value when `data-counter` (or `datetime`) changes, for
   * numbers your server or script updates. Defaults to `true`.
   */
  live?: boolean
  /**
   * Set `--counter-value` and `--counter-progress` (`0` to `1`) on every
   * frame: `true` on the element, or a selector for its closest ancestor,
   * such as `'.card'`. Defaults to `false`.
   */
  cssVars?: boolean | string
  /**
   * Also write the value elsewhere: `<progress>`, `<meter>` and inputs get it
   * as their value, other elements as `aria-valuenow`. A selector, element or
   * list, or a function called on every frame.
   */
  output?: ElementTarget | CounterOutput
  /** Scroll container. Defaults to the viewport. */
  root?: Element | Document | null
  /** Grow or shrink the root box. Defaults to `'0px'`. */
  rootMargin?: string
  /** Share of the element that must be visible to start, `0` to `1`. Defaults to `0.5`. */
  threshold?: number
  onStart?: (element: Element) => void
  onUpdate?: (value: number, element: Element) => void
  onComplete?: (element: Element) => void
}

export interface AutoCounterOptions extends CounterOptions {
  /** Elements to count. Defaults to `'[data-counter]'`. */
  selector?: string
  /** Where to look for them. Defaults to `document`. */
  scope?: ParentNode
  /** Also count matching elements added later. Defaults to `true`. */
  observe?: boolean
}

/** Receives the value on screen on every frame, with the counted element and progress (`0` to `1`). */
export type CounterOutput = (value: number, element: HTMLElement, progress: number) => void

/** Events of a counter controller. `update` runs on every frame and is not dispatched on the element. */
export type CounterEvent = 'start' | 'update' | 'pause' | 'resume' | 'reset' | 'complete'

/** What listeners receive, and the `detail` of the `counter:*` DOM events. */
export interface CounterEventDetail {
  element: HTMLElement
  /** The value on screen. */
  value: number
  state: CounterState
}

export type CounterListener = (detail: CounterEventDetail) => void

/** One element of a controller, as `getSnapshot()` reports it. */
export interface CounterSnapshot extends CounterEventDetail {
  from: number
  to: number
  /** How far the value has gone from `from` to `to`, `0` to `1`. */
  progress: number
}

/**
 * What `counter()` returns. Call it (or `destroy()`) to stop and restore the
 * original markup. Commands act on every element, or only on `element`, and
 * return the controller. After `destroy()` they do nothing.
 */
export interface CounterController {
  (): void
  /** The elements this controller counts. */
  readonly elements: readonly HTMLElement[]
  /**
   * Count from the value on screen to `value`, which becomes the final value.
   * A number still waiting to start counts to it when it starts.
   */
  set: (value: number, element?: Element) => CounterController
  /** Add `by` (default `1`) to the final value and count to it. */
  increment: (by?: number, element?: Element) => CounterController
  /** Subtract `by` (default `1`) from the final value and count to it. */
  decrement: (by?: number, element?: Element) => CounterController
  /** Count from the start value now, even before the element is visible. */
  start: (element?: Element) => CounterController
  pause: (element?: Element) => CounterController
  resume: (element?: Element) => CounterController
  /** Stop and show the start value again. Call `start()` to count again. */
  reset: (element?: Element) => CounterController
  /** Jump to the final value. */
  finish: (element?: Element) => CounterController
  /** Change options; attributes still win. Counting elements start again. */
  update: (options: CounterOptions) => CounterController
  /** Read the `data-counter-*` attributes again. */
  refresh: () => CounterController
  getSnapshot: () => CounterSnapshot[]
  /** Listen to an event. Returns a function that stops listening. */
  on: (event: CounterEvent, listener: CounterListener) => () => void
  destroy: () => void
}

export const ATTRIBUTE = 'data-counter'
/** DOM events are dispatched as `counter:start`, `counter:complete`, and so on. */
export const EVENT_PREFIX = 'counter:'
export const STATE_ATTRIBUTE = 'data-counter-state'
