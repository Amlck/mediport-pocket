import { test, expect } from '@playwright/test';
import { measureLayout } from './measure.mjs';

const DETAIL = /^https:\/\/reg\.ntuh\.gov\.tw\/pharmacyoutside\/QueryDrugDetail\.aspx\?Drug_Code=[A-Z0-9%]+$/;

for (const width of [320, 393]) test(`NTUH listings search and open externally at ${width}px with large text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 852 });
  await page.addInitScript(() => localStorage.setItem('mediport-pocket-variant-b:appearance', JSON.stringify({ theme: 'portal', contrast: 'standard', textSize: 'large' })));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/search');
  await page.getByRole('searchbox', { name: 'Search everything' }).fill('augmentin');
  const letters = page.locator('.letter');
  await expect(letters.first()).toContainText('Drug reference');
  await expect(letters.nth(1)).toContainText('NTUH formulary listings');
  const listing = page.locator('a.ntuh-row').first();
  await expect(listing).toHaveAttribute('href', DETAIL);
  await expect(listing).toHaveAttribute('target', '_blank');
  await expect(listing).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(listing).toContainText('Pocket monograph:');
  await expect(page.locator('#screen')).toContainText('a listing does not confirm current availability');
  await page.evaluate(() => Promise.all(document.querySelector('#phone').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  expect(await page.evaluate(measureLayout, { selectors: ['.row-title', '.row-sub', '.drug-match', '.drug-lookup-note'] })).toEqual([]);

  // Chinese product names and listing-only products are searchable too.
  await page.getByRole('searchbox', { name: 'Search everything' }).fill('安挺樂');
  await expect(page.locator('a.ntuh-row').first()).toHaveAttribute('href', DETAIL);
  // Enter never navigates away to an external listing.
  await page.getByRole('searchbox', { name: 'Search everything' }).press('Enter');
  await expect(page).toHaveURL(/#\/search$/);
  expect(errors).toEqual([]);
});

test('a monograph lists its NTUH products as external public links', async ({ page }) => {
  await page.goto('/#/drugs/amoxicillin');
  await page.locator('#drug-sources summary').click();
  const links = page.locator('.drug-ntuh-listings a.reflink');
  expect(await links.count()).toBeGreaterThan(0);
  for (const href of await links.evaluateAll((items) => items.map((item) => item.href))) expect(href).toMatch(DETAIL);
  await expect(page.locator('.drug-ntuh-listings')).toContainText('not a live availability check');
  await page.goto('/#/pack');
  await expect(page.locator('#screen')).toContainText('NTUH formulary listings');
});
