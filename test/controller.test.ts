import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  autoCounter,
  counter,
  getCounter,
  readShape,
  type CounterEventDetail,
} from '../src/index.js'
import { el, emit, installMock, installMotion, setReducedMotion, state } from './helpers.js'

beforeEach(() => {
  installMock()
  installMotion(false)
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'],
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const run = (ms: number) => vi.advanceTimersByTime(ms)

describe('readShape', () => {
  it('finds the text around the number and how its digits are grouped', () => {
    expect(readShape('$8,000', 'en')).toEqual({
      prefix: '$',
      suffix: '',
      integerDigits: 4,
      grouped: true,
      zero: '0',
    })
    expect(readShape('8000.45 visits', 'en')).toEqual({
      prefix: '',
      suffix: ' visits',
      integerDigits: 4,
      grouped: false,
      zero: '0',
    })
    expect(readShape('8.000,45 €', 'de')).toMatchObject({ suffix: ' €', grouped: true })
    // The sign belongs to the number, not to the prefix.
    expect(readShape('−12 %', 'en')).toMatchObject({ prefix: '', suffix: ' %' })
    expect(readShape('soon')).toBeNull()
  })
})

describe('the rendered text is the template', () => {
  const final = (text: string, attribute = '', lang = 'en') => {
    document.documentElement.setAttribute('lang', lang)
    const node = el({ 'data-counter': attribute }, text)
    counter(node, { duration: 100 })
    const start = node.textContent
    emit(node, 'in')
    run(50)
    const middle = node.textContent
    run(100)
    return { start, middle, end: node.textContent }
  }

  it('keeps digits ungrouped when the HTML writes them ungrouped', () => {
    const { middle, end } = final('8000')
    expect(middle).not.toContain(',')
    expect(end).toBe('8000')
    expect(final('8000.45').end).toBe('8000.45')
    expect(final('8,000.45').end).toBe('8,000.45')
  })

  it('keeps the prefix and suffix while counting', () => {
    const money = final('$8,000')
    expect(money.start).toBe('$0')
    expect(money.middle).toMatch(/^\$\d/)
    expect(money.end).toBe('$8,000')
    expect(final('8.000,45 €', '', 'de').start).toBe('0,00 €')
    expect(final('99 items', '120').end).toBe('120 items')
  })

  it('ends on the original markup when it holds the final value', () => {
    const node = el({ 'data-counter': '100' })
    node.innerHTML = '100<sup>+</sup>'
    const sup = node.querySelector('sup')
    counter(node, { duration: 0 })
    emit(node, 'in')
    expect(node.innerHTML).toBe('100<sup>+</sup>')
    expect(node.querySelector('sup')).toBe(sup)
  })

  /** Count `text` to the end with `options` and attribute overrides. */
  const done = (
    text: string,
    options = {},
    attributes: Record<string, string> = {},
    lang = 'en'
  ) => {
    document.documentElement.setAttribute('lang', lang)
    const node = el({ 'data-counter': '', ...attributes }, text)
    counter(node, { duration: 0, ...options })
    emit(node, 'in')
    return node.textContent
  }

  it('groups as the locale does with grouping: true, keeping the template', () => {
    expect(done('8000', { grouping: true })).toBe('8,000')
    expect(done('$8000', { grouping: true })).toBe('$8,000')
    expect(done('8000 visits', {}, { 'data-counter-grouping': 'true' })).toBe('8,000 visits')
    expect(done('8000,5', { grouping: true }, {}, 'de')).toBe('8.000,5')
    expect(
      done('8000', {}, { 'data-counter-grouping': 'true', 'data-counter-decimals': '2' })
    ).toBe('8,000.00')
  })

  it('never groups with grouping: false', () => {
    expect(done('8,000', { grouping: false })).toBe('8000')
    // The attribute wins over the option.
    expect(done('8,000', { grouping: true }, { 'data-counter-grouping': 'false' })).toBe('8000')
  })

  it('keeps the template with format, unless its style adds symbols', () => {
    expect(done('8000 visits', { format: { notation: 'compact' } })).toBe('8K visits')
    expect(done('$8000', { format: { style: 'currency', currency: 'USD' } })).toBe('$8000')
    expect(done('8000', { grouping: true, format: { style: 'currency', currency: 'USD' } })).toBe(
      '$8,000'
    )
    // format.useGrouping still wins over grouping.
    expect(done('8000', { format: { useGrouping: true } })).toBe('8,000')
  })

  it('leaves the text to formatter', () => {
    expect(done('$8000', { formatter: (value: number) => `${value} pts` })).toBe('8000 pts')
  })

  it('ends on the formatted value when it differs from the markup', () => {
    const node = el({ 'data-counter': '' })
    node.innerHTML = '8000<sup>+</sup>'
    counter(node, { duration: 0, grouping: true, locale: 'en' })
    emit(node, 'in')
    expect(node.innerHTML).toBe('8,000+')
  })
})

describe('controller', () => {
  it('is callable like the 1.0 cleanup and exposes its elements', () => {
    const a = el({ 'data-counter': '10' }, '10')
    const b = el({ 'data-counter': '20' }, '20')
    const c = counter([a, b])
    expect(c.elements).toEqual([a, b])
    expect(getCounter(a)).toBe(c)
    c()
    expect(a.textContent).toBe('10')
    expect(getCounter(a)).toBeNull()
  })

  it('returns the existing controller for elements it already counts', () => {
    const a = el({ 'data-counter': '10' }, '10')
    const b = el({ 'data-counter': '20' }, '20')
    const first = counter([a, b])
    expect(counter(a)).toBe(first)
    // Mixed: only the new element gets a controller.
    const c = el({ 'data-counter': '30' }, '30')
    const second = counter([a, c])
    expect(second).not.toBe(first)
    expect(second.elements).toEqual([c])
  })

  it('starts, pauses, resumes and finishes on command', () => {
    const node = el({ 'data-counter': '100' }, '100')
    const c = counter(node, { duration: 1000, easing: 'linear', start: 'manual' })
    emit(node, 'in')
    expect(state(node)).toBe('pending')

    c.start()
    run(500)
    c.pause()
    expect(state(node)).toBe('paused')
    const paused = Number(node.textContent)
    run(2000)
    expect(Number(node.textContent)).toBe(paused)

    c.resume()
    expect(state(node)).toBe('counting')
    run(300)
    // Paused time does not count: still short of the end.
    expect(Number(node.textContent)).toBeLessThan(100)
    c.finish()
    expect(node.textContent).toBe('100')
    expect(state(node)).toBe('done')
  })

  it('resets to the start value and can count again', () => {
    const node = el({ 'data-counter': '50' }, '50')
    const c = counter(node, { duration: 100 })
    emit(node, 'in')
    run(200)
    c.reset()
    expect(node.textContent).toBe('0')
    expect(state(node)).toBe('pending')
    c.start()
    run(200)
    expect(node.textContent).toBe('50')
  })

  it('acts on one element when given', () => {
    const a = el({ 'data-counter': '10' }, '10')
    const b = el({ 'data-counter': '20' }, '20')
    const c = counter([a, b], { start: 'manual' })
    c.finish(b)
    expect(state(a)).toBe('pending')
    expect(state(b)).toBe('done')
    // Elements it does not count are ignored.
    c.finish(document.body)
    expect(state(a)).toBe('pending')
  })

  it('starts on load or by attribute', () => {
    const load = el({ 'data-counter': '10', 'data-counter-start': 'load' })
    const option = el({ 'data-counter': '20' })
    counter([load, option], { duration: 100, start: 'manual' })
    expect(state(load)).toBe('counting')
    expect(state(option)).toBe('pending')
    emit(option, 'in')
    expect(state(option)).toBe('pending')
  })

  it('reports a snapshot', () => {
    const node = el({ 'data-counter': '200', 'data-counter-from': '100' }, '200')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    expect(c.getSnapshot()).toEqual([
      { element: node, value: 100, state: 'pending', from: 100, to: 200, progress: 0 },
    ])
    emit(node, 'in')
    run(516)
    expect(c.getSnapshot()[0]!.progress).toBeCloseTo(0.5, 1)
    c.finish()
    expect(c.getSnapshot()[0]).toMatchObject({ value: 200, progress: 1, state: 'done' })

    const same = el({ 'data-counter': '5', 'data-counter-from': '5' })
    const flat = counter(same, { start: 'manual' })
    expect(flat.getSnapshot()[0]!.progress).toBe(0)
    flat.finish()
    expect(flat.getSnapshot()[0]!.progress).toBe(1)
  })

  it('emits events to listeners and as bubbling DOM events', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const seen: string[] = []
    document.body.addEventListener('counter:complete', event =>
      seen.push(`dom:${(event as CustomEvent<CounterEventDetail>).detail.value}`)
    )
    document.body.addEventListener('counter:update', () => seen.push('dom:update'))
    const c = counter(node, { duration: 100, start: 'manual' })
    const off = c.on('update', () => seen.push('update'))
    ;(['start', 'pause', 'resume', 'reset', 'complete'] as const).forEach(name =>
      c.on(name, detail => seen.push(`${name}:${detail.state}`))
    )
    c.start()
    run(20)
    off()
    c.pause().resume()
    run(200)
    c.reset()

    expect(seen).toEqual([
      'start:counting',
      'update',
      'pause:paused',
      'resume:counting',
      'complete:done',
      'dom:10',
      'reset:pending',
    ])
  })

  it('updates options and re-reads attributes', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const c = counter(node, { duration: 0 })
    emit(node, 'in')
    expect(node.textContent).toBe('10')

    c.update({ formatter: value => `${value} pts` })
    expect(node.textContent).toBe('10 pts')

    node.setAttribute('data-counter', '20')
    c.refresh()
    expect(node.textContent).toBe('20 pts')

    // A pending element shows the new start; a counting one starts again.
    const other = el({ 'data-counter': '30' }, '30')
    const d = counter(other, { duration: 1000, start: 'manual' })
    d.update({ from: 5 })
    expect(other.textContent).toBe('5')
    d.start()
    run(500)
    const onStart = vi.fn()
    d.update({ onStart })
    expect(onStart).toHaveBeenCalledTimes(1)

    // An attribute that is no longer a number keeps the last good setup.
    other.setAttribute('data-counter', 'x')
    other.textContent = ''
    expect(() => d.refresh()).not.toThrow()
  })

  it('watches visibility again when repeat is turned on', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const c = counter(node, { duration: 0 })
    emit(node, 'in')
    c.update({ repeat: true })
    emit(node, 'in')
    emit(node, 'below')
    expect(state(node)).toBe('pending')
    emit(node, 'in')
    expect(node.textContent).toBe('10')
  })

  it('does nothing after destroy', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const c = counter(node, { start: 'manual' })
    const listener = vi.fn()
    c.on('start', listener)
    c.destroy()
    c.destroy()
    expect(c.start()).toBe(c)
    expect(c.update({ from: 3 }).refresh()).toBe(c)
    expect(c.getSnapshot()).toEqual([])
    expect(c.on('start', listener)).toBeTypeOf('function')
    expect(listener).not.toHaveBeenCalled()
    expect(state(node)).toBeNull()
  })

  it('returns an inert controller when there is nothing to count', () => {
    const c = counter('.missing')
    expect(c.elements).toEqual([])
    expect(c.start().pause().resume().reset().finish().update({}).refresh()).toBe(c)
    expect(c.getSnapshot()).toEqual([])
    expect(c.on('start', vi.fn())).toBeTypeOf('function')
    expect(() => c.destroy()).not.toThrow()
    expect(getCounter(null)).toBeNull()
  })

  it('finishes paused and pending counters when reduced motion turns on', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const c = counter(node, { duration: 1000, start: 'manual' })
    c.start()
    run(100)
    c.pause()
    setReducedMotion(true)
    expect(state(node)).toBe('done')
    // Starting with reduced motion jumps to the end.
    c.reset().start()
    expect(node.textContent).toBe('10')
  })

  it('autoCounter leaves elements another controller counts', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const own = counter(node, { start: 'manual' })
    const auto = autoCounter({ observe: false })
    expect(getCounter(node)).toBe(own)
    auto.destroy()
  })
})
