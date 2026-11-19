import { readBoolean } from '@samline/internal'
import { digitValue } from '../core/counter.js'
import type { PartFactory } from './controller.js'

/** Digits read from a text, as a number: `'$1,250.50'` is 125050. */
const digitsOf = (text: string) => {
  let digits = ''
  for (const char of text) {
    const digit = digitValue(char)
    if (digit >= 0) digits += digit
  }
  return digits ? Number(digits) : null
}

/**
 * How many places the text shows after the units, if its digits are exactly
 * the value: 2 for `'12.50'` (12.5) and for `'86%'` (0.86). `null` when the
 * digits do not follow the value, as in clocks, dates or `'8K'`.
 */
const placesOf = (value: number, text: string) => {
  const digits = digitsOf(text)
  if (digits === null || value < 0) return null
  for (let places = 0; places <= 20; places++)
    if (Math.round(value * 10 ** places) === digits) return places
  return null
}

const hidden =
  'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap'

interface Column {
  /** `0` for the last digit, `1` for the one before it, and so on. */
  place: number
  box: HTMLElement
  strip: HTMLElement | null
}

interface Roll {
  places: number
  prefix: string
  columns: Column[]
  nodes: Node[]
  steady: boolean
  /** The value of the previous frame, times `10^places`. */
  last: number | null
}

/**
 * `roll`: each digit is a column of digits that rolls to the value, like an
 * odometer. A column turns `value / 10^place` times, so the last digit spins
 * fastest and every column shows the real digit of its place.
 */
export const roll: PartFactory = () => {
  const enabled = new Map<HTMLElement, { roll: boolean; steady: boolean }>()
  const rolls = new Map<HTMLElement, Roll>()

  /** Build the columns for the text of `template`, the wider of the start and final values. */
  const build = (
    element: HTMLElement,
    template: string,
    final: string,
    places: number,
    steady: boolean
  ) => {
    const chars = Array.from(template)
    const first = chars.findIndex(char => digitValue(char) >= 0)
    const columns: Column[] = []
    const visual = document.createElement('span')
    visual.setAttribute('aria-hidden', 'true')
    visual.style.fontVariantNumeric = 'tabular-nums'
    let place = chars.filter(char => digitValue(char) >= 0).length
    const last = chars.length - 1 - [...chars].reverse().findIndex(char => digitValue(char) >= 0)
    // Digits always run left to right, also in a right-to-left paragraph.
    const run = document.createElement('span')
    run.dir = 'ltr'
    run.style.unicodeBidi = 'isolate'
    chars.forEach((char, index) => {
      const digit = digitValue(char)
      const box = document.createElement('span')
      if (index < first || digit < 0) {
        box.textContent = char
        // Separators belong to the digit before them; prefix and suffix always show.
        columns.push({ place: index < first ? -1 : place, box, strip: null })
      } else {
        place--
        const zero = char.codePointAt(0)! - digit
        // One em per digit, so a column between two digits shows them close together.
        box.style.cssText =
          'display:inline-block;position:relative;clip-path:inset(0);line-height:1'
        const sizer = document.createElement('span')
        sizer.style.visibility = 'hidden'
        sizer.textContent = String.fromCodePoint(zero)
        const strip = document.createElement('span')
        strip.style.cssText = 'position:absolute;inset:0 0 auto;display:flex;flex-direction:column'
        // 0 to 9 and 0 again, so a column between 9 and 0 shows both halves.
        for (let i = 0; i <= 10; i++) {
          const line = document.createElement('span')
          line.textContent = String.fromCodePoint(zero + (i % 10))
          strip.append(line)
        }
        box.append(sizer, strip)
        columns.push({ place, box, strip })
      }
      if (index === first) visual.append(run)
      ;(index >= first && index <= last ? run : visual).append(box)
    })
    const spoken = document.createElement('span')
    spoken.style.cssText = hidden
    // Without the label for screen readers, they read the final value here.
    spoken.textContent = final
    rolls.set(element, {
      places,
      prefix: chars.slice(0, first).join(''),
      columns,
      nodes: [visual, spoken],
      steady,
      last: null,
    })
  }

  return {
    read: (element, options) => {
      const on = readBoolean(element, 'data-counter-roll', options.roll ?? false)
      if (!on) rolls.delete(element)
      enabled.set(element, {
        roll: on,
        steady: readBoolean(element, 'data-counter-steady', options.steady ?? false),
      })
    },
    ready: (element, from, to, text) => {
      rolls.delete(element)
      const { roll: on, steady } = enabled.get(element)!
      if (!on) return
      const start = text(from)
      const end = text(to)
      const places = placesOf(to, end)
      // Both ends must be plain digits of their values, written the same way around them.
      if (places === null || placesOf(from, start) !== places) return
      const template = (digitsOf(start) ?? 0) > (digitsOf(end) ?? 0) ? start : end
      build(element, template, end, places, steady)
    },
    write: (element, value, text) => {
      const state = rolls.get(element)
      if (!state || value < 0 || !text.startsWith(state.prefix)) return false
      if (!element.contains(state.nodes[0]!)) element.replaceChildren(...state.nodes)
      const scaled = value * 10 ** state.places
      const moved = state.last === null ? 0 : Math.abs(scaled - state.last)
      state.last = scaled
      // Places that have a digit now: the units, the decimals, and the digits of the value.
      const shown = Math.max(state.places + 1, String(Math.floor(scaled)).length)
      state.columns.forEach(({ place, box, strip }) => {
        const visible = place < shown
        // Leading places keep their width with `steady`, and take none without it.
        box.style.display = visible || state.steady ? (strip ? 'inline-block' : '') : 'none'
        box.style.visibility = visible ? '' : 'hidden'
        if (strip) {
          const exact = (scaled / 10 ** place) % 10
          // A column that turns more than once a frame is a blur: show whole digits.
          const turn = moved / 10 ** place >= 1 ? Math.floor(exact) : exact
          strip.style.transform = `translateY(${(-turn * 100) / 11}%)`
        }
      })
      return true
    },
  }
}
