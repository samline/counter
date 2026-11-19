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

## Ordinals

Since 1.12.0, an ordinal suffix follows the value: `21st` counts `1st`, `2nd`, `3rd`, `4th` … `21st`, instead of `2st` and `3st`. A suffix of English (`st`, `nd`, `rd`, `th`) or French (`er`, `e`) right after the digits is recognized when it matches the final value, so plain HTML needs nothing else.

```html
<span data-counter data-counter-from="340">21st</span> of 340 teams
<!-- 340th … 23rd, 22nd, 21st -->
<span lang="fr" data-counter>2e</span> édition
<!-- 0e, 1er, 2e -->
```

For other languages, give the suffixes by [`Intl.PluralRules` ordinal category](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules/PluralRules#type) (`zero`, `one`, `two`, `few`, `many`, `other`) in `data-counter-ordinal` or the `ordinal` option. A category without a suffix uses `other`.

```html
<span lang="it" data-counter="3" data-counter-ordinal="other=º">3º</span>
```

```js
counter('.rank', { ordinal: { one: 'er', other: 'e' } })
```

- `data-counter-ordinal` (or `ordinal: true`) adds the language's suffixes to a number written without them, and English suffixes in a language without its own.
- `data-counter-ordinal="false"` (or `ordinal: false`) keeps the suffix as written.
- Ordinals are whole numbers: with decimals, the suffix stays as written.
- `ordinal(locale, suffixes)` returns the suffix of any value, and `ORDINALS` holds the English and French suffixes.

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

## Progress bars, meters and CSS

Since 1.4.0 the number can drive other elements while it counts.

`data-counter-output` writes the value on screen to a `<progress>`, `<meter>` or input as their value, and to any other element as `aria-valuenow`. Keep the final value in their HTML too, so the page is right without JavaScript:

```html
<span data-counter="72" data-counter-output="#html-skill">72</span>%
<progress id="html-skill" max="100" value="72">72%</progress>
```

`data-counter-css-vars` sets two custom properties on every frame: `--counter-value`, the number on screen, and `--counter-progress`, from `0` at the start value to `1` at the final value. Without a value they go on the number itself; with a selector, on its closest match, so a parent can use them:

```html
<div class="ring">
  <span data-counter data-counter-css-vars=".ring">86%</span>
</div>
```

```css
.ring {
  --counter-value: 86; /* without JavaScript */
  background:
    radial-gradient(closest-side, white 78%, transparent 80%),
    conic-gradient(currentColor calc(var(--counter-value) * 3.6deg), #e5e5e5 0);
}
```

In JavaScript, `output` also takes a function, called on every frame with the value, the element and the progress, for SVG, canvas or anything else:

```js
counter('#score', { output: (value, element, progress) => gauge.setAttribute('d', arc(progress)) })
```

`destroy()` removes the custom properties and puts back the values and `aria-valuenow` the outputs had. The [Progress and CSS example](../examples/#guide-progress) shows a progress bar, a meter, a ring and a goal bar.

## A steady layout

Digits have different widths in most fonts, so a number can wobble while it counts, and a number that grows from `0` to `1,250,000` pushes the words after it. Since 1.6.0, `data-counter-steady` (or `steady: true`) fixes both: tabular digits and the width of the wider of the start and final text, reserved from the start.

```html
<p><span data-counter data-counter-steady>1,250,000</span> downloads this year</p>
```

```js
autoCounter({ steady: true })
```

The box keeps the alignment of its parent, so a centered stat stays centered. To do it in CSS instead, use tabular figures and a width of your own:

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

## Digits in other scripts

Since 1.6.0 a number written in Arabic-Indic, Persian, Devanagari, Bengali, Thai, full-width or other decimal digits counts in those digits, with the separators of its language:

```html
<p lang="ar" dir="rtl"><span data-counter>١٬٢٥٠٬٠٠٠</span> تنزيل</p>
<p lang="hi"><span data-counter>१२,५०,०००</span> डाउनलोड</p>
```

Latin digits stay Latin, even in a language that writes others by default. To choose the digits yourself, pass `format: { numberingSystem: 'arab' }` (or `'deva'`, `'thai'`, `'latn'`…).

## The same text anywhere

`format(value, element?)` on the controller returns the text the counter would show for any value, with the element's template, language, clock or date style. Use it for a goal, a tooltip or a label next to the number:

```js
const downloads = counter('#downloads')
document.querySelector('#goal').textContent = downloads.format(2_000_000) // "2,000,000"
```

## Reading text in any language

With an empty `data-counter`, the final value is read from the text with `parseNumber`, using the decimal separator of the element's language. `1.234` is one thousand two hundred thirty-four in German and one point two three four in English, so set `lang` (or `data-counter-locale`) whenever the text is not in the page's language, or put the plain number in `data-counter`.
