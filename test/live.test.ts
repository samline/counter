import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { animateNumber, counter } from '../src/index.js'
import { el, emit, installMock, installMotion, setReducedMotion, state } from './helpers.js'

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
/** Let MutationObserver callbacks run. */
const mutations = () => Promise.resolve()

describe('animateNumber controls', () => {
  it('is callable to cancel and reports its value', () => {
    const onUpdate = vi.fn()
    const tween = animateNumber({ to: 10, duration: 100, onUpdate })
    expect(tween.isRunning()).toBe(true)
    run(48)
    expect(tween.getValue()).toBeGreaterThan(0)
    tween()
    expect(tween.isRunning()).toBe(false)
    const calls = onUpdate.mock.calls.length
    run(500)
    expect(onUpdate).toHaveBeenCalledTimes(calls)
    // Cancelled for good.
    tween.retarget(50)
    tween.resume()
    run(500)
    expect(onUpdate).toHaveBeenCalledTimes(calls)
  })

  it('pauses without counting the paused time, and resumes', () => {
    const values: number[] = []
    const tween = animateNumber({
      to: 100,
      duration: 1000,
      easing: 'linear',
      onUpdate: v => values.push(v),
    })
    run(500)
    tween.pause()
    const paused = tween.getValue()
    run(5000)
    expect(tween.getValue()).toBe(paused)
    tween.resume()
    tween.resume()
    run(200)
    expect(tween.getValue()).toBeLessThan(100)
    run(400)
    expect(tween.getValue()).toBe(100)
    // Resuming a finished tween does nothing.
    tween.resume()
    expect(tween.isRunning()).toBe(false)
  })

  it('retargets from the current value, also after finishing', () => {
    const onComplete = vi.fn()
    const tween = animateNumber({
      to: 100,
      duration: 1000,
      easing: 'linear',
      onUpdate: () => {},
      onComplete,
    })
    run(500)
    const middle = tween.getValue()
    tween.retarget(0, 100)
    run(16)
    expect(tween.getValue()).toBeLessThanOrEqual(middle)
    run(200)
    expect(tween.getValue()).toBe(0)
    expect(onComplete).toHaveBeenCalledTimes(1)

    tween.retarget(30)
    run(1100)
    expect(tween.getValue()).toBe(30)
    expect(onComplete).toHaveBeenCalledTimes(2)
    // A zero duration jumps.
    tween.retarget(7, 0)
    expect(tween.getValue()).toBe(7)
  })
})

describe('set, increment and decrement', () => {
  it('counts from the value on screen to the new value', () => {
    const node = el({ 'data-counter': '100' }, '100')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    emit(node, 'in')
    run(1100)
    expect(node.textContent).toBe('100')

    const onStart = vi.fn()
    c.on('start', onStart)
    c.set(200)
    expect(state(node)).toBe('counting')
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(node.textContent).toBe('100')
    run(500)
    expect(Number(node.textContent)).toBeGreaterThan(140)
    run(600)
    expect(node.textContent).toBe('200')
    expect(c.getSnapshot()[0]).toMatchObject({ to: 200, value: 200, progress: 1 })
  })

  it('changes course while counting, without waiting for the delay again', () => {
    const node = el({ 'data-counter': '100', 'data-counter-delay': '500' }, '100')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    emit(node, 'in')
    run(1000)
    const middle = Number(node.textContent)
    expect(middle).toBeGreaterThan(30)
    c.set(0)
    run(32)
    expect(Number(node.textContent)).toBeLessThan(middle)
    run(1100)
    expect(node.textContent).toBe('0')
  })

  it('adds to the final value, so quick clicks add up', () => {
    const node = el({ 'data-counter': '3' }, '3')
    const c = counter(node, { duration: 300 })
    emit(node, 'in')
    run(400)
    c.increment().increment().increment(5)
    run(400)
    expect(node.textContent).toBe('10')
    c.decrement(4).decrement()
    run(400)
    expect(node.textContent).toBe('5')
    c.set(Number.NaN)
    run(400)
    expect(node.textContent).toBe('5')
  })

  it('keeps the template of the text and puts the markup back when it matches', () => {
    const node = el({ 'data-counter': '' })
    node.innerHTML = '$10<small>/mo</small>'
    const small = node.querySelector('small')
    const c = counter(node, { duration: 0 })
    emit(node, 'in')
    c.set(120)
    expect(node.textContent).toBe('$120/mo')
    c.set(10)
    expect(node.querySelector('small')).toBe(small)
  })

  it('makes a waiting number count to the new value when it starts', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const c = counter(node, { duration: 0 })
    c.set(40)
    expect(state(node)).toBe('pending')
    expect(node.textContent).toBe('0')
    emit(node, 'in')
    expect(node.textContent).toBe('40')
  })

  it('acts on one element, and jumps with reduced motion', () => {
    const a = el({ 'data-counter': '1' }, '1')
    const b = el({ 'data-counter': '2' }, '2')
    const c = counter([a, b], { duration: 1000, start: 'load' })
    run(1100)
    c.set(9, b)
    expect(state(a)).toBe('done')
    expect(state(b)).toBe('counting')
    setReducedMotion(true)
    c.increment(1, a)
    expect(a.textContent).toBe('2')
    expect(b.textContent).toBe('9')
  })

  it('works with time and date values', () => {
    const clock = el({ 'data-counter': '', 'data-counter-as': 'time' }, '10:00')
    const c = counter(clock, { duration: 0 })
    emit(clock, 'in')
    c.increment(90)
    expect(clock.textContent).toBe('11:30')
  })
})

