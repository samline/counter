---
title: 'Configuration options'
titleAccent: 'options'
description: Every @samline/counter attribute, JavaScript option and state, with defaults and which one wins.
locale: en
sidebar:
  group: reference
  order: 2
  label: Configuration
---

## Attributes

Attributes win over options, so one call can set defaults and each number can override them.

| Attribute                     | Value                              | Description                                                                                                                            |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `data-counter`                | number, or empty                   | The final value as a plain number (`12480`, `99.95`, `-3`). Empty reads it from the text.                                              |
| `data-counter-from`           | number                             | Start value. Higher than the target counts down.                                                                                       |
| `data-counter-duration`       | milliseconds                       | How long counting takes                                                                                                                |
| `data-counter-delay`          | milliseconds                       | Wait before counting                                                                                                                   |
| `data-counter-speed`          | units per second                   | Count at a steady rate instead of a fixed duration (since 1.5.0)                                                                       |
| `data-counter-stagger`        | milliseconds, on a container       | Each next `[data-counter]` inside starts this much later (since 1.5.0)                                                                 |
| `data-counter-easing`         | an easing name or `cubic-bezier()` | Curve of the count: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `ease-out-expo`, `ease-out-back` or `cubic-bezier(x1, y1, x2, y2)` |
| `data-counter-decimals`       | number                             | Decimals to show                                                                                                                       |
| `data-counter-locale`         | BCP 47 tag                         | Language for formatting and for reading the text                                                                                       |
| `data-counter-repeat`         | present, or `false`                | Reset on leaving, count again on every entry                                                                                           |
| `data-counter-start`          | `visible`, `load`, `manual`        | When counting starts (since 1.1.0)                                                                                                     |
| `data-counter-live`           | present, or `false`                | Count to a new `data-counter` or `datetime` when it changes; on by default (since 1.3.0)                                               |
| `data-counter-css-vars`       | present, `false`, or a selector    | Set `--counter-value` and `--counter-progress` on the number or its closest match (1.4.0)                                              |
| `data-counter-output`         | selector                           | Write the value to a `<progress>`, `<meter>`, input or `aria-valuenow` (since 1.4.0)                                                   |
| `data-counter-steady`         | present, or `false`                | Tabular digits and the width of the wider of the start and final text reserved, so nothing moves (since 1.6.0)                         |
| `data-counter-roll`           | present, or `false`                | Roll each digit like an odometer while counting; numbers only, not in the lite entry (since 1.9.0)                                     |
| `data-counter-label`          | present, or `false`                | Expose the final value to screen readers while the text is not final; on by default (since 1.7.0)                                      |
| `data-counter-announce`       | present, `false`, or a template    | Announce new values in a polite live region; `{value}` is the final text (since 1.7.0)                                                 |
| `data-counter-reduced-motion` | `final`, `count`                   | With reduced motion, show the final value (default) or count anyway (since 1.7.0)                                                      |
| `data-counter-grouping`       | `auto`, `true`, `false`            | Group separators: as the HTML writes them, as the language does, or never (since 1.1.0)                                                |
| `data-counter-as`             | `number`, `time`, `date`           | What the number means: a number, seconds shown as a clock, or days between dates (1.2.0)                                               |
| `data-counter-step`           | number                             | Show whole steps only: units, seconds with `time`, days with `date` (since 1.2.0)                                                      |
| `data-counter-date-style`     | `full`, `long`, `medium`, `short`  | Date format with `as="date"`; default `long` (since 1.2.0)                                                                             |
| `datetime`                    | ISO date                           | Final date with `as="date"`; `data-counter-from` takes an ISO date too                                                                 |

## Options

