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
  numberingSystem,
  REDUCED_MOTIONS,
  parseNumber,
  readShape,
  safeLocale,
  STARTS,
  KINDS,
  type CounterKind,
  type CounterStart,
  type CounterReducedMotion,
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

/** Elements without a role of their own, which `label` may turn into a labelled image. */
const GENERIC = /^(SPAN|DIV|B|STRONG|EM|I|SMALL|MARK|SUB|SUP|DATA|TIME)$/

/** Compare texts regardless of the kind of spaces (French groups with a narrow no-break space). */
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/** What a kind of value reads from an element: its range, its text and its steps. */
export interface Value {
  from: number
  to: number
  format: (value: number) => string
  /** Whole steps shown while counting, in the unit of the value; `0` for none. */
  step: number
  /** What one unit of `speed` is. Defaults to `1`. */
  unit?: number
}

/** Reads a kind of value other than a plain number, such as a clock or a date. */
export type KindReader = (
  element: HTMLElement,
  original: string,
  options: CounterOptions,
  locale: string | undefined
) => Value | null

interface Setup extends Required<Value> {
  duration: number
  delay: number
  easing: Easing
  repeat: boolean
  start: CounterStart
  /** Units per second, or `0` to use `duration`. */
  speed: number
  /** Count to the new value when `data-counter` or `datetime` changes. */
  live: boolean
  /** The final value is the rendered text: put the original nodes back when done. */
  restore: boolean
  /** Give assistive technology the final value while the text counts. */
  label: boolean
  /** `'count'` counts even with reduced motion. */
  motion: CounterReducedMotion
}

export const readFinal = (element: HTMLElement) => {
  const raw = element.getAttribute(ATTRIBUTE)?.trim() ?? ''
  return { raw, number: raw && Number.isFinite(Number(raw)) ? Number(raw) : null }
}

const numberValue: KindReader = (element, original, options, locale) => {
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
    // Digits stay in the script the HTML writes them in: `١٬٢٣٤` counts in Arabic-Indic.
    const system = shape && numberingSystem(shape.zero)
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...(system && { numberingSystem: system }),
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

const prepare = (
  element: HTMLElement,
  original: string,
  options: CounterOptions,
  kinds: Partial<Record<CounterKind, KindReader>>
): Setup | null => {
  const locale = safeLocale(
    readString(element, 'data-counter-locale', '') ||
      options.locale ||
      element.closest('[lang]')?.getAttribute('lang') ||
      undefined
  )
  const kind = readEnum(element, 'data-counter-as', KINDS, options.as ?? 'number')
  // A kind this entry does not include leaves the element as rendered.
  const value = (kind === 'number' ? numberValue : kinds[kind])?.(
    element,
    original,
    options,
    locale
  )
  if (!value) return null

  const easingAttribute = element.getAttribute('data-counter-easing')?.trim()

  return {
    unit: 1,
    ...value,
    step: Math.max(0, value.step),
    duration: readNumber(element, 'data-counter-duration', options.duration ?? 2000),
    delay: readNumber(element, 'data-counter-delay', options.delay ?? 0),
    easing: isEasing(easingAttribute) ? easingAttribute : (options.easing ?? 'ease-out'),
    speed: Math.max(0, readNumber(element, 'data-counter-speed', options.speed ?? 0)),
    repeat: readBoolean(element, 'data-counter-repeat', options.repeat ?? false),
    live: readBoolean(element, 'data-counter-live', options.live ?? true),
    label: readBoolean(element, 'data-counter-label', options.label ?? true),
    motion: readEnum(
      element,
      'data-counter-reduced-motion',
      REDUCED_MOTIONS,
      options.reducedMotion ?? 'final'
    ),
    start: readEnum(element, 'data-counter-start', STARTS, options.start ?? 'visible'),
    // End on the original markup when it reads exactly like the final value.
    restore: normalize(value.format(value.to)) === normalize(original),
  }
}

/** Show only whole steps away from the start; the end stays exact. */
const snap = ({ from, to, step }: Setup, value: number) =>
  step > 0 && value !== to ? from + Math.trunc((value - from) / step) * step : value

/* ------------------------------------------------------------------------ */
/* Parts                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * An optional piece of behavior, created once per controller. The full entry
 * includes every part; the lite entry none, so their code is left out.
 */
export interface Part {
  /** Read the element's settings: on creation, `update()`, `refresh()` and live values. */
  read?: (element: HTMLElement, options: CounterOptions) => void
  /** Every time the value on screen changes, with progress from `0` to `1`. */
  paint?: (element: HTMLElement, value: number, progress: number) => void
  /** Before counting (or waiting) from `from`, with a function that writes any value. */
  ready?: (element: HTMLElement, from: number, to: number, text: (value: number) => string) => void
  /**
   * Show a value while counting or waiting, instead of the plain text.
   * Returns `true` when it did; the final value is always plain text.
   */
  write?: (element: HTMLElement, value: number, text: string) => boolean
  /** A new value from `set()`, `increment()`, `decrement()` or a live attribute is shown. */
  changed?: (element: HTMLElement, text: string) => void
  /** The controller is destroyed and the markup restored. */
  destroy?: () => void
}

export type PartFactory = () => Part

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
  /** The element has a role or label of its own (a cell, a heading, `aria-label`): leave it alone. */
  named: boolean
  /** A new value from `set()` or a live attribute is on its way. */
  news: boolean
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
    format: () => '',
    on: () => noop,
    destroy: noop,
  })
  return controller
}

