import { test, expect } from '@playwright/test';
import { measureLayout } from './measure.mjs';

test.beforeEach(async ({ request }) => {
  const release = await (await request.get('/release.json')).json();
  test.skip(release.profile !== 'public-share', 'Public-edition delivery checks use a separate candidate.');
});

for (const width of [320, 393]) test(`sharing and installation fit ${width}px with large text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 852 });
  await page.addInitScript(() => localStorage.setItem('mediport-pocket-variant-b:appearance', JSON.stringify({ theme: 'portal', contrast: 'standard', textSize: 'large' })));
  await page.goto('/#/home');
  await page.getByRole('link', { name: /Share & install/ }).click();
  await expect(page.getByRole('heading', { name: 'Install on iPhone or iPad' })).toBeVisible();
  await expect(page.locator('#screen')).toContainText('No Tailscale, account or app store is needed.');
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute('href', 'https://github.com/Amlck/mediport-pocket');
  await page.locator('.pocket-share-link').evaluate(link => { link.textContent = 'https://mediport-pocket.abuzz-moth-0863.chatgpt.site/'; });
  await page.evaluate(() => Promise.all(document.querySelector('#phone').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  expect(await page.evaluate(measureLayout, { selectors: ['.card-title', '.small', '.muted', '.reflink'] })).toEqual([]);
  await page.screenshot({ path: `test-results/install-${width}.png`, fullPage: true });
});

test('all shared guides and calculator routes load without internal resource panels', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const reference = await (await request.get('/data/reference.json')).json();
  expect(reference.guideResources).toBeUndefined();
  expect(reference.guides.length).toBeGreaterThan(0);
  for (const guide of reference.guides) {
    await page.goto(`/#/guides/${guide.id}`);
    await expect(page.locator('.guide-page')).toBeVisible();
    await expect(page.locator('.guide-page')).not.toContainText('Loading guide engine…');
    await expect(page.locator('.guide-page')).not.toContainText('Local historical resources');
  }
  for (const route of ['lab-review', 'calc/steroid', 'calc/ekg', 'drugs', 'fluids', 'pack']) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('#screen .page')).toBeVisible();
    await expect(page.locator('#screen')).not.toContainText('Unable to load');
  }
  expect(await page.locator('#screen').innerText()).not.toMatch(/\[object Object\]|\bundefined\b/);
  expect(errors).toEqual([]);
});

test('public scope is explicit and private assets are unavailable', async ({ page, request }) => {
  await page.goto('/#/pack');
  await expect(page.locator('#screen')).toContainText('About this edition');
  await expect(page.locator('#screen')).toContainText('Hospital catalog records and saved local regimens are excluded.');
  for (const file of ['/images/ekg/qrs-axis.png', '/shared/index.mjs', '/api/patients', '/.env', '/data/handoff.db']) {
    expect((await request.get(file)).status()).toBe(404);
  }
});

test.describe('offline public installation', () => {
  test.use({ serviceWorkers: 'allow' });
  test('verified pack reopens offline and runs a calculator', async ({ page, context }) => {
    await page.goto('/#/pack');
    await expect(page.locator('.page [role="status"]').first()).toContainText('Offline copy verified', { timeout: 60_000 });
    await context.setOffline(true);
    await page.close();
    const offlinePage = await context.newPage();
    try {
      await offlinePage.goto('/#/calc/abg');
      await offlinePage.locator('#abg-ph').fill('7.20');
      await offlinePage.locator('#abg-paco2').fill('30');
      await offlinePage.locator('#abg-hco3').fill('12');
      await offlinePage.getByRole('button', { name: 'Interpret', exact: true }).click();
      await expect(offlinePage.locator('.abg-summary[aria-label="Current interpretation"]')).toBeVisible();
      await offlinePage.goto('/#/install');
      await expect(offlinePage.getByRole('heading', { name: 'Install on Android' })).toBeVisible();
    } finally { await context.setOffline(false); await offlinePage.close(); }
  });
});
