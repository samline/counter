import { readBoolean } from '@samline/internal'
import type { PartFactory } from './controller.js'

/** Inline styles `steady` sets. */
const STEADY = ['font-variant-numeric', 'display', 'min-inline-size']

/** `steady`: tabular digits and the width of the wider of the start and final text, reserved. */
export const steady: PartFactory = () => {
  const enabled = new Map<HTMLElement, boolean>()
  // Inline styles `steady` set, with what they held before, to restore on destroy.
  const held = new Map<HTMLElement, string[]>()

  const release = (element: HTMLElement) => {
    const before = held.get(element)
    if (!before) return
    held.delete(element)
    STEADY.forEach((name, i) =>
      before[i] ? element.style.setProperty(name, before[i]!) : element.style.removeProperty(name)
    )
    if (!element.getAttribute('style')) element.removeAttribute('style')
  }

  return {
    read: (element, options) =>
      enabled.set(element, readBoolean(element, 'data-counter-steady', options.steady ?? false)),
    ready: (element, from, to, text) => {
      if (!enabled.get(element)) return release(element)
      const { style } = element
      if (!held.has(element))
        held.set(
          element,
          STEADY.map(name => style.getPropertyValue(name))
        )
      style.setProperty('font-variant-numeric', 'tabular-nums')
      // A min-width needs a box; inline text becomes an inline block.
      if (getComputedStyle(element).display === 'inline')
        style.setProperty('display', 'inline-block')
      style.removeProperty('min-inline-size')
      const width = Math.max(
        ...[from, to].map(value => {
          element.textContent = text(value)
          return element.getBoundingClientRect().width
        })
      )
      // In em, so it follows the font size.
      const size = parseFloat(getComputedStyle(element).fontSize)
      if (width > 0)
        style.setProperty(
          'min-inline-size',
          size > 0 ? `${Math.ceil((width / size) * 1000) / 1000}em` : `${Math.ceil(width)}px`
        )
    },
    destroy: () => [...held.keys()].forEach(release),
  }
}
