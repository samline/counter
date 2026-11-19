---
title: 'API reference'
titleAccent: 'reference'
description: Every @samline/counter export, counter, autoCounter, animateNumber, parseNumber, EASINGS and the window.Counter browser global.
locale: en
sidebar:
  group: reference
  order: 1
---

## counter(target?, options?)

```ts
counter(target?: ElementTarget, options?: CounterOptions): CounterController
```

Counts `target` when it scrolls into view and returns a controller. `target` is a selector, an element, a NodeList or an array, and defaults to `'[data-counter]'`. Elements without a final value (no number in `data-counter`, no `to` option and no number in the text) are left alone.

```js
import { counter } from '@samline/counter'

const stats = counter('.stat', { duration: 1500, easing: 'ease-in-out' })
// Later: stop counting and put the original markup back.
stats.destroy() // or stats()
```

The controller is also a function: calling it is the same as `destroy()`, so code written for 1.0 (`const stop = counter(); stop()`) keeps working. `destroy()` cancels any running count, restores each element's original markup and removes `data-counter-state`. Calling it twice is safe. On the server, or with no matching elements, `counter` returns a controller whose methods do nothing.

An element is counted by one controller at a time. Calling `counter` again for elements another controller already counts leaves them to it; when every element belongs to one controller, that controller is returned.

## The controller

Since 1.1.0. Commands act on every element of the controller, or only on `element` when you pass one, and return the controller so they can be chained. After `destroy()` they do nothing.

| Member                     | Description                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `elements`                 | The elements this controller counts                                                                            |
| `set(value, element?)`     | Count from the value on screen to `value`, which becomes the final value (since 1.3.0)                         |
| `increment(by?, element?)` | Add `by` (default `1`) to the final value and count to it; quick calls add up (since 1.3.0)                    |
| `decrement(by?, element?)` | Subtract `by` (default `1`) from the final value and count to it (since 1.3.0)                                 |
| `start(element?)`          | Count from the start value now, even if the element is not visible yet                                         |
| `pause(element?)`          | Pause a running count; paused time does not count                                                              |
| `resume(element?)`         | Continue a paused count                                                                                        |
| `reset(element?)`          | Stop and show the start value; call `start()` to count again                                                   |
| `finish(element?)`         | Jump to the final value                                                                                        |
| `update(options)`          | Merge options (attributes still win). Waiting elements show the new start, running ones count again            |
| `refresh()`                | Read the `data-counter-*` attributes again                                                                     |
| `getSnapshot()`            | One `{ element, value, state, from, to, progress }` per element; `progress` goes from `0` to `1`               |
| `format(value, element?)`  | The text the counter shows for `value`, with the element's template, clock or date style (since 1.6.0)         |
| `on(event, listener)`      | Listen to `start`, `update`, `pause`, `resume`, `reset` or `complete`; returns a function that stops listening |
| `destroy()`                | Stop and restore the original markup                                                                           |

```js
const total = counter('#total', { start: 'manual', duration: 1200 })

total.on('complete', ({ element, value }) => console.log(element.id, value))
document.querySelector('#play').addEventListener('click', () => total.start())
document.querySelector('#hold').addEventListener('click', () => total.pause())
```

Listeners receive `{ element, value, state }`, where `value` is the number on screen. `update` runs on every frame.

### Live numbers

Since 1.3.0, a number can change after it counts. `set()`, `increment()` and `decrement()` count from the value on screen to the new one, with the element's `duration` and `easing` and no `delay`; each new value is a new `start`, and its `complete` follows. A number still waiting to start counts to the new value when it starts. With reduced motion the new value shows at once. Since 1.7.0, `announce` reads each new value in a polite live region once it is shown; see [Accessibility](../../guides/accessibility/#announcing-new-values).

```js
const price = counter('#price')
document.querySelector('#yearly').addEventListener('click', () => price.set(10))

const items = counter('#items')
document.querySelector('#add').addEventListener('click', () => items.increment())
```

