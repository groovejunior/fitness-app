// The v1 definition-of-done journey:
// onboarding → month plan → week plan → commit workout → complete workout → progress shows it.
import { expect, test } from '@playwright/test';

const TODAY = '2026-11-03'; // a Tuesday

test('first month, first workout, shows in progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.evaluate((d) => localStorage.setItem('fitness.today', d), TODAY);
  await page.reload();

  // --- Onboarding
  await expect(page.getByTestId('onboarding-step')).toBeVisible();
  await page.getByTestId('onboarding-name').fill('Carlo');
  for (let i = 0; i < 7; i++) {
    await page.getByTestId('onboarding-next').click();
  }
  await expect(page.getByTestId('option-recommended')).toBeVisible();
  await expect(page.getByTestId('option-alternative')).toBeVisible();
  await page.getByTestId('onboarding-start').click();

  // --- Today
  await expect(page).toHaveURL(/#\/today/);
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible();

  // --- Month plan
  await page.getByRole('button', { name: 'Plan' }).click();
  await page.getByTestId('plan-view-month').click();
  await expect(page.getByText(/Deload/).first()).toBeVisible();
  await expect(page.getByTestId('month-option-alternative')).toBeVisible();

  // --- Week plan: every day row, at least one session this week
  await page.getByTestId('plan-view-week').click();
  for (let d = 0; d < 7; d++) await expect(page.getByTestId(`week-day-${d}`)).toBeVisible();
  const cards = page.locator('[data-testid^="session-card-"]');
  expect(await cards.count()).toBeGreaterThan(0);

  // --- Pick the first gym session of the week and commit to it
  const gymId = await page.evaluate(async () => {
    const req = indexedDB.open('fitness');
    const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const all: { sessions: { id: string; type: string; status: string }[] }[] = await new Promise((r) => {
      const q = db.transaction('weeks').objectStore('weeks').getAll();
      q.onsuccess = () => r(q.result);
    });
    return all.flatMap((w) => w.sessions).find((s) => s.type === 'gym' && s.status === 'planned')!.id;
  });
  await page.getByTestId(`session-card-${gymId}`).click();
  await expect(page.getByTestId('session-detail')).toBeVisible();

  // Change context: home + shorter, the workout regenerates
  await page.getByTestId('equipment-home').click();
  await expect(page.getByTestId('exercise-row').first()).toBeVisible();
  await page.getByTestId('variant-alternative').click();
  await page.getByTestId('variant-recommended').click();
  await page.getByTestId('commit-workout').click();

  // --- Active workout: check every set of every exercise
  await expect(page.getByTestId('active-workout')).toBeVisible();
  for (let guard = 0; guard < 40; guard++) {
    const checks = page.locator('[data-testid^="set-check-"]');
    const n = await checks.count();
    for (let i = 0; i < n; i++) {
      const c = page.getByTestId(`set-check-${i}`);
      if ((await c.getAttribute('aria-pressed')) !== 'true') await c.click();
      const skip = page.getByTestId('rest-skip');
      if (await skip.isVisible().catch(() => false)) await skip.click();
    }
    const finish = page.getByTestId('finish-workout');
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      break;
    }
    await page.getByTestId('next-exercise').click();
  }

  // --- Finish
  await expect(page.getByTestId('finish-screen')).toBeVisible();
  await page.getByTestId('effort-7').click();
  await page.getByTestId('save-finish').click();
  await expect(page).toHaveURL(/#\/today/);

  // --- Progress shows the done session and the lifts
  await page.getByRole('button', { name: 'Progress' }).click();
  await expect(page.getByTestId('progress-week-count')).toContainText('1');
  await expect(page.getByTestId('progress-heatmap')).toBeVisible();
  await expect(page.locator('[data-testid^="exercise-history-"]').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('week can be re-planned and exported', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((d) => localStorage.setItem('fitness.today', d), TODAY);
  await page.waitForFunction(() => (window as unknown as { fitnessDev?: unknown }).fitnessDev);
  await page.evaluate(() => (window as unknown as { fitnessDev: { seed: () => Promise<void> } }).fitnessDev.seed());
  await page.goto('/#/plan?view=week');
  await page.reload();

  await page.getByTestId('week-focus-legs').click();
  await expect(page.getByText(/legs focus/i).first()).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByTestId('ics-export').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^week-2026-11-02\.ics$/);
});
