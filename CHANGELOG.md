# Changelog

All notable changes to this package. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/).

## Unreleased

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
