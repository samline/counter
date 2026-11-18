import {
  autoInit,
  isBrowser,
  noop,
  onReducedMotionChange,
  prefersReducedMotion,
  readBoolean,
  readEnum,
  readNumber,
  readString,
  resolveElements,
  type AutoInitController,
  type ElementTarget,
} from '@samline/internal'
import { observeVisibility } from '@samline/is-visible'
import {
  type Easing,
  isEasing,
  type AnimateNumberOptions,
  type NumberAnimation,
  resolveEasing,
  fractionDigits,
  parseNumber,
  readShape,
  readClock,
  writeClock,
  readDate,
  isDateOnly,
  safeLocale,
  STARTS,
  KINDS,
  DATE_STYLES,
  DAY,
  type CounterStart,
  type CounterOutput,
  type CounterState,
  type CounterEvent,
  type CounterListener,
  type CounterSnapshot,
  type CounterController,
  type CounterOptions,
  type AutoCounterOptions,
  ATTRIBUTE,
  EVENT_PREFIX,
  STATE_ATTRIBUTE,
} from '../core/counter.js'

/* ------------------------------------------------------------------------ */
/* Tween                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * The eased, time-based tween behind `animateNumber`, with pause, resume and
 * retarget. Time spent paused does not count.
 */
const createTween = ({
  from = 0,
  to,
  duration = 2000,
  delay = 0,
  easing,
  onUpdate,
  onComplete,
}: AnimateNumberOptions): NumberAnimation => {
  const ease = resolveEasing(easing)
  const frames = typeof requestAnimationFrame === 'function'
  let start = from
  let end = to
  let length = duration
  let value = from
  let frame = 0
  // Negative while waiting for the delay.
  let elapsed = -Math.max(0, delay)
  let last: number | null = null
  let running = false
  let over = false
  let cancelled = false

  const emit = (next: number) => {
    value = next
    onUpdate(next)
  }
  const finish = () => {
    over = true
    running = false
    emit(end)
    onComplete?.()
  }
  const step = (now: number) => {
    if (last !== null) elapsed += now - last
    last = now
    const progress = Math.min(Math.max(elapsed / length, 0), 1)
    if (progress >= 1) return finish()
    emit(start + (end - start) * ease(progress))
    frame = requestAnimationFrame(step)
  }
  const play = () => {
    if (length <= 0 || !frames) return finish()
    running = true
    last = null
    frame = requestAnimationFrame(step)
  }
  const halt = () => {
    if (frames) cancelAnimationFrame(frame)
    running = false
  }
  const cancel = () => {
    halt()
    cancelled = over = true
  }
  play()

  return Object.assign(() => cancel(), {
    cancel,
    pause: halt,
    resume: () => {
      if (!running && !over) play()
    },
    retarget: (next: number, nextDuration = length) => {
      if (cancelled) return
      halt()
      start = value
      end = next
      length = nextDuration
      elapsed = 0
      over = false
      play()
    },
    getValue: () => value,
    isRunning: () => running,
  })
}

/**
 * Animate a number from `from` to `to` over time, frame by frame. Returns a
 * function that cancels it, with `pause()`, `resume()`, `retarget(to)` and
 * `getValue()`. Without `requestAnimationFrame` (on the server), or with a
 * duration of `0`, it jumps to `to` at once.
 */
export const animateNumber = (options: AnimateNumberOptions): NumberAnimation =>
  createTween(options)

/* ------------------------------------------------------------------------ */
/* Setup                                                                     */
/* ------------------------------------------------------------------------ */

const GROUPINGS = ['auto', 'true', 'false'] as const

/** Compare texts regardless of the kind of spaces (French groups with a narrow no-break space). */
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

interface Setup {
  from: number
  to: number
  duration: number
  delay: number
  easing: Easing
  repeat: boolean
  start: CounterStart
  /** Whole steps shown while counting, in the unit of the value; `0` for none. */
  step: number
  /** Units per second, or `0` to use `duration`. */
  speed: number
  /** What one unit of `speed` is: `1`, or a day in milliseconds for dates. */
  unit: number
  /** Count to the new value when `data-counter` or `datetime` changes. */
  live: boolean
  /** Where `--counter-value` and `--counter-progress` are set, or `null`. */
  vars: HTMLElement | null
  /** Elements that receive the value: `<progress>`, `<meter>`, inputs or `aria-valuenow`. */
  outputs: Element[]
  output: CounterOutput | null
  format: (value: number) => string
  /** The final value is the rendered text: put the original nodes back when done. */
  restore: boolean
}

