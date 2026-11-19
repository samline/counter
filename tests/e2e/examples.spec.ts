// The website shows each example twice: a live preview and copyable files
// (site/examples.ts) that load the browser bundle. These tests run the copyable
// files against the built bundle, so the code people copy keeps working.
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import counterExamples from '../../site/examples'

const bundle = (pkg: string) =>
  fileURLToPath(new URL(`../../dist/browser/${pkg}.global.js`, import.meta.url))

type Example = { id: string; files: { html: string; css?: string; js: string } }

const open = async (page: import('@playwright/test').Page, pkg: string, example: Example) => {
  await page.setContent(
    `<!doctype html><html><head><style>${example.files.css ?? ''}</style></head><body><main>${example.files.html}</main></body></html>`
  )
  await page.addScriptTag({ path: bundle(pkg) })
  await page.addScriptTag({ content: example.files.js })
}

const find = <T extends Example>(list: readonly T[], id: string) =>
  list.find(item => item.id === id)!

test.describe('counter copyable examples', () => {
  // Like the copied index.html: the bundle, then the example script, at the end
  // of the body while the page parses.
  const openDocument = async (page: import('@playwright/test').Page, example: Example) => {
    const script = readFileSync(bundle('counter'), 'utf8')
    await page.setContent(
      `<!doctype html><html lang="en"><head><style>${example.files.css ?? ''}</style></head><body><main>${example.files.html}</main><script>${script}</script><script>${example.files.js}</script></body></html>`
    )
  }
  const scrollBox = (page: import('@playwright/test').Page, top: number) =>
    page.locator('#page').evaluate((box, y) => box.scrollTo(0, y), top)

  test('stats wait at zero below the fold and count to the rendered values', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'stats'))
    const numbers = page.locator('[data-counter]')
    await expect(numbers).toHaveText(['0', '0.00', '0'])
    await scrollBox(page, 10_000)
    await expect(numbers).toHaveText(['12,480', '99.95', '42'])
  })

  test('locales and currencies count to the same text they started with', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'locales'))
    const spans = page.locator('.prices span')
    const rendered = ['$1,234.50', '1.234.567,89', '1 234 567', '12,34,567']
    await expect(spans.first()).toHaveAttribute('data-counter-state', 'done', { timeout: 5000 })
    await expect(spans.nth(3)).toHaveAttribute('data-counter-state', 'done')
    // French groups with a narrow no-break space.
    const texts = (await spans.allTextContents()).map(text => text.replace(/\s/g, ' '))
    expect(texts).toEqual(rendered)
  })

  test('repeat counts down again after leaving', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'repeat'))
    const countdown = page.locator('[data-counter-from="10"]')
    await expect(countdown).toHaveText('10')
    await scrollBox(page, 10_000)
    await expect(countdown).toHaveText('0', { timeout: 5000 })
    await scrollBox(page, 0)
    await expect(countdown).toHaveText('10')
  })

  test('controls start, pause and finish the clock', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'controls'))
    const clock = page.locator('#clock')
    const status = page.locator('#status')
    await expect(clock).toHaveText('00:00:00')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(status).toHaveText('Counting')
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(status).toHaveText('Paused')
    await page.getByRole('button', { name: 'Finish' }).click()
    await expect(clock).toHaveText('23:59:59')
    await expect(status).toHaveText('Done')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(clock).toHaveText('00:00:00')
    await expect(status).toHaveText('Ready')
  })

  test('formats count as written, or grouped when asked', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'formats'))
    const numbers = page.locator('.formats dd span')
    const expected = [
      '8000',
      '8,000.45',
      '8,000',
      '$8,000',
      '8,000.00',
      '8000',
      '8.000,5',
      '8K visits',
      '$8,000',
    ]
    await expect(numbers).toHaveText(expected)
    await page.getByRole('button', { name: 'Count again' }).click()
    await expect(numbers.first()).toHaveAttribute('data-counter-state', 'counting')
    await expect(numbers).toHaveText(expected)
  })

  test('clocks and dates carry and end on the rendered text', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'clock'))
    const times = page.locator('.clocks time')
    const rendered = ['23:59:59', '90:00', '17:30:00', 'December 31, 2026', 'Dec 31, 2026']
    await expect(times.nth(3)).toHaveAttribute('data-counter-state', 'counting')
    await expect(times.nth(3)).toHaveText(
      /^(January|February|March|April|May|June|July|August|September|October|November|December) \d+, 2026$/
    )
    await expect(times).toHaveText(rendered, { timeout: 10_000 })
    await page.getByRole('button', { name: 'Count again' }).click()
    await expect(times.first()).toHaveAttribute('data-counter-state', 'counting')
    await expect(times).toHaveText(rendered, { timeout: 10_000 })
  })

  test('live numbers count to new values from buttons and attributes', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'live'))
    const price = page.locator('#price')
    const items = page.locator('#items')
    const visitors = page.locator('#visitors')
    await expect(price).toHaveText('$12')
    await page.getByRole('button', { name: 'Yearly' }).click()
    await expect(price).toHaveText('$10')
    await expect(page.getByRole('button', { name: 'Yearly' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await expect(items).toHaveText('1')
    const add = page.getByRole('button', { name: 'Add one item' })
    await add.click()
    await add.click()
    await add.click()
    await expect(items).toHaveText('4')
    const remove = page.getByRole('button', { name: 'Remove one item' })
    for (let i = 0; i < 6; i++) await remove.click()
    await expect(items).toHaveText('0')

    // A new value arrives every two seconds and counts in 800ms: wait for one
    // that has finished counting, then compare the text with it in one read.
    const first = await visitors.getAttribute('data-counter')
    await expect
      .poll(
        () =>
          visitors.evaluate((node, initial) => {
            const value = node.getAttribute('data-counter')
            const done = node.getAttribute('data-counter-state') === 'done'
            return (
              done && value !== initial && node.textContent === Number(value).toLocaleString('en')
            )
          }, first),
        { timeout: 8000 }
      )
      .toBe(true)
  })

  test('progress, meter and CSS variables follow the count', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'progress'))
    const numbers = page.locator('.meters [data-counter]')
    await expect(numbers).toHaveText(['72', '38.5', '86%', '2,000'])
    await expect(page.locator('#html-skill')).toHaveJSProperty('value', 72)
    await expect(page.locator('#storage')).toHaveJSProperty('value', 38.5)
    const progress = () =>
      page
        .locator('.ring')
        .evaluate(ring => getComputedStyle(ring).getPropertyValue('--counter-value').trim())
    await expect.poll(progress).toBe('86')

    await page.getByRole('button', { name: 'Count again' }).click()
    await expect.poll(async () => Number(await progress())).toBeLessThan(86)
    await expect
      .poll(() =>
        page.locator('.fill').evaluate(bar => bar.clientWidth / bar.parentElement!.clientWidth)
      )
      .toBeLessThan(1)
    await expect
      .poll(() => page.locator('#html-skill').evaluate(bar => (bar as HTMLProgressElement).value))
      .toBeLessThan(72)
    await expect(numbers).toHaveText(['72', '38.5', '86%', '2,000'])
    await expect.poll(progress).toBe('86')
    const fill = await page
      .locator('.fill')
      .evaluate(bar => bar.clientWidth / bar.parentElement!.clientWidth)
    expect(fill).toBeCloseTo(1, 2)
  })

  test('screen readers get the final value and hear new ones', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'accessible'))
    const customers = page.locator('#customers')
    await expect(customers).toHaveText('12,480', { timeout: 4000 })
    await expect(customers).not.toHaveAttribute('role')
    await expect(page.locator('#hears')).toHaveText('12,480')

    await page.getByRole('button', { name: 'Count again' }).click()
    await expect(customers).toHaveAttribute('data-counter-state', 'counting')
    // The accessible name is the final value while the digits move.
    await expect(customers).toHaveAttribute('role', 'img')
    await expect(page.getByRole('img', { name: '12,480' })).toBeVisible()
    await expect(page.locator('#hears')).toHaveText('12,480')
    await expect(customers).not.toHaveAttribute('role', { timeout: 4000 })

    await page.getByRole('button', { name: 'Someone joins' }).click()
    await expect(page.locator('[data-counter-announcer]')).toHaveText('39 people online')
    await expect(page.locator('#said')).toHaveText('39 people online')
    await page.getByRole('button', { name: 'Someone leaves' }).click()
    await page.getByRole('button', { name: 'Someone leaves' }).click()
    await expect(page.locator('#online')).toHaveText('37')
    await expect(page.locator('#said')).toHaveText('37 people online')
  })

  test('steady numbers keep the line still and count in their own digits', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'steady'))
    const numbers = page.locator('.steady [data-counter]')
    const final = ['1,250,000', '1,250,000', '١٬٢٥٠٬٠٠٠', '१२,५०,०००']
    await expect(page.locator('#goal')).toHaveText('2,000,000')
    await expect(numbers).toHaveText(final, { timeout: 4000 })

    // Record where the text after each number starts on every frame of a new count.
    await page.evaluate(() => {
      const lines = [...document.querySelectorAll('.steady .line')].slice(0, 2)
      const edges: number[][] = []
      Object.assign(window, { edges })
      const frame = () => {
        edges.push(
          lines.map(line => {
            const range = document.createRange()
            range.selectNodeContents(line.lastChild!)
            return Math.round(range.getBoundingClientRect().left)
          })
        )
        if (edges.length < 60) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    await page.getByRole('button', { name: 'Count again' }).click()
    await expect(numbers.first()).toHaveAttribute('data-counter-state', 'counting')
    await expect(numbers).toHaveText(final, { timeout: 4000 })
    const edges: number[][] = await page.evaluate(() => (window as any).edges)
    const moves = (index: number) => new Set(edges.map(edge => edge[index])).size
    // Without steady the words move as the number grows; with it they stay put.
    expect(moves(0)).toBeGreaterThan(1)
    expect(moves(1)).toBe(1)
    await expect(numbers.nth(1)).toHaveCSS('font-variant-numeric', 'tabular-nums')
    expect(await numbers.nth(1).evaluate(node => node.style.minInlineSize)).toMatch(/em$/)
  })

  test('easings, stagger and speed end on the rendered values', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'motion'))
    const easings = page.locator('.easings [data-counter]')
    await expect(easings).toHaveCount(7)
    await expect(easings).toHaveText(Array(7).fill('1000'))

    // Record which numbers are done each time one completes, inside the page.
    await page.evaluate(() => {
      const log: string[][] = []
      Object.assign(window, { log })
      document.addEventListener('counter:complete', () =>
        log.push(
          [
            ...document.querySelectorAll(
              '[data-counter-stagger] [data-counter], [data-counter-speed]'
            ),
          ].map(number => number.getAttribute('data-counter-state')!)
        )
      )
    })
    await page.getByRole('button', { name: 'Count again' }).click()
    const row = page.locator('[data-counter-stagger] [data-counter]')
    const speed = page.locator('[data-counter-speed]')
    await expect(row).toHaveText(['120', '340', '560', '780'], { timeout: 4000 })
    await expect(speed).toHaveText(['500', '4,000'], { timeout: 6000 })
    await expect(speed.last()).toHaveAttribute('data-counter-state', 'done', { timeout: 6000 })
    const log: string[][] = await page.evaluate(() => (window as any).log)
    // Stagger: the row finishes in order, first to last.
    const doneAt = (index: number) => log.findIndex(states => states[index] === 'done')
    expect([0, 1, 2, 3].map(doneAt)).toEqual([...[0, 1, 2, 3].map(doneAt)].sort((a, b) => a - b))
    expect(doneAt(0)).toBeLessThan(doneAt(3))
    // Speed: 500 finishes long before 4,000.
    expect(doneAt(4)).toBeLessThan(doneAt(5))
  })
})
