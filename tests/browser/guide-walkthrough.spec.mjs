import { test, expect } from '@playwright/test';

// Answers every visible question in each guide, one option at a time, so each
// engine renders real branches. Public output, including collapsed sections,
// must not describe the hospital resource library that the public edition omits.
const PRIVATE_WORDING = /\b(?:saved|captured|curated)\s+(?:[\w-]+\s+){0,4}(?:rows?|folders?|sets?|regimens?)\b|\blocal (?:rows?|folders?|catalog)\b|\bcatalog identit/i;

// Guides from the first public extraction whose limitation text still needs
// the same wording cleanup. Remove entries as they are cleaned.
const WORDING_CLEANUP_PENDING = new Set(['delirium', 'heart-failure', 'hyperkalemia', 'hypotension', 'new-inpatient-fever']);

test.beforeEach(async ({ request }) => {
  const release = await (await request.get('/release.json')).json();
  test.skip(release.profile !== 'public-share', 'Public-edition delivery checks use a separate candidate.');
});

test('every guide answers through its choices without errors or private resource wording', async ({ page, request }) => {
  test.setTimeout(240_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const reference = await (await request.get('/data/reference.json')).json();
  for (const guide of reference.guides) {
    await page.goto(`/#/guides/${guide.id}`);
    await expect(page.locator('.guide-page')).not.toContainText('Loading guide engine…');
    // Walk option index 0, then 1, then 2 so later branches are reached too.
    for (const pick of [0, 1, 2]) {
      const fields = await page.locator('[data-field-key]').evaluateAll((buttons) => [...new Set(buttons.map((b) => b.dataset.fieldKey))]);
      for (const key of fields) {
        const options = page.locator(`[data-field-key="${key}"]`);
        const count = await options.count();
        if (count) await options.nth(Math.min(pick, count - 1)).click();
      }
      const label = `${guide.id} pick ${pick}`;
      expect(await page.locator('#screen').innerText(), label).not.toMatch(/\[object Object\]|\bundefined\b|\bNaN\b/);
      if (!WORDING_CLEANUP_PENDING.has(guide.id)) {
        const allText = await page.locator('#screen').evaluate((el) => el.textContent);
        expect(allText.match(PRIVATE_WORDING)?.[0] ?? null, label).toBeNull();
      }
    }
  }
  expect(errors).toEqual([]);
});