type Value = Pick<Setup, 'from' | 'to' | 'format' | 'step'>

const readFinal = (element: HTMLElement) => {
  const raw = element.getAttribute(ATTRIBUTE)?.trim() ?? ''
  return { raw, number: raw && Number.isFinite(Number(raw)) ? Number(raw) : null }
}

const numberValue = (
  element: HTMLElement,
  original: string,
  options: CounterOptions,
  locale: string | undefined
): Value | null => {
  // Final value: the attribute, then the option, then the visible text.
  const { raw, number: fromAttribute } = readFinal(element)
  const fromText =
    fromAttribute === null && options.to === undefined ? parseNumber(original, locale) : null
  const to = fromAttribute ?? options.to ?? fromText?.value
  if (to === undefined) return null

  let inferred = fromAttribute !== null ? fractionDigits(raw) : (fromText?.decimals ?? 0)
  // Percent formatting multiplies by 100: 0.25 is "25%", with no decimals.
  if (options.format?.style === 'percent' && fromAttribute !== null)
    inferred = Math.max(0, inferred - 2)
  const decimals = Math.min(
    Math.max(
      0,
      Math.round(readNumber(element, 'data-counter-decimals', options.decimals ?? inferred))
    ),
    20
  )

  // The rendered text is the template: its prefix and suffix stay unless a
  // `format` style adds its own symbols, and grouping follows it on 'auto'.
  const shape = options.formatter ? null : readShape(original, locale)
  const style = options.format?.style
  const affixes = shape && (!style || style === 'decimal') ? shape : null
  const grouping = readEnum(
    element,
    'data-counter-grouping',
    GROUPINGS,
    `${options.grouping ?? 'auto'}`
  )
  const useGrouping =
    grouping === 'false' ||
    (grouping === 'auto' && shape && shape.integerDigits >= 4 && !shape.grouped)
      ? { useGrouping: false }
      : null

  let format: (value: number) => string
  if (options.formatter) {
    const custom = options.formatter
    format = value => custom(value, element)
  } else {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...useGrouping,
      ...options.format,
    })
    // Values rounding to zero on the way up from a negative start would read "-0".
    const negativeZero = formatter.format(-0)
    const zero = formatter.format(0)
    const prefix = affixes?.prefix ?? ''
    const suffix = affixes?.suffix ?? ''
    format = value => {
      const text = formatter.format(value)
      return prefix + (text === negativeZero ? zero : text) + suffix
    }
  }

  return {
    from: readNumber(element, 'data-counter-from', options.from ?? 0),
    to,
    format,
    step: readNumber(element, 'data-counter-step', options.step ?? 0),
  }
}

const timeValue = (
  element: HTMLElement,
  original: string,
  options: CounterOptions,
  locale: string | undefined
): Value | null => {
  const clock = readClock(original)
  const to = readFinal(element).number ?? options.to ?? clock?.seconds
  if (to === undefined) return null

  const fromAttribute = element.getAttribute('data-counter-from')?.trim() ?? ''
  const from = fromAttribute.includes(':')
    ? (readClock(fromAttribute)?.seconds ?? 0)
    : readNumber(element, 'data-counter-from', options.from ?? 0)

  const fields = clock?.fields ?? (Math.max(from, to) >= 3600 ? 3 : 2)
  const padded = clock?.padded ?? true
  const one = new Intl.NumberFormat(locale, { useGrouping: false })
  const two = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 2 })
  const digits = (value: number, pad: boolean) => (pad ? two : one).format(value)
  const custom = options.formatter

  return {
    from,
    to,
    format: custom
      ? value => custom(value, element)
      : value =>
          (clock?.prefix ?? '') + writeClock(value, fields, padded, digits) + (clock?.suffix ?? ''),
    step: readNumber(element, 'data-counter-step', options.step ?? 1),
  }
}

