import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter, digitValue, numberingSystem, parseNumber, readShape } from '../src/index.js'
import { el, emit, installMock, installMotion } from './helpers.js'

beforeEach(() => {
  installMock()
  installMotion(false)
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'],
  })
  document.documentElement.setAttribute('lang', 'en')
})

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const run = (ms: number) => vi.advanceTimersByTime(ms)

describe('digits in any script', () => {
  it('reads the value of each digit', () => {
    expect(['7', '٧', '۷', '७', '৭', '７', '๗'].map(digitValue)).toEqual([7, 7, 7, 7, 7, 7, 7])
    expect(['0', '٠', '𝟘'].map(digitValue)).toEqual([0, 0, 0])
    // Mathematical digits come in five runs of ten in a row.
    expect(digitValue('𝟡')).toBe(9)
    expect(digitValue('x')).toBe(-1)
    expect(digitValue(undefined)).toBe(-1)
  })

  it('parses numbers written in other scripts', () => {
    expect(parseNumber('١٬٢٣٤٫٥', 'ar')).toEqual({ value: 1234.5, decimals: 1 })
    expect(parseNumber('١٢٣٫٥', 'en')).toEqual({ value: 123.5, decimals: 1 })
    expect(parseNumber('१,२३४', 'hi')).toEqual({ value: 1234, decimals: 0 })
    expect(parseNumber('１２３')).toEqual({ value: 123, decimals: 0 })
  })

  it('reads the shape and the script of the digits', () => {
    expect(readShape('١٬٢٣٤ زائر', 'ar')).toMatchObject({
      suffix: ' زائر',
      integerDigits: 4,
      grouped: true,
      zero: '٠',
    })
    expect(readShape('𝟙𝟚 pts')).toMatchObject({ suffix: ' pts', integerDigits: 2 })
  })

  it('finds the numbering system of a zero', () => {
    expect(numberingSystem('0')).toBe('latn')
    expect(numberingSystem('٠')).toBe('arab')
    expect(numberingSystem('०')).toBe('deva')
    expect(numberingSystem('x')).toBeUndefined()
    // Cached, and unknown without Intl.supportedValuesOf.
    vi.stubGlobal('Intl', { ...Intl, supportedValuesOf: undefined })
    expect(numberingSystem('٠')).toBe('arab')
    expect(numberingSystem('๐')).toBeUndefined()
  })

  it('counts in the script the HTML uses', () => {
    const arabic = el({ 'data-counter': '' }, '١٬٢٣٤')
    const devanagari = el({ 'data-counter': '' }, '१२३ अंक')
    const latin = el({ 'data-counter': '', lang: 'ar-EG' }, '1,234')
    counter([arabic, devanagari, latin], { duration: 1000, easing: 'linear' })
    expect(arabic.textContent).toBe('٠')
    expect(devanagari.textContent).toBe('० अंक')
    emit(arabic, 'in')
    emit(devanagari, 'in')
    emit(latin, 'in')
    run(516)
    expect(arabic.textContent).toMatch(/^[٠-٩٬]+$/)
    // Latin digits stay Latin, even in a language that writes others.
    expect(latin.textContent).toMatch(/^[\d,]+$/)
    run(600)
    expect(arabic.textContent).toBe('١٬٢٣٤')
    expect(devanagari.textContent).toBe('१२३ अंक')
    expect(latin.textContent).toBe('1,234')
  })

  it('lets format choose the numbering system', () => {
    const node = el({ 'data-counter': '42' }, '42')
    counter(node, { duration: 0, format: { numberingSystem: 'arab' } })
    emit(node, 'in')
    expect(node.textContent).toBe('٤٢')
  })
})

