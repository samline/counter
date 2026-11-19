import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter, getCounter } from '../src/index.js'
import { counter as lite } from '../src/lite/index.js'
import { el, emit, installMock, installMotion, state } from './helpers.js'

beforeEach(() => {
  installMock()
  installMotion(false)
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'],
  })
  vi.stubGlobal('innerHeight', 800)
  document.documentElement.setAttribute('lang', 'en')
})

afterEach(() => {
  document.querySelectorAll('[data-counter]').forEach(node => getCounter(node)?.destroy())
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Put an element (with no height) at `top` pixels from the top of the viewport. */
const place = (node: Element, top: number) =>
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ top, height: 0 } as DOMRect)

/** Scroll so the element is at `top`, and let the next frame measure it. */
const scrollTo = (node: Element, top: number, target: EventTarget = window) => {
  place(node, top)
  target.dispatchEvent(new Event('scroll'))
  vi.advanceTimersByTime(16)
}

describe("start: 'scroll'", () => {
  it('follows the scroll position both ways', () => {
    const node = el({ 'data-counter': '100', 'data-counter-start': 'scroll' }, '100')
    place(node, 1000)
    const events: string[] = []
    const c = counter(node, { easing: 'linear' })
    ;(['start', 'reset', 'complete'] as const).forEach(name => c.on(name, () => events.push(name)))
    expect(state(node)).toBe('pending')
    expect(node.textContent).toBe('0')

    // The center from the bottom edge (800) to the middle (400).
    scrollTo(node, 700)
    expect(state(node)).toBe('counting')
    expect(node.textContent).toBe('25')
    scrollTo(node, 500)
    expect(node.textContent).toBe('75')
    scrollTo(node, 300)
    expect(state(node)).toBe('done')
    expect(node.textContent).toBe('100')
    scrollTo(node, 600)
    expect(node.textContent).toBe('50')
    scrollTo(node, 900)
    expect(state(node)).toBe('pending')
    expect(node.textContent).toBe('0')
    expect(events).toEqual(['start', 'complete', 'start', 'reset'])
  })

  it('measures once a frame', () => {
    const node = el({ 'data-counter': '100', 'data-counter-start': 'scroll' }, '100')
    place(node, 1000)
    const onUpdate = vi.fn()
    counter(node, { easing: 'linear', onUpdate })
    place(node, 600)
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(16)
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('takes a range and a scroll container', () => {
    const box = document.body.appendChild(document.createElement('div'))
    vi.spyOn(box, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 400 } as DOMRect)
    const node = el(
      { 'data-counter': '10', 'data-counter-start': 'scroll', 'data-counter-scroll-range': '1 0' },
      '10',
      box
    )
    place(node, 600)
    counter(node, { easing: 'linear', root: box })
    // 300 of 400 from the top of the box: three quarters of the way down.
    scrollTo(node, 400, box)
    expect(node.textContent).toBe('3')
    const other = el({ 'data-counter': '10' }, '10')
    place(other, 700)
    counter(other, { easing: 'linear', start: 'scroll', scrollRange: [0.5, 0.5] })
    expect(state(other)).toBe('pending')
    scrollTo(other, 300)
    expect(state(other)).toBe('done')
  })

  it('shows a new value at the same place of the scroll', () => {
    const node = el({ 'data-counter': '100', 'data-counter-start': 'scroll' }, '100')
    place(node, 600)
    const c = counter(node, { easing: 'linear', announce: true })
    expect(node.textContent).toBe('50')
    c.set(200)
    expect(node.textContent).toBe('100')
    scrollTo(node, 0)
    expect(node.textContent).toBe('200')
    c.set(300)
    expect(node.textContent).toBe('300')
    vi.advanceTimersByTime(150)
    expect(document.querySelector('[data-counter-announcer]')!.textContent).toBe('300')
  })

  it('ignores a root without height, and stops on destroy', () => {
    const box = document.body.appendChild(document.createElement('div'))
    const node = el({ 'data-counter': '10', 'data-counter-start': 'scroll' }, '10', box)
    place(node, 0)
    counter(node, { root: box })
    expect(state(node)).toBe('pending')

    const other = el({ 'data-counter': '10', 'data-counter-start': 'scroll' }, '10')
    place(other, 1000)
    const c = counter(other)
    c.destroy()
    scrollTo(other, 0)
    expect(other.textContent).toBe('10')
    expect(other.hasAttribute('data-counter-state')).toBe(false)
  })

  it('keeps the final value with reduced motion', () => {
    installMotion(true)
    const node = el({ 'data-counter': '10', 'data-counter-start': 'scroll' }, '10')
    place(node, 1000)
    counter(node)
    scrollTo(node, 600)
    expect(node.textContent).toBe('10')
    expect(state(node)).toBe('done')
  })

  it('rolls with roll', () => {
    const node = el({ 'data-counter': '100', 'data-counter-start': 'scroll' }, '100')
    place(node, 600)
    counter(node, { easing: 'linear', roll: true })
    expect(node.querySelector('[dir="ltr"]')).not.toBeNull()
  })

  it('starts on visibility in the lite entry', () => {
    const node = el({ 'data-counter': '10', 'data-counter-start': 'scroll' }, '10')
    lite(node, { duration: 0 })
    expect(state(node)).toBe('pending')
    emit(node, 'in')
    expect(state(node)).toBe('done')
  })
})
