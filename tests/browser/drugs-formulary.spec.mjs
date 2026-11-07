import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { buildSearchIndex, drugBrowseResults } from '../../src/app/lib/search.js';
import { measureLayout } from './measure.mjs';

const reference = JSON.parse(await readFile(new URL('../../src/data/reference.json', import.meta.url)));
const ntuh = JSON.parse(await readFile(new URL('../../src/data/ntuh-index.json', import.meta.url)));
const index = buildSearchIndex({ drugs: reference.drugs, drugIndicationLookup: reference.drugIndicationLookup, ntuh });
const browse = drugBrowseResults(index);
const listing = page => page.locator('.drug-formulary-row');
const monographs = page => page.locator('section[aria-labelledby="drug-browse-drug"]');
const formulary = page => page.locator('section[aria-labelledby="drug-browse-ntuh"]');

test('All browses both catalogues with complete counts and bounded pages, including the last listing', async ({ page }) => {
  await page.goto('/#/home');
  const shortcut = page.locator('.shortcut[href="#/drugs"]');
  await expect(shortcut).toContainText('179 monographs');
  await expect(shortcut).toContainText('2,289 NTUH listings');
  await shortcut.click();
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText('179 monographs · 2,289 NTUH listings');
  await expect(monographs(page).locator('a.row')).toHaveCount(20);
  await expect(listing(page)).toHaveCount(20);
  await expect(formulary(page)).toContainText('Offline names · snapshot 2026-08-28');
  await expect(formulary(page)).toContainText('do not establish dosing or current availability');
  await page.getByRole('button', { name: 'NTUH', exact: true }).click();
  await expect(monographs(page)).toHaveCount(0);
  await expect(page.locator('.drug-monograph-tools')).toBeHidden();
  await page.getByRole('combobox', { name: 'NTUH listings page' }).selectOption('114');
  await expect(listing(page)).toHaveCount(9);
  await expect(listing(page).last()).toContainText(browse.listings.at(-1).entry.title);
  await expect(page.getByRole('button', { name: 'Next ntuh listings', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous ntuh listings', exact: true }).click();
  await expect(listing(page)).toHaveCount(20);
  await expect(page.getByRole('combobox', { name: 'NTUH listings page' })).toHaveValue('113');
});

test('broad searches retain all results beyond 200, and English, Chinese and public-code searches reach products', async ({ page }) => {
  await page.goto('/#/drugs');
  await page.getByRole('button', { name: 'NTUH', exact: true }).click();
  const input = page.getByRole('searchbox', { name: 'Search drugs' });
  const matches = drugBrowseResults(index, 'injection').listings;
  expect(matches.length).toBeGreaterThan(200);
  await input.fill('injection');
  await expect(page.getByRole('status')).toHaveText(`${matches.length.toLocaleString('en-US')} NTUH listings`);
  await expect(listing(page)).toHaveCount(20);
  await page.getByRole('combobox', { name: 'NTUH listings page' }).selectOption(String(Math.ceil(matches.length / 20) - 1));
  await expect(listing(page).last()).toContainText(matches.at(-1).entry.title);
  for (const query of ['Actemra', '安挺樂', 'amoxicillin']) {
    await input.fill(query);
    expect(await listing(page).count()).toBeGreaterThan(0);
  }
  const exact = ntuh.entries.find(entry => entry.product === 'Actemra for SC Injection 162 mg/0.9 mL/pen');
  await input.fill(exact.product);
  await expect(listing(page)).toHaveCount(1);
  await expect(listing(page)).toContainText(exact.code);
  await input.fill(exact.code);
  await expect(listing(page)).toHaveCount(1);
  await input.fill('Actemra 162 mg');
  await expect(listing(page)).toHaveCount(1);
  await expect(listing(page)).toContainText(exact.code);
  await input.fill('Actemra 0.9 mL');
  await expect(listing(page)).toHaveCount(1);
  await expect(listing(page)).toContainText(exact.code);
  await input.press('Enter');
  await expect(page).toHaveURL(/#\/drugs$/);
});

test('listing links are explicit, reviewed-only and independent of monograph filters; Back and clear retain their meaning', async ({ page }) => {
  await page.goto('/#/drugs');
  await page.locator('.drug-monograph-filters > summary').click();
  const fluids = page.getByRole('group', { name: 'Monograph category' }).getByRole('button', { name: /^Fluids / });
  await fluids.focus(); await fluids.press('Enter');
  await expect(fluids).toBeFocused();
  await expect(formulary(page).getByRole('heading', { level: 2 })).toHaveText('NTUH listings · 2,289');
  await expect(page.getByRole('link', { name: /點滴 · Fluids/ })).toBeVisible();
  const input = page.getByRole('searchbox', { name: 'Search drugs' });
  const unassociated = ntuh.entries.find(entry => !entry.monograph);
  await input.fill(unassociated.code);
  await expect(listing(page)).toHaveCount(1);
  await expect(listing(page).locator('a[href^="#/drugs/"]')).toHaveCount(0);
  const associated = ntuh.entries.find(entry => entry.monograph === 'amoxicillin-clavulanate');
  await input.fill(associated.code);
  await expect(monographs(page).getByRole('heading', { level: 2 })).toHaveText('Monographs · 0');
  const external = listing(page).getByRole('link', { name: /on NTUH/ });
  await expect(external).toHaveAttribute('href', `https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=${associated.code}`);
  await expect(external).toHaveAttribute('target', '_blank');
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(listing(page).locator('a a')).toHaveCount(0);
  await listing(page).getByRole('link', { name: /^Pocket monograph:/ }).click();
  await expect(page).toHaveURL(/#\/drugs\/amoxicillin-clavulanate$/);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(input).toHaveValue(associated.code);
  await expect(page.getByRole('group', { name: 'Monograph category' }).getByRole('button', { name: /^Fluids / })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(formulary(page).getByRole('heading', { level: 2 })).toHaveText('NTUH listings · 2,289');
  await expect(page.getByRole('group', { name: 'Monograph category' }).getByRole('button', { name: /^Fluids / })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear monograph filters', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('179 monographs · 2,289 NTUH listings');
});

test('favorites stay first, indication filters affect monographs only and the view works without an NTUH index', async ({ page }) => {
  const favorite = reference.drugs.at(-1);
  await page.addInitScript(id => localStorage.setItem('mediport-pocket-variant-b:favorites', JSON.stringify([`drug:${id}`])), favorite.id);
  await page.goto('/#/drugs');
  await expect(monographs(page).locator('a.row').first()).toHaveAttribute('href', `#/drugs/${favorite.id}`);
  await page.locator('.drug-monograph-filters > summary').click();
  await page.locator('.drug-indication-picker > summary').click();
  const tag = reference.drugs.find(drug => drug.indicationTags?.length).indicationTags[0];
  await page.getByRole('group', { name: 'Monograph indication' }).getByRole('button').filter({ has: page.getByText(tag, { exact: true }) }).click();
  await expect(formulary(page).getByRole('heading', { level: 2 })).toHaveText('NTUH listings · 2,289');
  await expect(monographs(page).getByRole('heading', { level: 2 })).toHaveText(`Monographs · ${reference.drugs.filter(drug => drug.indicationTags?.includes(tag)).length}`);

  const fallback = await page.evaluate(async data => {
    const { drugsView, drugSession } = await import('/views/drugs.js');
    Object.assign(drugSession, { scope: 'ntuh', query: '', category: 'all', indication: '', pages: { drug: 0, ntuh: 0 } });
    const view = drugsView({ data });
    return { text: view.el.textContent, scopes: view.el.querySelectorAll('.drug-scopes').length,
      rows: view.el.querySelectorAll('a.row').length, status: view.el.querySelector('[role="status"]').textContent };
  }, { drugs: reference.drugs, drugIndicationLookup: reference.drugIndicationLookup });
  expect(fallback.scopes).toBe(0);
  expect(fallback.rows).toBe(20);
  expect(fallback.status).toBe('179 monographs');
  expect(fallback.text).not.toMatch(/NTUH|undefined|\[object Object\]/);
});

for (const width of [320, 393]) test(`unified Drugs fits ${width}px with large text and keyboard-accessible scope`, async ({ page }) => {
  await page.setViewportSize({ width, height: 852 });
  await page.addInitScript(() => localStorage.setItem('mediport-pocket-variant-b:appearance', JSON.stringify({ theme: 'portal', contrast: 'standard', textSize: 'large' })));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/home');
  await expect(page.locator('.shortcut[href="#/drugs"]')).toContainText('2,289 NTUH listings');
  await expect(page.getByRole('dialog', { name: 'Mediport Pocket is opening' })).toBeHidden();
  await expect(page.locator('#phone')).not.toHaveClass(/boot-reveal/);
  await page.evaluate(() => Promise.all(document.querySelector('#phone').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  expect(await page.evaluate(measureLayout, { selectors: ['.shortcut-count'] })).toEqual([]);
  await page.screenshot({ path: `test-results/drugs-home-${width}.png` });
  await page.locator('.shortcut[href="#/drugs"]').click();
  await expect(page.getByRole('heading', { name: 'Drugs', exact: true, level: 1 })).toBeVisible();
  await page.evaluate(() => Promise.all(document.querySelector('#phone').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  expect(await page.evaluate(measureLayout, { selectors: ['.subtitle', '.drug-lookup-note'] })).toEqual([]);
  await page.screenshot({ path: `test-results/drugs-all-${width}.png` });
  const ntuhScope = page.getByRole('button', { name: 'NTUH', exact: true });
  await ntuhScope.focus(); await ntuhScope.press('Enter');
  await expect(ntuhScope).toBeFocused();
  await expect(ntuhScope).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(measureLayout, { selectors: ['.row-title', '.drug-formulary-description', '.drug-pagination'] })).toEqual([]);
  await page.screenshot({ path: `test-results/drugs-ntuh-browse-${width}.png` });
  await page.getByRole('searchbox', { name: 'Search drugs' }).fill('augmentin');
  await expect(listing(page).first()).toBeVisible();
  await page.evaluate(() => Promise.all(document.querySelector('#phone').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  expect(await page.evaluate(measureLayout, { selectors: ['.row-title', '.drug-formulary-description', '.drug-match', '.drug-lookup-note', '.drug-formulary-links a'] })).toEqual([]);
  await page.screenshot({ path: `test-results/drugs-formulary-${width}.png` });
  expect(errors).toEqual([]);
});

test.describe('offline names index', () => {
  test.use({ serviceWorkers: 'allow' });
  test('the installed Drugs browser searches listings offline and labels external access', async ({ page, context }) => {
    await page.goto('/#/pack');
    await expect(page.locator('.page [role="status"]').first()).toContainText('Offline copy verified', { timeout: 60_000 });
    await context.setOffline(true); await page.close();
    const offline = await context.newPage();
    try {
      await offline.goto('/#/drugs');
      await offline.getByRole('button', { name: 'NTUH', exact: true }).click();
      await offline.getByRole('searchbox', { name: 'Search drugs' }).fill('安挺樂');
      await expect(listing(offline).first()).toBeVisible();
      await expect(formulary(offline)).toContainText('NTUH public pages need internet');
      await expect(listing(offline).first().getByRole('link', { name: /on NTUH/ })).toHaveAttribute('target', '_blank');
    } finally { await offline.close(); }
  });
});