describe('steady', () => {
  /** Ten pixels per character, at a 20px font size; jsdom has no layout. */
  const measure = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      return { width: (this.textContent ?? '').length * 10 } as DOMRect
    })
    const real = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = real(element)
      return new Proxy(style, {
        get: (target, key) =>
          key === 'fontSize'
            ? '20px'
            : key === 'display'
              ? element.tagName === 'SPAN'
                ? 'inline'
                : 'block'
              : Reflect.get(target, key as string, target),
      })
    })
  }

  it('reserves the wider text and uses tabular digits while counting', () => {
    measure()
    const node = el({ 'data-counter': '12480', 'data-counter-steady': '' }, '12,480')
    counter(node, { duration: 1000 })
    // "12,480" is 60px, 3em at 20px; the box holds it from the start.
    expect(node.style.getPropertyValue('min-inline-size')).toBe('3em')
    expect(node.style.getPropertyValue('font-variant-numeric')).toBe('tabular-nums')
    expect(node.style.getPropertyValue('display')).toBe('inline-block')
    expect(node.textContent).toBe('0')
    emit(node, 'in')
    run(1100)
    expect(node.textContent).toBe('12,480')
  })

  it('takes the start when it is wider, and measures again for new values', () => {
    measure()
    const node = el({ 'data-counter': '5', 'data-counter-from': '1000' }, '5')
    const c = counter(node, { duration: 100, steady: true, grouping: true })
    expect(node.style.getPropertyValue('min-inline-size')).toBe('2.5em')
    emit(node, 'in')
    run(200)
    c.set(1_000_000)
    expect(node.style.getPropertyValue('min-inline-size')).toBe('4.5em')
  })

  it('falls back to pixels without a font size, and skips a zero width', () => {
    const node = el({ 'data-counter': '50' }, '50')
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 0,
    } as DOMRect)
    counter(node, { steady: true })
    expect(node.style.getPropertyValue('min-inline-size')).toBe('')

    vi.restoreAllMocks()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 33.2,
    } as DOMRect)
    const real = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = real(element)
      return new Proxy(style, {
        get: (target, key) =>
          key === 'fontSize' ? '' : Reflect.get(target, key as string, target),
      })
    })
    const other = el({ 'data-counter': '50' }, '50')
    counter(other, { steady: true })
    expect(other.style.getPropertyValue('min-inline-size')).toBe('34px')
  })

  it('keeps a block box, and puts the original styles back', () => {
    measure()
    const block = document.body.appendChild(document.createElement('div'))
    block.setAttribute('data-counter', '99')
    block.setAttribute('style', 'font-variant-numeric: oldstyle-nums; color: red')
    block.textContent = '99'
    const bare = el({ 'data-counter': '7' }, '7')
    const c = counter([block, bare], { steady: true })
    expect(block.style.getPropertyValue('display')).toBe('')
    expect(block.style.getPropertyValue('font-variant-numeric')).toBe('tabular-nums')
    c.destroy()
    expect(block.getAttribute('style')).toBe('font-variant-numeric: oldstyle-nums; color: red;')
    expect(bare.hasAttribute('style')).toBe(false)
  })

  it('can be turned off with update or the attribute', () => {
    measure()
    const node = el({ 'data-counter': '10' }, '10')
    const off = el({ 'data-counter': '10', 'data-counter-steady': 'false' }, '10')
    const c = counter([node, off], { steady: true, start: 'manual' })
    expect(off.hasAttribute('style')).toBe(false)
    expect(node.style.getPropertyValue('min-inline-size')).toBe('1em')
    c.update({ steady: false }).reset()
    expect(node.hasAttribute('style')).toBe(false)
  })

  it('changes nothing with reduced motion', () => {
    installMotion(true)
    const node = el({ 'data-counter': '10' }, '10')
    counter(node, { steady: true })
    expect(node.hasAttribute('style')).toBe(false)
  })
})

describe('format()', () => {
  it('writes a value the way each element shows it', () => {
    const price = el({ 'data-counter': '' }, '$1,200/mo')
    const clock = el({ 'data-counter': '', 'data-counter-as': 'time' }, '01:30')
    const c = counter([price, clock], { start: 'manual' })
    expect(c.format(1234.5)).toBe('$1,235/mo')
    expect(c.format(1234.5, price)).toBe('$1,235/mo')
    expect(c.format(75, clock)).toBe('01:15')
    expect(c.format(1, document.body)).toBe('')
    c.destroy()
    expect(c.format(1)).toBe('')
    expect(counter('.missing').format(1)).toBe('')
  })
})
