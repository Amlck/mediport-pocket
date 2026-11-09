import { test, expect } from '@playwright/test';

// The suite runs with reduced motion; these cases opt out to exercise each opening.
test.use({ reducedMotion: 'no-preference' });
const KEY = 'mediport-pocket-variant-b:appearance';
const choose = (page, opening) => page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify({ opening: value })), [KEY, opening]);
const overlay = (page) => page.locator('#phone > .boot, #phone > .cine');

test('cinematic is the default and hands off to the Home header', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/home');
  await expect(page.locator('#phone > .cine')).toHaveCount(1);
  await expect(page.locator('#phone > .cine')).toBeFocused();
  await expect(page.locator('#screen')).toHaveAttribute('inert', '');
  await expect(overlay(page)).toHaveCount(0, { timeout: 12_000 });
  await expect(page.locator('#screen .hero-title .brandmark')).toBeVisible();
  await expect(page.locator('#screen')).not.toHaveAttribute('inert', '');
  expect(errors).toEqual([]);
});

test('classic plays the drawn opening with its traced word', async ({ page }) => {
  await choose(page, 'classic');
  await page.goto('/#/home');
  await expect(page.locator('#phone > .boot')).toHaveCount(1);
  expect(await page.locator('.boot-word .boot-trace-line').count()).toBeGreaterThanOrEqual(8);
  await expect(page.locator('.boot-word .boot-trace-fill')).toHaveCount(8);
  await expect(overlay(page)).toHaveCount(0, { timeout: 10_000 });
});

test('off opens straight to Home', async ({ page }) => {
  await choose(page, 'off');
  await page.goto('/#/home');
  await expect(page.locator('#screen .hero-title')).toBeVisible();
  await expect(overlay(page)).toHaveCount(0);
});

for (const opening of ['cinematic', 'classic']) test(`a tap skips the ${opening} opening`, async ({ page }) => {
  await choose(page, opening);
  await page.goto('/#/home');
  await expect(overlay(page)).toHaveCount(1);
  await page.waitForTimeout(500);
  await overlay(page).click();
  await expect(overlay(page)).toHaveCount(0, { timeout: 2_500 });
  await expect(page.locator('#screen .hero-title')).toBeVisible();
});

test('a deep link never shows an opening', async ({ page }) => {
  await page.goto('/#/drugs');
  await expect(overlay(page)).toHaveCount(0);
});

test('the pack page can replay the chosen opening', async ({ page }) => {
  await choose(page, 'classic');
  await page.goto('/#/pack');
  const card = page.locator('.card', { has: page.getByRole('group', { name: 'Opening' }) });
  await card.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('#phone > .boot')).toHaveCount(1);
  await expect(overlay(page)).toHaveCount(0, { timeout: 10_000 });
  await card.getByRole('button', { name: 'Off' }).click();
  await expect(card.getByRole('button', { name: 'Play' })).toBeDisabled();
});
