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
