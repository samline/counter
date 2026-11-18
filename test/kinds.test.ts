import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter, readClock, readDate, writeClock } from '../src/index.js'
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
})

const run = (ms: number) => vi.advanceTimersByTime(ms)

/** Every text the element shows while counting `ms` milliseconds. */
const record = (node: HTMLElement, ms: number) => {
  const seen = new Set<string>()
  for (let t = 0; t < ms; t += 16) {
    seen.add(node.textContent ?? '')
    run(16)
  }
  seen.add(node.textContent ?? '')
  return [...seen]
}

describe('clock helpers', () => {
  it('reads clocks with two or three fields', () => {
    expect(readClock('23:59:59')).toEqual({
      seconds: 86399,
      fields: 3,
      padded: true,
      prefix: '',
      suffix: '',
    })
    expect(readClock('Kick-off 90:00 min')).toEqual({
      seconds: 5400,
      fields: 2,
      padded: true,
      prefix: 'Kick-off ',
      suffix: ' min',
    })
    expect(readClock('1:05:00')).toMatchObject({ seconds: 3900, padded: false })
    expect(readClock('soon')).toBeNull()
  })

  it('writes seconds as a clock, carrying into minutes and hours', () => {
    const digits = (value: number, pad: boolean) => String(value).padStart(pad ? 2 : 1, '0')
    expect(writeClock(3661, 3, true, digits)).toBe('01:01:01')
    expect(writeClock(3661, 3, false, digits)).toBe('1:01:01')
    // Minutes go past 59 without an hours field.
    expect(writeClock(5400, 2, true, digits)).toBe('90:00')
    expect(writeClock(-5, 2, true, digits)).toBe('00:00')
  })

  it('reads dates and timestamps', () => {
    expect(readDate('2026-12-31')).toBe(Date.UTC(2026, 11, 31))
    expect(readDate(5)).toBe(5)
    expect(readDate('nope')).toBeNull()
    expect(readDate('')).toBeNull()
    expect(readDate(null)).toBeNull()
  })
})

describe("as: 'time'", () => {
  it('counts seconds in the pattern of the text and ends on it', () => {
    const node = el({ 'data-counter': '', 'data-counter-as': 'time' }, '23:59:59')
    counter(node, { duration: 1000, easing: 'linear' })
    expect(node.textContent).toBe('00:00:00')
    emit(node, 'in')
    run(500)
    // Halfway through a day.
    expect(node.textContent).toMatch(/^1[12]:\d\d:\d\d$/)
    run(600)
    expect(node.textContent).toBe('23:59:59')
  })

  it('carries seconds into minutes', () => {
    const node = el({ 'data-counter': '', 'data-counter-as': 'time' }, '02:00')
    counter(node, { duration: 2000, easing: 'linear' })
    emit(node, 'in')
    const seen = record(node, 2100)
    expect(seen).toContain('00:59')
    expect(seen).toContain('01:00')
    expect(seen[seen.length - 1]).toBe('02:00')
    // Whole seconds only.
    expect(seen.every(text => /^\d\d:\d\d$/.test(text))).toBe(true)
  })

  it('takes the start as a clock or in seconds, and counts down', () => {
    const work = el(
      { 'data-counter': '', 'data-counter-as': 'time', 'data-counter-from': '08:00:00' },
      '17:30:00'
    )
    const countdown = el({
      'data-counter': '0',
      'data-counter-as': 'time',
      'data-counter-from': '600',
    })
    counter([work, countdown], { duration: 1000 })
    expect(work.textContent).toBe('08:00:00')
    expect(countdown.textContent).toBe('10:00')
    emit(countdown, 'in')
    run(100)
    expect(countdown.textContent).not.toBe('10:00')
    run(1000)
    expect(countdown.textContent).toBe('00:00')
  })

  it('uses hours when the value needs them, and keeps the text around the clock', () => {
    const long = el({ 'data-counter': '7200', 'data-counter-as': 'time' })
    const label = el({ 'data-counter': '', 'data-counter-as': 'time' }, 'Run 1:05:00 total')
    counter([long, label], { duration: 0 })
    expect(long.textContent).toBe('00:00:00')
    expect(label.textContent).toBe('Run 0:00:00 total')
    emit(long, 'in')
    emit(label, 'in')
    expect(long.textContent).toBe('02:00:00')
    expect(label.textContent).toBe('Run 1:05:00 total')
  })

  it('accepts the option, a step and a formatter', () => {
    const node = el({ 'data-counter': '' }, '10:00')
    counter(node, { as: 'time', duration: 1000, easing: 'linear', step: 60 })
    emit(node, 'in')
    const seen = record(node, 1100)
    expect(seen.every(text => text.endsWith(':00'))).toBe(true)

    const custom = el({ 'data-counter': '90', 'data-counter-as': 'time' })
    counter(custom, { duration: 0, formatter: value => `${value}s` })
    emit(custom, 'in')
    expect(custom.textContent).toBe('90s')
  })

  it('skips elements without a clock or a number', () => {
    const node = el({ 'data-counter': '', 'data-counter-as': 'time' }, 'soon')
    expect(counter(node).elements).toEqual([])
  })
})

