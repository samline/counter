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

| Attribute                 | Value                               | Description                                                                               |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `data-counter`            | number, or empty                    | The final value as a plain number (`12480`, `99.95`, `-3`). Empty reads it from the text. |
| `data-counter-from`       | number                              | Start value. Higher than the target counts down.                                          |
| `data-counter-duration`   | milliseconds                        | How long counting takes                                                                   |
| `data-counter-delay`      | milliseconds                        | Wait before counting                                                                      |
| `data-counter-easing`     | `ease-out`, `ease-in-out`, `linear` | Curve of the count                                                                        |
| `data-counter-decimals`   | number                              | Decimals to show                                                                          |
| `data-counter-locale`     | BCP 47 tag                          | Language for formatting and for reading the text                                          |
| `data-counter-repeat`     | present, or `false`                 | Reset on leaving, count again on every entry                                              |
| `data-counter-start`      | `visible`, `load`, `manual`         | When counting starts (since 1.1.0)                                                        |
| `data-counter-grouping`   | `auto`, `true`, `false`             | Group separators: as the HTML writes them, as the language does, or never (since 1.1.0)   |
| `data-counter-as`         | `number`, `time`, `date`            | What the number means: a number, seconds shown as a clock, or days between dates (1.2.0)  |
| `data-counter-step`       | number                              | Show whole steps only: units, seconds with `time`, days with `date` (since 1.2.0)         |
| `data-counter-date-style` | `full`, `long`, `medium`, `short`   | Date format with `as="date"`; default `long` (since 1.2.0)                                |
| `datetime`                | ISO date                            | Final date with `as="date"`; `data-counter-from` takes an ISO date too                    |

## Options

| Option                         | Default                                | Description                                                                        |
| ------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `from`                         | `0`                                    | Start value                                                                        |
| `to`                           | —                                      | Final value when `data-counter` has no number; by default it is read from the text |
| `duration`                     | `2000`                                 | Milliseconds                                                                       |
| `delay`                        | `0`                                    | Milliseconds before counting                                                       |
| `easing`                       | `'ease-out'`                           | A name or a function from progress (`0`–`1`) to eased progress                     |
| `decimals`                     | from the target                        | Decimals to show                                                                   |
| `locale`                       | closest `lang`                         | BCP 47 locale; an invalid one falls back to the browser's                          |
| `format`                       | —                                      | `Intl.NumberFormat` options, for example `{ style: 'currency', currency: 'EUR' }`  |
| `formatter(value, element)`    | —                                      | Returns the text yourself; replaces `locale`, `decimals` and `format`              |
| `repeat`                       | `false`                                | Count again every time the number enters                                           |
| `start`                        | `'visible'`                            | `'visible'`, `'load'` (right away) or `'manual'` (when you call `start()`)         |
| `grouping`                     | `'auto'`                               | `'auto'` copies the HTML, `true` groups as the language does, `false` never groups |
| `as`                           | `'number'`                             | `'time'` (seconds as a clock) or `'date'` (days between two dates)                 |
| `step`                         | none; `1` with `time` and `date`       | Whole steps only, in the unit of the value; the final value is always exact        |
| `dateFormat`                   | `{ dateStyle: 'long' }`                | `Intl.DateTimeFormat` options with `as: 'date'`                                    |
| `root`                         | viewport                               | Scroll container to observe against                                                |
| `rootMargin`                   | `'0px'`                                | Grows or shrinks the root                                                          |
| `threshold`                    | `0.5`                                  | Share of the number that must be visible to start                                  |
| `onStart(element)`             | —                                      | Counting starts                                                                    |
| `onUpdate(value, element)`     | —                                      | Every frame, with the unformatted value                                            |
| `onComplete(element)`          | —                                      | The final value is shown (also right away with reduced motion)                     |
| `selector`, `scope`, `observe` | `'[data-counter]'`, `document`, `true` | `autoCounter` only                                                                 |

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
