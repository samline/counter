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

  test('formats named in HTML count in their own notation', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'named'))
    const numbers = page.locator('.named [data-counter]')
    const final = ['1.5M', '86%', '1.234,50 €', '120 km/h', '2.4 GB']
    const flat = (texts: string[]) => texts.map(text => text.replace(/\s/g, ' '))
    await expect
      .poll(async () => flat(await numbers.allTextContents()), { timeout: 4000 })
      .toEqual(final)

    await page.getByRole('button', { name: 'Count again' }).click()
    await expect(numbers.first()).toHaveAttribute('data-counter-state', 'counting')
    // While counting, every value is written by its format, never with a doubled suffix.
    const patterns = [
      /^\d+(\.\d)?[KM]?$/,
      /^\d+%$/,
      /^[\d.]+,\d\d €$/,
      /^\d+ km\/h$/,
      /^\d+(\.\d)? (B|KB|MB|GB)$/,
    ]
    for (let i = 0; i < 8; i++) {
      flat(await numbers.allTextContents()).forEach((text, n) => expect(text).toMatch(patterns[n]!))
      await page.waitForTimeout(80)
    }
    await expect
      .poll(async () => flat(await numbers.allTextContents()), { timeout: 4000 })
      .toEqual(final)
  })

  test('ordinals keep the right suffix on every value', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'ordinal'))
    const ranks = page.locator('.ranks [data-counter]')
    const final = ['21st', '103rd', '2e', '5.ª']
    await expect(ranks).toHaveText(final, { timeout: 4000 })

    await page.getByRole('button', { name: 'Count again' }).click()
    const english = (n: number) =>
      n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
    const seen = new Set<string>()
    for (let i = 0; i < 12; i++) {
      for (const text of (await ranks.allTextContents()).slice(0, 2)) {
        const [, digits, suffix] = /^(\d+)(\D*)$/.exec(text.trim())!
        expect(suffix).toBe(english(Number(digits)))
        seen.add(text)
      }
      await page.waitForTimeout(60)
    }
    expect(seen.size).toBeGreaterThan(4)
    await expect(ranks).toHaveText(final, { timeout: 4000 })
  })

  test('scroll-linked numbers follow the scroll both ways', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'scroll'))
    const story = page.locator('#story')
    const water = page.locator('[data-counter="71"]')
    await expect(water).toHaveAttribute('data-counter-state', 'pending')
    await expect(water).toHaveText('0')

    // Scroll step by step: the value only grows on the way down.
    const seen: number[] = []
    for (let top = 0; top <= 1200; top += 40) {
      await story.evaluate((box, y) => box.scrollTo(0, y), top)
      await page.waitForTimeout(60)
      seen.push(Number(await water.textContent()))
    }
    expect(seen.every((value, i) => i === 0 || value >= seen[i - 1]!)).toBe(true)
    expect(seen.some(value => value > 0 && value < 71)).toBe(true)
    await expect(water).toHaveText('71')
    await expect(page.locator('[data-counter="8000000000"]')).toHaveText('8,000,000,000')
    await expect(page.locator('[data-counter="384400"]')).toHaveText('384,400')

    // Back to the top: every number returns to its start.
    await story.evaluate(box => box.scrollTo(0, 0))
    await expect(water).toHaveText('0')
    await expect(water).toHaveAttribute('data-counter-state', 'pending')
  })

  test('rolling digits keep the line box and end on the rendered text', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'roll'))
    const board = page.locator('.board [data-counter]')
    const final = ['$1,250,000', '99.95%', '١٬٢٣٤']
    await expect(board).toHaveText(final, { timeout: 4000 })
    const height = await page
      .locator('.board dd')
      .first()
      .evaluate(dd => dd.clientHeight)

    await page.getByRole('button', { name: 'Count again' }).click()
    await expect(board.first()).toHaveAttribute('data-counter-state', 'counting')
    // While counting: columns that roll, the digits left to right, and the same line height.
    expect(await board.first().locator('[dir="ltr"] > span').count()).toBe(9)
    expect(
      await page
        .locator('.board dd')
        .first()
        .evaluate(dd => dd.clientHeight)
    ).toBe(height)
    await expect(board.first()).toHaveAttribute('aria-label', '$1,250,000')
    await expect(board).toHaveText(final, { timeout: 4000 })
    await expect(board.first().locator('[aria-hidden]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Add 75' }).click()
    await page.getByRole('button', { name: 'Take 40' }).click()
    await expect(page.locator('#score')).toHaveText('155', { timeout: 4000 })
  })

  test('scrambled digits keep the shape and width of the final text', async ({ page }) => {
    await openDocument(page, find(counterExamples, 'scramble'))
    const codes = page.locator('.codes [data-counter]')
    const final = ['#20481736', '$1,250,000', '02:45:30']
    await expect(codes).toHaveText(final, { timeout: 4000 })
    const width = () => codes.nth(1).evaluate(number => number.getBoundingClientRect().width)
    const settled = await width()

    await page.getByRole('button', { name: 'Decode again' }).click()
    await expect(codes.first()).toHaveAttribute('data-counter-state', 'counting')
    // While counting: random digits in the final text's shape, at the same width.
    const shape = (text: string) => text.replace(/\d/g, '0')
    // The first frame of a count still shows its start value.
    const start = ['#0', '$0', '00:00:00']
    const seen = new Set<string>()
    for (let i = 0; i < 8; i++) {
      const texts = await codes.allTextContents()
      if ((await codes.nth(1).getAttribute('data-counter-state')) === 'counting') {
        texts.forEach((text, n) => {
          if (text !== start[n]) expect(shape(text)).toBe(shape(final[n]!))
        })
        expect(Math.abs((await width()) - settled)).toBeLessThan(1)
        seen.add(texts[1]!)
      }
      await page.waitForTimeout(80)
    }
    expect(seen.size).toBeGreaterThan(1)
    await expect(codes).toHaveText(final, { timeout: 4000 })
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
