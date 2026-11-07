import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const review = JSON.parse(await readFile(new URL('../../docs/ntuh-guide-source-review.json', import.meta.url)));
const products = new Map(review.products.map(product => [product.code, product]));

test('restored guides expose dated public product-identity links without implying a stock or dosing review', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [guide, codes] of Object.entries(review.guideProducts)) {
    await page.goto(`/#/guides/${guide}`);
    await expect(page.locator('.guide-page')).not.toContainText('Loading guide engine…');
    for (const code of codes) {
      const link = page.locator(`a[href="${products.get(code).url}"]`).first();
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toContainText('access checked 2026-11-07');
    }
    const text = await page.locator('#screen').evaluate(el => el.textContent);
    expect(text, guide).toContain('identity and label strength only');
    expect(text, guide).toContain('do not establish current stock, absence of an alternative');
    expect(text, guide).not.toMatch(/\[object Object\]|\bundefined\b|\bNaN\b/);
  }
  expect(errors).toEqual([]);
});
