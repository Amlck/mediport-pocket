import { test, expect } from '@playwright/test';

const cases = [
  ['acute-severe-asthma', 'severity', 'life-threatening', ['life-threatening-escalation', 'life-threatening-oxygen']],
  ['bradycardia', 'pulseStatus', 'absent', ['brady-arrest']],
  ['acute-chest-pain-acs', 'stability', 'unstable', ['unstable-escalation']],
  ['atrial-fibrillation-rvr', 'instability', 'attributable', ['unstable-unconfirmed-rhythm-emergency']],
];

for (const [guide, field, value, actions] of cases) {
  test(`${guide} keeps engine emergency actions visible before phase selection`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/#/guides/${guide}`);
    await expect(page.locator('[data-field-key="phase"][data-choice-value="unknown"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.action')).toHaveCount(0);
    await page.locator(`[data-field-key="${field}"][data-choice-value="${value}"]`).click();
    const urgent = page.getByRole('region', { name: 'Urgent actions before phase selection' });
    await expect(urgent).toBeVisible();
    for (const id of actions) await expect(urgent.locator(`[data-action-id="${id}"]`)).toBeVisible();
    await expect(urgent.locator('.action')).toHaveCount(actions.length);
    await expect(page.locator('.action:not(.urgent)')).toHaveCount(0);
    await expect(page.locator('[data-field-key="phase"][data-choice-value="unknown"]')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'View plan ↓' }).click();
    await expect(page.getByRole('heading', { name: 'Urgent actions', exact: true })).toBeFocused();
    await page.locator('[data-field-key="phase"][data-choice-value="initial"]').click();
    await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible();
    for (const id of actions) await expect(page.locator(`[data-action-id="${id}"]`)).toBeVisible();
    expect(errors).toEqual([]);
  });
}
