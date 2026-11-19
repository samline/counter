import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as full from '../src/index.js'
import lite, { autoCounter, counter, getCounter } from '../src/lite/index.js'
import { el, emit, installMock, installMotion, state } from './helpers.js'

beforeEach(() => {
  installMock()
  installMotion(false)
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'],
  })
  document.documentElement.setAttribute('lang', 'en')
})

afterEach(() => {
  document.querySelectorAll('[data-counter]').forEach(node => getCounter(node)?.destroy())
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
})

const run = (ms: number) => vi.advanceTimersByTime(ms)

describe('lite entry', () => {
  it('counts numbers with the template, controller and label', () => {
    const node = el({ 'data-counter': '' }, '$1,250/mo')
    const c = counter(node, { duration: 1000 })
    expect(lite).toBe(counter)
    expect(node.textContent).toBe('$0/mo')
    expect(node.getAttribute('aria-label')).toBe('$1,250/mo')
    emit(node, 'in')
    run(1100)
    expect(node.textContent).toBe('$1,250/mo')
    c.increment(750)
    run(1100)
    expect(node.textContent).toBe('$2,000/mo')
    expect(c.format(5)).toBe('$5/mo')
  })

  it('leaves clocks and dates as rendered', () => {
    const clock = el({ 'data-counter': '', 'data-counter-as': 'time' }, '01:30')
    const date = el({ 'data-counter-as': 'date', datetime: '2026-12-31' }, 'Dec 31')
    expect(counter([clock, date]).elements).toEqual([])
    expect(clock.textContent).toBe('01:30')
    expect(clock.hasAttribute('data-counter-state')).toBe(false)
  })

  it('ignores the options of the parts it leaves out', () => {
    const node = el({ 'data-counter': '5' }, '5')
    const output = vi.fn()
    const c = counter(node, {
      duration: 0,
      cssVars: true,
      output,
      steady: true,
      announce: true,
    })
    emit(node, 'in')
    c.set(6)
    run(200)
    expect(node.textContent).toBe('6')
    expect(output).not.toHaveBeenCalled()
    expect(node.hasAttribute('style')).toBe(false)
    expect(document.querySelector('[data-counter-announcer]')).toBeNull()
  })

  it('shares getCounter and one owner per element with the main entry', () => {
    const node = el({ 'data-counter': '5' }, '5')
    const c = counter(node)
    expect(full.getCounter(node)).toBe(c)
    expect(full.counter(node)).toBe(c)
  })

  it('has autoCounter', () => {
    el({ 'data-counter': '7' }, '7')
    const auto = autoCounter()
    expect(document.querySelector('[data-counter]')!.getAttribute('data-counter-state')).toBe(
      'pending'
    )
    auto.destroy()
    expect(state(document.querySelector('[data-counter]')!)).toBeNull()
  })
})