const dateValue = (
  element: HTMLElement,
  options: CounterOptions,
  locale: string | undefined
): Value | null => {
  const written = element.getAttribute('datetime') || readFinal(element).raw
  const to = readDate(written) ?? readDate(options.to)
  if (to === null) return null
  const utc = isDateOnly(written)
  const year = new Date(to)

  const fromAttribute = element.getAttribute('data-counter-from') ?? ''
  const from =
    readDate(fromAttribute) ??
    readDate(options.from) ??
    (utc ? Date.UTC(year.getUTCFullYear(), 0, 1) : new Date(year.getFullYear(), 0, 1).getTime())

  const dateStyle = readEnum(element, 'data-counter-date-style', DATE_STYLES, 'long')
  const formatter = new Intl.DateTimeFormat(locale, {
    ...(utc && { timeZone: 'UTC' }),
    ...(element.hasAttribute('data-counter-date-style') || !options.dateFormat
      ? { dateStyle }
      : options.dateFormat),
  })
  const custom = options.formatter

  return {
    from,
    to,
    format: custom ? value => custom(value, element) : value => formatter.format(value),
    step: readNumber(element, 'data-counter-step', options.step ?? 1) * DAY,
  }
}

const prepare = (element: HTMLElement, original: string, options: CounterOptions): Setup | null => {
  const locale = safeLocale(
    readString(element, 'data-counter-locale', '') ||
      options.locale ||
      element.closest('[lang]')?.getAttribute('lang') ||
      undefined
  )
  const kind = readEnum(element, 'data-counter-as', KINDS, options.as ?? 'number')
  const value =
    kind === 'time'
      ? timeValue(element, original, options, locale)
      : kind === 'date'
        ? dateValue(element, options, locale)
        : numberValue(element, original, options, locale)
  if (!value) return null

  const easingAttribute = element.getAttribute('data-counter-easing')?.trim()

  return {
    ...value,
    step: Math.max(0, value.step),
    duration: readNumber(element, 'data-counter-duration', options.duration ?? 2000),
    delay: readNumber(element, 'data-counter-delay', options.delay ?? 0),
    easing: isEasing(easingAttribute) ? easingAttribute : (options.easing ?? 'ease-out'),
    speed: Math.max(0, readNumber(element, 'data-counter-speed', options.speed ?? 0)),
    unit: kind === 'date' ? DAY : 1,
    repeat: readBoolean(element, 'data-counter-repeat', options.repeat ?? false),
    live: readBoolean(element, 'data-counter-live', options.live ?? true),
    ...outputsOf(element, options),
    start: readEnum(element, 'data-counter-start', STARTS, options.start ?? 'visible'),
    // End on the original markup when it reads exactly like the final value.
    restore: normalize(value.format(value.to)) === normalize(original),
  }
}

/** Run a selector without letting an invalid one throw. */
const attempt = <T>(read: () => T, fallback: T): T => {
  try {
    return read()
  } catch {
    return fallback
  }
}

const outputsOf = (
  element: HTMLElement,
  options: CounterOptions
): Pick<Setup, 'vars' | 'outputs' | 'output'> => {
  const varsAttribute = element.getAttribute('data-counter-css-vars')?.trim()
  const vars =
    varsAttribute === undefined
      ? (options.cssVars ?? false)
      : varsAttribute === '' || varsAttribute === 'true'
        ? true
        : varsAttribute === 'false'
          ? false
          : varsAttribute
  const target = element.getAttribute('data-counter-output')?.trim() || options.output
  return {
    vars:
      vars === true
        ? element
        : typeof vars === 'string'
          ? attempt(() => element.closest<HTMLElement>(vars), null)
          : null,
    outputs:
      !target || typeof target === 'function'
        ? []
        : attempt(() => Array.from(resolveElements(target)), [] as Element[]),
    output: typeof target === 'function' ? target : null,
  }
}

const isField = (
  element: Element
): element is HTMLProgressElement | HTMLMeterElement | HTMLInputElement =>
  element instanceof HTMLProgressElement ||
  element instanceof HTMLMeterElement ||
  element instanceof HTMLInputElement

/** Show only whole steps away from the start; the end stays exact. */
const snap = ({ from, to, step }: Setup, value: number) =>
  step > 0 && value !== to ? from + Math.trunc((value - from) / step) * step : value

/* ------------------------------------------------------------------------ */
/* Controller                                                                */
/* ------------------------------------------------------------------------ */

