// Copyable files load the published browser bundle (window.Counter starts on
// its own); the previews in examples/*.astro import the package itself.
export default [
  {
    id: 'stats',
    tab: 'Stats band',
    title: 'Count a stats band when it scrolls in',
    description:
      'The HTML holds the final values, so they read correctly without JavaScript. Each number counts once, when half of it is visible, with the decimals of its target.',
    files: {
      html: `<div id="page">
  <p class="spacer">Scroll down</p>
  <dl class="stats">
    <div><dt>Customers</dt><dd><span data-counter="12480">12,480</span></dd></div>
    <div><dt>Uptime</dt><dd><span data-counter="99.95">99.95</span>%</dd></div>
    <div><dt>Countries</dt><dd>+<span data-counter="42">42</span></dd></div>
  </dl>
</div>`,
      css: `#page { height: 16rem; overflow-y: auto; padding: 1rem; border: 1px solid #ccc; }
.spacer { min-height: 20rem; margin: 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 1rem; margin: 0; }
dd { margin: 0; font-size: 2rem; font-weight: 600; font-variant-numeric: tabular-nums; }`,
      js: `// The box scrolls instead of the page, so pass it as the root.
// Called before the DOM is ready, this replaces the automatic start.
Counter.auto({ root: document.querySelector('#page') })`,
      esm: `import { autoCounter, counter } from '@samline/counter'

// The box scrolls instead of the page, so pass it as the root.
autoCounter({ root: document.querySelector('#page') })`,
    },
  },
  {
    id: 'locales',
    tab: 'Locales',
    title: 'Currencies and number formats per language',
    description:
      'Without data-counter, the final value is read from the text in the language of the element. Intl.NumberFormat options add currencies, and grouping follows the locale.',
    files: {
      html: `<ul class="prices">
  <li lang="en-US"><span id="usd">$1,234.50</span> en-US</li>
  <li lang="de-DE"><span class="plain">1.234.567,89</span> de-DE</li>
  <li lang="fr-FR"><span class="plain">1 234 567</span> fr-FR</li>
  <li lang="en-IN"><span class="plain">12,34,567</span> en-IN</li>
</ul>`,
      css: `.prices { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
.prices span { display: inline-block; min-width: 9rem; font-size: 1.5rem; font-variant-numeric: tabular-nums; }`,
      js: `Counter.counter('#usd', { format: { style: 'currency', currency: 'USD' } })
Counter.counter('.plain')`,
      esm: `import { autoCounter, counter } from '@samline/counter'

counter('#usd', { format: { style: 'currency', currency: 'USD' } })
counter('.plain')`,
    },
  },
  {
    id: 'formats',
    tab: 'Formats',
    title: 'Grouping, decimals and the text around the number',
    description:
      'By default a number counts the way the HTML writes it: 8000 stays 8000 and 8,000 stays 8,000. data-counter-grouping="true" adds the separators of the language, decimals fixes the decimals, and text around the number stays unless a currency, percent or unit style adds its own.',
    files: {
      html: `<div class="formats">
  <dl lang="en">
    <div><dt>As written: no separators</dt><dd><span data-counter>8000</span></dd></div>
    <div><dt>As written: separators and decimals</dt><dd><span data-counter>8,000.45</span></dd></div>
    <div><dt>grouping="true"</dt><dd><span data-counter data-counter-grouping="true">8000</span></dd></div>
    <div><dt>grouping="true" keeps the $</dt><dd><span data-counter data-counter-grouping="true">$8000</span></dd></div>
    <div><dt>grouping="true" decimals="2"</dt><dd><span data-counter data-counter-grouping="true" data-counter-decimals="2">8000</span></dd></div>
    <div><dt>grouping="false"</dt><dd><span data-counter data-counter-grouping="false">8,000</span></dd></div>
    <div><dt>grouping="true" lang="de"</dt><dd><span data-counter data-counter-grouping="true" lang="de">8000,5</span></dd></div>
    <div><dt>format: compact, suffix kept</dt><dd><span id="compact">8000 visits</span></dd></div>
    <div><dt>format: currency + grouping: true</dt><dd><span id="usd">8000</span></dd></div>
  </dl>
  <button type="button" id="again">Count again</button>
</div>`,
      css: `.formats { display: grid; gap: 1rem; justify-items: start; }
.formats dl { display: grid; gap: 0.5rem; margin: 0; }
.formats dl div { display: grid; grid-template-columns: minmax(12rem, 1fr) auto; gap: 1rem; align-items: baseline; }
.formats dt { font: 0.875rem/1.4 ui-monospace, monospace; }
.formats dd { margin: 0; font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }`,
      js: `// Every [data-counter] counts on its own; these two take JavaScript options.
Counter.counter('#compact', { format: { notation: 'compact' } })
Counter.counter('#usd', { grouping: true, format: { style: 'currency', currency: 'USD' } })

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.formats dd span').forEach(number => Counter.getCounter(number)?.start())
)`,
      esm: `import { autoCounter, counter, getCounter } from '@samline/counter'

autoCounter()
counter('#compact', { format: { notation: 'compact' } })
counter('#usd', { grouping: true, format: { style: 'currency', currency: 'USD' } })

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.formats dd span').forEach(number => getCounter(number)?.start())
)`,
    },
  },
  {
    id: 'steady',
    tab: 'Steady layout',
    title: 'A still layout and digits in any script',
    description:
      'data-counter-steady gives the digits equal widths and reserves the width of the final text, so the words after a growing number stay where they are. Numbers written in Arabic-Indic, Devanagari or other digits count in those digits, and format() writes any value the way the counter shows it.',
    files: {
      html: `<div class="steady">
  <h3>Without steady: the words after the number move</h3>
  <p class="line" lang="en"><span data-counter>1,250,000</span> downloads this year</p>
  <h3>With data-counter-steady: the line keeps still</h3>
  <p class="line" lang="en"><span id="downloads" data-counter data-counter-steady>1,250,000</span> downloads this year</p>
  <h3>Digits in other scripts count in that script</h3>
  <p class="line" lang="ar" dir="rtl"><span data-counter data-counter-steady>١٬٢٥٠٬٠٠٠</span> تنزيل هذا العام</p>
  <p class="line" lang="hi"><span data-counter data-counter-steady>१२,५०,०००</span> डाउनलोड इस साल</p>
  <h3>format(): the same text anywhere on the page</h3>
  <p class="line" lang="en">Next goal: <output id="goal"></output></p>
</div>
<button type="button" id="again">Count again</button>`,
      css: `.steady h3 { margin: 1rem 0 0.25rem; font-size: 0.875rem; }
.steady .line { margin: 0; font-size: 1.5rem; }
.steady [data-counter] { font-weight: 600; }`,
      js: `// Start now, so getCounter finds each number's controller.
Counter.auto()

// The goal is written like the number it belongs to: grouped, in its language.
const downloads = Counter.getCounter(document.querySelector('#downloads'))
document.querySelector('#goal').textContent = downloads.format(2000000)

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.steady [data-counter]').forEach(number => Counter.getCounter(number)?.start())
)`,
      esm: `import { autoCounter, getCounter } from '@samline/counter'

autoCounter()

// The goal is written like the number it belongs to: grouped, in its language.
const downloads = getCounter(document.querySelector('#downloads'))
document.querySelector('#goal').textContent = downloads.format(2000000)

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.steady [data-counter]').forEach(number => getCounter(number)?.start())
)`,
    },
  },
  {
    id: 'repeat',
    tab: 'Repeat',
    title: 'Count down, and again on every visit',
    description:
      'data-counter-from larger than the target counts down. data-counter-repeat resets the number when it leaves and counts again when it comes back.',
    files: {
      html: `<div id="page">
  <p class="spacer">Scroll down, then back up</p>
  <p class="row"><span data-counter="0" data-counter-from="10" data-counter-repeat data-counter-easing="linear">0</span> seconds left</p>
  <p class="row"><span data-counter="365" data-counter-repeat data-counter-duration="1200">365</span> days a year</p>
</div>`,
      css: `#page { height: 16rem; overflow-y: auto; padding: 1rem; border: 1px solid #ccc; }
.spacer { min-height: 20rem; margin: 0; }
.row span { font-size: 2rem; font-weight: 600; font-variant-numeric: tabular-nums; }`,
      js: `Counter.auto({ root: document.querySelector('#page') })`,
      esm: `import { autoCounter, counter } from '@samline/counter'

autoCounter({ root: document.querySelector('#page') })`,
    },
  },
  {
    id: 'clock',
    tab: 'Clock and calendar',
    title: 'Clocks and dates that carry on their own',
    description:
      'data-counter-as="time" counts seconds in the pattern of the text (23:59:59 or 90:00), so seconds carry into minutes and hours. data-counter-as="date" counts day by day up to the datetime, and months and years roll over on their own. data-counter-step shows whole steps, such as one week at a time. No JavaScript options.',
    files: {
      html: `<dl class="clocks" lang="en">
  <div><dt>A day</dt><dd><time data-counter data-counter-as="time" data-counter-duration="6000" data-counter-easing="linear">23:59:59</time></dd></div>
  <div><dt>A match</dt><dd><time data-counter data-counter-as="time" data-counter-duration="6000" data-counter-easing="linear">90:00</time></dd></div>
  <div><dt>A work day</dt><dd><time data-counter data-counter-as="time" data-counter-from="08:00:00" data-counter-duration="6000">17:30:00</time></dd></div>
  <div><dt>A year</dt><dd><time data-counter data-counter-as="date" datetime="2026-12-31" data-counter-duration="6000" data-counter-easing="linear">December 31, 2026</time></dd></div>
  <div><dt>Week by week</dt><dd><time data-counter data-counter-as="date" datetime="2026-12-31" data-counter-step="7" data-counter-date-style="medium" data-counter-duration="6000">Dec 31, 2026</time></dd></div>
</dl>
<button type="button" id="again">Count again</button>`,
      css: `.clocks { display: grid; gap: 0.5rem; margin: 0 0 1rem; }
.clocks div { display: grid; grid-template-columns: 8rem auto; gap: 1rem; align-items: baseline; }
.clocks dd { margin: 0; font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }`,
      js: `// Every [data-counter] counts on its own; the button starts them again.
document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.clocks time').forEach(time => Counter.getCounter(time)?.start())
)`,
      esm: `import { autoCounter, getCounter } from '@samline/counter'

autoCounter()

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.clocks time').forEach(time => getCounter(time)?.start())
)`,
    },
  },
  {
    id: 'motion',
    tab: 'Motion',
    title: 'Easings, stagger and speed',
    description:
      'Seven curves side by side, including ease-out-back and a CSS cubic-bezier. data-counter-stagger on a container starts its numbers one after another, and data-counter-speed counts a set amount per second, so 500 takes half a second and 4,000 takes four.',
    files: {
      html: `<div class="motion" lang="en">
  <h3>Easing</h3>
  <dl class="easings">
    <div><dt>linear</dt><dd><span data-counter="1000" data-counter-easing="linear" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
    <div><dt>ease-in</dt><dd><span data-counter="1000" data-counter-easing="ease-in" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
    <div><dt>ease-out</dt><dd><span data-counter="1000" data-counter-easing="ease-out" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
    <div><dt>ease-in-out</dt><dd><span data-counter="1000" data-counter-easing="ease-in-out" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
    <div><dt>ease-out-expo</dt><dd><span data-counter="1000" data-counter-easing="ease-out-expo" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
    <div><dt>ease-out-back</dt><dd><span data-counter="1000" data-counter-easing="ease-out-back" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
    <div><dt>cubic-bezier(0.2, 0.8, 0.2, 1)</dt><dd><span data-counter="1000" data-counter-easing="cubic-bezier(0.2, 0.8, 0.2, 1)" data-counter-css-vars="div">1000</span><i class="bar"></i></dd></div>
  </dl>
  <h3>Stagger: one after another</h3>
  <p class="row" data-counter-stagger="300">
    <span data-counter="120" data-counter-duration="800">120</span>
    <span data-counter="340" data-counter-duration="800">340</span>
    <span data-counter="560" data-counter-duration="800">560</span>
    <span data-counter="780" data-counter-duration="800">780</span>
  </p>
  <h3>Speed: 1,000 per second</h3>
  <p class="row">
    <span data-counter="500" data-counter-speed="1000">500</span>
    <span data-counter="4000" data-counter-speed="1000" data-counter-grouping="true">4000</span>
  </p>
</div>
<button type="button" id="again">Count again</button>`,
      css: `.motion h3 { margin: 1rem 0 0.5rem; font-size: 0.875rem; }
.easings { display: grid; gap: 0.25rem; margin: 0; }
.easings div { --counter-progress: 1; display: grid; grid-template-columns: 13rem 1fr; gap: 1rem; align-items: center; }
.easings dt { font: 0.8125rem/1.4 ui-monospace, monospace; }
.easings dd { display: grid; grid-template-columns: 3.5rem 1fr; gap: 0.5rem; align-items: center; margin: 0; font-variant-numeric: tabular-nums; }
/* The bar shows the curve: --counter-progress can go past 1 with ease-out-back. */
.bar { height: 0.5rem; width: calc(var(--counter-progress) * 100%); max-width: 110%; border-radius: 1rem; background: #c2410c; }
.row { display: flex; gap: 1.5rem; margin: 0; font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }`,
      js: `// Start now, so getCounter finds each number's controller.
Counter.auto()

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.motion [data-counter]').forEach(number => Counter.getCounter(number)?.start())
)`,
      esm: `import { autoCounter, getCounter } from '@samline/counter'

autoCounter()

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.motion [data-counter]').forEach(number => getCounter(number)?.start())
)`,
    },
  },
  {
    id: 'progress',
    tab: 'Progress and CSS',
    title: 'Progress bars, meters and CSS that follow the count',
    description:
      'data-counter-output writes the value to a progress, meter or input as it counts. data-counter-css-vars sets --counter-value and --counter-progress, from 0 to 1, on the number or on its closest match, so a ring or a bar follows it with CSS alone.',
    files: {
      html: `<div class="meters" lang="en">
  <section>
    <h3>Progress bar</h3>
    <p class="big"><span data-counter="72" data-counter-output="#html-skill">72</span>%</p>
    <progress id="html-skill" max="100" value="72">72%</progress>
  </section>
  <section>
    <h3>Meter</h3>
    <p class="big"><span data-counter="38.5" data-counter-output="#storage">38.5</span> GB of 50 GB</p>
    <meter id="storage" min="0" max="50" high="45" value="38.5">38.5 GB</meter>
  </section>
  <section>
    <h3>Ring from --counter-value</h3>
    <div class="ring">
      <span class="big" data-counter data-counter-css-vars=".ring">86%</span>
    </div>
  </section>
  <section>
    <h3>Goal from --counter-progress</h3>
    <div class="track"><div class="fill"></div></div>
    <p class="big"><span data-counter="2000" data-counter-grouping="true" data-counter-css-vars=".meters section">2000</span> steps</p>
  </section>
</div>
<button type="button" id="again">Count again</button>`,
      css: `.meters { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1.5rem; margin-bottom: 1rem; }
.meters h3 { margin: 0 0 0.25rem; font-size: 0.875rem; }
.big { margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }
progress, meter { width: 100%; }
/* --counter-value is the number on screen; --counter-progress goes from 0 to 1. */
.ring { --counter-value: 86; display: grid; place-items: center; width: 7rem; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(closest-side, white 78%, transparent 80%),
    conic-gradient(#c2410c calc(var(--counter-value) * 3.6deg), #e5e5e5 0); }
.track { height: 0.75rem; border-radius: 1rem; background: #e5e5e5; overflow: hidden; margin-bottom: 0.5rem; }
.meters section { --counter-progress: 1; }
.fill { height: 100%; width: calc(var(--counter-progress) * 100%); background: #c2410c; }`,
      js: `// Every [data-counter] counts on its own. Start now, so getCounter finds them.
Counter.auto()

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.meters [data-counter]').forEach(number => Counter.getCounter(number)?.start())
)`,
      esm: `import { autoCounter, getCounter } from '@samline/counter'

autoCounter()

document.querySelector('#again').addEventListener('click', () =>
  document.querySelectorAll('.meters [data-counter]').forEach(number => getCounter(number)?.start())
)`,
    },
  },
  {
    id: 'live',
    tab: 'Live numbers',
    title: 'Numbers that change after they count',
    description:
      'set() counts from the value on screen to a new one, increment() and decrement() add up quick clicks, and changing data-counter from your server or script counts to the new value on its own.',
    files: {
      html: `<div class="live" lang="en">
  <section>
    <h3>Price</h3>
    <p class="big"><span id="price" data-counter="12">$12</span> per month</p>
    <div class="actions" role="group" aria-label="Billing">
      <button type="button" data-price="12" aria-pressed="true">Monthly</button>
      <button type="button" data-price="10" aria-pressed="false">Yearly</button>
    </div>
  </section>
  <section>
    <h3>Cart</h3>
    <p class="big"><span id="items" data-counter="1">1</span> items</p>
    <div class="actions">
      <button type="button" id="remove" aria-label="Remove one item">-</button>
      <button type="button" id="add" aria-label="Add one item">+</button>
    </div>
  </section>
  <section>
    <h3>Visitors right now</h3>
    <p class="big"><span id="visitors" data-counter="1280" data-counter-duration="800">1,280</span></p>
    <p class="note">A new value arrives every two seconds.</p>
  </section>
</div>`,
      css: `.live { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1.5rem; }
.live h3 { margin: 0 0 0.25rem; font-size: 0.875rem; }
.big { margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.actions { display: flex; gap: 0.5rem; }
.actions button[aria-pressed='true'] { font-weight: 700; }
.note { margin: 0; font-size: 0.875rem; }`,
      js: `// Start counting now (this replaces the automatic start), so getCounter finds
// each number's controller right away.
Counter.auto()

const price = Counter.getCounter(document.querySelector('#price'))
document.querySelectorAll('[data-price]').forEach(button =>
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-price]').forEach(other =>
      other.setAttribute('aria-pressed', String(other === button))
    )
    price.set(Number(button.dataset.price))
  })
)

// increment and decrement add up, so quick clicks count to the right total.
const items = Counter.getCounter(document.querySelector('#items'))
document.querySelector('#add').addEventListener('click', () => items.increment())
document.querySelector('#remove').addEventListener('click', () => {
  if (items.getSnapshot()[0].to > 0) items.decrement()
})

// Your server or script only changes the attribute; the number counts to it.
const visitors = document.querySelector('#visitors')
setInterval(() => {
  const next = Number(visitors.dataset.counter) + Math.round(Math.random() * 60 - 25)
  visitors.dataset.counter = String(Math.max(0, next))
}, 2000)`,
      esm: `import { autoCounter, getCounter } from '@samline/counter'

autoCounter()

const price = getCounter(document.querySelector('#price'))
document.querySelectorAll('[data-price]').forEach(button =>
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-price]').forEach(other =>
      other.setAttribute('aria-pressed', String(other === button))
    )
    price.set(Number(button.dataset.price))
  })
)

// increment and decrement add up, so quick clicks count to the right total.
const items = getCounter(document.querySelector('#items'))
document.querySelector('#add').addEventListener('click', () => items.increment())
document.querySelector('#remove').addEventListener('click', () => {
  if (items.getSnapshot()[0].to > 0) items.decrement()
})

// Your server or script only changes the attribute; the number counts to it.
const visitors = document.querySelector('#visitors')
setInterval(() => {
  const next = Number(visitors.dataset.counter) + Math.round(Math.random() * 60 - 25)
  visitors.dataset.counter = String(Math.max(0, next))
}, 2000)`,
    },
  },
  {
    id: 'controls',
    tab: 'Controls',
    title: 'Start, pause and finish a simulated clock',
    description:
      'start: manual waits for start(). The controller pauses, resumes, resets and finishes, and its events report the state. as: "time" counts seconds in the pattern of the text, so they carry into minutes and hours.',
    files: {
      html: `<div class="clock">
  <time id="clock" class="big">23:59:59</time>
  <p id="status" aria-live="polite">Ready</p>
  <div class="actions">
    <button type="button" data-action="start">Start</button>
    <button type="button" data-action="pause">Pause</button>
    <button type="button" data-action="resume">Resume</button>
    <button type="button" data-action="finish">Finish</button>
    <button type="button" data-action="reset">Reset</button>
  </div>
</div>`,
      css: `.clock { display: grid; gap: 0.75rem; justify-items: start; }
.big { font-size: 2.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }
#status { margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }`,
      js: `// One day in eight seconds, read from the text: 23:59:59.
const clock = Counter.counter('#clock', { as: 'time', duration: 8000, easing: 'linear', start: 'manual' })

const status = document.querySelector('#status')
const labels = { start: 'Counting', pause: 'Paused', resume: 'Counting', complete: 'Done', reset: 'Ready' }
Object.entries(labels).forEach(([event, label]) => clock.on(event, () => (status.textContent = label)))

document.querySelectorAll('[data-action]').forEach(button =>
  button.addEventListener('click', () => clock[button.dataset.action]())
)`,
      esm: `import { counter } from '@samline/counter'

// One day in eight seconds, read from the text: 23:59:59.
const clock = counter('#clock', { as: 'time', duration: 8000, easing: 'linear', start: 'manual' })

const status = document.querySelector('#status')
const labels = { start: 'Counting', pause: 'Paused', resume: 'Counting', complete: 'Done', reset: 'Ready' }
Object.entries(labels).forEach(([event, label]) => clock.on(event, () => (status.textContent = label)))

document.querySelectorAll('[data-action]').forEach(button =>
  button.addEventListener('click', () => clock[button.dataset.action]())
)`,
    },
  },
]
