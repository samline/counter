# Changelog

All notable changes to this package. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/).

## [1.0.1] - 2026-11-17

### Fixed

- Cleanup restores the element's original child nodes instead of only its text, so markup inside a counter (for example `100<sup>+</sup>`) survives `destroy()` and removal.

### Changed

- The package moved from the `samline/utils` monorepo to its own repository, [samline/counter](https://github.com/samline/counter). Homepage, repository and documentation links point to the package's own site.

## [1.0.0] - 2026-11-13

### Added

- First release: `counter` and `autoCounter` count numbers as they scroll into view, from the final value rendered in the HTML, with time-based easing, decimals taken from the target, `Intl.NumberFormat` formatting in the element's language (currencies, compact, units or your own `formatter`), counting down, `repeat` and reduced-motion support. `animateNumber` tweens any number and `parseNumber` reads localized text. ESM, CommonJS and a browser global (`window.Counter`) that starts on its own.
