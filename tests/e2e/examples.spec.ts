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
})
