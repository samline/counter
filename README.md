# @samline/counter

Count numbers up (or down) as they scroll into view, with easing, decimals and `Intl` formatting, for vanilla JavaScript, any framework and plain HTML. The final value stays in the HTML, so it is right without JavaScript, for search engines and with reduced motion.

[Demo](https://samline.github.io/counter/) · [Examples](https://samline.github.io/counter/examples/) · [Documentation](https://samline.github.io/counter/docs/) · [Changelog](CHANGELOG.md)

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [HTML / CDN](#html--cdn)
- [Capabilities](#capabilities)
- [API at a glance](#api-at-a-glance)
- [Documentation](#documentation)
- [Changelog](#changelog)
- [AI agent skill](#ai-agent-skill)
- [License](#license)

## Installation

```sh
npm install @samline/counter
```

```sh
pnpm add @samline/counter
```

```sh
bun add @samline/counter
```

Any modern browser with `Intl.NumberFormat`; without IntersectionObserver, numbers count right away. On the server, every function returns a no-op. No runtime dependencies.

## Quick start

```js
import { autoCounter } from '@samline/counter'

autoCounter()
```

```html
<p lang="en">
  <span data-counter="12480">12,480</span> customers · <span data-counter="99.95">99.95</span>%
  uptime · <span data-counter="0" data-counter-from="10">0</span> seconds left
</p>
```

## HTML / CDN

For Shopify, WordPress or plain HTML pages without a build step, load the browser bundle. It counts every `[data-counter]` as soon as the DOM is ready. Pin the version in production.

```html
<script
  src="https://cdn.jsdelivr.net/npm/@samline/counter@1.11.0/dist/browser/counter.global.js"
  defer
></script>
```

The bundle defines `window.Counter`. Add `data-manual` to the script tag and call `Counter.auto(options)` to start it with your own options. For stats bands and other plain numbers, `counter-lite.global.js` is about a quarter smaller.

## Capabilities

### The real value first

You render `12,480`; the script shows the start value and counts back to it when the number is half visible. Search engines, link previews, screen readers and visitors without JavaScript always get the real number. With reduced motion, it never changes.

### Accessible while it moves

While a number counts, screen readers get its final value instead of the digits in between. `data-counter-announce="{value} people online"` reads new values in a polite live region, and `data-counter-reduced-motion="count"` keeps counting for numbers whose change is the content.

### Formatted for the language

`Intl.NumberFormat` in the closest `lang`: `12.345,5` in German, `12,34,567` in India. Add currencies, compact notation or units with `format`, or return your own text with `formatter`. The rendered text is the template: `$8,000` keeps its `$` while counting, `8000` stays `8000`, and `data-counter-grouping="true"` turns a raw `8000` from your backend into `8,000`. Decimals follow the target, and empty `data-counter` reads the value back from localized text, also in Arabic-Indic, Devanagari and other digits, which keep counting in their own script.

### Rolling digits

`data-counter-roll` turns each digit into a column that rolls like an odometer: the last digit spins fastest, every column shows the real digit of its place, and the count still ends on your original markup.

### Scroll-linked numbers

`data-counter-start="scroll"` ties the count to the scroll position: the number counts up as it moves from the bottom of the viewport to the middle and back down when you scroll up, with `data-counter-scroll-range` to choose where.

### Scrambled digits

`data-counter-scramble` shows the final text with random digits that settle from left to right, like a code being cracked, for numbers, clocks and dates.

### A steady layout

`data-counter-steady` gives the digits equal widths and reserves the width of the final text, so the words after a growing number never move. `format(value)` on the controller writes any value the way the counter shows it, for goals and labels next to the number.

### Time-based easing

Counts by elapsed time, not frames, with six named curves (`ease-out`, `ease-out-expo`, `ease-out-back` and more), any CSS `cubic-bezier()` or your own function, and ends exactly on the target. `data-counter-speed` counts at a steady rate instead, and `data-counter-stagger` on a container starts a row of numbers one after another. Start higher to count down; `data-counter-repeat` counts again on every visit.

### Control and events

`counter()` returns a controller: `start()`, `pause()`, `resume()`, `reset()`, `finish()`, `update(options)`, `refresh()`, `getSnapshot()`, `format(value)` and `on(event, listener)`, for one element or all of them. `start: 'manual'` waits for your `start()`, and `counter:start`, `counter:complete` and the other events bubble from each number. The controller is still callable as a cleanup.

```js
const clock = counter('#clock', { start: 'manual', easing: 'linear' })
clock.on('complete', ({ value }) => console.log(value))
clock.start()
```

### Live numbers

`set(value)` counts from the value on screen to a new one, `increment()` and `decrement()` add up quick clicks, and changing `data-counter` from your server, htmx or a framework counts to the new value on its own. `animateNumber` can `pause()`, `resume()` and `retarget(to)`.

```js
const items = counter('#items')
document.querySelector('#add').addEventListener('click', () => items.increment())
```

### Progress bars and CSS

`data-counter-output` fills a `<progress>`, `<meter>` or input as the number counts, and `data-counter-css-vars` sets `--counter-value` and `--counter-progress` (`0` to `1`) on the number or a parent, for rings and bars in plain CSS.

```html
<span data-counter="72" data-counter-output="#skill">72</span>%
<progress id="skill" max="100" value="72">72%</progress>
```

### Clocks and dates

`data-counter-as="time"` counts seconds in the pattern of the text, so `23:59:59` carries seconds into minutes and hours; `data-counter-as="date"` counts day by day up to a `datetime`, and months and years roll over on their own. `data-counter-step` shows whole steps, such as a week at a time.

```html
<time data-counter data-counter-as="time">23:59:59</time>
<time data-counter data-counter-as="date" datetime="2026-12-31">December 31, 2026</time>
```

### Beyond text

`animateNumber` is the same eased tween for charts, canvas and CSS variables, and `parseNumber` reads `1.234,5 €` back into a number.

## API at a glance

| API                          | Purpose                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `autoCounter(options?)`      | Count every `[data-counter]`, including numbers added later.                                                                                                                                     |
| `counter(target?, options?)` | Count a selector, element or list. Returns a controller.                                                                                                                                         |
| `animateNumber(options)`     | Eased, time-based tween of any number. Returns a cancel function.                                                                                                                                |
| `parseNumber(text, locale?)` | Read a localized number back into a value and its decimals.                                                                                                                                      |
| `getCounter(element)`        | The controller counting an element, or `null`.                                                                                                                                                   |
| `data-counter-*` attributes  | Start value, duration, delay, easing, decimals, grouping, locale, repeat, start, scroll-range, as, step, live, css-vars, output, speed, steady, roll, scramble, label, announce, reduced-motion. |

### Entrypoints

| Entrypoint                      | When to use                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@samline/counter`              | ESM or CommonJS, every function (about 9 KB gzip).                                                                                                 |
| `@samline/counter/lite`         | Plain numbers only (about 6 KB gzip): no clocks or dates, `cssVars`, `output`, `steady`, `roll`, `scramble`, `announce` or scroll-linked counting. |
| `@samline/counter/vanilla`      | `counter` as the default export.                                                                                                                   |
| `@samline/counter/browser`      | Classic script that defines `window.Counter`.                                                                                                      |
| `@samline/counter/browser/lite` | The lite classic script, also as `window.Counter`; load one of the two.                                                                            |

## Documentation

Read the [documentation](https://samline.github.io/counter/docs/) for the full guides and API contracts, and explore [working examples](https://samline.github.io/counter/examples/) with complete and separate source files.

| Guide                                                                      | What it covers                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Installation](https://samline.github.io/counter/docs/getting-started/)    | npm, CDN and the first counter.                                 |
| [API reference](https://samline.github.io/counter/docs/reference/api/)     | `counter`, `autoCounter`, `animateNumber` and `window.Counter`. |
| [Options](https://samline.github.io/counter/docs/reference/configuration/) | Attributes, options and states.                                 |
| [Formatting](https://samline.github.io/counter/docs/guides/formatting/)    | Locales, currencies, percentages and a steady layout.           |
| [Frameworks](https://samline.github.io/counter/docs/guides/frameworks/)    | React, Vue, Svelte, Astro and page swaps.                       |

## Changelog

Read [CHANGELOG.md](CHANGELOG.md) or the [published changelog](https://samline.github.io/counter/docs/changelog/) for release history and explicitly marked breaking and behavior changes. Review the notes before upgrading.

## AI agent skill

The [Counter skill](https://samline.github.io/counter/skills/counter/SKILL.md) teaches verified package integration. Its maintained [repository source](skills/counter/SKILL.md) and website download are the same file. Verify the installed package version before applying its guidance.

Download [SKILL.md](https://samline.github.io/counter/skills/counter/SKILL.md) into a `counter/` folder in your agent's supported skill directory. For agents that discover project skills from `.agents/skills/`:

```sh
mkdir -p .agents/skills/counter
curl --fail --location https://samline.github.io/counter/skills/counter/SKILL.md \
  --output .agents/skills/counter/SKILL.md
```

Keep the filename `SKILL.md`; discovery paths and invocation syntax depend on the agent.

## License

MIT — [LICENSE.md](LICENSE.md).
