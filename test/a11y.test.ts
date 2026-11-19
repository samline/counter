import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter, getCounter } from '../src/index.js'
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
  // Release the shared live region before the next test.
  document.querySelectorAll('[data-counter]').forEach(node => getCounter(node)?.destroy())
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const run = (ms: number) => vi.advanceTimersByTime(ms)
const mutations = () => Promise.resolve()
const announcer = () => document.querySelector('[data-counter-announcer]')

describe('label', () => {
  it('gives screen readers the final value until the text is final', () => {
    const node = el({ 'data-counter': '12480' }, '12,480')
    counter(node, { duration: 1000 })
    expect(node.textContent).toBe('0')
    expect(node.getAttribute('role')).toBe('img')
    expect(node.getAttribute('aria-label')).toBe('12,480')
    emit(node, 'in')
    run(500)
    expect(state(node)).toBe('counting')
    expect(node.getAttribute('aria-label')).toBe('12,480')
    run(600)
    expect(node.hasAttribute('role')).toBe(false)
    expect(node.hasAttribute('aria-label')).toBe(false)
  })

  it('follows new values and the text template', () => {
    const node = el({ 'data-counter': '' })
    node.innerHTML = '$10<small>/mo</small>'
    const c = counter(node, { duration: 1000 })
    expect(node.getAttribute('aria-label')).toBe('$10/mo')
    emit(node, 'in')
    run(1100)
    c.set(25)
    expect(node.getAttribute('aria-label')).toBe('$25/mo')
    c.pause()
    expect(node.getAttribute('aria-label')).toBe('$25/mo')
    c.finish()
    expect(node.hasAttribute('aria-label')).toBe(false)
  })

  it('leaves elements with a role or label of their own alone', () => {
    const own = el({ 'data-counter': '5', 'aria-label': 'Five stars' }, '5')
    const role = el({ 'data-counter': '5', role: 'status' }, '5')
    const cell = document.body.appendChild(document.createElement('td'))
    cell.setAttribute('data-counter', '5')
    cell.textContent = '5'
    const c = counter([own, role, cell], { duration: 0 })
    expect(cell.hasAttribute('role')).toBe(false)
    expect(own.getAttribute('aria-label')).toBe('Five stars')
    expect(own.hasAttribute('role')).toBe(false)
    expect(role.getAttribute('role')).toBe('status')
    c.destroy()
    expect(own.getAttribute('aria-label')).toBe('Five stars')
    expect(role.getAttribute('role')).toBe('status')
  })

  it('can be turned off, also with update, and is removed on destroy', () => {
    const off = el({ 'data-counter': '5', 'data-counter-label': 'false' }, '5')
    const on = el({ 'data-counter': '5' }, '5')
    const c = counter([off, on], { start: 'manual' })
    expect(off.hasAttribute('role')).toBe(false)
    expect(on.getAttribute('role')).toBe('img')
    c.update({ label: false })
    expect(on.hasAttribute('role')).toBe(false)
    c.update({ label: true })
    expect(on.getAttribute('role')).toBe('img')
    c.destroy()
    expect(on.hasAttribute('role')).toBe(false)
    expect(on.hasAttribute('aria-label')).toBe(false)
  })

  it('is not needed with reduced motion, where the text never changes', () => {
    installMotion(true)
    const node = el({ 'data-counter': '5' }, '5')
    counter(node)
    expect(node.hasAttribute('role')).toBe(false)
  })
})

describe('announce', () => {
  it('reads new values once they are shown, not the first count', async () => {
    const node = el({ 'data-counter': '10', 'data-counter-announce': '' }, '10')
    const c = counter(node, { duration: 300 })
    const region = announcer()!
    expect(region.getAttribute('aria-live')).toBe('polite')
    emit(node, 'in')
    run(500)
    expect(region.textContent).toBe('')

    c.increment(5)
    run(200)
    expect(region.textContent).toBe('')
    run(250)
    expect(region.textContent).toBe('15')

    node.setAttribute('data-counter', '20')
    await mutations()
    run(450)
    expect(region.textContent).toBe('20')
  })

  it('fills a template and reads the same text again', () => {
    const node = el({ 'data-counter': '3' }, '3')
    const c = counter(node, { duration: 0, announce: '{value} people online' })
    emit(node, 'in')
    c.set(4)
    run(150)
    expect(announcer()!.textContent).toBe('4 people online')
    c.set(4)
    expect(announcer()!.textContent).toBe('')
    run(150)
    expect(announcer()!.textContent).toBe('4 people online')
  })

  it('takes the attribute over the option', () => {
    const quiet = el({ 'data-counter': '1', 'data-counter-announce': 'false' }, '1')
    const loud = el({ 'data-counter': '1', 'data-counter-announce': 'true' }, '1')
    const c = counter([quiet, loud], { duration: 0, announce: 'Now {value}' })
    emit(quiet, 'in')
    emit(loud, 'in')
    c.set(2, quiet)
    run(150)
    expect(announcer()!.textContent).toBe('')
    c.set(3, loud)
    run(150)
    expect(announcer()!.textContent).toBe('3')
  })

  it('shares one region and removes it with the last controller', () => {
    const a = counter(el({ 'data-counter': '1' }, '1'), { announce: true })
    const b = counter(el({ 'data-counter': '1' }, '1'), { announce: true })
    const quiet = counter(el({ 'data-counter': '1' }, '1'))
    expect(document.querySelectorAll('[data-counter-announcer]')).toHaveLength(1)
    a.destroy()
    a.destroy()
    quiet.destroy()
    expect(announcer()).not.toBeNull()
    b.destroy()
    expect(announcer()).toBeNull()
  })

  it('starts listening when update turns it on', () => {
    const node = el({ 'data-counter': '1' }, '1')
    const c = counter(node, { duration: 0 })
    emit(node, 'in')
    expect(announcer()).toBeNull()
    c.update({ announce: true }).set(9)
    run(150)
    expect(announcer()!.textContent).toBe('9')
    c.destroy()
    expect(announcer()).toBeNull()
  })

  it('announces jumps with reduced motion', () => {
    installMotion(true)
    const node = el({ 'data-counter': '1' }, '1')
    counter(node, { announce: true }).increment()
    run(150)
    expect(node.textContent).toBe('2')
    expect(announcer()!.textContent).toBe('2')
  })
})

describe('reducedMotion', () => {
  it("'count' counts even when motion is reduced", () => {
    installMotion(true)
    const node = el({ 'data-counter': '100' }, '100')
    const final = el({ 'data-counter': '100' }, '100')
    counter(node, { duration: 1000, reducedMotion: 'count' })
    counter(final, { duration: 1000 })
    expect(node.textContent).toBe('0')
    expect(final.textContent).toBe('100')
    emit(node, 'in')
    run(500)
    expect(state(node)).toBe('counting')
    run(600)
    expect(node.textContent).toBe('100')
  })

  it('reads the attribute, and keeps counting when the preference turns on', () => {
    const node = el({ 'data-counter': '100', 'data-counter-reduced-motion': 'count' }, '100')
    const other = el({ 'data-counter': '100' }, '100')
    counter([node, other], { duration: 1000, start: 'load' })
    run(300)
    setReducedMotion(true)
    expect(state(node)).toBe('counting')
    expect(state(other)).toBe('done')
  })
})
