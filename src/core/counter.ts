// DOM-free part of counter: types, constants and pure helpers. The DOM
// controller lives in src/vanilla/counter.ts.
import { type AutoInitController, type ElementTarget } from '@samline/internal'

export type { AutoInitController, ElementTarget }

/* ------------------------------------------------------------------------ */
/* Number tween                                                              */
/* ------------------------------------------------------------------------ */

export const EASINGS = {
  linear: (t: number) => t,
  'ease-in': (t: number) => t ** 3,
  'ease-out': (t: number) => 1 - (1 - t) ** 3,
  'ease-in-out': (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  /** Fast start, long gentle landing: good for large numbers. */
  'ease-out-expo': (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  /** Goes a little past the target, then settles on it. */
  'ease-out-back': (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
} as const

export type EasingName = keyof typeof EASINGS

/**
 * A named easing, a CSS `cubic-bezier(x1, y1, x2, y2)` string, or a function
 * from progress (`0`–`1`) to eased progress.
 */
export type Easing = EasingName | `cubic-bezier(${string})` | ((progress: number) => number)

const BEZIER = /^cubic-bezier\(([^,]+),([^,]+),([^,]+),([^,)]+)\)$/

/**
 * Read a CSS `cubic-bezier(x1, y1, x2, y2)` into an easing function, as CSS
 * defines it. Returns `null` for anything else; `x1` and `x2` must be `0`–`1`.
 */
export const cubicBezier = (value: string): ((progress: number) => number) | null => {
  const match = BEZIER.exec(value.replace(/\s+/g, ''))
  const [x1, y1, x2, y2] = match ? match.slice(1).map(Number) : []
  if (
    [x1, y1, x2, y2].some(n => n === undefined || !Number.isFinite(n)) ||
    x1! < 0 ||
    x1! > 1 ||
    x2! < 0 ||
    x2! > 1
  )
    return null
  const curve = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3
  return t => {
    if (t <= 0 || t >= 1) return t <= 0 ? 0 : 1
    // x grows with u, so halving finds the u whose x is t.
    let low = 0
    let high = 1
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2
      if (curve(x1!, x2!, mid) < t) low = mid
      else high = mid
    }
    return curve(y1!, y2!, (low + high) / 2)
  }
}

/** Whether `value` names an easing or is a valid `cubic-bezier()`. */
export const isEasing = (value: unknown): value is Easing =>
  typeof value === 'function' ||
  isEasingName(value) ||
  (typeof value === 'string' && cubicBezier(value) !== null)

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

export const resolveEasing = (easing: Easing = 'ease-out'): ((progress: number) => number) =>
  typeof easing === 'function'
    ? easing
    : isEasingName(easing)
      ? EASINGS[easing]
      : (cubicBezier(easing) ?? EASINGS['ease-out'])

/* ------------------------------------------------------------------------ */
/* Parsing and formatting                                                    */
/* ------------------------------------------------------------------------ */

export const decimalSeparator = (locale: string | undefined) =>
  new Intl.NumberFormat(locale).formatToParts(1.5).find(part => part.type === 'decimal')?.value ??
  '.'

export const fractionDigits = (normalized: string) => normalized.split('.')[1]?.length ?? 0

const DIGIT = /\p{Nd}/u

/**
 * The value of a decimal digit in any script: `'7'`, `'٧'` (Arabic-Indic),
 * `'७'` (Devanagari) and `'７'` (full width) are all 7. Returns `-1` for
 * anything else.
 */
export const digitValue = (char: string | undefined): number => {
  if (!char || !DIGIT.test(char)) return -1
  const code = char.codePointAt(0)!
  // Digits come in runs of ten from zero; walk back to the start of the run.
  let start = code
  while (DIGIT.test(String.fromCodePoint(start - 1))) start--
  return (code - start) % 10
}

/** The Arabic decimal separator reads as a decimal point in every language. */
const isDecimal = (char: string | undefined, decimal: string) => char === decimal || char === '٫'

/**
 * Read a number written for people in `locale`: `"1,234.5"` in English,
 * `"1.234,5"` in German, `"−12 %"`, or `"١٬٢٣٤"` in Arabic-Indic digits.
 * Returns the value and its decimals.
 */
export const parseNumber = (
  text: string,
  locale?: string
): { value: number; decimals: number } | null => {
  const decimal = decimalSeparator(locale)
  let normalized = ''
  for (const char of text.trim()) {
    const digit = digitValue(char)
    if (digit >= 0) normalized += digit
    else if (isDecimal(char, decimal)) normalized += '.'
    else if ((char === '-' || char === '−') && normalized === '') normalized = '-'
  }
  if (!/\d/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? { value, decimals: fractionDigits(normalized) } : null
}

/**
 * The integer whose digits `text` writes, as a `BigInt`, in any script:
 * `'18,446,744,073,709,551,615'` is `18446744073709551615n`. `null` without digits.
 */
export const readBigInt = (text: string, negative = false): bigint | null => {
  let digits = ''
  for (const char of text) {
    const digit = digitValue(char)
    if (digit >= 0) digits += digit
  }
  return digits ? BigInt(negative ? `-${digits}` : digits) : null
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
  /** The zero of the script the digits are written in: `'0'`, or `'٠'` for Arabic-Indic. */
  zero: string
}

/**
 * Describe how a number is written in `text`: `'$8,000'` has the prefix `'$'`
 * and grouped digits, `'8000 visits'` the suffix `' visits'` and ungrouped
 * digits. Returns `null` when the text has no digit.
 */
export const readShape = (text: string, locale?: string): NumberShape | null => {
  const chars = Array.from(text)
  let first = -1
  let last = -1
  chars.forEach((char, i) => {
    if (digitValue(char) < 0) return
    if (first < 0) first = i
    last = i
  })
  if (first < 0) return null
  const separator = decimalSeparator(locale)
  let decimal = first + 1
  while (decimal <= last && !isDecimal(chars[decimal], separator)) decimal++
  const integer = chars.slice(first, decimal)
  let start = first
  if (chars[start - 1] === '-' || chars[start - 1] === '−') start--
  const lead = chars[first]!
  return {
    prefix: chars.slice(0, start).join(''),
    suffix: chars.slice(last + 1).join(''),
    integerDigits: integer.filter(char => digitValue(char) >= 0).length,
    grouped: integer.some(char => digitValue(char) < 0),
    zero: String.fromCodePoint(lead.codePointAt(0)! - digitValue(lead)),
  }
}

/** Ordinal suffixes by `Intl.PluralRules` category with `type: 'ordinal'`: `{ one: 'st', two: 'nd', few: 'rd', other: 'th' }`. */
export type OrdinalSuffixes = Partial<Record<Intl.LDMLPluralRule, string>>

/** Ordinal suffixes of languages that write them right after the digits. */
export const ORDINALS: Readonly<Record<string, OrdinalSuffixes>> = {
  en: { one: 'st', two: 'nd', few: 'rd', other: 'th' },
  fr: { one: 'er', other: 'e' },
}

/** Read suffixes written as `'one=er other=e'`. */
export const parseOrdinals = (text: string): OrdinalSuffixes =>
  Object.fromEntries(
    text
      .trim()
      .split(/\s+/)
      .map(pair => pair.split('='))
      .filter(pair => pair.length === 2 && pair[0])
  ) as OrdinalSuffixes

/**
 * The ordinal suffix of the whole number nearest to a value, in `locale`:
 * `ordinal('en', ORDINALS.en)(22)` is `'nd'`. Categories without a suffix
 * use `other`.
 */
export const ordinal = (locale: string | undefined, suffixes: OrdinalSuffixes) => {
  const rules = new Intl.PluralRules(locale, { type: 'ordinal' })
  return (value: number) =>
    suffixes[rules.select(Math.abs(Math.round(value)))] ?? suffixes.other ?? ''
}

/**
 * Read `Intl.NumberFormat` options from words, for HTML:
 * `'compact'`, `'percent'`, `'scientific'`, `'engineering'`,
 * `'currency:EUR'`, `'unit:kilometer-per-hour'`, `'long'` and `'narrow'`
 * (how the currency, unit or compact notation is written) and `'sign'`
 * (a `+` on positive values). Words combine: `'compact currency:USD'`.
 * Unknown words are ignored.
 */
export const parseFormat = (text: string): Intl.NumberFormatOptions => {
  const options: Intl.NumberFormatOptions = {}
  for (const word of text.trim().split(/\s+/)) {
    const [name, value] = word.split(':')
    if (name === 'compact') options.notation = 'compact'
    else if (name === 'scientific' || name === 'engineering') options.notation = name
    else if (name === 'percent') options.style = 'percent'
    else if (name === 'currency' && value) Object.assign(options, { style: name, currency: value })
    else if (name === 'unit' && value) Object.assign(options, { style: name, unit: value })
    else if (name === 'long')
      Object.assign(options, {
        compactDisplay: 'long',
        unitDisplay: 'long',
        currencyDisplay: 'name',
      })
    else if (name === 'narrow')
      Object.assign(options, { unitDisplay: 'narrow', currencyDisplay: 'narrowSymbol' })
    else if (name === 'sign') options.signDisplay = 'exceptZero'
  }
  return options
}

/** A named format: `Intl.NumberFormat` options, or a function that writes the text. */
export type CounterFormat = Intl.NumberFormatOptions | ((value: number, element: Element) => string)

const systems = new Map<string, string | undefined>()

/**
 * The `Intl` numbering system whose zero is `zero`: `'latn'` for `'0'`,
 * `'arab'` for `'٠'`, `'deva'` for `'०'`. `undefined` when the browser
 * cannot tell.
 */
export const numberingSystem = (zero: string): string | undefined => {
  if (zero === '0') return 'latn'
  if (!systems.has(zero)) {
    const all =
      (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
        'numberingSystem'
      ) ?? []
    systems.set(
      zero,
      all.find(
        system => new Intl.NumberFormat('en', { numberingSystem: system }).format(0) === zero
      )
    )
  }
  return systems.get(zero)
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

export const STARTS = ['visible', 'load', 'manual', 'scroll'] as const

export const KINDS = ['number', 'time', 'date'] as const

/**
 * What the number means: a plain `number` (default), a `time` in seconds
 * shown as a clock (`23:59:59`), or a `date` counted day by day.
 */
export type CounterKind = (typeof KINDS)[number]

export const DATE_STYLES = ['full', 'long', 'medium', 'short'] as const

export const REDUCED_MOTIONS = ['final', 'count'] as const

/**
 * With `prefers-reduced-motion: reduce`, `'final'` (default) shows the final
 * value and never counts; `'count'` counts anyway.
 */
export type CounterReducedMotion = (typeof REDUCED_MOTIONS)[number]

/**
 * When counting starts: once the element is `visible` (default), on `load`
 * (as soon as it is set up), `manual` (when you call `start()`), or `scroll`:
 * the value follows the scroll position instead of time (main entry only;
 * the lite entry treats it as `visible`).
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
  /**
   * Units per second instead of a fixed `duration`, so a small number takes
   * less time than a big one: `500` counts to 1,000 in two seconds. Seconds
   * per second with `as: 'time'`, days per second with `as: 'date'`.
   */
  speed?: number
  /** Milliseconds before counting starts. Defaults to `0`. */
  delay?: number
  /**
   * Milliseconds added to the delay of each next element of this call, so a
   * row of numbers starts one after another. A `data-counter-stagger`
   * container staggers its `[data-counter]` elements instead.
   */
  stagger?: number
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
  /**
   * Ordinal suffixes that follow the value: `21st` counts `1st`, `2nd`,
   * `3rd`. By default, a suffix of English or French that matches the final
   * value is recognized. `true` adds the language's suffixes (English when
   * it has none), an object sets them by `Intl.PluralRules` ordinal category
   * (`{ one: 'er', other: 'e' }`), and `false` leaves the suffix as written.
   * Whole numbers only.
   */
  ordinal?: boolean | OrdinalSuffixes
  /**
   * Keep the layout still while counting: digits get equal widths
   * (`tabular-nums`) and the element reserves the width of the wider of its
   * start and final text, so nothing around it moves. Defaults to `false`.
   */
  steady?: boolean
  /**
   * Roll each digit like an odometer while counting, instead of rewriting
   * the text. The last digit spins fastest and every column shows the real
   * digit of its place. Numbers only; text whose digits do not follow the
   * value (clocks, dates, `'8K'`, negative numbers) counts as text. Not in
   * the lite entry. Defaults to `false`.
   */
  roll?: boolean
  /**
   * Show the final text with random digits while counting, and settle them
   * from left to right as the count goes on, like a code being cracked.
   * Works with numbers, clocks and dates; `roll` wins when both apply. Not
   * in the lite entry. Defaults to `false`.
   */
  scramble?: boolean
  /** BCP 47 locale for formatting. Defaults to the closest `lang` attribute. */
  locale?: string
  /**
   * Extra `Intl.NumberFormat` options, for example `{ style: 'percent' }` or
   * `{ notation: 'compact' }`. Since 1.13.0 also the name of a format from
   * `defineFormat()`, or words such as `'compact currency:USD'`.
   */
  format?: Intl.NumberFormatOptions | string
  /** Full control over the text. Replaces `locale`, `decimals` and `format`. */
  formatter?: (value: number, element: Element) => string
  /**
   * While the text is not final (waiting, counting or paused), expose the
   * final value to screen readers as the element's label, so they never read
   * a number in between. Applies to elements without a role of their own
   * (`span`, `strong`, `data`, `time`, `div`…) and no `role` or label
   * attribute. Defaults to `true`.
   */
  label?: boolean
  /**
   * Announce new values from `set()`, `increment()`, `decrement()` or a live
   * attribute in a polite live region once they are shown: `true` reads the
   * final text, a string is a template where `{value}` is the final text,
   * such as `'{value} people online'`. Defaults to `false`.
   */
  announce?: boolean | string
  /**
   * What `prefers-reduced-motion: reduce` does: `'final'` (default) shows
   * the final value and never counts; `'count'` counts anyway, for numbers
   * whose change is the content, such as a score.
   */
  reducedMotion?: CounterReducedMotion
  /** Count again every time the element enters. Defaults to `false`. */
  repeat?: boolean
  /**
   * With `start: 'scroll'`, where the element's center is, as a share of the
   * root's height from the top, when the count is at its start and when it is
   * at its end. Defaults to `[1, 0.5]`: from the bottom edge to the middle.
   */
  scrollRange?: [number, number]
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
  /**
   * The text the counter shows for `value`, with the element's own format,
   * template, clock or date style. Uses the first element when none is given.
   */
  format: (value: number, element?: Element) => string
  /** Listen to an event. Returns a function that stops listening. */
  on: (event: CounterEvent, listener: CounterListener) => () => void
  destroy: () => void
}

export const ATTRIBUTE = 'data-counter'
/** DOM events are dispatched as `counter:start`, `counter:complete`, and so on. */
export const EVENT_PREFIX = 'counter:'
export const STATE_ATTRIBUTE = 'data-counter-state'
