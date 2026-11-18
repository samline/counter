import {
  autoInit,
  isBrowser,
  noop,
  onReducedMotionChange,
  prefersReducedMotion,
  readBoolean,
  readNumber,
  readString,
  resolveElements,
  type AutoInitController,
  type ElementTarget,
} from '@samline/internal'
import { observeVisibility } from '@samline/is-visible'
import {
  type Easing,
  isEasingName,
  type AnimateNumberOptions,
  resolveEasing,
  fractionDigits,
  parseNumber,
  safeLocale,
  type CounterState,
  type CounterOptions,
  type AutoCounterOptions,
  ATTRIBUTE,
  STATE_ATTRIBUTE,
} from '../core/counter.js'

/**
 * Animate a number from `from` to `to` over time, frame by frame. Returns a
 * function that cancels it. Without `requestAnimationFrame` (on the server),
 * or with a duration of `0`, it jumps to `to` at once.
 */
export const animateNumber = ({
  from = 0,
  to,
  duration = 2000,
  delay = 0,
  easing,
  onUpdate,
  onComplete,
}: AnimateNumberOptions): (() => void) => {
  const ease = resolveEasing(easing)
  const finish = () => {
    onUpdate(to)
    onComplete?.()
  }

  if (duration <= 0 || typeof requestAnimationFrame !== 'function') {
    finish()
    return noop
  }

  let frame = 0
  let start: number | null = null
  const step = (now: number) => {
    start ??= now + Math.max(0, delay)
    const progress = Math.min(Math.max((now - start) / duration, 0), 1)
    if (progress >= 1) return finish()
    onUpdate(from + (to - from) * ease(progress))
    frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)

  return () => cancelAnimationFrame(frame)
}

interface Setup {
  from: number
  to: number
  duration: number
  delay: number
  easing: Easing
  repeat: boolean
  format: (value: number) => string
  /** The element's own child nodes, restored on cleanup so inner markup survives. */
  original: Node[]
}

const prepare = (element: HTMLElement, options: CounterOptions): Setup | null => {
  const locale = safeLocale(
    readString(element, 'data-counter-locale', '') ||
      options.locale ||
      element.closest('[lang]')?.getAttribute('lang') ||
      undefined
  )
  const original = element.textContent ?? ''
  const nodes = Array.from(element.childNodes)

  // Final value: the attribute, then the option, then the visible text.
  const raw = element.getAttribute(ATTRIBUTE)?.trim() ?? ''
  const fromAttribute = raw && Number.isFinite(Number(raw)) ? Number(raw) : null
  const parsed =
    fromAttribute === null && options.to === undefined ? parseNumber(original, locale) : null
  const to = fromAttribute ?? options.to ?? parsed?.value
  if (to === undefined) return null

  let inferred = fromAttribute !== null ? fractionDigits(raw) : (parsed?.decimals ?? 0)
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

  let format: (value: number) => string
  if (options.formatter) {
    const custom = options.formatter
    format = value => custom(value, element)
  } else {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...options.format,
    })
    // Values rounding to zero on the way up from a negative start would read "-0".
    const negativeZero = formatter.format(-0)
    const zero = formatter.format(0)
    format = value => {
      const text = formatter.format(value)
      return text === negativeZero ? zero : text
    }
  }

  const easingAttribute = element.getAttribute('data-counter-easing')?.trim()

  return {
    from: readNumber(element, 'data-counter-from', options.from ?? 0),
    to,
    duration: readNumber(element, 'data-counter-duration', options.duration ?? 2000),
    delay: readNumber(element, 'data-counter-delay', options.delay ?? 0),
    easing: isEasingName(easingAttribute) ? easingAttribute : (options.easing ?? 'ease-out'),
    repeat: readBoolean(element, 'data-counter-repeat', options.repeat ?? false),
    format,
    original: nodes,
  }
}

/**
 * Count numbers as they scroll into view.
 *
 * Render the final value in the HTML (`<span data-counter>1,234</span>`):
 * it stays visible without JavaScript and for search engines. When the
 * script runs, each element shows `from` and counts to the final value once
 * half of it is visible. With reduced motion it keeps the final value.
 *
 * Returns a cleanup that stops everything and restores the original content.
 */
export const counter = (
  target: ElementTarget = `[${ATTRIBUTE}]`,
  options: CounterOptions = {}
): (() => void) => {
  if (!isBrowser()) return noop

  const setups = new Map<HTMLElement, Setup>()
  for (const element of resolveElements(target)) {
    if (!(element instanceof HTMLElement)) continue
    const setup = prepare(element, options)
    if (setup) setups.set(element, setup)
  }
  if (setups.size === 0) return noop

  const cancels = new Map<HTMLElement, () => void>()
  const cleanups: Array<() => void> = []
  const reduced = prefersReducedMotion()

  const setState = (element: HTMLElement, state: CounterState) =>
    element.setAttribute(STATE_ATTRIBUTE, state)

  const stop = (element: HTMLElement) => {
    cancels.get(element)?.()
    cancels.delete(element)
  }

  const show = (element: HTMLElement, value: number) => {
    element.textContent = setups.get(element)!.format(value)
  }

  const complete = (element: HTMLElement) => {
    stop(element)
    show(element, setups.get(element)!.to)
    setState(element, 'done')
    options.onComplete?.(element)
  }

  const start = (element: HTMLElement) => {
    const setup = setups.get(element)!
    stop(element)
    if (prefersReducedMotion()) return complete(element)
    setState(element, 'counting')
    options.onStart?.(element)
    cancels.set(
      element,
      animateNumber({
        from: setup.from,
        to: setup.to,
        duration: setup.duration,
        delay: setup.delay,
        easing: setup.easing,
        onUpdate: value => {
          show(element, value)
          options.onUpdate?.(value, element)
        },
        onComplete: () => {
          cancels.delete(element)
          complete(element)
        },
      })
    )
  }

  const reset = (element: HTMLElement) => {
    stop(element)
    show(element, setups.get(element)!.from)
    setState(element, 'pending')
  }

  const groups = new Map<boolean, HTMLElement[]>()
  setups.forEach((setup, element) => {
    if (reduced) {
      // Keep the text as rendered; nothing moves.
      setState(element, 'done')
      options.onComplete?.(element)
      return
    }
    reset(element)
    groups.set(setup.repeat, [...(groups.get(setup.repeat) ?? []), element])
  })

  groups.forEach((group, repeat) => {
    cleanups.push(
      observeVisibility(group, {
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? '0px',
        threshold: options.threshold ?? 0.5,
        once: !repeat,
        inOut: repeat,
        visible: (_, element) => start(element as HTMLElement),
        notVisible: (_, element) => {
          if (!prefersReducedMotion()) reset(element as HTMLElement)
        },
      })
    )
  })

  cleanups.push(
    onReducedMotionChange(isReduced => {
      if (!isReduced) return
      setups.forEach((_, element) => {
        if (element.getAttribute(STATE_ATTRIBUTE) !== 'done') complete(element)
      })
    })
  )

  let active = true
  return () => {
    if (!active) return
    active = false
    cleanups.forEach(cleanup => cleanup())
    setups.forEach((setup, element) => {
      stop(element)
      element.replaceChildren(...setup.original)
      element.removeAttribute(STATE_ATTRIBUTE)
    })
  }
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
