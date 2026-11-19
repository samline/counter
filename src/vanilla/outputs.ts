import { resolveElements } from '@samline/internal'
import type { CounterOptions, CounterOutput } from '../core/counter.js'
import type { PartFactory } from './controller.js'

interface Targets {
  /** Where `--counter-value` and `--counter-progress` are set, or `null`. */
  vars: HTMLElement | null
  /** Elements that receive the value: `<progress>`, `<meter>`, inputs or `aria-valuenow`. */
  outputs: Element[]
  output: CounterOutput | null
}

/** Run a selector without letting an invalid one throw. */
const attempt = <T>(read: () => T, fallback: T): T => {
  try {
    return read()
  } catch {
    return fallback
  }
}

const outputsOf = (element: HTMLElement, options: CounterOptions): Targets => {
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

/** `cssVars` and `output`: write the value on screen to CSS variables and other elements. */
export const outputs: PartFactory = () => {
  const targets = new Map<HTMLElement, Targets>()
  // What outputs held before, and where CSS variables were set, to restore on destroy.
  const originals = new Map<Element, { value: string; aria: string | null }>()
  const styled = new Set<HTMLElement>()
  return {
    read: (element, options) => targets.set(element, outputsOf(element, options)),
    paint: (element, value, progress) => {
      const { vars, outputs, output } = targets.get(element)!
      if (vars) {
        styled.add(vars)
        vars.style.setProperty('--counter-value', `${value}`)
        vars.style.setProperty('--counter-progress', `${progress}`)
      }
      outputs.forEach(target => {
        if (!originals.has(target))
          originals.set(target, {
            value: isField(target) ? `${target.value}` : '',
            aria: target.getAttribute('aria-valuenow'),
          })
        if (isField(target)) target.value = value as never
        else target.setAttribute('aria-valuenow', `${value}`)
      })
      output?.(value, element, progress)
    },
    destroy: () => {
      styled.forEach(target => {
        target.style.removeProperty('--counter-value')
        target.style.removeProperty('--counter-progress')
        if (!target.getAttribute('style')) target.removeAttribute('style')
      })
      originals.forEach(({ value, aria }, target) => {
        if (isField(target)) target.value = value as never
        if (aria === null) target.removeAttribute('aria-valuenow')
        else target.setAttribute('aria-valuenow', aria)
      })
    },
  }
}
