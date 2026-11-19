# Changelog

All notable changes to this package. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/).

## Unreleased

### Added

- Ordinals: an English (`st`, `nd`, `rd`, `th`) or French (`er`, `e`) suffix right after the digits that matches the final value now follows every value, so `21st` counts `1st`, `2nd`, `3rd` instead of `2st` and `3st`. `ordinal` option and `data-counter-ordinal` attribute: `true` adds the language's suffixes, an object (`{ one: 'er', other: 'e' }`) or `one=er other=e` sets them by `Intl.PluralRules` ordinal category, and `false` keeps the suffix as written. Also in the lite entry.
- `ordinal(locale, suffixes)`, `ORDINALS` and the `OrdinalSuffixes` type.
- Ordinals example: a rank, a release, a French edition and a Spanish season.

### Changed

- Size budgets: 10 KB gzip for the main entry and the browser bundle (were 9.5 KB), 7 KB for the lite entry and its bundle (were 6.5 KB).

## [1.11.0] - 2026-11-19

### Added

- `scramble` option and `data-counter-scramble` attribute: while counting, the element shows the final text with random digits and settles them from left to right, like a code being cracked. Prefixes, separators and suffixes stay, random digits use the script of the text, the digits change every 50 milliseconds, and the count ends on the original markup. Works with numbers, clocks and dates; `roll` wins where both apply. Main entry only.
- Scramble example: an order number, money and a clock that settle digit by digit, with `steady`.

## [1.10.0] - 2026-11-18

### Added

- `start: 'scroll'` and `data-counter-start="scroll"`: the value follows the scroll position instead of time. A number counts from its start value when its middle enters at the bottom of the viewport (or `root`) to its final value at the middle, and back when scrolling up. Easing, events, `onUpdate`, `cssVars`, `output`, `roll` and live values follow every step. In the lite entry it counts once on visibility.
- `scrollRange` option and `data-counter-scroll-range` attribute: where a scroll-linked count starts and ends, as shares of the root height (default `[1, 0.5]`).
- Scroll-linked example: three facts in a scrolling box, with rolling digits and a bar drawn from `--counter-progress`.

### Changed

- Size budgets: 9.5 KB gzip for the main entry and the browser bundle (were 9 KB), 6.5 KB for the lite entry and its bundle (were 6.25 KB).

## [1.9.0] - 2026-11-18

### Added

- `roll` option and `data-counter-roll` attribute: each digit is a column that rolls like an odometer while the number counts. A column turns `value / 10^place` times, so every column shows the real digit of its place; columns that turn more than once a frame show whole digits. Prefixes, separators, decimals, suffixes and other scripts' digits stay in place, digits run left to right in right-to-left text, and the count ends on the original markup. Text whose digits do not follow the value (clocks, dates, compact notation, negative numbers) counts as text. Main entry only.
- Rolling digits example: money, a percentage, Arabic-Indic digits and a score with `steady`.

### Changed

- Size budgets: 9 KB gzip for the main entry and the browser bundle (were 8 KB). The lite entry is unchanged.

## [1.8.0] - 2026-11-18

### Added

- `@samline/counter/lite` entry and `dist/browser/counter-lite.global.js` (`@samline/counter/browser/lite`): the same API for plain numbers, about 6 KB gzip instead of 8 KB. It leaves out clocks and dates (`as: 'time'` and `'date'` elements stay as rendered), `cssVars`, `output`, `steady` and `announce`. Both entries share `getCounter` and the owner of each element.

### Changed

- Clocks and dates, outputs, `steady` and announcements are separate modules inside the package, so an entry includes only what it uses. The main entry and its behavior are unchanged.
- Size budgets: 6.25 KB gzip for the lite entry and bundle; 8 KB for the main ones.

## [1.7.0] - 2026-11-18

### Added

