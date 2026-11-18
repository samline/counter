import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EASINGS, animateNumber, counter, cubicBezier, isEasing } from '../src/index.js'
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
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const run = (ms: number) => vi.advanceTimersByTime(ms)

describe('easings', () => {
  it('start at 0 and end at 1', () => {
    Object.values(EASINGS).forEach(ease => {
      expect(ease(0)).toBeCloseTo(0, 5)
      expect(ease(1)).toBeCloseTo(1, 5)
    })
  })

  it('have their shape', () => {
    expect(EASINGS['ease-in'](0.5)).toBeLessThan(0.5)
    expect(EASINGS['ease-out-expo'](0.5)).toBeGreaterThan(0.95)
    // ease-out-back goes past the end before settling.
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(EASINGS['ease-out-back']))).toBeGreaterThan(1)
  })
})

describe('cubicBezier', () => {
  it('follows the CSS curve', () => {
    const linear = cubicBezier('cubic-bezier(0, 0, 1, 1)')!
    expect(linear(0.3)).toBeCloseTo(0.3, 3)
    // CSS `ease` at half time is about 0.8024.
    const ease = cubicBezier('cubic-bezier(0.25, 0.1, 0.25, 1)')!
    expect(ease(0.5)).toBeCloseTo(0.8024, 2)
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    // y may leave 0–1 for overshoot.
    expect(cubicBezier(' cubic-bezier( .3, 1.6, .6, 1 ) ')).not.toBeNull()
  })

  it('rejects anything else', () => {
    expect(cubicBezier('cubic-bezier(1.2, 0, 1, 1)')).toBeNull()
    expect(cubicBezier('cubic-bezier(-0.1, 0, 1, 1)')).toBeNull()
    expect(cubicBezier('cubic-bezier(0, 0, 1.5, 1)')).toBeNull()
    expect(cubicBezier('cubic-bezier(0, a, 1, 1)')).toBeNull()
    expect(cubicBezier('cubic-bezier(0, 0, 1)')).toBeNull()
    expect(cubicBezier('ease')).toBeNull()
  })

  it('is accepted wherever an easing is', () => {
    expect(isEasing('cubic-bezier(0.2, 0.8, 0.2, 1)')).toBe(true)
    expect(isEasing('ease-out-back')).toBe(true)
    expect(isEasing(() => 1)).toBe(true)
    expect(isEasing('bounce')).toBe(false)

    let last = 0
    animateNumber({
      to: 100,
      duration: 1000,
      easing: 'cubic-bezier(0, 0, 1, 1)',
      onUpdate: v => (last = v),
    })
    run(516)
    expect(last).toBeCloseTo(49.6, 0)
  })

  it('works from the attribute', () => {
    const node = el({ 'data-counter': '100', 'data-counter-easing': 'cubic-bezier(0, 0, 1, 1)' })
    counter(node, { duration: 1000, easing: t => t ** 8 })
    emit(node, 'in')
    run(516)
    expect(Number(node.textContent)).toBeGreaterThan(45)
  })
})

describe('speed', () => {
  it('takes a time that grows with the distance', () => {
    const small = el({ 'data-counter': '500', 'data-counter-speed': '1000' })
    const big = el({ 'data-counter': '4000' })
    counter([small, big], { speed: 1000, duration: 99_999 })
    emit(small, 'in')
    emit(big, 'in')
    run(600)
    expect(state(small)).toBe('done')
    expect(state(big)).toBe('counting')
    run(3500)
    expect(state(big)).toBe('done')
  })

  it('applies to the distance left after set()', () => {
    const node = el({ 'data-counter': '100' })
    const c = counter(node, { speed: 100 })
    emit(node, 'in')
    run(1100)
    c.set(110)
    run(150)
    expect(node.textContent).toBe('110')
  })

  it('counts days per second for dates', () => {
    const node = el({
      'data-counter-as': 'date',
      datetime: '2026-01-11',
      'data-counter-from': '2026-01-01',
    })
    counter(node, { speed: 10 })
    emit(node, 'in')
    run(1100)
    expect(state(node)).toBe('done')
  })
})

describe('stagger', () => {
  // Counting takes 50ms; a zero duration would jump to the end without waiting.
  it('delays each next element of the call', () => {
    const nodes = [
      el({ 'data-counter': '1' }),
      el({ 'data-counter': '2' }),
      el({ 'data-counter': '3' }),
    ]
    counter(nodes, { duration: 50, stagger: 100 })
    nodes.forEach(node => emit(node, 'in'))
    run(80)
    expect(nodes.map(state)).toEqual(['done', 'counting', 'counting'])
    run(100)
    expect(nodes.map(state)).toEqual(['done', 'done', 'counting'])
    run(100)
    expect(nodes.map(state)).toEqual(['done', 'done', 'done'])
  })

  it('follows a data-counter-stagger container, also across calls', () => {
    const row = document.body.appendChild(document.createElement('div'))
    row.setAttribute('data-counter-stagger', '200')
    const first = el({ 'data-counter': '1' }, '', row)
    const second = el({ 'data-counter': '2' }, '', row)
    counter(first, { duration: 50 })
    counter(second, { duration: 50 })
    emit(first, 'in')
    emit(second, 'in')
    run(80)
    expect(state(first)).toBe('done')
    expect(state(second)).toBe('counting')
    run(200)
    expect(state(second)).toBe('done')
  })

  it('is recomputed on update and does not delay new values', () => {
    const a = el({ 'data-counter': '1' })
    const b = el({ 'data-counter': '2' })
    const c = counter([a, b], { duration: 50, start: 'manual' })
    c.update({ stagger: 300 }).start()
    run(80)
    expect(state(b)).toBe('counting')
    run(300)
    expect(state(b)).toBe('done')
    c.set(5, b)
    run(80)
    expect(b.textContent).toBe('5')
  })
})
