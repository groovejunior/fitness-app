// Weekly check-in: shows at the weekend, three taps, next week adapts.
import { expect, test } from '@playwright/test';

test('weekly check-in makes a busy week lighter', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('fitness.today', '2026-11-07')); // Saturday
  await page.waitForFunction(() => (window as unknown as { fitnessDev?: unknown }).fitnessDev);
  await page.evaluate(() => (window as unknown as { fitnessDev: { seed: () => Promise<void> } }).fitnessDev.seed());
  await page.goto('/#/today');
  await page.reload();

  await page.getByTestId('checkin-card').click();
  await expect(page.getByTestId('checkin-save')).toBeDisabled();
  await page.getByTestId('felt-right').click();
  await page.getByTestId('sleep-good').click();
  await page.getByTestId('ahead-very-busy').click();
  await expect(page.getByTestId('checkin-preview')).toContainText('two sessions fewer');
  await page.getByTestId('checkin-save').click();

  await expect(page.getByTestId('checkin-result')).toBeVisible();
  await page.getByTestId('checkin-done').click();
  await expect(page.getByTestId('checkin-card')).toHaveCount(0); // done for this week

  await page.goto('/#/plan?view=week');
  await page.getByTestId('week-next').click();
  await expect(page.getByTestId('week-checkin')).toContainText('very busy');
  expect(errors).toEqual([]);
});