interface Entry {
  setup: Setup
  /** The element's own child nodes, restored on cleanup so inner markup survives. */
  nodes: Node[]
  text: string
  tween: NumberAnimation | null
  value: number
  state: CounterState
  /** Stops watching visibility. */
  unwatch: () => void
  /** Extra delay before the first count, from `stagger`. */
  offset: number
}

/** Which live controller owns an element. */
const owners = new WeakMap<HTMLElement, CounterController>()

const inert = (): CounterController => {
  const controller: CounterController = Object.assign(() => {}, {
    elements: [] as readonly HTMLElement[],
    set: () => controller,
    increment: () => controller,
    decrement: () => controller,
    start: () => controller,
    pause: () => controller,
    resume: () => controller,
    reset: () => controller,
    finish: () => controller,
    update: () => controller,
    refresh: () => controller,
    getSnapshot: () => [],
    on: () => noop,
    destroy: noop,
  })
  return controller
}

/** The controller counting `element`, or `null`. */
export const getCounter = (element: Element | null | undefined): CounterController | null =>
  (element instanceof HTMLElement && owners.get(element)) || null

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
export const counter = (
  target: ElementTarget = `[${ATTRIBUTE}]`,
  options: CounterOptions = {}
): CounterController => {
  if (!isBrowser()) return inert()

  const found = Array.from(resolveElements(target)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
  const fresh = found.filter(element => !owners.has(element))
  if (fresh.length === 0) {
    const existing = new Set(found.map(element => owners.get(element)))
    return existing.size === 1 ? [...existing][0]! : inert()
  }

  let current = options
  const entries = new Map<HTMLElement, Entry>()
  for (const element of fresh) {
    const text = element.textContent ?? ''
    const setup = prepare(element, text, current)
    if (setup)
      entries.set(element, {
        setup,
        nodes: Array.from(element.childNodes),
        text,
        tween: null,
        value: setup.to,
        state: 'done',
        unwatch: noop,
        offset: 0,
      })
  }
  if (entries.size === 0) return inert()

  /** Extra delay from `stagger`, or from a `data-counter-stagger` container. */
  const stagger = () =>
    [...entries].forEach(([element, entry], index) => {
      const container = element.closest('[data-counter-stagger]')
      entry.offset = container
        ? readNumber(container, 'data-counter-stagger', 0) *
          Math.max(0, Array.from(container.querySelectorAll(`[${ATTRIBUTE}]`)).indexOf(element))
        : (current.stagger ?? 0) * index
    })
  stagger()

  const listeners = new Map<CounterEvent, Set<CounterListener>>()
  let active = true

  const emit = (event: CounterEvent, element: HTMLElement) => {
    const entry = entries.get(element)!
    const detail = { element, value: entry.value, state: entry.state }
    listeners.get(event)?.forEach(listener => listener(detail))
    if (event !== 'update')
      element.dispatchEvent(new CustomEvent(EVENT_PREFIX + event, { bubbles: true, detail }))
  }

  const setState = (element: HTMLElement, state: CounterState) => {
    entries.get(element)!.state = state
    element.setAttribute(STATE_ATTRIBUTE, state)
  }

  // What outputs held before, and where CSS variables were set, to restore on destroy.
  const originals = new Map<Element, { value: string; aria: string | null }>()
  const styled = new Set<HTMLElement>()

  /** Write the value to CSS variables and outputs. */
  const paint = (element: HTMLElement, value: number) => {
    const entry = entries.get(element)!
    entry.value = value
    const { setup } = entry
    const span = setup.to - setup.from
    const progress = span === 0 ? 1 : Math.min(Math.max((value - setup.from) / span, 0), 1)
    if (setup.vars) {
      styled.add(setup.vars)
      setup.vars.style.setProperty('--counter-value', `${value}`)
      setup.vars.style.setProperty('--counter-progress', `${progress}`)
    }
    setup.outputs.forEach(output => {
      if (!originals.has(output))
        originals.set(output, {
          value: isField(output) ? `${output.value}` : '',
          aria: output.getAttribute('aria-valuenow'),
        })
      if (isField(output)) output.value = value as never
      else output.setAttribute('aria-valuenow', `${value}`)
    })
    setup.output?.(value, element, progress)
  }

  const show = (element: HTMLElement, value: number) => {
    const entry = entries.get(element)!
    paint(element, snap(entry.setup, value))
    element.textContent = entry.setup.format(entry.value)
  }

  const stop = (element: HTMLElement) => {
    const entry = entries.get(element)!
    entry.tween?.cancel()
    entry.tween = null
  }

  const showFinal = (element: HTMLElement) => {
    const entry = entries.get(element)!
    if (entry.setup.restore) {
      paint(element, entry.setup.to)
      element.replaceChildren(...entry.nodes)
    } else show(element, entry.setup.to)
  }

  const complete = (element: HTMLElement) => {
    stop(element)
    showFinal(element)
    setState(element, 'done')
    current.onComplete?.(element)
    emit('complete', element)
  }

  const begin = (element: HTMLElement, from?: number) => {
    const { setup } = entries.get(element)!
    stop(element)
    if (prefersReducedMotion()) return complete(element)
    const start = from ?? setup.from
    show(element, start)
    setState(element, 'counting')
    current.onStart?.(element)
    emit('start', element)
    entries.get(element)!.tween = createTween({
      from: start,
      to: setup.to,
      duration:
        setup.speed > 0
          ? (Math.abs(setup.to - start) / setup.unit / setup.speed) * 1000
          : setup.duration,
      // Only the first count waits; new values move at once.
      delay: from === undefined ? setup.delay + entries.get(element)!.offset : 0,
      easing: setup.easing,
      onUpdate: value => {
        show(element, value)
        current.onUpdate?.(entries.get(element)!.value, element)
        emit('update', element)
      },
      onComplete: () => {
        entries.get(element)!.tween = null
        complete(element)
      },
    })
  }

  /** Show the start value and wait. */
  const rewind = (element: HTMLElement) => {
    stop(element)
    show(element, entries.get(element)!.setup.from)
    setState(element, 'pending')
  }

  /** Watch visibility for elements that start on it and can still start. */
  const watch = (element: HTMLElement) => {
    const entry = entries.get(element)!
    entry.unwatch()
    entry.unwatch = noop
    const { setup } = entry
    if (setup.start !== 'visible' || (!setup.repeat && entry.state !== 'pending')) return
    entry.unwatch = observeVisibility(element, {
      root: current.root ?? null,
      rootMargin: current.rootMargin ?? '0px',
      threshold: current.threshold ?? 0.5,
      once: !setup.repeat,
      inOut: setup.repeat,
      visible: () => begin(element),
      notVisible: () => {
        if (prefersReducedMotion()) return
        rewind(element)
        emit('reset', element)
      },
    })
  }

  /** Put an element in its first state, as on creation. */
  const arm = (element: HTMLElement) => {
    if (prefersReducedMotion()) {
      // Keep the text as rendered; nothing moves.
      stop(element)
      element.replaceChildren(...entries.get(element)!.nodes)
      paint(element, entries.get(element)!.setup.to)
      setState(element, 'done')
      current.onComplete?.(element)
      emit('complete', element)
      return
    }
    rewind(element)
    if (entries.get(element)!.setup.start === 'load') begin(element)
    watch(element)
  }

  const targets = (element?: Element): HTMLElement[] =>
    !active
      ? []
      : element === undefined
        ? [...entries.keys()]
        : entries.has(element as HTMLElement)
          ? [element as HTMLElement]
          : []

  const command =
    (action: (element: HTMLElement, entry: Entry) => void) =>
    (element?: Element): CounterController => {
      targets(element).forEach(target => action(target, entries.get(target)!))
      return controller
    }

  /** Count from the value on screen to a new final value. */
  const glide = (element: HTMLElement, setup: Setup) => {
    const entry = entries.get(element)!
    entry.setup = { ...setup, restore: normalize(setup.format(setup.to)) === normalize(entry.text) }
    // Waiting elements count to the new value when they start.
    if (entry.state !== 'pending') begin(element, entry.value)
  }

  const retarget =
    (next: (entry: Entry, amount: number) => number) =>
    (amount = 1, element?: Element): CounterController => {
      targets(element).forEach(target => {
        const entry = entries.get(target)!
        const to = next(entry, amount)
        if (Number.isFinite(to)) glide(target, { ...entry.setup, to })
      })
      return controller
    }

  // Live values: count to a new `data-counter` or `datetime` as soon as it changes.
  const mutations =
    typeof MutationObserver === 'function'
      ? new MutationObserver(records =>
          new Set(records.map(record => record.target as HTMLElement)).forEach(element => {
            const entry = entries.get(element)
            if (!active || !entry?.setup.live) return
            const setup = prepare(element, entry.text, current)
            if (setup && setup.to !== entry.setup.to) glide(element, setup)
          })
        )
      : null
  entries.forEach((_, element) =>
    mutations?.observe(element, { attributes: true, attributeFilter: [ATTRIBUTE, 'datetime'] })
  )

  const reprepare = () => {
    stagger()
    entries.forEach((entry, element) => {
      const setup = prepare(element, entry.text, current)
      // The text was readable once; keep the old setup if the attribute became invalid.
      if (setup) entry.setup = setup
      const { state } = entry
      if (state === 'counting' || state === 'paused') begin(element)
      else if (state === 'done') showFinal(element)
      else show(element, entry.setup.from)
      watch(element)
    })
  }

  const destroy = () => {
    if (!active) return
    active = false
    stopMotion()
    mutations?.disconnect()
    entries.forEach((entry, element) => {
      entry.unwatch()
      stop(element)
      element.replaceChildren(...entry.nodes)
      element.removeAttribute(STATE_ATTRIBUTE)
      owners.delete(element)
    })
    listeners.clear()
    styled.forEach(target => {
      target.style.removeProperty('--counter-value')
      target.style.removeProperty('--counter-progress')
      if (!target.getAttribute('style')) target.removeAttribute('style')
    })
    originals.forEach(({ value, aria }, output) => {
      if (isField(output)) output.value = value as never
      if (aria === null) output.removeAttribute('aria-valuenow')
      else output.setAttribute('aria-valuenow', aria)
    })
  }

  const controller: CounterController = Object.assign(() => destroy(), {
    elements: [...entries.keys()] as readonly HTMLElement[],
    start: command(element => begin(element)),
    set: (value: number, element?: Element) => retarget(() => value)(0, element),
    increment: retarget((entry, by) => entry.setup.to + by),
    decrement: retarget((entry, by) => entry.setup.to - by),
    pause: command((element, entry) => {
      if (entry.state !== 'counting') return
      entry.tween?.pause()
      setState(element, 'paused')
      emit('pause', element)
    }),
    resume: command((element, entry) => {
      if (entry.state !== 'paused') return
      setState(element, 'counting')
      emit('resume', element)
      entry.tween?.resume()
    }),
    reset: command(element => {
      rewind(element)
      emit('reset', element)
    }),
    finish: command((element, entry) => {
      if (entry.state !== 'done') complete(element)
    }),
    update: (next: CounterOptions) => {
      if (active) {
        current = { ...current, ...next }
        reprepare()
      }
      return controller
    },
    refresh: () => {
      if (active) reprepare()
      return controller
    },
    getSnapshot: (): CounterSnapshot[] =>
      targets().map(element => {
        const { setup, value, state } = entries.get(element)!
        const span = setup.to - setup.from
        return {
          element,
          value,
          state,
          from: setup.from,
          to: setup.to,
          progress:
            span === 0
              ? state === 'done'
                ? 1
                : 0
              : Math.min(Math.max((value - setup.from) / span, 0), 1),
        }
      }),
    on: (event: CounterEvent, listener: CounterListener) => {
      if (!active) return noop
      const set = listeners.get(event) ?? new Set()
      listeners.set(event, set.add(listener))
      return () => void set.delete(listener)
    },
    destroy,
  })

  entries.forEach((_, element) => owners.set(element, controller))

  const stopMotion = onReducedMotionChange(isReduced => {
    if (!isReduced) return
    entries.forEach((entry, element) => {
      if (entry.state !== 'done') complete(element)
    })
  })

  entries.forEach((_, element) => arm(element))

  return controller
}

/**
 * Count every `[data-counter]` element in `scope`, including elements added
 * later, and clean up elements that are removed. Returns a controller with
 * `refresh()` and `destroy()`.
 */
export const autoCounter = ({
  selector = `[${ATTRIBUTE}]`,
  scope,
  observe = true,
  ...options
}: AutoCounterOptions = {}): AutoInitController => {
  return autoInit({
    selector,
    observe,
    ...(scope && { root: scope }),
    init: element => counter(element, options),
  })
}
