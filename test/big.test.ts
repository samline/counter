import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter, getCounter } from '../src/index.js'
import { readBigInt } from '../src/core/counter.js'
import { counter as lite } from '../src/lite/index.js'
import { el, installMock, installMotion, state } from './helpers.js'

const MAX = '18446744073709551615'

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

describe('big integers', () => {
  it('reads the digits of any script as a BigInt', () => {
    expect(readBigInt('18,446,744,073,709,551,615')).toBe(18446744073709551615n)
    expect(readBigInt('١٢٣', true)).toBe(-123n)
    expect(readBigInt('none')).toBeNull()
  })

  it('ends exactly on a final value past 2^53 from the attribute', () => {
    const node = el({ 'data-counter': MAX }, MAX)
    const c = counter(node, { start: 'load', grouping: true, duration: 1000 })
    expect(c.format(Number(MAX))).toBe('18,446,744,073,709,551,615')
    vi.advanceTimersByTime(1200)
    expect(state(node)).toBe('done')
    expect(node.textContent).toBe('18,446,744,073,709,551,615')
  })

  it('reads a big final value from the text, in its language and script', () => {
    const node = el({ 'data-counter': '' }, '18,446,744,073,709,551,615 hashes')
    expect(counter(node, { start: 'manual' }).format(Number(MAX))).toBe(
      '18,446,744,073,709,551,615 hashes'
    )
    const german = el({ 'data-counter': '', lang: 'de' }, '-9.007.199.254.740.993')
    expect(counter(german, { start: 'manual' }).format(-9007199254740993)).toBe(
      '-9.007.199.254.740.993'
    )
  })

  it('shows every digit in the frames in between', () => {
    const node = el({ 'data-counter': MAX }, '18,446,744,073,709,551,615')
    counter(node, { start: 'load', duration: 1000, easing: 'linear' })
    vi.advanceTimersByTime(500)
    // A double has no more than 17 significant digits; the rest are not rounded to zeros.
    expect(node.textContent).toMatch(/^\d{1,2}(,\d{3}){6}$/)
    expect(node.textContent).not.toMatch(/000$/)
  })

  it('leaves safe numbers, decimals and options alone', () => {
    expect(counter(el({ 'data-counter': '1e20' }, '1e20'), { start: 'manual' }).format(1e20)).toBe(
      '100,000,000,000,000,000,000'
    )
    expect(
      counter(el({ 'data-counter': '12345678901234567.5' }, 'x'), { start: 'manual' }).format(
        12345678901234567.5
      )
    ).toBe('12,345,678,901,234,568.0')
    expect(
      counter(el({ 'data-counter': '' }, 'x'), { start: 'manual', to: 2 ** 60 }).format(2 ** 60)
    ).toBe('1,152,921,504,606,846,976')
  })

  it('works in the lite entry', () => {
    const node = el({ 'data-counter': MAX }, MAX)
    expect(lite(node, { start: 'manual', grouping: true }).format(Number(MAX))).toBe(
      '18,446,744,073,709,551,615'
    )
  })
})
