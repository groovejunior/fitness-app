import { expect, test } from '@playwright/test';
import { onboard, openSession, openWeek, pinToday } from './helpers';

test.beforeEach(async ({ page }) => {
  await pinToday(page);
});

test('onboarding to month, week, gym workout, progress', async ({ page }) => {
  // ---- 1. Onboarding ----
  await onboard(page);

  // ---- 2. Month plan ----
  for (const phase of ['Build', 'Build', 'Peak', 'Deload']) {
    // Titles are "Week N · Phase"; match the exact week number too.
    const i = ['Build', 'Build', 'Peak', 'Deload'].indexOf(phase) + 1;
    await expect(page.getByText(`Week ${i} · ${phase}`)).toBeVisible();
  }
  const recommended = page.getByRole('button', { name: /^Recommended/ });
  await expect(recommended).toHaveAttribute('aria-pressed', 'true');
  // The only other option card is the alternative (the only other pressable cards with aria-pressed).
  const alternative = page.locator('button[aria-pressed="false"]'); // option cards are the only toggles on this screen
  await expect(alternative).toHaveCount(1);
  await alternative.click();
  await expect(recommended).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await recommended.click();
  await expect(recommended).toHaveAttribute('aria-pressed', 'true');

  // ---- 3. Week plan ----
  await openWeek(page);
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
    await expect(page.getByText(day, { exact: false }).first()).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /^Move / }).first()).toBeVisible();

  // Weekly focus: another chip, then back
  const balanced = page.getByRole('button', { name: 'Balanced', exact: true });
  const legs = page.getByRole('button', { name: 'More legs', exact: true });
  await expect(balanced).toHaveAttribute('aria-pressed', 'true');
  await legs.click();
  await expect(legs).toHaveAttribute('aria-pressed', 'true');
  await balanced.click();
  await expect(balanced).toHaveAttribute('aria-pressed', 'true');

  // Move one session to a free day (a day showing "Rest"; with Mon-Sat full this is Sunday, which the app allows even though it is marked busy)
  const moveBtn = page.getByRole('button', { name: /^Move / }).first();
  const moveName = (await moveBtn.getAttribute('aria-label'))!;
  const title = moveName.replace(/^Move /, '');
  const restDays = await page.evaluate(() =>
    [0, 1, 2, 3, 4, 5, 6].filter((d) => !!document.getElementById(`day-${d}`) && !document.getElementById(`day-${d}`)!.querySelector('[aria-label^="Move "]')),
  );
  expect(restDays.length).toBeGreaterThan(0);
  const target = restDays[0];
  await moveBtn.click();
  const sheet = page.getByRole('dialog', { name: moveName });
  await expect(sheet).toBeVisible();
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  await sheet.getByRole('button', { name: new RegExp(`^${dayNames[target]}`) }).click();
  await expect(sheet).toBeHidden();
  // The session now sits under that day (no longer "Rest")
  // (days are anchored by id "day-N" in WeekView; there is no role for a day section)
  await expect(page.locator(`#day-${target}`).getByRole('button', { name: `Move ${title}` })).toBeVisible();

  // ---- 4. Commit a gym workout ----
  const gymTitle = await openSession(page, 'gym');
  await expect(page.getByRole('radiogroup', { name: 'Equipment' })).toBeVisible();

  // Duration once
  const durationText = page.getByText(/^\d+ min$|^\d+ h/).first();
  await page.getByRole('button', { name: 'Increase Duration' }).click();
  await expect(durationText).not.toHaveText('');
  // Equipment once (Bodyweight needs no kit), then back to Gym so a weighted lift is likely
  await page.getByRole('radiogroup', { name: 'Equipment' }).getByRole('radio', { name: 'Bodyweight' }).click();
  await expect(page.getByRole('radio', { name: 'Bodyweight' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radiogroup', { name: 'Equipment' }).getByRole('radio', { name: 'Gym', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Gym', exact: true })).toHaveAttribute('aria-checked', 'true');

  // Alternative version and back
  const version = page.getByRole('radiogroup', { name: 'Version' });
  await version.getByRole('radio', { checked: false }).click();
  await expect(version.getByRole('radio', { checked: true })).not.toHaveText('Recommended');
  await version.getByRole('radio', { name: 'Recommended' }).click();
  await expect(version.getByRole('radio', { name: 'Recommended' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: "Today I'm doing this" }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page).toHaveURL(/#\/session\//);

  // ---- 5. Complete it ----
  const logged: string[] = [];
  for (let ex = 0; ex < 2 || logged.length === 0; ex++) {
    // wait for the screen to be on exercise ex+1 (the counter reads "N of M")
    await expect(page.getByRole('heading', { name: new RegExp(`^${ex + 1} of \\d+$`) })).toBeVisible();
    const name = (await page.getByRole('heading', { level: 1 }).filter({ hasNotText: /^\d+ of \d+$/ }).textContent())!.trim();
    // Log a weight where the exercise takes one
    const weights = page.getByLabel(/^Weight for set \d+$/);
    const weighted = (await weights.count()) > 0;
    if (weighted) {
      for (let i = 0; i < (await weights.count()); i++) await weights.nth(i).fill('40');
    }
    // Mark every set done; skip the rest timer after each
    const nSets = await page.getByRole('list', { name: 'Sets' }).getByRole('listitem').count();
    for (let n = 1; n <= nSets; n++) {
      await page.getByRole('button', { name: `Mark set ${n} done` }).click();
      await expect(page.getByRole('button', { name: `Mark set ${n} not done` })).toBeVisible();
      // Warm-up moves have no rest, so the timer only shows for the others
      const skip = page.getByRole('button', { name: 'Skip rest' });
      if (await skip.isVisible()) {
        await skip.click();
        await expect(skip).toBeHidden();
      }
    }
    if (weighted) logged.push(name);
    if (ex >= 10) break; // safety net
    await page.getByRole('button', { name: 'Next exercise' }).click();
  }
  expect(logged.length).toBeGreaterThan(0);

  // Walk to the last exercise, then finish
  const nextBtn = page.getByRole('button', { name: 'Next exercise' });
  while (await nextBtn.isVisible()) await nextBtn.click();
  await page.getByRole('button', { name: 'Finish workout' }).click();

  // Finish screen
  await expect(page.getByRole('heading', { name: 'Workout done' })).toBeVisible();
  await page.getByRole('button', { name: 'Effort 7' }).click();
  await page.getByRole('button', { name: 'Save workout' }).click();

  // ---- 6. Progress shows it ----
  await expect(page).toHaveURL(/#\/progress$/);
  await expect(page.getByText('Nothing to show yet')).toHaveCount(0);
  const tile = page.getByText('Sessions this month', { exact: true }).locator('xpath=preceding-sibling::p[1]');
  await expect(tile).toHaveText('1');
  await expect(page.getByText('Personal records')).toBeVisible();
  await expect(page.getByRole('button', { name: logged[0], exact: true })).toBeVisible();
  void gymTitle;
});

test('run session shows up in progress', async ({ page }) => {
  await onboard(page);
  await openWeek(page);
  await openSession(page, 'run');

  await page.getByRole('button', { name: "Today I'm doing this" }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page).toHaveURL(/#\/session\//);

  // Interval timer: start, skip two steps, finish
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  // (a short run can finish on the second skip, then the button is gone, so check first)
  for (let i = 0; i < 2; i++) {
    const skip = page.getByRole('button', { name: 'Skip step' });
    if (await skip.isVisible()) await skip.click();
  }
  await page.getByRole('button', { name: 'Finish run' }).click();

  await expect(page.getByRole('heading', { name: 'Workout done' })).toBeVisible();
  await page.getByLabel(/^Distance/).fill('5.2');
  await page.getByRole('button', { name: 'Save workout' }).click();

  await expect(page).toHaveURL(/#\/progress$/);
  await expect(page.getByText(/^Distance per week/)).toBeVisible();
  await expect(page.getByText(/^Last run:.*5\.2 km/)).toBeVisible();
});

test('app still loads offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByLabel('Your name')).toBeVisible();

  // Make sure the service worker has installed and controls the page
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