Changing `data-counter` (or `datetime` with `as: 'date'`) does the same, so a server, htmx swap or framework that only updates the attribute gets a counting number for free. New decimals come from the new value. Turn it off per element with `data-counter-live="false"`, or for a call with `live: false`.

```js
// Somewhere your data arrives:
visitors.dataset.counter = String(latest)
```

### DOM events

Every event except `update` is also dispatched on the element as a bubbling `CustomEvent` named `counter:start`, `counter:pause`, `counter:resume`, `counter:reset` or `counter:complete`, with the same `detail`. They work without a reference to the controller, for example on pages that use the browser bundle:

```js
document.addEventListener('counter:complete', event => {
  event.target.classList.add('is-done')
})
```

## getCounter(element)

```ts
getCounter(element: Element | null | undefined): CounterController | null
```

Returns the controller counting `element`, or `null`. Use it to control numbers that `autoCounter` or the browser bundle started:

```js
getCounter(document.querySelector('#hero-number'))?.start()
```

## autoCounter(options?)

```ts
autoCounter(options?: AutoCounterOptions): { refresh(): void; destroy(): void }
```

Counts every element matching `selector` (default `'[data-counter]'`) inside `scope` (default `document`). With `observe: true` (the default) it also counts matching elements added later and cleans up elements that are removed.

