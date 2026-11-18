---
title: 'Number formatting'
titleAccent: 'formatting'
description: Format @samline/counter numbers for any language with currencies, percentages, compact notation or a formatter, and keep the layout steady.
locale: en
sidebar:
  group: guides
  order: 2
---

Numbers are formatted with `Intl.NumberFormat` in the language of the element: the closest `lang` attribute, `data-counter-locale` or the `locale` option. Write the HTML the same way, so the text is identical before and after counting.

```html
<html lang="de">
  …
  <span data-counter="12345.5">12.345,5</span>
</html>
```

## Currencies, units and compact numbers

Pass `Intl.NumberFormat` options with `format`:

```js
counter('.price', { locale: 'es-MX', format: { style: 'currency', currency: 'MXN' } })
counter('.followers', { format: { notation: 'compact' } }) // 12K, 1.2M
counter('.speed', { format: { style: 'unit', unit: 'kilometer-per-hour' } })
```

Fraction digits in `format` win over the decimals taken from the target.

For percentages, write fractions in `data-counter` (`0.25` for 25%); the decimals of the target are reduced by two, so `0.25` shows `25%` and `0.255` shows `25.5%`.

## Your own text

`formatter` replaces formatting entirely:

```js
counter('.duration', {
  formatter: minutes => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`,
})
```

## Numbers from a backend or a CMS

A number counts the way the HTML writes it. When your template prints a raw value such as `8000` and you want `8,000`, ask for the separators of the language with `data-counter-grouping="true"` (or `grouping: true`), and fix the decimals with `data-counter-decimals`:

```html
<p lang="en">
  <span data-counter data-counter-grouping="true">8000</span>
  <!-- 0 … 8,000 -->
  <span data-counter data-counter-grouping="true" data-counter-decimals="2">8000</span>
  <!-- 0.00 … 8,000.00 -->
  <span data-counter data-counter-grouping="true">$8000</span>
  <!-- $0 … $8,000 -->
</p>
```

Without JavaScript the visitor sees the raw `8000`. If that matters, format the number on the server and put the raw value in the attribute: `<span data-counter="8000">8,000</span>`.

`data-counter-grouping="false"` does the opposite, for years, IDs or codes that must never get separators: `2,026` would be wrong for a year.

## Prefixes, suffixes and grouping

The text of the element is the template: what comes before and after the number stays while it counts, and digits written without a group separator stay that way. `format` keeps the prefix and suffix unless its style is `currency`, `percent` or `unit`; `formatter` replaces the whole text.

```html
<span data-counter>$8,000</span>
<!-- $0 … $8,000 -->
<span data-counter>8000 visits</span>
<!-- 0 visits … 8000 visits -->
<span data-counter>8,000.45</span>
<!-- 0.00 … 8,000.45 -->
```

Text outside the element works too, and keeps the counted element short:

```html
+<span data-counter="42">42</span>% <span data-counter="4.9">4.9</span> / 5
```

## Clocks and dates

Since 1.2.0, `data-counter-as` tells counter what the number means, and the HTML stays the source of truth.

### Clocks: `data-counter-as="time"`

The value is in seconds and the text gives the pattern: `23:59:59` is hours, minutes and seconds, `90:00` is minutes and seconds. Seconds carry into minutes and minutes into hours, and the clock moves one whole second at a time.

```html
<time data-counter data-counter-as="time">23:59:59</time>
<!-- 00:00:00 … 00:59:59, 01:00:00 … 23:59:59 -->
<time data-counter data-counter-as="time">90:00</time>
<!-- 00:00 … 45:00 … 90:00: minutes go past 59 without an hours field -->
<time data-counter data-counter-as="time" data-counter-from="08:00:00">17:30:00</time>
<!-- a work day: the start can be a clock too -->
<span data-counter="0" data-counter-as="time" data-counter-from="600">10:00</span>
<!-- counts down: 10:00 … 00:00 -->
```

- A first field written with one digit (`1:05:00`) stays unpadded; the others always have two digits.
- Text around the clock stays: `Run 1:05:00 total`.
- `data-counter-step="60"` moves a minute at a time.
- Without a clock in the text, `data-counter="5400"` gives the seconds; values of an hour or more show hours.

### Dates: `data-counter-as="date"`

Counts day by day up to the `datetime` (or an ISO date in `data-counter`), formatted with `Intl.DateTimeFormat` in the language of the element, so months, years and leap days roll over on their own. It starts on January 1 of that year unless `data-counter-from` says otherwise, and ends on the text you wrote.

```html
<time data-counter data-counter-as="date" datetime="2026-12-31">December 31, 2026</time>
<!-- January 1, 2026 … January 31, 2026, February 1, 2026 … December 31, 2026 -->
<time
  data-counter
  data-counter-as="date"
  datetime="2027-01-01"
  data-counter-from="2026-12-01"
  data-counter-date-style="medium"
  data-counter-step="7"
>
  Jan 1, 2027
</time>
<!-- week by week: Dec 1, 2026, Dec 8, 2026 … Dec 29, 2026, Jan 1, 2027 -->
```

- `data-counter-date-style` is `full`, `long` (default), `medium` or `short`. In JavaScript, `dateFormat` takes any `Intl.DateTimeFormat` options, for example `{ month: 'long', year: 'numeric' }` to count months.
- A date without a time (`2026-12-31`) is a calendar day, the same in every time zone. A date with a time (`2026-12-31T18:00`) is local time.
- `data-counter-step` is in days.
- In JavaScript, `from` and `to` are timestamps: `counter(el, { as: 'date', from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 11, 31) })`.

The [Clock and calendar example](../examples/#guide-clock) runs every case. These are simulations: they run for `duration`, not on the wall clock.

### Your own units

For anything else, count the smallest unit and let `formatter` carry it:

```js
counter('#flight', {
  to: 750, // minutes
  formatter: minutes => `${Math.floor(minutes / 60)} h ${Math.floor(minutes % 60)} min`,
})
```

`formatter` also replaces the clock and the date text when `data-counter-as` is set.

## A steady layout

Digits have different widths in most fonts, so a number can wobble while it counts. Use tabular figures; when the number shares a line with other text, also reserve its final width:

```css
[data-counter] {
  font-variant-numeric: tabular-nums;
}
.stat [data-counter] {
  display: inline-block;
  min-width: 6ch;
  text-align: end;
}
```

## Reading text in any language

With an empty `data-counter`, the final value is read from the text with `parseNumber`, using the decimal separator of the element's language. `1.234` is one thousand two hundred thirty-four in German and one point two three four in English, so set `lang` (or `data-counter-locale`) whenever the text is not in the page's language, or put the plain number in `data-counter`.
