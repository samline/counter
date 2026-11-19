import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { counter, defineFormat, getCounter, parseFormat } from '../src/index.js'
import { counter as lite, defineFormat as defineLite } from '../src/lite/index.js'
import { el, installMock, installMotion } from './helpers.js'

beforeEach(() => {
  installMock()
  installMotion(false)
  document.documentElement.setAttribute('lang', 'en')
})

afterEach(() => {
  document.querySelectorAll('[data-counter]').forEach(node => getCounter(node)?.destroy())
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
})

/** The text a manual counter of `node` shows for `value`. */
const show = (node: HTMLElement, value: number, options = {}) =>
  counter(node, { start: 'manual', ...options }).format(value)

describe('parseFormat', () => {
  it('reads Intl.NumberFormat options from words', () => {
    expect(parseFormat('compact')).toEqual({ notation: 'compact' })
    expect(parseFormat('scientific')).toEqual({ notation: 'scientific' })
    expect(parseFormat('engineering')).toEqual({ notation: 'engineering' })
    expect(parseFormat('percent sign')).toEqual({ style: 'percent', signDisplay: 'exceptZero' })
    expect(parseFormat(' compact  currency:USD long ')).toEqual({
      notation: 'compact',
      style: 'currency',
      currency: 'USD',
      compactDisplay: 'long',
      unitDisplay: 'long',
      currencyDisplay: 'name',
    })
    expect(parseFormat('unit:liter narrow')).toEqual({
      style: 'unit',
      unit: 'liter',
      unitDisplay: 'narrow',
      currencyDisplay: 'narrowSymbol',
    })
    // Unknown words and words without their value are ignored.
    expect(parseFormat('fancy currency unit: ')).toEqual({})
  })
})

describe('data-counter-format', () => {
  it('formats with words, without JavaScript options', () => {
    expect(
      show(el({ 'data-counter': '1500', 'data-counter-format': 'compact' }, '1.5K'), 1500)
    ).toBe('1.5K')
    expect(
      show(el({ 'data-counter': '0.86', 'data-counter-format': 'percent' }, '86%'), 0.42)
    ).toBe('42%')
    expect(show(el({ 'data-counter': '5', 'data-counter-format': 'sign' }, '+5'), 3)).toBe('+3')
    expect(
      show(
        el({ 'data-counter': '120', 'data-counter-format': 'unit:kilometer-per-hour long' }, '120'),
        80
      )
    ).toBe('80 kilometers per hour')
    const euros = el(
      { 'data-counter': '1234', 'data-counter-format': 'currency:EUR', lang: 'de' },
      '1.234 €'
    )
    expect(show(euros, 1234).replace(/\s/g, ' ')).toBe('1.234 €')
  })

  it('uses formats defined by name, as options or functions', () => {
    defineFormat('money', { style: 'currency', currency: 'USD' })
    defineFormat('bytes', value =>
      value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB` : `${Math.round(value / 1e3)} KB`
    )
    expect(show(el({ 'data-counter': '25', 'data-counter-format': 'money' }, '$25'), 12)).toBe(
      '$12'
    )
    expect(
      show(el({ 'data-counter': '2400000', 'data-counter-format': 'bytes' }, '2.4 MB'), 512e3)
    ).toBe('512 KB')
    // The option takes a name too.
    expect(show(el({ 'data-counter': '2400000' }, '2.4 MB'), 2.4e6, { format: 'bytes' })).toBe(
      '2.4 MB'
    )
    // A function format writes clocks and dates too.
    defineFormat('minutes', value => `${Math.round(value / 60)} min`)
    const clock = el(
      { 'data-counter': '', 'data-counter-as': 'time', 'data-counter-format': 'minutes' },
      '1:30:00'
    )
    expect(show(clock, 1800)).toBe('30 min')
  })

  it('wins over the format option, and a defined name wins over words', () => {
    const node = el({ 'data-counter': '1500', 'data-counter-format': 'compact' }, '1,500')
    expect(show(node, 1500, { format: { style: 'percent' } })).toBe('1.5K')
    defineFormat('compact', { notation: 'compact', compactDisplay: 'long' })
    const other = el({ 'data-counter': '1500', 'data-counter-format': 'compact' }, '1,500')
    expect(show(other, 1500)).toBe('1.5 thousand')
    // Words in the option, when the element has no attribute.
    expect(show(el({ 'data-counter': '5' }, '5'), 3, { format: 'sign' })).toBe('+3')
  })

  it('leaves the text template alone without a format', () => {
    expect(show(el({ 'data-counter': '8000' }, '8,000 visits'), 1200)).toBe('1,200 visits')
    expect(show(el({ 'data-counter': '8000', 'data-counter-format': '' }, '8000'), 1200)).toBe(
      '1200'
    )
  })

  it('shares defined formats with the lite entry', () => {
    defineLite('stars', value => '★'.repeat(Math.round(value)))
    const node = el({ 'data-counter': '3', 'data-counter-format': 'stars' }, '★★★')
    expect(lite(node, { start: 'manual' }).format(2)).toBe('★★')
    const other = el({ 'data-counter': '3', 'data-counter-format': 'stars' }, '★★★')
    expect(show(other, 1)).toBe('★')
  })
})
