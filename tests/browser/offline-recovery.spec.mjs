import { test, expect } from '@playwright/test';

test('a stalled browser registration shows a usable retry and then verifies the recovered pack', async ({ page }) => {
  // Model the browser API stall reported in Safari, rather than a failed asset
  // download. The real view and offline client must remain usable together.
  await page.addInitScript(() => {
    let attempts = 0;
    const worker = {
      postMessage(_request, [port]) {
        port.postMessage({ version: 'recovery-test-v1', complete: true });
      },
      addEventListener() {},
    };
    const registration = {
      active: worker, waiting: null, installing: null,
      update: async () => {}, addEventListener() {},
    };
    Object.defineProperty(navigator, 'serviceWorker', { value: {
      controller: null, addEventListener() {},
      register() { return ++attempts === 1 ? new Promise(() => {}) : Promise.resolve(registration); },
      getRegistration: async () => undefined,
    } });
  });
  await page.goto('/#/pack');
  const status = page.locator('.page [role="status"]').first();
  await expect(status).toContainText('Offline status unavailable', { timeout: 15_000 });
  await expect(status).toContainText('try again');
  const retry = page.getByRole('button', { name: 'Check for update', exact: true });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(status).toContainText('Offline copy verified');
  await expect(page.locator('#screen')).toContainText('recovery-test-v1');
  await expect(retry).not.toHaveAttribute('aria-busy', 'true');
});