`AutoCounterOptions` accepts every [`CounterOptions`](../configuration/#options) field plus `selector`, `scope` and `observe`.

## animateNumber(options)

```ts
animateNumber(options: AnimateNumberOptions): () => void
```

The eased tween behind `counter`, for anything that is not text: charts, canvas, CSS variables. Returns a function that cancels it.

```js
import { animateNumber } from '@samline/counter'

const cancel = animateNumber({
  from: 0,
  to: 72,
  duration: 800, // ms, default 2000
  delay: 0,
  easing: 'ease-out', // any EASINGS name, 'cubic-bezier(…)' or (progress) => eased
  onUpdate: value => gauge.style.setProperty('--value', value),
  onComplete: () => console.log('done'),
})
```

It is time-based, so it lasts the same at any frame rate. `onUpdate` receives `to` exactly on the last call; `onComplete` is not called when cancelled. Without `requestAnimationFrame`, or with `duration: 0`, it jumps to `to` at once.

Since 1.3.0 the returned function also has controls; calling it still cancels:

| Member                    | Description                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `cancel()`                | Stop for good; same as calling the function                                           |
| `pause()` / `resume()`    | Stop and continue; time spent paused does not count                                   |
| `retarget(to, duration?)` | Count from the current value to `to`, also after it finished; `onComplete` runs again |
| `getValue()`              | The last value sent to `onUpdate`                                                     |
| `isRunning()`             | Whether it is counting right now                                                      |

```js
const gauge = animateNumber({ to: 40, onUpdate: v => meter.style.setProperty('--value', v) })
socket.addEventListener('message', event => gauge.retarget(Number(event.data), 600))
```

## parseNumber(text, locale?)

```ts
parseNumber(text: string, locale?: string): { value: number; decimals: number } | null
```

Reads a number written for people in `locale`: `parseNumber('1.234,5 €', 'de')` returns `{ value: 1234.5, decimals: 1 }`. Grouping, currency symbols and spaces are ignored; a leading `-` or `−` makes it negative. Returns `null` when there is no digit. `counter` uses it when `data-counter` is empty. Since 1.6.0 it reads decimal digits in any script: `parseNumber('١٬٢٣٤٫٥', 'ar')` returns `{ value: 1234.5, decimals: 1 }`.

`digitValue(char)` returns the value of one digit in any script (`'٧'` and `'७'` are `7`), or `-1`. `numberingSystem(zero)` returns the `Intl` numbering system whose zero is `zero` (`'٠'` is `'arab'`), or `undefined` when the browser cannot tell.

Since 1.12.0, `ordinal(locale, suffixes)` returns a function that gives the ordinal suffix of the whole number nearest to a value: `ordinal('en', ORDINALS.en)(22)` is `'nd'`. `ORDINALS` holds the suffixes `counter` recognizes (`en` and `fr`), typed as `OrdinalSuffixes`: suffixes by `Intl.PluralRules` ordinal category.

## defineFormat(name, format)

```ts
defineFormat(name: string, format: Intl.NumberFormatOptions | ((value: number, element: Element) => string)): void
```

Since 1.13.0. Names a format for `data-counter-format="name"` and `format: 'name'`: `Intl.NumberFormat` options, or a function that writes the text (for clocks and dates too). Elements read after the call use it; a name defined again replaces it. Both entries share the names. `parseFormat(words)` returns the `Intl.NumberFormat` options that words such as `'compact currency:USD'` stand for, and `CounterFormat` is the type of a named format. The [formatting guide](../../guides/formatting/#from-html) lists the words.

## EASINGS

```js
import { EASINGS } from '@samline/counter'
// { linear, 'ease-in', 'ease-out', 'ease-in-out', 'ease-out-expo', 'ease-out-back' }
// Functions from progress (0–1) to eased progress.
```

Since 1.5.0, `cubicBezier('cubic-bezier(0.2, 0.8, 0.2, 1)')` returns the CSS curve as a function (or `null` when the string is not a valid curve), and `isEasing(value)` tells whether a value is an easing name, a valid `cubic-bezier()` or a function.

`Easing`, `EasingName`, `CounterState`, `CounterStart`, `CounterOptions`, `AutoCounterOptions`, `AnimateNumberOptions`, `CounterController`, `CounterEvent`, `CounterEventDetail`, `CounterListener`, `CounterSnapshot` and `NumberShape` are exported as types. `readShape(text, locale?)` reports the prefix, suffix, grouping and, since 1.6.0, the `zero` of the digits of a rendered number, which `counter` uses as the template. Since 1.2.0, `readClock(text)` reads a clock (`'23:59:59'` → 86399 seconds, with its pattern), `writeClock(seconds, fields, padded, digits)` writes one, and `readDate(value)` reads an ISO date or timestamp; `CounterKind`, `ClockShape` and `NumberAnimation` are exported as types. Since 1.7.0, `REDUCED_MOTIONS` lists the values of `reducedMotion`, typed as `CounterReducedMotion`. `@samline/counter/vanilla` exports `counter` as its default export.

## @samline/counter/lite

Since 1.8.0. The same `counter`, `autoCounter`, `getCounter`, `defineFormat`, `animateNumber`, `parseNumber`, `EASINGS`, `cubicBezier` and `isEasing`, for plain numbers only. Elements with `data-counter-as="time"` or `"date"` are not counted and keep their text; `cssVars`, `output`, `steady`, `roll`, `scramble` and `announce` (options and attributes) are ignored, and `start: 'scroll'` counts once on visibility. `counter` is also the default export. Both entries share `getCounter` and one owner per element, so an element counted by one is left alone by the other. The browser build is `dist/browser/counter-lite.global.js` (`@samline/counter/browser/lite`) and defines the same `window.Counter`.

## window.Counter

The browser bundle (`dist/browser/counter.global.js`) defines `window.Counter` and counts every `[data-counter]` as soon as the DOM is ready.

| Member                               | Description                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `Counter.counter(target, options)`   | Same as `counter`                                                                |
| `Counter.autoCounter(options)`       | Same as `autoCounter`                                                            |
| `Counter.animateNumber(options)`     | Same as `animateNumber`                                                          |
| `Counter.getCounter(element)`        | Same as `getCounter`                                                             |
| `Counter.defineFormat(name, format)` | Same as `defineFormat` (since 1.13.0)                                            |
| `Counter.auto(options)`              | Starts, or restarts, the automatic run with `options` and returns its controller |
| `Counter.controller`                 | The controller of the automatic run, or `null`                                   |

Add `data-manual` to the script tag to skip the automatic start. Calling `Counter.auto()` before the DOM is ready also replaces it, so a deferred or inline script after the bundle can pass its own options. To count elements with different options, give them a class instead of `data-counter` and call `Counter.counter('.price', options)`, so the automatic run does not count them too.
