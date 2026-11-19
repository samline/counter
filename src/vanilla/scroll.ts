import { readNumberPair } from '@samline/internal'
import type { PartFactory } from './controller.js'

/**
 * `start: 'scroll'`: the value follows the scroll position. Progress is `0`
 * while the element's center is at the first share of the root's height
 * (`1`, the bottom edge, by default) and `1` at the second (`0.5`, the middle).
 */
export const scroll: PartFactory = () => ({
  follow: (element, seek, options) => {
    const [start, end] = readNumberPair(
      element,
      'data-counter-scroll-range',
      options.scrollRange ?? [1, 0.5]
    )
    const root = options.root instanceof Element ? options.root : null
    const source: EventTarget = root ?? window
    let frame = 0
    const measure = () => {
      frame = 0
      const box = root?.getBoundingClientRect() ?? { top: 0, height: innerHeight }
      if (!box.height) return
      const rect = element.getBoundingClientRect()
      const at = (rect.top + rect.height / 2 - box.top) / box.height
      seek(start === end ? (at <= end ? 1 : 0) : (start - at) / (start - end))
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(measure)
    }
    source.addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      source.removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
    }
  },
})
