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

| Member                | Description                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `elements`            | The elements this controller counts                                                                            |
| `start(element?)`     | Count from the start value now, even if the element is not visible yet                                         |
| `pause(element?)`     | Pause a running count; paused time does not count                                                              |
| `resume(element?)`    | Continue a paused count                                                                                        |
| `reset(element?)`     | Stop and show the start value; call `start()` to count again                                                   |
| `finish(element?)`    | Jump to the final value                                                                                        |
| `update(options)`     | Merge options (attributes still win). Waiting elements show the new start, running ones count again            |
| `refresh()`           | Read the `data-counter-*` attributes again                                                                     |
| `getSnapshot()`       | One `{ element, value, state, from, to, progress }` per element; `progress` goes from `0` to `1`               |
| `on(event, listener)` | Listen to `start`, `update`, `pause`, `resume`, `reset` or `complete`; returns a function that stops listening |
| `destroy()`           | Stop and restore the original markup                                                                           |

```js
const total = counter('#total', { start: 'manual', duration: 1200 })

total.on('complete', ({ element, value }) => console.log(element.id, value))
document.querySelector('#play').addEventListener('click', () => total.start())
document.querySelector('#hold').addEventListener('click', () => total.pause())
```

Listeners receive `{ element, value, state }`, where `value` is the number on screen. `update` runs on every frame.

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
  easing: 'ease-out', // 'linear', 'ease-in-out' or (progress) => eased
  onUpdate: value => gauge.style.setProperty('--value', value),
  onComplete: () => console.log('done'),
})
```

It is time-based, so it lasts the same at any frame rate. `onUpdate` receives `to` exactly on the last call; `onComplete` is not called when cancelled. Without `requestAnimationFrame`, or with `duration: 0`, it jumps to `to` at once.

## parseNumber(text, locale?)

```ts
parseNumber(text: string, locale?: string): { value: number; decimals: number } | null
```

Reads a number written for people in `locale`: `parseNumber('1.234,5 €', 'de')` returns `{ value: 1234.5, decimals: 1 }`. Grouping, currency symbols and spaces are ignored; a leading `-` or `−` makes it negative. Returns `null` when there is no digit. `counter` uses it when `data-counter` is empty.

## EASINGS

```js
import { EASINGS } from '@samline/counter'
// { linear, 'ease-out', 'ease-in-out' }: functions from progress to eased progress
```

`Easing`, `EasingName`, `CounterState`, `CounterStart`, `CounterOptions`, `AutoCounterOptions`, `AnimateNumberOptions`, `CounterController`, `CounterEvent`, `CounterEventDetail`, `CounterListener`, `CounterSnapshot` and `NumberShape` are exported as types. `readShape(text, locale?)` reports the prefix, suffix and grouping of a rendered number, which `counter` uses as the template. `@samline/counter/vanilla` exports `counter` as its default export.

## window.Counter

The browser bundle (`dist/browser/counter.global.js`) defines `window.Counter` and counts every `[data-counter]` as soon as the DOM is ready.

| Member                             | Description                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `Counter.counter(target, options)` | Same as `counter`                                                                |
| `Counter.autoCounter(options)`     | Same as `autoCounter`                                                            |
| `Counter.animateNumber(options)`   | Same as `animateNumber`                                                          |
| `Counter.getCounter(element)`      | Same as `getCounter`                                                             |
| `Counter.auto(options)`            | Starts, or restarts, the automatic run with `options` and returns its controller |
| `Counter.controller`               | The controller of the automatic run, or `null`                                   |

Add `data-manual` to the script tag to skip the automatic start. Calling `Counter.auto()` before the DOM is ready also replaces it, so a deferred or inline script after the bundle can pass its own options. To count elements with different options, give them a class instead of `data-counter` and call `Counter.counter('.price', options)`, so the automatic run does not count them too.
