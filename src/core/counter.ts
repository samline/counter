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

/** `pending` (showing `from`), `counting` or `done`. */
export type CounterState = 'pending' | 'counting' | 'done'

export interface CounterOptions {
  /** Starting value. Defaults to `0`. */
  from?: number
  /**
   * Final value when the element has no number in `data-counter`. By default
   * it is read from the element's text, formatted for its locale.
   */
  to?: number
  /** Milliseconds. Defaults to `2000`. */
  duration?: number
  /** Milliseconds before counting starts. Defaults to `0`. */
  delay?: number
  /** Defaults to `'ease-out'`. */
  easing?: Easing
  /** Decimals to show. Defaults to the decimals of the final value. */
  decimals?: number
  /** BCP 47 locale for formatting. Defaults to the closest `lang` attribute. */
  locale?: string
  /** Extra `Intl.NumberFormat` options, for example `{ style: 'percent' }` or `{ notation: 'compact' }`. */
  format?: Intl.NumberFormatOptions
  /** Full control over the text. Replaces `locale`, `decimals` and `format`. */
  formatter?: (value: number, element: Element) => string
  /** Count again every time the element enters. Defaults to `false`. */
  repeat?: boolean
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

export const ATTRIBUTE = 'data-counter'
export const STATE_ATTRIBUTE = 'data-counter-state'
