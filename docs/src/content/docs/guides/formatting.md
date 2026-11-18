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

## Clocks, durations and dates

A counter animates one number. To show it as a clock or a date, count the smallest unit and let `formatter` carry it into the larger ones, so seconds roll into minutes and minutes into hours:

```js
const pad = number => String(number).padStart(2, '0')

counter('#clock', {
  to: 86399, // seconds in a day, minus one
  duration: 8000,
  easing: 'linear',
  formatter: value => {
    const seconds = Math.floor(value)
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
  },
})
```

For days that roll into months and years, count days and format a date; `Intl.DateTimeFormat` handles month lengths and leap years:

```js
const start = Date.UTC(2026, 0, 1)
const day = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' })

counter('#date', {
  to: 365,
  duration: 6000,
  formatter: days => day.format(start + Math.floor(days) * 86_400_000),
})
```

These are simulations: they run for `duration`, not on the wall clock.

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