- `label` option and `data-counter-label` attribute, on by default: while the text is not final (waiting, counting or paused), generic elements are exposed as an image labelled with the final value, so screen readers never read a number in between. Elements with a role or label of their own are left alone.
- `announce` option and `data-counter-announce` attribute: new values from `set()`, `increment()`, `decrement()` or a live attribute are read in a shared polite live region once they are shown, as is or through a `{value}` template.
- `reducedMotion` option and `data-counter-reduced-motion` attribute: `'count'` keeps counting with `prefers-reduced-motion: reduce`. `REDUCED_MOTIONS` and the `CounterReducedMotion` type.
- Screen readers example: the label while counting and visible announcements from two buttons.

### Changed

- Waiting and counting numbers carry `role="img"` and `aria-label` until they are done; pass `label: false` for the previous behavior.
- Size budgets: 8 KB gzip for the main entry and the browser bundle (were 7.25 KB).

## [1.6.0] - 2026-11-18

### Added

- `steady` option and `data-counter-steady` attribute: tabular digits and a `min-inline-size` reserved for the wider of the start and final text, so the words around a counting number stay still. `destroy()` restores the original inline styles.
- Numbers written in Arabic-Indic, Persian, Devanagari, Bengali, Thai, full-width and other decimal digits are read from the text and count in the same digits. `digitValue()` and `numberingSystem()` helpers; `NumberShape` gains `zero`.
- `format(value, element?)` on the controller: the text the counter shows for any value.
- Steady layout example: a line with and without `steady`, Arabic and Devanagari numbers, and a goal written with `format()`.

### Changed

- Latin digits in the HTML stay Latin in languages whose default digits are others (Arabic, for example), following the rendered text as the template. Pass `format: { numberingSystem }` to choose.
- Size budgets: 7.25 KB gzip for the main entry and the browser bundle (were 6.5 KB).

## [1.5.0] - 2026-11-18

### Added

- Easings `ease-in`, `ease-out-expo` and `ease-out-back`.
- CSS `cubic-bezier(x1, y1, x2, y2)` strings as easings, in `easing` and in `data-counter-easing`. `cubicBezier()` and `isEasing()` helpers.
- `speed` option and `data-counter-speed` attribute: units per second instead of a fixed `duration`, so small numbers take less time than big ones; after `set()` the time comes from the distance left.
- `stagger` option, and `data-counter-stagger` on a container: each next number starts later, also when `autoCounter` counts them one by one.
- Motion example: seven curves side by side, a staggered row and two speeds.

### Changed

- Size budgets: 6.5 KB gzip for the main entry and the browser bundle (were 6 KB).

## [1.4.0] - 2026-11-18

### Added

- `output` option and `data-counter-output` attribute: write the value on screen to `<progress>`, `<meter>` and inputs, or as `aria-valuenow` on other elements, on every frame. `output` also takes a function `(value, element, progress)`.
- `cssVars` option and `data-counter-css-vars` attribute: set `--counter-value` and `--counter-progress` (`0` to `1`) on the number, or on its closest ancestor matching a selector.
- `destroy()` removes those custom properties and restores the values and `aria-valuenow` of outputs.
- `CounterOutput` type.
- Progress and CSS example: a progress bar, a meter, a ring and a goal bar.

### Changed

- Size budgets: 6 KB gzip for the main entry and the browser bundle (were 5.6 KB).

## [1.3.0] - 2026-11-18

### Added

- Live numbers: the controller's `set(value)`, `increment(by)` and `decrement(by)` count from the value on screen to a new final value, for one element or all of them. Quick `increment` calls add up.
- Changing `data-counter` (or `datetime` with `as: 'date'`) counts to the new value on its own; turn it off with `live: false` or `data-counter-live="false"`.
- `animateNumber` returns its cancel function with `pause()`, `resume()`, `retarget(to, duration?)`, `getValue()` and `isRunning()`. The `NumberAnimation` type describes it.
- Live numbers example: a monthly or yearly price, a cart with add and remove buttons, and visitors updated through the attribute.

### Changed

- `getSnapshot()` keeps `progress` between `0` and `1` after a new value.
- Size budgets: 5.6 KB gzip for the main entry and the browser bundle (were 5.3 KB).

## [1.2.0] - 2026-11-18

