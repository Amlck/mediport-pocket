import { test, expect } from '@playwright/test';

async function catalogue(request) {
  const response = await request.get('/data/reference.json');
  const { pocus } = await response.json();
  expect(pocus.videos.length).toBeGreaterThan(0);
  return pocus;
}

function locationFor(pocus, id) {
  for (const topic of pocus.topics) for (const section of topic.atlas || []) {
    const item = section.items.find((entry) => entry.videoIds?.includes(id));
    if (item) return { topic, section, item };
  }
  throw new Error(`No card for ${id}`);
}

async function playClip(page, clip) {
  const figure = page.locator(`[data-atlas-video="${clip.id}"]`).first();
  const player = figure.locator('video');
  await player.scrollIntoViewIfNeeded();
  await expect(player).toHaveAttribute('playsinline', '');
  await expect(player).toHaveAttribute('preload', 'none');
  await expect(player).toHaveAttribute('controls', '');
  await expect(player).not.toHaveAttribute('autoplay');
  await expect(player).not.toHaveAttribute('loop');
  await expect(figure).toContainText(clip.alt);
  await expect(figure).toContainText(clip.license);
  await player.evaluate((video) => video.play());
  await expect.poll(() => player.evaluate((video) => video.currentTime)).toBeGreaterThan(0.1);
  expect(await player.evaluate((video) => [video.videoWidth, video.videoHeight])).toEqual([clip.width, clip.height]);
  expect(await player.evaluate((video) => video.duration)).toBeCloseTo(clip.duration, 1);
  await player.evaluate((video) => { video.pause(); video.currentTime = video.duration / 2; });
  await expect.poll(() => player.evaluate((video) => !video.seeking && video.readyState >= 2 && !video.error)).toBe(true);
  return player;
}

test('all published motion clips decode, seek, retain credits and pause on collapse/navigation', async ({ page, request }) => {
  const pocus = await catalogue(request);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 852 });
  await page.addInitScript(() => localStorage.setItem('mediport-pocket-variant-b:appearance', JSON.stringify({ theme: 'portal', contrast: 'standard', textSize: 'large' })));
  for (const clip of pocus.videos) {
    const { topic, section, item } = locationFor(pocus, clip.id);
    await page.goto(`/#/pocus/${topic.id}/atlas/${item.id}`);
    await expect(page.locator('#phone > .boot')).toHaveCount(0);
    const player = await playClip(page, clip);
    expect(await player.evaluate((node) => node.getBoundingClientRect().width <= node.closest('.pocus-atlas-figure').clientWidth)).toBe(true);
    await player.evaluate((video) => video.play());
    await page.locator(`[data-atlas-section="${section.id}"] > summary`).click();
    await expect.poll(() => player.evaluate((video) => video.paused)).toBe(true);
    const handle = await player.elementHandle();
    await page.evaluate(() => { location.hash = '#/pocus'; });
    await expect(page.locator('.pocus-catalogue')).toBeVisible();
    expect(await handle.evaluate((video) => video.paused && !video.hasAttribute('src'))).toBe(true);
    await handle.dispose();
  }
  expect(errors).toEqual([]);
});

test('online byte-range delivery serves only the allowlisted clip', async ({ request }) => {
  const pocus = await catalogue(request);
  const clip = pocus.videos[0];
  const url = `/images/pocus/${clip.file}`;
  const full = await request.get(url);
  expect(full.headers()['content-type']).toBe('video/mp4');
  const bytes = await full.body();
  const range = await request.get(url, { headers: { Range: 'bytes=0-1' } });
  expect(range.status()).toBe(206);
  expect(await range.body()).toEqual(bytes.subarray(0, 2));
  expect(range.headers()['content-range']).toBe(`bytes 0-1/${bytes.length}`);
  expect((await request.get(url, { headers: { Range: `bytes=${bytes.length}-` } })).status()).toBe(416);
  expect((await request.get(url + '?patient=x', { headers: { Range: 'bytes=0-1' } })).status()).toBe(404);
  expect((await request.get('/images/pocus/not-allowlisted.mp4', { headers: { Range: 'bytes=0-1' } })).status()).toBe(404);
});

test.describe('offline motion', () => {
  test.use({ serviceWorkers: 'allow' });
  test('a cold offline reopen plays and seeks every clip from the verified pack', async ({ page, context, request }) => {
    const pocus = await catalogue(request);
    await page.goto('/#/pack');
    await expect(page.locator('.page [role="status"]').first()).toContainText('Offline copy verified', { timeout: 60_000 });
    await context.setOffline(true);
    await page.close();
    const reopened = await context.newPage();
    try {
      for (const clip of pocus.videos) {
        const { topic, item } = locationFor(pocus, clip.id);
        await reopened.goto(`/#/pocus/${topic.id}/atlas/${item.id}`);
        await expect(reopened.locator('.pocus-topic')).toBeVisible();
        await playClip(reopened, clip);
        const range = await reopened.evaluate(async (file) => {
          const response = await fetch(`images/pocus/${file}`, { headers: { Range: 'bytes=0-1' } });
          return { status: response.status, length: (await response.arrayBuffer()).byteLength, range: response.headers.get('Content-Range') };
        }, clip.file);
        expect(range.status).toBe(206); expect(range.length).toBe(2);
        expect(range.range).toMatch(/^bytes 0-1\/\d+$/);
      }
    } finally { await context.setOffline(false); await reopened.close(); }
  });
});
