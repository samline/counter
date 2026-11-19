import { readEnum, readNumber } from '@samline/internal'
import { DATE_STYLES, DAY, isDateOnly, readClock, readDate, writeClock } from '../core/counter.js'
import { readFinal, type KindReader } from './controller.js'

/** `as: 'time'`: seconds shown as a clock in the pattern of the text. */
export const timeValue: KindReader = (element, original, options, locale) => {
  const clock = readClock(original)
  const to = readFinal(element).number ?? options.to ?? clock?.seconds
  if (to === undefined) return null

  const fromAttribute = element.getAttribute('data-counter-from')?.trim() ?? ''
  const from = fromAttribute.includes(':')
    ? (readClock(fromAttribute)?.seconds ?? 0)
    : readNumber(element, 'data-counter-from', options.from ?? 0)

  const fields = clock?.fields ?? (Math.max(from, to) >= 3600 ? 3 : 2)
  const padded = clock?.padded ?? true
  const one = new Intl.NumberFormat(locale, { useGrouping: false })
  const two = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 2 })
  const digits = (value: number, pad: boolean) => (pad ? two : one).format(value)
  const custom = options.formatter

  return {
    from,
    to,
    format: custom
      ? value => custom(value, element)
      : value =>
          (clock?.prefix ?? '') + writeClock(value, fields, padded, digits) + (clock?.suffix ?? ''),
    step: readNumber(element, 'data-counter-step', options.step ?? 1),
  }
}

/** `as: 'date'`: days between two dates, written with `Intl.DateTimeFormat`. */
export const dateValue: KindReader = (element, _original, options, locale) => {
  const written = element.getAttribute('datetime') || readFinal(element).raw
  const to = readDate(written) ?? readDate(options.to)
  if (to === null) return null
  const utc = isDateOnly(written)
  const year = new Date(to)

  const fromAttribute = element.getAttribute('data-counter-from') ?? ''
  const from =
    readDate(fromAttribute) ??
    readDate(options.from) ??
    (utc ? Date.UTC(year.getUTCFullYear(), 0, 1) : new Date(year.getFullYear(), 0, 1).getTime())

  const dateStyle = readEnum(element, 'data-counter-date-style', DATE_STYLES, 'long')
  const formatter = new Intl.DateTimeFormat(locale, {
    ...(utc && { timeZone: 'UTC' }),
    ...(element.hasAttribute('data-counter-date-style') || !options.dateFormat
      ? { dateStyle }
      : options.dateFormat),
  })
  const custom = options.formatter

  return {
    from,
    to,
    format: custom ? value => custom(value, element) : value => formatter.format(value),
    step: readNumber(element, 'data-counter-step', options.step ?? 1) * DAY,
    // `speed` counts days per second.
    unit: DAY,
  }
}