| Option                         | Default                                | Description                                                                                |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `from`                         | `0`                                    | Start value                                                                                |
| `to`                           | —                                      | Final value when `data-counter` has no number; by default it is read from the text         |
| `duration`                     | `2000`                                 | Milliseconds                                                                               |
| `delay`                        | `0`                                    | Milliseconds before counting                                                               |
| `speed`                        | —                                      | Units per second instead of `duration`; seconds with `time`, days with `date`              |
| `stagger`                      | `0`                                    | Milliseconds added to the delay of each next element of the call                           |
| `easing`                       | `'ease-out'`                           | A name, a `cubic-bezier()` string, or a function from progress (`0`–`1`) to eased progress |
| `decimals`                     | from the target                        | Decimals to show                                                                           |
| `locale`                       | closest `lang`                         | BCP 47 locale; an invalid one falls back to the browser's                                  |
| `format`                       | —                                      | `Intl.NumberFormat` options, for example `{ style: 'currency', currency: 'EUR' }`          |
| `formatter(value, element)`    | —                                      | Returns the text yourself; replaces `locale`, `decimals` and `format`                      |
| `repeat`                       | `false`                                | Count again every time the number enters                                                   |
| `start`                        | `'visible'`                            | `'visible'`, `'load'` (right away) or `'manual'` (when you call `start()`)                 |
| `live`                         | `true`                                 | Count to a new `data-counter` or `datetime` when it changes                                |
| `cssVars`                      | `false`                                | `true`, or a selector for the closest ancestor, such as `'.card'`                          |
| `output`                       | —                                      | A selector, element or list to write the value to, or `(value, element, progress) => void` |
| `steady`                       | `false`                                | Tabular digits and a reserved width while counting, so the layout keeps still              |
| `roll`                         | `false`                                | Each digit rolls like an odometer while counting; numbers only                             |
| `label`                        | `true`                                 | The final value as the label of generic elements while the text is not final               |
| `announce`                     | `false`                                | `true`, or a template such as `'{value} people online'`, to announce new values            |
| `reducedMotion`                | `'final'`                              | `'count'` counts even with `prefers-reduced-motion: reduce`                                |
| `grouping`                     | `'auto'`                               | `'auto'` copies the HTML, `true` groups as the language does, `false` never groups         |
| `as`                           | `'number'`                             | `'time'` (seconds as a clock) or `'date'` (days between two dates)                         |
| `step`                         | none; `1` with `time` and `date`       | Whole steps only, in the unit of the value; the final value is always exact                |
| `dateFormat`                   | `{ dateStyle: 'long' }`                | `Intl.DateTimeFormat` options with `as: 'date'`                                            |
| `root`                         | viewport                               | Scroll container to observe against                                                        |
| `rootMargin`                   | `'0px'`                                | Grows or shrinks the root                                                                  |
| `threshold`                    | `0.5`                                  | Share of the number that must be visible to start                                          |
| `onStart(element)`             | —                                      | Counting starts                                                                            |
| `onUpdate(value, element)`     | —                                      | Every frame, with the unformatted value                                                    |
| `onComplete(element)`          | —                                      | The final value is shown (also right away with reduced motion)                             |
| `selector`, `scope`, `observe` | `'[data-counter]'`, `document`, `true` | `autoCounter` only                                                                         |

## Easing, speed and stagger

Since 1.5.0:

- **Easings:** `linear`, `ease-in`, `ease-out` (default), `ease-in-out`, `ease-out-expo` (fast start, long landing, good for big numbers) and `ease-out-back` (goes a little past the target, then settles). Any CSS `cubic-bezier(x1, y1, x2, y2)` works too, also in `data-counter-easing`; `x1` and `x2` must be between `0` and `1`, and an invalid curve falls back to `ease-out`.
- **Speed:** `data-counter-speed="1000"` counts 1,000 units per second, so `500` takes half a second and `4000` four seconds; it replaces `duration`. After `set()`, the time comes from the distance left. Seconds per second with `as="time"`, days per second with `as="date"`.
- **Stagger:** `data-counter-stagger="150"` on a container starts its `[data-counter]` elements 150 ms apart, in document order, also when `autoCounter` counts them one by one. In JavaScript, `stagger` does the same for the elements of one `counter()` call. It adds to `delay`, and only the first count of each element waits.

```html
<p data-counter-stagger="150">
  <span data-counter="120">120</span>
  <span data-counter="340">340</span>
  <span data-counter="560">560</span>
</p>
<span data-counter="1000" data-counter-easing="cubic-bezier(0.2, 0.8, 0.2, 1)">1000</span>
```

