import { readBoolean } from '@samline/internal'
import { digitValue } from '../core/counter.js'
import type { PartFactory } from './controller.js'

/** Milliseconds between new random digits: a flicker the eye can follow. */
const PACE = 50

interface Scramble {
  from: number
  to: number
  /** The final text, split into characters. */
  chars: string[]
  /** Where each digit of the final text is, left to right. */
  digits: number[]
  /** The random characters on screen now. */
  shown: string[]
  /** When the random digits last changed. */
  at: number
}

/**
 * `scramble`: while counting, the element shows the final text with random
 * digits, and the digits settle from left to right as the count goes on.
 */
export const scramble: PartFactory = () => {
  const enabled = new Map<HTMLElement, boolean>()
  const scrambles = new Map<HTMLElement, Scramble>()

  /** A random digit in the script of `char`. */
  const random = (char: string) =>
    String.fromCodePoint(char.codePointAt(0)! - digitValue(char) + Math.floor(Math.random() * 10))

  return {
    read: (element, options) =>
      enabled.set(
        element,
        readBoolean(element, 'data-counter-scramble', options.scramble ?? false)
      ),
    ready: (element, from, to, text) => {
      scrambles.delete(element)
      if (!enabled.get(element) || from === to) return
      const chars = Array.from(text(to))
      const digits = chars.flatMap((char, index) => (digitValue(char) >= 0 ? [index] : []))
      if (digits.length) scrambles.set(element, { from, to, chars, digits, shown: [], at: -PACE })
    },
    write: (element, value) => {
      const state = scrambles.get(element)
      if (!state) return false
      const progress = (value - state.from) / (state.to - state.from)
      // Waiting at the start value: show it as it is.
      if (!(progress > 0)) return false
      const now = Date.now()
      if (now - state.at >= PACE) {
        state.at = now
        state.shown = state.digits.map(index => random(state.chars[index]!))
      }
      const settled = Math.floor(Math.min(progress, 1) * state.digits.length)
      const chars = [...state.chars]
      state.digits.forEach((index, i) => {
        if (i >= settled) chars[index] = state.shown[i]!
      })
      element.textContent = chars.join('')
      return true
    },
  }
}
