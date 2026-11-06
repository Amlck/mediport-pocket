import { test, expect } from '@playwright/test';

test('a cold page uses one pinned clinical release even if root data changes', async ({ page, request }) => {
  const release = await (await request.get('/release.json')).json();
  const prefix = `/__releases/${release.version}/`;
  const requested = [];
  let rootReferenceRequests = 0;
  page.on('request', req => requested.push(new URL(req.url()).pathname));
  await page.route('**/data/reference.json', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/data/reference.json') {
      rootReferenceRequests++;
      // Represents an atomic root pointer changing after the HTML response.
      await route.fulfill({ contentType: 'application/json', body: '{"wrongRelease":true}' });
    } else await route.continue();
  });
  await page.goto('/#/pocus/lung-blue');
  await expect(page.locator('.pocus-topic')).toBeVisible();
  expect(rootReferenceRequests).toBe(0);
  expect(requested).toContain(prefix + 'data/reference.json');
  expect(requested).toContain(prefix + 'release.json');
  expect(requested.filter(name => /\.(?:js|mjs|css)$/.test(name)).every(name => name.startsWith(prefix))).toBe(true);
  const figure = page.locator('[data-atlas-image] img').first();
  await expect(figure).toHaveAttribute('src', new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 'images/pocus/'));
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.scope).toBe('./');
  expect(manifest.start_url).toBe('./');
});
