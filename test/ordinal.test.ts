import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ORDINALS, counter, getCounter, ordinal } from '../src/index.js'
import { counter as lite } from '../src/lite/index.js'
import { el, installMock, installMotion } from './helpers.js'

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

/** The text a manual counter shows for `value`. */
const text = (node: HTMLElement, value: number) => counter(node, { start: 'manual' }).format(value)

describe('ordinal', () => {
  it('writes the suffix of the nearest whole number', () => {
    const en = ordinal('en', ORDINALS.en!)
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 2.6].map(en)).toEqual([
      'st',
      'nd',
      'rd',
      'th',
      'th',
      'th',
      'th',
      'st',
      'nd',
      'rd',
      'st',
      'th',
      'rd',
    ])
    expect(ordinal('fr', ORDINALS.fr!)(1)).toBe('er')
    expect(ordinal('fr', ORDINALS.fr!)(2)).toBe('e')
    // A category without a suffix uses `other`.
    expect(ordinal('en', { other: '.' })(2)).toBe('.')
    expect(ordinal('en', {})(2)).toBe('')
  })

  it('recognizes an English suffix that matches the final value', () => {
    const node = el({ 'data-counter': '21' }, '21st place')
    expect([1, 2, 3, 12, 21].map(value => text(node, value))).toEqual([
      '1st place',
      '2nd place',
      '3rd place',
      '12th place',
      '21st place',
    ])
  })

  it('counts through the ordinals and ends on the rendered text', () => {
    const node = el({ 'data-counter': '' }, '3rd')
    const c = counter(node, { duration: 1000, easing: 'linear', start: 'load' })
    const seen = new Set<string>()
    for (let t = 0; t < 1200; t += 100) {
      vi.advanceTimersByTime(100)
      seen.add(node.textContent!)
    }
    expect([...seen]).toEqual(expect.arrayContaining(['1st', '2nd', '3rd']))
    expect(c.getSnapshot()[0]!.state).toBe('done')
  })

  it('recognizes French suffixes', () => {
    const node = el({ 'data-counter': '2', lang: 'fr' }, '2e')
    expect(text(node, 1)).toBe('1er')
    expect(text(node, 2)).toBe('2e')
  })

  it('leaves other suffixes and other languages alone', () => {
    expect(text(el({ 'data-counter': '21' }, '21 people'), 2)).toBe('2 people')
    // "st" does not match 22, so it is not an ordinal.
    expect(text(el({ 'data-counter': '22' }, '22st'), 2)).toBe('2st')
    // A word that starts like a suffix is not one.
    expect(text(el({ 'data-counter': '4' }, '4things'), 1)).toBe('1things')
    expect(text(el({ 'data-counter': '3', lang: 'es' }, '3.º'), 1)).toBe('1.º')
    expect(text(el({ 'data-counter': '2.5' }, '2.5th'), 1)).toBe('1.0th')
  })

  it('takes suffixes from the attribute or the option', () => {
    const node = el({ 'data-counter': '2', 'data-counter-ordinal': 'one=º other=º' }, '2')
    expect(text(node, 1)).toBe('1º')
    const custom = el({ 'data-counter': '3', lang: 'es' }, '3')
    const c = counter(custom, { start: 'manual', ordinal: { other: '.ª' } })
    expect(c.format(1)).toBe('1.ª')
  })

  it('adds the language suffixes with true, English when the language has none', () => {
    expect(text(el({ 'data-counter': '3', 'data-counter-ordinal': '' }, '3'), 2)).toBe('2nd')
    expect(
      text(el({ 'data-counter': '3', 'data-counter-ordinal': 'true', lang: 'de' }, '3'), 1)
    ).toBe('1st')
    const node = el({ 'data-counter': '3', lang: 'fr' }, '3')
    expect(counter(node, { start: 'manual', ordinal: true }).format(1)).toBe('1er')
  })

  it('can be turned off', () => {
    expect(text(el({ 'data-counter': '21', 'data-counter-ordinal': 'false' }, '21st'), 2)).toBe(
      '2st'
    )
    const node = el({ 'data-counter': '21' }, '21st')
    expect(counter(node, { start: 'manual', ordinal: false }).format(2)).toBe('2st')
  })

  it('works in the lite entry', () => {
    const node = el({ 'data-counter': '21' }, '21st')
    expect(lite(node, { start: 'manual' }).format(22)).toBe('22nd')
  })
})
