---
title: 'Accessibility and motion'
titleAccent: 'motion'
description: What @samline/counter guarantees for reduced motion, screen readers and layout, and what your page still provides.
locale: en
sidebar:
  group: guides
  order: 3
  label: Accessibility
---

## Responsibilities

Counter animates text that is already correct. It guarantees that the rendered HTML holds the final value, that every count ends exactly on it, that screen readers get the final value while the digits move (since 1.7.0), and that `destroy()` (also calling the returned controller) restores the original markup. Your page provides the words that give the number its meaning (`12,480 customers`, not a bare `12,480`).

## Motion and state

- With `prefers-reduced-motion: reduce` the rendered value never changes: nothing is reset to `from` and `onComplete` runs at once. New values from `set()` or a live attribute show at once.
- If the preference turns on while numbers are counting, every running count jumps to its final value.
- Counts run once by default, over two seconds. `data-counter-repeat` counts again on every entry; use it sparingly, because repeated motion is distracting.
- Since 1.7.0, `data-counter-reduced-motion="count"` (or `reducedMotion: 'count'`) counts anyway. Keep it for numbers whose change is the content, such as a score or a timer the visitor started, not for decoration.

## Screen readers

The number is plain text, so it is read like any other text. Since 1.7.0, while the text is not final (waiting below the fold, counting or paused), the element is exposed as an image labelled with its final value, so a screen reader reads `12,480` instead of `0` or a number in between. Once the count is done, the label goes away and the text is read as before.

- It applies to elements without a role of their own: `span`, `strong`, `b`, `em`, `i`, `small`, `mark`, `sub`, `sup`, `data`, `time` and `div`. A table cell, list item, heading or any element with its own `role`, `aria-label` or `aria-labelledby` is left alone; put the attribute on a `span` inside it.
- `data-counter-label="false"` (or `label: false`) turns it off.

### Announcing new values

A number that changes later (a cart, a vote, people online) is not announced by default. `data-counter-announce` reads each new value from `set()`, `increment()`, `decrement()` or a live `data-counter` attribute in a polite live region, once it is shown. The first count is never announced. Give the value its words with a template, where `{value}` is the final text:

```html
<span data-counter="38" data-counter-announce="{value} people online">38</span> people online
```

```js
counter('#cart', { announce: '{value} items in your cart' })
```

Counter adds one visually hidden `aria-live="polite"` region to the page for every number that announces, and removes it with the last controller that uses it. The [Screen readers example](../examples/#guide-accessible) shows the label and the announcements as they happen.

## Layout and contrast

Digits have different widths in most fonts, so a counting number can push the text around it. `data-counter-steady` (since 1.6.0) uses tabular digits and reserves the final width, as shown in [Number formatting](../formatting/). The number keeps your own colors and contrast.
