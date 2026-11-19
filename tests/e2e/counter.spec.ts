import { expect, test } from './fixtures'

const layout = `
  <p id="top"><span data-counter="250">250</span></p>
  <div style="height:150vh"></div>
  <p id="stats" lang="de">
    <span id="de" data-counter="12345.5" data-counter-duration="600">12.345,5</span>
    <span id="text" data-counter data-counter-duration="600">1.200</span>
  </p>
  <span id="repeat" data-counter="40" data-counter-repeat data-counter-duration="300">40</span>
  <div style="height:150vh"></div>
`

test('counters wait at the start value and count to the localized final value', async ({
  load,
  page,
}) => {
  await load(layout, 'counter')
  // In view on load: counts right away.
  await expect(page.locator('#top span')).toHaveText('250')
  await expect(page.locator('#top span')).toHaveAttribute('data-counter-state', 'done')

  // Below the fold: waiting at zero, formatted for the language.
  await expect(page.locator('#de')).toHaveText('0,0')
  await expect(page.locator('#de')).toHaveAttribute('data-counter-state', 'pending')

  await page.locator('#stats').scrollIntoViewIfNeeded()
  await expect(page.locator('#de')).toHaveAttribute('data-counter-state', 'counting')
  await expect(page.locator('#de')).toHaveText('12.345,5')
  // The final value read from German text: 1.200 is one thousand two hundred.
  await expect(page.locator('#text')).toHaveText('1.200')
})

test('values only grow while counting up', async ({ load, page }) => {
  await load(layout, 'counter')
  await page.evaluate(() => {
    const seen: number[] = []
    Object.assign(window, { seen })
    const node = document.getElementById('de')!
    new MutationObserver(() =>
      seen.push(Number(node.textContent!.replace(/\./g, '').replace(',', '.')))
    ).observe(node, { childList: true, characterData: true, subtree: true })
  })
  await page.locator('#stats').scrollIntoViewIfNeeded()
  await expect(page.locator('#de')).toHaveAttribute('data-counter-state', 'done')
  const seen: number[] = await page.evaluate(() => (window as any).seen)
  expect(seen.length).toBeGreaterThan(5)
  expect(seen.every((value, i) => i === 0 || value >= seen[i - 1]!)).toBe(true)
  expect(seen.at(-1)).toBe(12345.5)
})

test('repeat resets on leaving and counts again', async ({ load, page }) => {
  await load(layout, 'counter')
  const repeat = page.locator('#repeat')
  await repeat.scrollIntoViewIfNeeded()
  await expect(repeat).toHaveAttribute('data-counter-state', 'done')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(repeat).toHaveText('0')
  await repeat.scrollIntoViewIfNeeded()
  await expect(repeat).toHaveText('40')
})

test('without the script or with reduced motion, the rendered value stays', async ({
  load,
  page,
}) => {
  await load(layout)
  await expect(page.locator('#de')).toHaveText('12.345,5')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await load(layout, 'counter')
  await expect(page.locator('#de')).toHaveAttribute('data-counter-state', 'done')
  await expect(page.locator('#de')).toHaveText('12.345,5')
  await expect(page.locator('#text')).toHaveText('1.200')
})

test('the rendered text is kept: ungrouped digits, prefix and suffix', async ({ load, page }) => {
  await load(
    `<p lang="en">
      <span id="plain" data-counter data-counter-duration="300">8000</span>
      <span id="money" data-counter data-counter-duration="300">$8,000.45</span>
    </p>`,
    'counter'
  )
  await expect(page.locator('#plain')).toHaveAttribute('data-counter-state', 'done')
  await expect(page.locator('#plain')).toHaveText('8000')
  await expect(page.locator('#money')).toHaveText('$8,000.45')
})

test('the controller starts, pauses, resumes and emits DOM events', async ({ load, page }) => {
  await load(
    `<span id="manual" data-counter="500" data-counter-start="manual" data-counter-duration="800">500</span>`,
    'counter'
  )
  const manual = page.locator('#manual')
  await expect(manual).toHaveAttribute('data-counter-state', 'pending')
  await expect(manual).toHaveText('0')

  await page.evaluate(() => {
    const events: string[] = []
    Object.assign(window, { events })
    for (const name of ['start', 'pause', 'resume', 'complete'])
      document.addEventListener(`counter:${name}`, () => events.push(name))
    const c = (window as any).Counter.getCounter(document.getElementById('manual'))
    Object.assign(window, { c })
    c.start()
  })
  await expect(manual).toHaveAttribute('data-counter-state', 'counting')
  await page.evaluate(() => (window as any).c.pause())
  await expect(manual).toHaveAttribute('data-counter-state', 'paused')
  const paused = await manual.textContent()
  await page.waitForTimeout(300)
  await expect(manual).toHaveText(paused!)
  await page.evaluate(() => (window as any).c.resume())
  await expect(manual).toHaveAttribute('data-counter-state', 'done')
  await expect(manual).toHaveText('500')
  expect(await page.evaluate(() => (window as any).events)).toEqual([
    'start',
    'pause',
    'resume',
    'complete',
  ])
})

test('the lite bundle counts numbers and leaves clocks as rendered', async ({ load, page }) => {
  await load(
    `<p lang="en">
      <span id="n" data-counter="1250" data-counter-duration="400">1,250</span>
      <time id="clock" data-counter data-counter-as="time">01:30</time>
      <span id="vars" data-counter="5" data-counter-css-vars data-counter-steady>5</span>
    </p>`,
    'counter-lite'
  )
  await expect(page.locator('#n')).toHaveText('1,250')
  await expect(page.locator('#n')).toHaveAttribute('data-counter-state', 'done')
  await expect(page.locator('#clock')).toHaveText('01:30')
  await expect(page.locator('#clock')).not.toHaveAttribute('data-counter-state')
  await expect(page.locator('#vars')).toHaveAttribute('data-counter-state', 'done')
  // No CSS variables or reserved width in the lite bundle.
  await expect(page.locator('#vars')).not.toHaveAttribute('style')
  const members = await page.evaluate(() => Object.keys((window as any).Counter).sort())
  expect(members).toEqual([
    'animateNumber',
    'auto',
    'autoCounter',
    'controller',
    'counter',
    'defineFormat',
    'getCounter',
  ])
  await page.evaluate(() =>
    (window as any).Counter.getCounter(document.getElementById('n')).set(2000)
  )
  await expect(page.locator('#n')).toHaveText('2,000')
})