describe("as: 'date'", () => {
  it('counts day by day from January 1 to the datetime and ends on the text', () => {
    const node = document.createElement('time')
    node.setAttribute('data-counter', '')
    node.setAttribute('data-counter-as', 'date')
    node.setAttribute('datetime', '2026-12-31')
    node.textContent = 'December 31, 2026'
    document.body.append(node)
    // More frames than days, so every day shows.
    counter(node, { duration: 8000, easing: 'linear' })
    expect(node.textContent).toBe('January 1, 2026')
    emit(node, 'in')
    const seen = record(node, 8100)
    // Months roll over on their own.
    expect(seen).toContain('January 31, 2026')
    expect(seen).toContain('February 28, 2026')
    expect(seen).toContain('March 1, 2026')
    expect(seen[seen.length - 1]).toBe('December 31, 2026')
    expect(node.firstChild?.nodeType).toBe(Node.TEXT_NODE)
  })

  it('takes the start, the style and a step in days', () => {
    const node = el({
      'data-counter': '2027-01-01',
      'data-counter-as': 'date',
      'data-counter-from': '2026-12-01',
      'data-counter-date-style': 'medium',
      'data-counter-step': '7',
    })
    counter(node, { duration: 1000, easing: 'linear' })
    expect(node.textContent).toBe('Dec 1, 2026')
    emit(node, 'in')
    const seen = record(node, 1100)
    expect(seen).toEqual([
      'Dec 1, 2026',
      'Dec 8, 2026',
      'Dec 15, 2026',
      'Dec 22, 2026',
      'Dec 29, 2026',
      'Jan 1, 2027',
    ])
  })

  it('accepts timestamps, dateFormat and the language of the element', () => {
    const node = el({ lang: 'es' })
    node.textContent = ''
    counter(node, {
      as: 'date',
      from: Date.UTC(2026, 0, 1),
      to: Date.UTC(2026, 5, 15),
      dateFormat: { month: 'long', year: 'numeric', timeZone: 'UTC' },
      duration: 0,
    })
    expect(node.textContent).toBe('enero de 2026')
    emit(node, 'in')
    expect(node.textContent).toBe('junio de 2026')
  })

  it('reads dates with a time in local time, from the start of their year', () => {
    const node = el({ 'data-counter-as': 'date', datetime: '2026-03-01T12:00' })
    counter(node, { duration: 0, dateFormat: { month: 'short', day: 'numeric' } })
    expect(node.textContent).toBe('Jan 1')
  })

  it('skips elements without a date', () => {
    const node = el({ 'data-counter': '', 'data-counter-as': 'date' }, 'someday')
    expect(counter(node).elements).toEqual([])
  })
})

describe('step', () => {
  it('shows whole steps of a number and ends exactly', () => {
    const node = el({ 'data-counter': '102', 'data-counter-step': '25' })
    counter(node, { duration: 1000, easing: 'linear' })
    emit(node, 'in')
    const seen = record(node, 1100)
    expect(seen).toEqual(['0', '25', '50', '75', '100', '102'])
  })
})