/** The controller counting `element`, or `null`. */
export const getCounter = (element: Element | null | undefined): CounterController | null =>
  (element instanceof HTMLElement && owners.get(element)) || null

/** Build `counter()` from the kinds of values and the parts an entry includes. */
export const createCounter =
  (kinds: Partial<Record<CounterKind, KindReader>>, factories: readonly PartFactory[]) =>
  (target: ElementTarget = `[${ATTRIBUTE}]`, options: CounterOptions = {}): CounterController => {
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
    const parts = factories.map(create => create())
    /** Read an element's setup, and let every part read its own settings. */
    const configure = (element: HTMLElement, text: string) => {
      const setup = prepare(element, text, current, kinds)
      if (setup) parts.forEach(part => part.read?.(element, current))
      return setup
    }

    const entries = new Map<HTMLElement, Entry>()
    for (const element of fresh) {
      const text = element.textContent ?? ''
      const setup = configure(element, text)
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
          named:
            !GENERIC.test(element.tagName) ||
            ['role', 'aria-label', 'aria-labelledby'].some(name => element.hasAttribute(name)),
          news: false,
        })
    }
    if (entries.size === 0) {
      parts.forEach(part => part.destroy?.())
      return inert()
    }
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

    /** The final value as text: what the number reads when it is done. */
    const finalText = ({ setup, text }: Entry) =>
      normalize(setup.restore ? text : setup.format(setup.to))

    /**
     * While the text is not final, expose the final value instead: the element
     * becomes an image labelled with it, so the digits in between are not read.
     */
    const describe = (element: HTMLElement) => {
      const entry = entries.get(element)!
      if (entry.named) return
      if (entry.setup.label && entry.state !== 'done') {
        element.setAttribute('role', 'img')
        element.setAttribute('aria-label', finalText(entry))
      } else {
        element.removeAttribute('role')
        element.removeAttribute('aria-label')
      }
    }

    const setState = (element: HTMLElement, state: CounterState) => {
      entries.get(element)!.state = state
      element.setAttribute(STATE_ATTRIBUTE, state)
      describe(element)
    }

    /** Reduced motion applies to this element: it jumps to its final value. */
    const still = (element: HTMLElement) =>
      entries.get(element)!.setup.motion === 'final' && prefersReducedMotion()

    /** Let parts follow the value on screen. */
    const paint = (element: HTMLElement, value: number) => {
      const entry = entries.get(element)!
      entry.value = value
      const { setup } = entry
      const span = setup.to - setup.from
      const progress = span === 0 ? 1 : Math.min(Math.max((value - setup.from) / span, 0), 1)
      parts.forEach(part => part.paint?.(element, value, progress))
    }

    /** Let parts prepare for a count from `from`, such as `steady` reserving the width. */
    const hold = (element: HTMLElement, from: number) => {
      const { setup } = entries.get(element)!
      parts.forEach(part =>
        part.ready?.(element, from, setup.to, value => setup.format(snap(setup, value)))
      )
    }

    const show = (element: HTMLElement, value: number, final = false) => {
      const entry = entries.get(element)!
      paint(element, snap(entry.setup, value))
      const text = entry.setup.format(entry.value)
      if (final || !parts.some(part => part.write?.(element, entry.value, text)))
        element.textContent = text
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
      } else show(element, entry.setup.to, true)
    }

    const complete = (element: HTMLElement) => {
      const entry = entries.get(element)!
      stop(element)
      showFinal(element)
      setState(element, 'done')
      if (entry.news) parts.forEach(part => part.changed?.(element, finalText(entry)))
      entry.news = false
      current.onComplete?.(element)
      emit('complete', element)
    }

    const begin = (element: HTMLElement, from?: number) => {
      const { setup } = entries.get(element)!
      stop(element)
      if (still(element)) return complete(element)
      const start = from ?? setup.from
      hold(element, start)
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
      const { from } = entries.get(element)!.setup
      hold(element, from)
      show(element, from)
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
          if (still(element)) return
          rewind(element)
          emit('reset', element)
        },
      })
    }

    /** Put an element in its first state, as on creation. */
    const arm = (element: HTMLElement) => {
      if (still(element)) {
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
      entry.setup = {
        ...setup,
        restore: normalize(setup.format(setup.to)) === normalize(entry.text),
      }
      entry.news = true
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
              const setup = configure(element, entry.text)
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
        const setup = configure(element, entry.text)
        // The text was readable once; keep the old setup if the attribute became invalid.
        if (setup) entry.setup = setup
        const { state } = entry
        if (state === 'counting' || state === 'paused') begin(element)
        else if (state === 'done') showFinal(element)
        else show(element, entry.setup.from)
        describe(element)
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
        if (!entry.named) {
          element.removeAttribute('role')
          element.removeAttribute('aria-label')
        }
      })
      listeners.clear()
      parts.forEach(part => part.destroy?.())
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
      format: (value: number, element?: Element) => {
        const [target] = targets(element)
        return target ? entries.get(target)!.setup.format(value) : ''
      },
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
        if (entry.state !== 'done' && still(element)) complete(element)
      })
    })

    entries.forEach((_, element) => arm(element))

    return controller
  }

/** Build `autoCounter()` for an entry's `counter()`. */
export const createAutoCounter =
  (counter: ReturnType<typeof createCounter>) =>
  ({
    selector = `[${ATTRIBUTE}]`,
    scope,
    observe = true,
    ...options
  }: AutoCounterOptions = {}): AutoInitController =>
    autoInit({
      selector,
      observe,
      ...(scope && { root: scope }),
      init: element => counter(element, options),
    })