### Added

- `as` option and `data-counter-as` attribute. `'time'` counts seconds in the pattern of the text (`23:59:59` or `90:00`), carrying seconds into minutes and hours; `data-counter-from` accepts a clock. `'date'` counts day by day up to the `datetime` (or an ISO date in `data-counter`), from January 1 of that year or `data-counter-from`, formatted with `Intl.DateTimeFormat` (`data-counter-date-style` or `dateFormat`), and ends on the rendered text.
- `step` option and `data-counter-step` attribute: show whole steps only, in units, seconds or days; the final value stays exact.
- `readClock`, `writeClock` and `readDate` helpers; `CounterKind` and `ClockShape` types.
- Clock and calendar example. The Controls example uses `as: 'time'` instead of a formatter.

### Changed

- Size budgets: 5.3 KB gzip for the main entry and the browser bundle (were 4.4 and 4.45 KB).

## [1.1.0] - 2026-11-18

### Added

- `counter()` returns a controller with `start()`, `pause()`, `resume()`, `reset()`, `finish()`, `update(options)`, `refresh()`, `getSnapshot()` and `on(event, listener)`. Commands act on every element or on one, and chain. The controller is still callable as the cleanup, so 1.0 code keeps working.
- `start` option and `data-counter-start` attribute: `'visible'` (default), `'load'` or `'manual'`.
- `grouping` option and `data-counter-grouping` attribute: `'auto'` (default) writes digits the way the HTML does, `true` groups as the language does (a raw `8000` from a backend counts to `8,000`), `false` never groups.
- Formats example: grouping, decimals and text around the number, with a Count again button.
- `paused` state in `data-counter-state`.
- Bubbling DOM events `counter:start`, `counter:pause`, `counter:resume`, `counter:reset` and `counter:complete`, with `{ element, value, state }` as `detail`.
- `getCounter(element)`, also on `window.Counter`, returns the controller counting an element.
- `readShape(text, locale?)` and the controller types (`CounterController`, `CounterEvent`, `CounterEventDetail`, `CounterListener`, `CounterSnapshot`, `CounterStart`, `NumberShape`).
- Controls example: a simulated clock started, paused and finished from buttons.

### Fixed

- Counting keeps the text around the number: `$8,000` no longer loses its `$`, and `8.000,45 €` keeps its ` €`. It also stays with `format`, unless `format.style` is `currency`, `percent` or `unit`.
- When the final value reads like the original text, the count ends on the original markup, so `100<sup>+</sup>` is shown as written once done, not only after `destroy()`.

### Changed

- Digits count the way the HTML writes them: `8000` now counts to `8000` (1.0 showed `8,000`). Set `grouping: true` or `data-counter-grouping="true"` for the separators of the language.
- Calling `counter()` for elements another controller already counts leaves them to it, and returns that controller when it owns them all. Before, a second call counted the same element twice.
- Size budgets: 4.4 KB gzip for the main entry, 4.45 KB for the browser bundle (were 3.1 and 3.2 KB).

## [1.0.1] - 2026-11-17

### Fixed

- Cleanup restores the element's original child nodes instead of only its text, so markup inside a counter (for example `100<sup>+</sup>`) survives `destroy()` and removal.

### Changed

- Internal: the DOM controller moved from `src/core` to `src/vanilla`; `src/core` keeps the DOM-free types, constants and helpers. Public entries are unchanged.
- The package moved from the `samline/utils` monorepo to its own repository, [samline/counter](https://github.com/samline/counter). Homepage, repository and documentation links point to the package's own site.

## [1.0.0] - 2026-11-13

### Added

- First release: `counter` and `autoCounter` count numbers as they scroll into view, from the final value rendered in the HTML, with time-based easing, decimals taken from the target, `Intl.NumberFormat` formatting in the element's language (currencies, compact, units or your own `formatter`), counting down, `repeat` and reduced-motion support. `animateNumber` tweens any number and `parseNumber` reads localized text. ESM, CommonJS and a browser global (`window.Counter`) that starts on its own.
