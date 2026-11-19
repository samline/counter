import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter, getCounter } from '../src/index.js'
import { counter as lite } from '../src/lite/index.js'
import { el, emit, installMock, installMotion, state } from './helpers.js'

let now = 0

beforeEach(() => {
  installMock()
  installMotion(false)
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'],
  })
  now = 0
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  // Random digits are always 9, so settled digits are easy to tell apart.
  vi.spyOn(Math, 'random').mockReturnValue(0.99)
  document.documentElement.setAttribute('lang', 'en')
})

afterEach(() => {
  document.querySelectorAll('[data-counter]').forEach(node => getCounter(node)?.destroy())
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const run = (ms: number) => {
  now += ms
  vi.advanceTimersByTime(ms)
}

describe('scramble', () => {
  it('settles the digits of the final text from left to right', () => {
    const node = el({ 'data-counter': '1250', 'data-counter-scramble': '' }, '1,250')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    // Waiting: the start value, as it is.
    expect(node.textContent).toBe('0')
    emit(node, 'in')
    const seen = new Set<string>()
    for (let t = 0; t < 900; t += 100) {
      run(100)
      const progress = c.getSnapshot()[0]!.value / 1250
      const settled = Math.floor(progress * 4)
      const digits = ['1', '2', '5', '0'].map((digit, i) => (i < settled ? digit : '9'))
      expect(node.textContent).toBe(`${digits[0]},${digits.slice(1).join('')}`)
      seen.add(node.textContent!)
    }
    expect(seen.size).toBeGreaterThan(2)
    run(200)
    expect(state(node)).toBe('done')
    expect(node.textContent).toBe('1,250')
  })

  it('keeps the prefix, separators, decimals and suffix in place', () => {
    const node = el({ 'data-counter': '1250.50', 'data-counter-scramble': '' }, '$1,250.50 left')
    counter(node, { duration: 1000, easing: 'linear', start: 'load' })
    run(100)
    expect(node.textContent).toBe('$9,999.99 left')
  })

  it('draws random digits in the script of the text', () => {
    const node = el({ 'data-counter': '', 'data-counter-scramble': '' }, '١٬٢٥٠')
    node.setAttribute('lang', 'ar')
    counter(node, { duration: 1000, start: 'load' })
    run(100)
    expect(node.textContent).toBe('٩٬٩٩٩')
  })

  it('works with clocks', () => {
    const node = el(
      { 'data-counter': '', 'data-counter-as': 'time', 'data-counter-scramble': '' },
      '1:30:00'
    )
    counter(node, { duration: 1000, easing: 'linear', start: 'load' })
    run(100)
    expect(node.textContent).toBe('9:99:99')
    run(1200)
    expect(node.textContent).toBe('1:30:00')
  })

  it('changes the random digits at a steady pace, not every frame', () => {
    const node = el({ 'data-counter': '100', 'data-counter-scramble': '' }, '100')
    counter(node, { duration: 2000, easing: 'linear', start: 'load' })
    vi.mocked(Math.random).mockReturnValue(0.05)
    run(100)
    expect(node.textContent).toBe('000')
    vi.mocked(Math.random).mockReturnValue(0.55)
    // Frames within the same 50 ms keep the digits.
    vi.advanceTimersByTime(32)
    expect(node.textContent).toBe('000')
    run(50)
    expect(node.textContent).toBe('555')
  })

  it('leaves the text alone when start and final values are equal', () => {
    const node = el({ 'data-counter': '5', 'data-counter-scramble': '' }, '5')
    counter(node, { from: 5, start: 'load' })
    run(16)
    expect(node.textContent).toBe('5')
  })

  it('gives way to roll when both apply', () => {
    const node = el(
      { 'data-counter': '1250', 'data-counter-scramble': '', 'data-counter-roll': '' },
      '1,250'
    )
    counter(node, { duration: 1000, start: 'load' })
    run(100)
    expect(node.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('is off by default, can be turned off with update, and is left out of the lite entry', () => {
    const plain = el({ 'data-counter': '1250' }, '1,250')
    const c = counter(plain, { duration: 1000, easing: 'linear', start: 'manual' })
    c.update({ scramble: true }).start()
    run(500)
    expect(plain.textContent).toMatch(/9/)
    c.update({ scramble: false }).start()
    run(500)
    expect(plain.textContent).not.toMatch(/9/)
    c.destroy()

    const other = el({ 'data-counter': '1250', 'data-counter-scramble': '' }, '1,250')
    lite(other, { duration: 1000, easing: 'linear', start: 'load' })
    run(500)
    expect(other.textContent).not.toMatch(/9/)
  })

  it('does nothing with reduced motion', () => {
    installMotion(true)
    const node = el({ 'data-counter': '1250', 'data-counter-scramble': '' }, '1,250')
    counter(node, { start: 'load' })
    run(100)
    expect(node.textContent).toBe('1,250')
    expect(state(node)).toBe('done')
  })
})
