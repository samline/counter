import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { counter } from '../src/index.js'
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
const css = (node: HTMLElement, name: string) => node.style.getPropertyValue(name)

describe('cssVars', () => {
  it('sets --counter-value and --counter-progress on every frame', () => {
    const node = el({ 'data-counter': '80', 'data-counter-css-vars': '' }, '80')
    counter(node, { duration: 1000, easing: 'linear' })
    expect(css(node, '--counter-value')).toBe('0')
    expect(css(node, '--counter-progress')).toBe('0')
    emit(node, 'in')
    run(516)
    expect(Number(css(node, '--counter-progress'))).toBeCloseTo(0.5, 1)
    run(600)
    expect(css(node, '--counter-value')).toBe('80')
    expect(css(node, '--counter-progress')).toBe('1')
  })

  it('sets them on the closest ancestor matching a selector', () => {
    const card = document.body.appendChild(document.createElement('div'))
    card.className = 'card'
    const node = el({ 'data-counter': '5', 'data-counter-css-vars': '.card' }, '5', card)
    const own = el({ 'data-counter': '5' }, '5', card)
    counter(node, { duration: 0 })
    counter(own, { duration: 0, cssVars: true })
    emit(node, 'in')
    emit(own, 'in')
    expect(css(card, '--counter-value')).toBe('5')
    expect(css(node, '--counter-value')).toBe('')
    expect(css(own, '--counter-progress')).toBe('1')
  })

  it('is off by default, with "false" or an invalid selector', () => {
    const plain = el({ 'data-counter': '5' }, '5')
    const off = el({ 'data-counter': '5', 'data-counter-css-vars': 'false' }, '5')
    const invalid = el({ 'data-counter': '5', 'data-counter-css-vars': '[[' }, '5')
    counter([plain, off, invalid], { duration: 0, cssVars: true })
    expect(css(plain, '--counter-value')).toBe('0')
    expect(css(off, '--counter-value')).toBe('')
    expect(css(invalid, '--counter-value')).toBe('')
    expect(css(el({ 'data-counter': '1' }), '--counter-value')).toBe('')
  })

  it('removes them on destroy and keeps other styles', () => {
    const node = el({ 'data-counter': '5', style: 'color: red' }, '5')
    const bare = el({ 'data-counter': '5' }, '5')
    const c = counter([node, bare], { duration: 0, cssVars: true })
    c.destroy()
    expect(node.getAttribute('style')).toBe('color: red;')
    expect(bare.hasAttribute('style')).toBe(false)
  })

  it('reports progress 1 when start and end are the same', () => {
    const node = el({ 'data-counter': '3', 'data-counter-from': '3' }, '3')
    counter(node, { duration: 0, cssVars: true })
    expect(css(node, '--counter-progress')).toBe('1')
  })
})

describe('output', () => {
  it('writes the value to progress, meter and inputs', () => {
    document.body.innerHTML = `
      <span id="n" data-counter="60" data-counter-output=".bar">60</span>
      <progress class="bar" max="100" value="60"></progress>
      <meter class="bar" max="100" value="60"></meter>
      <input class="bar" type="range" max="100" value="60" />`
    const node = document.getElementById('n')!
    const [progress, meter, range] = document.querySelectorAll<HTMLInputElement>('.bar')
    const c = counter(node, { duration: 1000, easing: 'linear' })
    expect(progress!.value).toBe(0)
    emit(node, 'in')
    run(516)
    expect(progress!.value).toBeGreaterThan(25)
    run(600)
    expect(progress!.value).toBe(60)
    expect(meter!.value).toBe(60)
    expect(range!.value).toBe('60')

    c.set(20)
    run(1100)
    expect(progress!.value).toBe(20)
    // Destroy puts the values back.
    c.destroy()
    expect(progress!.value).toBe(60)
    expect(range!.value).toBe('60')
  })

  it('sets aria-valuenow on other elements and restores it', () => {
    document.body.innerHTML = `
      <span id="n" data-counter="7">7</span>
      <div id="bar" role="progressbar" aria-valuemax="10"></div>
      <div id="had" role="progressbar" aria-valuenow="7"></div>`
    const node = document.getElementById('n')!
    const bar = document.getElementById('bar')!
    const had = document.getElementById('had')!
    const c = counter(node, { duration: 0, output: [bar, had] })
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    emit(node, 'in')
    expect(bar.getAttribute('aria-valuenow')).toBe('7')
    c.destroy()
    expect(bar.hasAttribute('aria-valuenow')).toBe(false)
    expect(had.getAttribute('aria-valuenow')).toBe('7')
  })

  it('calls a function with the value, the element and progress', () => {
    const node = el({ 'data-counter': '10' }, '10')
    const output = vi.fn()
    counter(node, { duration: 0, output })
    expect(output).toHaveBeenLastCalledWith(0, node, 0)
    emit(node, 'in')
    expect(output).toHaveBeenLastCalledWith(10, node, 1)
  })

  it('writes the final value right away with reduced motion', () => {
    installMotion(true)
    document.body.innerHTML = `<span id="n" data-counter="9" data-counter-output="#p">9</span><progress id="p" max="10"></progress>`
    counter('#n', { cssVars: true })
    expect((document.getElementById('p') as HTMLProgressElement).value).toBe(9)
    expect(css(document.getElementById('n')!, '--counter-value')).toBe('9')
  })

  it('ignores an invalid output selector', () => {
    const node = el({ 'data-counter': '5', 'data-counter-output': '[[' }, '5')
    expect(() => counter(node, { duration: 0 })).not.toThrow()
  })
})
