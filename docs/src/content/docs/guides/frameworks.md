---
title: 'Framework integrations'
titleAccent: 'integrations'
description: Use @samline/counter in React, Vue, Svelte, Astro, Shopify and WordPress, and keep it working with client-side navigation and page swaps.
locale: en
sidebar:
  group: guides
  order: 4
---

`counter` returns a controller that is also its cleanup (call it, or its `destroy()`), and cleanup restores the original markup, so it fits every framework's mount and unmount hooks. Render the final value; the counter replaces it only while animating.

When the value changes later, you do not need to tear the counter down: since 1.3.0, updating `data-counter` (for example by binding it in your template) counts from the value on screen to the new one, and the controller's `set(value)` does the same from code.

## React

```jsx
import { counter } from '@samline/counter'
import { useEffect, useRef } from 'react'

export function Stat({ value, label }) {
  const number = useRef(null)
  useEffect(() => counter(number.current, { to: value }), [value])
  return (
    <p>
      <span ref={number}>{value.toLocaleString()}</span> {label}
    </p>
  )
}
```

## Vue

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { counter } from '@samline/counter'

const props = defineProps({ value: Number })
const number = ref()
let stop
onMounted(() => (stop = counter(number.value, { to: props.value })))
onBeforeUnmount(() => stop?.())
</script>

<template>
  <span ref="number">{{ value.toLocaleString() }}</span>
</template>
```

## Svelte

```svelte
<script>
  import { counter } from '@samline/counter'

  export let value
  const count = (node, to) => ({ destroy: counter(node, { to }) })
</script>

<span use:count={value}>{value.toLocaleString()}</span>
```

## Astro, page swaps and AJAX

For a page built from many components, call `autoCounter()` once. It watches the document, so it counts numbers added later (infinite scroll, AJAX, Swup or Astro view transitions that replace the content) and releases removed ones. The CDN script does the same.

```astro
<p>
  <span data-counter="12480">12,480</span> customers
</p>

<script>
  import { autoCounter } from '@samline/counter'

  autoCounter()
</script>
```

Server rendering is safe: on the server `counter` and `autoCounter` return no-ops, and the rendered value is visible until the script runs.

## Shopify

Load the pinned classic script once from theme assets. Copy the `dist/browser/counter.global.js` to `assets/counter.global.js` from the matching published release (`@samline/counter@1.14.0`), then include it once in `layout/theme.liquid` before `</body>`:

```liquid
{{ 'counter.global.js' | asset_url | script_tag }}
```

Mark up any section with the `data-counter*` attributes; the script defines `window.Counter`. A deferred `<script src="{{ 'counter.global.js' | asset_url }}" defer></script>` works the same.

```liquid
<p><span data-counter="12480">12,480</span> customers</p>
```

The script starts `autoCounter()` on load and keeps watching the document, so numbers inside a section the theme editor adds are counted and numbers in a section it removes are released: you do not need `shopify:section:load` or `shopify:section:unload` handlers. To start it with your own options, load the script with a raw tag that has `data-manual` (`script_tag` cannot add attributes) and call `Counter.auto(options)`; `Counter.controller.destroy()` releases everything it started:

```liquid
<script src="{{ 'counter.global.js' | asset_url }}" data-manual defer></script>
```

See [Shopify's section events](https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks).

## WordPress

Enqueue the pinned script from your theme or plugin, copied from the matching published release (`@samline/counter@1.14.0`), in the `wp_enqueue_scripts` hook. The `strategy` argument needs WordPress 6.3 or later.

```php
add_action('wp_enqueue_scripts', function () {
  wp_enqueue_script('counter', plugins_url('assets/counter.global.js', __FILE__), [], '1.14.0', [
    'in_footer' => true,
    'strategy' => 'defer',
  ]);
});
```

The script counts every `[data-counter]` element on load and as elements are added, so the markup can live in a block, a template or a shortcode output. To use your own options, add `data-manual` to the script tag with the `script_loader_tag` filter and call `Counter.auto(options)`:

```php
add_filter('script_loader_tag', fn($tag, $handle) => $handle === 'counter' ? str_replace(' src=', ' data-manual src=', $tag) : $tag, 10, 2);
```

See [wp_enqueue_script](https://developer.wordpress.org/reference/functions/wp_enqueue_script/).