describe('live attributes', () => {
  it('counts to a new data-counter value', async () => {
    const node = el({ 'data-counter': '100' }, '100')
    const c = counter(node, { duration: 1000 })
    emit(node, 'in')
    run(1100)
    node.setAttribute('data-counter', '250')
    await mutations()
    expect(state(node)).toBe('counting')
    run(1100)
    expect(node.textContent).toBe('250')
    expect(c.getSnapshot()[0]!.to).toBe(250)

    // The same value, or our own state attribute, does nothing.
    const onStart = vi.fn()
    c.on('start', onStart)
    node.setAttribute('data-counter', '250')
    await mutations()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('takes new decimals from the new value', async () => {
    const node = el({ 'data-counter': '1' }, '1')
    counter(node, { duration: 0 })
    emit(node, 'in')
    node.setAttribute('data-counter', '2.5')
    await mutations()
    expect(node.textContent).toBe('2.5')
  })

  it('follows a new datetime', async () => {
    const node = el({ 'data-counter-as': 'date', datetime: '2026-01-10' })
    counter(node, { duration: 0 })
    emit(node, 'in')
    expect(node.textContent).toBe('January 10, 2026')
    node.setAttribute('datetime', '2026-02-01')
    await mutations()
    expect(node.textContent).toBe('February 1, 2026')
  })

  it('can be turned off, and stops after destroy', async () => {
    const off = el({ 'data-counter': '5', 'data-counter-live': 'false' }, '5')
    const on = el({ 'data-counter': '5' }, '5')
    counter(off, { duration: 0 })
    const c = counter(on, { duration: 0 })
    emit(off, 'in')
    emit(on, 'in')
    off.setAttribute('data-counter', '6')
    await mutations()
    expect(off.textContent).toBe('5')

    c.destroy()
    on.setAttribute('data-counter', '6')
    await mutations()
    expect(on.textContent).toBe('5')
    expect(c.set(8).increment().decrement()).toBe(c)
  })

  it('ignores a value that is no longer readable', async () => {
    const node = el({ 'data-counter': '5' })
    counter(node, { duration: 0 })
    emit(node, 'in')
    node.setAttribute('data-counter', 'soon')
    await mutations()
    expect(node.textContent).toBe('5')
  })

  it('works without MutationObserver', () => {
    vi.stubGlobal('MutationObserver', undefined)
    const node = el({ 'data-counter': '5' }, '5')
    const c = counter(node, { duration: 0 })
    emit(node, 'in')
    c.set(6)
    expect(node.textContent).toBe('6')
    c.destroy()
  })

  it('the inert controller accepts every command', () => {
    const c = counter('.missing')
    expect(c.set(1).increment().decrement(2)).toBe(c)
  })
})