The [Motion example](../../guides/examples/#guide-motion) shows every curve side by side.

## Steady layout and digits

Since 1.6.0:

- **Steady:** `data-counter-steady` sets `font-variant-numeric: tabular-nums` and a `min-inline-size` (in `em`, so it follows the font size) equal to the wider of the start and final text, and turns inline text into an inline block. The words after a growing number stay where they are, and the alignment of the parent still applies inside the box. It measures again for each new value from `set()` or a live attribute, changes nothing with reduced motion, and `destroy()` puts the original inline styles back.
- **Digits in any script:** text written in Arabic-Indic (`١٬٢٣٤`), Persian, Devanagari (`१,२३४`), Bengali, Thai, full-width or other decimal digits is read as a number and counts in the same digits. Latin digits stay Latin, also in a language that writes others by default. `format: { numberingSystem: 'arab' }` chooses the digits yourself.

```html
<p><span data-counter data-counter-steady>1,250,000</span> downloads this year</p>
<p lang="ar" dir="rtl"><span data-counter>١٬٢٥٠٬٠٠٠</span> تنزيل</p>
```

The [Steady layout example](../../guides/examples/#guide-steady) shows the difference side by side.

## Rolling digits

Since 1.9.0, `data-counter-roll` (or `roll: true`) turns each digit into a column that rolls while the number counts, like an odometer. A column turns `value / 10^place` times, so the last digit spins fastest and every column always shows the real digit of its place; a column that turns more than once a frame shows whole digits. The prefix, separators, decimals and suffix stay in place, Arabic-Indic and other digits roll in their own script, and the digits always run left to right, also in a right-to-left paragraph.

- Leading places appear as the number grows; with `data-counter-steady` they keep their width from the start.
- It needs text whose digits are exactly the value (`1,250`, `$12.50`, `99.95%`). Clocks, dates, compact notation (`8K`) and negative numbers count as text.
- The count ends on the original markup, and the columns are hidden from screen readers, which get the final value.
- It uses inline styles, so there is no stylesheet. It is in the main entry, not in `@samline/counter/lite`.

```html
<span data-counter="1250000" data-counter-roll>$1,250,000</span>
```

The [Rolling digits example](../../guides/examples/#guide-roll) shows money, a percentage, Arabic-Indic digits and a score.

## Units of `from` and `to`

With `as: 'time'`, `from` and `to` are seconds (`data-counter-from` also accepts a clock such as `08:00:00`). With `as: 'date'`, they are timestamps in milliseconds; `from` defaults to January 1 of the final date's year. `onUpdate`, listeners and `getSnapshot()` report values in the same unit, already rounded to the step.

## Final value and decimals

The final value comes from the first of these that holds a number:

1. `data-counter="1234.5"`, a plain number with a `.` for decimals;
2. the `to` option;
3. the element's text, read in its language: `1.234,5` in German, `$1,234.50` in English.

## The rendered text is the template

A number counts the way the HTML writes it (since 1.1.0):

- **Grouping** follows the text with `grouping: 'auto'` (the default): `8000` counts to `8000` and `8,000` to `8,000`. `true` adds the separators of the language (`8000` → `8,000` in English, `8.000` in German); `false` removes them. With fewer than four digits in the text there is nothing to copy, so `'auto'` groups as the language does. `format.useGrouping` wins over `grouping`.
- **Text around the number** stays: `$8,000` counts as `$0`, `$1,250` … `$8,000`, and `8.000,45 €` keeps its ` €`. It also stays with `format`, unless `format.style` is `currency`, `percent` or `unit`, which add their own symbols. `formatter` replaces the whole text.
- **Markup** comes back at the end when the final value reads exactly like the original text, so `100<sup>+</sup>` ends as written. When it reads differently (for example `8000` with `grouping: true`), the count ends on the formatted value.

| HTML                                 | Options                                                            | Ends as     |
| ------------------------------------ | ------------------------------------------------------------------ | ----------- |
| `8000`                               | —                                                                  | `8000`      |
| `8,000.45`                           | —                                                                  | `8,000.45`  |
| `8000`                               | `grouping: true`                                                   | `8,000`     |
| `$8000`                              | `grouping: true`                                                   | `$8,000`    |
| `8000` + `data-counter-decimals="2"` | `grouping: true`                                                   | `8,000.00`  |
| `8,000`                              | `grouping: false`                                                  | `8000`      |
| `8000,5` in `lang="de"`              | `grouping: true`                                                   | `8.000,5`   |
| `8000 visits`                        | `format: { notation: 'compact' }`                                  | `8K visits` |
| `8000`                               | `grouping: true`, `format: { style: 'currency', currency: 'USD' }` | `$8,000`    |

The [Formats example](../../guides/examples/#guide-formats) runs every row.

Decimals come from how the target is written: `data-counter="12.50"` shows two decimals all the way. With `format: { style: 'percent' }`, write fractions (`0.25` for 25%); two decimals are taken off for the percentage.

## States

The script sets `data-counter-state` on each number:

| State      | Meaning                                      |
| ---------- | -------------------------------------------- |
| `pending`  | Showing the start value, waiting to start    |
| `counting` | Counting                                     |
| `paused`   | Stopped by `pause()`, waiting for `resume()` |
| `done`     | Showing the final value                      |

Use them in CSS, for example to highlight a number while it counts:

```css
[data-counter-state='counting'] {
  color: var(--accent);
}
```
