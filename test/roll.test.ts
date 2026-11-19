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
  document.documentElement.setAttribute('lang', 'en')
})

afterEach(() => {
  document.querySelectorAll('[data-counter]').forEach(node => getCounter(node)?.destroy())
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
})

const run = (ms: number) => vi.advanceTimersByTime(ms)

/** The rolling columns of an element, if it is rolling. */
const columns = (node: HTMLElement) =>
  Array.from(
    node.querySelectorAll<HTMLElement>(
      '[aria-hidden="true"] > span:not([dir]), [aria-hidden="true"] > [dir] > span'
    )
  )

/** What the columns show: each strip's whole digit, and the static characters. */
const reads = (node: HTMLElement) =>
  columns(node)
    .filter(box => box.style.display !== 'none' && box.style.visibility !== 'hidden')
    .map(box => {
      const strip = box.children[1] as HTMLElement | undefined
      if (!strip) return box.textContent
      const turn = (-parseFloat(strip.style.transform.slice('translateY('.length)) * 11) / 100
      return strip.children[Math.floor(turn + 1e-9) % 10]!.textContent
    })
    .join('')

describe('roll', () => {
  it('rolls each digit and ends on the original text', () => {
    const node = el({ 'data-counter': '1250', 'data-counter-roll': '' }, '1,250')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    // Waiting at 0: only the units column shows.
    expect(columns(node)).toHaveLength(5)
    expect(reads(node)).toBe('0')
    emit(node, 'in')
    for (let t = 0; t < 900; t += 160) {
      run(160)
      const value = c.getSnapshot()[0]!.value
      expect(reads(node)).toBe(new Intl.NumberFormat('en').format(Math.floor(value)))
    }
    run(200)
    expect(state(node)).toBe('done')
    expect(node.textContent).toBe('1,250')
    expect(columns(node)).toHaveLength(0)
  })

  it('turns each column by value / 10^place', () => {
    const node = el({ 'data-counter': '100' }, '100')
    // Slow enough that no column turns more than once a frame.
    const c = counter(node, { duration: 10_000, easing: 'linear', roll: true })
    emit(node, 'in')
    run(5000)
    const value = c.getSnapshot()[0]!.value
    const strips = columns(node).map(box => box.children[1] as HTMLElement)
    const turns = strips.map(
      strip => (-parseFloat(strip.style.transform.slice('translateY('.length)) * 11) / 100
    )
    expect(turns[2]).toBeCloseTo(value % 10, 5)
    expect(turns[1]).toBeCloseTo((value / 10) % 10, 5)
    expect(turns[0]).toBeCloseTo((value / 100) % 10, 5)
  })

  it('shows whole digits in a column that turns more than once a frame', () => {
    const node = el({ 'data-counter': '10000', 'data-counter-roll': '' }, '10000')
    counter(node, { duration: 1000, easing: 'linear' })
    emit(node, 'in')
    run(480)
    const turns = columns(node).map(
      box => (-parseFloat((box.children[1] as HTMLElement).style.transform.slice(11)) * 11) / 100
    )
    // Units and tens jump by whole digits; thousands still roll smoothly.
    expect(turns[4]! % 1).toBeCloseTo(0, 6)
    expect(turns[3]! % 1).toBeCloseTo(0, 6)
    expect(turns[1]! % 1).not.toBeCloseTo(0, 2)
  })

  it('runs the digits left to right and keeps the text around them outside', () => {
    const node = el({ 'data-counter': '', 'data-counter-roll': '', lang: 'ar' }, 'زوار ١٬٢٣٤ اليوم')
    counter(node, { start: 'manual' })
    const run = node.querySelector('[dir="ltr"]')!
    expect(run.textContent!.startsWith('٠')).toBe(true)
    expect(node.querySelector('[aria-hidden="true"]')!.firstChild!.textContent).toBe('ز')
  })

  it('keeps decimals, prefix and suffix, and the script of the digits', () => {
    const money = el({ 'data-counter': '12.50', 'data-counter-roll': '' }, '$12.50/mo')
    const arabic = el({ 'data-counter': '', 'data-counter-roll': '' }, '١٬٢٣٤')
    counter([money, arabic], { start: 'manual', from: 3 })
    expect(reads(money)).toBe('$3.00/mo')
    expect(reads(arabic)).toBe('٣')
    expect(columns(arabic)[0]!.children[1]!.textContent).toBe('٠١٢٣٤٥٦٧٨٩٠')
  })

  it('keeps the width of leading places with steady', () => {
    const node = el({ 'data-counter': '1250', 'data-counter-roll': '' }, '1,250')
    counter(node, { start: 'manual', steady: true })
    const [thousands, comma, , , units] = columns(node)
    expect(thousands!.style.display).toBe('inline-block')
    expect(units!.style.visibility).toBe('')
    expect(thousands!.style.visibility).toBe('hidden')
    expect(comma!.style.display).toBe('')
    expect(comma!.style.visibility).toBe('hidden')
  })

  it('counts down from the wider start', () => {
    const node = el({ 'data-counter': '5', 'data-counter-from': '1000', 'data-counter-roll': '' })
    counter(node, { start: 'manual', grouping: true })
    expect(columns(node)).toHaveLength(5)
    expect(reads(node)).toBe('1,000')
  })

  it('counts as text when the digits do not follow the value', () => {
    const clock = el({ 'data-counter': '', 'data-counter-as': 'time' }, '01:30')
    const plain = el({ 'data-counter': '8000' }, '8000')
    const negative = el({ 'data-counter': '5', 'data-counter-from': '-5' }, '5')
    counter([clock, plain, negative], { start: 'manual', roll: true })
    counter(el({ 'data-counter': '8000' }), {
      start: 'manual',
      roll: true,
      format: { notation: 'compact' },
    })
    expect(clock.textContent).toBe('00:00')
    expect(columns(clock)).toHaveLength(0)
    expect(columns(negative)).toHaveLength(0)
    expect(negative.textContent).toBe('-5')
    expect(columns(plain)).toHaveLength(4)
    const rolled = document.body.lastElementChild as HTMLElement
    expect(columns(rolled)).toHaveLength(0)
  })

  it('switches to text in the middle when the text changes its shape', () => {
    const node = el({ 'data-counter': '10', 'data-counter-roll': '' }, '10')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    emit(node, 'in')
    run(1100)
    // Counting down below zero: the sign is not a column.
    c.set(-10)
    run(900)
    expect(node.textContent).toMatch(/^-\d$/)
    run(200)
    expect(node.textContent).toBe('-10')
  })

  it('tells screen readers the final value when the element has a role of its own', () => {
    const cell = document.body.appendChild(document.createElement('td'))
    cell.setAttribute('data-counter', '42')
    cell.textContent = '42'
    counter(cell, { start: 'manual', roll: true })
    expect(cell.hasAttribute('role')).toBe(false)
    expect(cell.lastElementChild!.textContent).toBe('42')
  })

  it('can be turned off with update, and is left out of the lite entry', () => {
    const node = el({ 'data-counter': '50' }, '50')
    const c = counter(node, { start: 'manual', roll: true })
    expect(columns(node)).toHaveLength(2)
    c.update({ roll: false })
    expect(columns(node)).toHaveLength(0)
    expect(node.textContent).toBe('0')

    const plain = el({ 'data-counter': '50', 'data-counter-roll': '' }, '50')
    lite(plain, { start: 'manual' })
    expect(columns(plain)).toHaveLength(0)
  })

  it('does nothing with reduced motion', () => {
    installMotion(true)
    const node = el({ 'data-counter': '50', 'data-counter-roll': '' }, '50')
    counter(node)
    expect(node.textContent).toBe('50')
    expect(columns(node)).toHaveLength(0)
  })
})
