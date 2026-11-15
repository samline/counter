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

Counter animates text that is already correct. It guarantees that the rendered HTML holds the final value, that every count ends exactly on it, and that `destroy` (the returned cleanup) restores the original text. It does not add ARIA attributes or live regions. Your page provides the label that gives the number its meaning (`12,480 customers`, not a bare `12,480`).

## Motion and state

- With `prefers-reduced-motion: reduce` the rendered value never changes: nothing is reset to `from` and `onComplete` runs at once.
- If the preference turns on while numbers are counting, every running count jumps to its final value.
- Counts run once by default, over two seconds. `data-counter-repeat` counts again on every entry; use it sparingly, because repeated motion is distracting.

## Screen readers

The number is plain text, so it is read like any other text. During a count the text changes without being announced, and a screen reader that reads it mid-count reads an intermediate value. Keep counts short, and when the exact value matters, give the sentence a complete label:

```html
<p>
  <span data-counter="12480" aria-hidden="true">12,480</span>
  <span class="visually-hidden">12,480</span> customers
</p>
```

## Layout and contrast

Digits have different widths in most fonts, so a counting number can push the text around it. Use `font-variant-numeric: tabular-nums` and reserve the final width, as shown in [Number formatting](../formatting/). The number keeps your own colors and contrast.
