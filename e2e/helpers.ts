import { expect, type Page } from '@playwright/test';

/**
 * Pin "today" to a Monday so the planned week is the same every run.
 * The app reads this key in src/lib/today.ts. Without it the plan would depend on
 * the weekday the test happens to run on (days earlier in the week may be skipped).
 */
export const PINNED_TODAY = '2026-11-02';

export async function pinToday(page: Page) {
  await page.addInitScript((d) => {
    try {
      localStorage.setItem('fitness.debugToday', d);
    } catch {
      /* ignore */
    }
  }, PINNED_TODAY);
}

const next = (page: Page) => page.getByRole('button', { name: 'Next', exact: true }).click();

/** Walks through the 7 onboarding steps and lands on the month plan. */
export async function onboard(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/onboarding$/);

  // 1. Name
  await page.getByLabel('Your name').fill('Carlo');
  await next(page);

  // 2. Goal
  await page.getByRole('button', { name: /Athletic build/ }).click();
  await next(page);

  // 3. Sport
  await page.getByRole('button', { name: 'Tennis', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tennis', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await next(page);

  // 4. Experience (gym)
  await page.getByRole('radiogroup', { name: 'Gym experience' }).getByRole('radio', { name: 'Intermediate' }).click();
  await next(page);

  // 5. Availability: every day starts off, so switch on Monday to Saturday
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
    await page.getByRole('button', { name: day, exact: true }).click();
    await expect(page.getByRole('button', { name: day, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await next(page);

  // 6. Equipment
  await page.getByRole('group', { name: 'Default equipment' }).getByRole('button', { name: 'Gym', exact: true }).click();
  await next(page);

  // 7. Sessions per week (defaults: 3 gym, 2 runs, 1 sport), then build
  await expect(page.getByRole('heading', { name: 'Sessions per week' })).toBeVisible();
  await page.getByRole('button', { name: 'Build my month' }).click();
  await expect(page).toHaveURL(/#\/plan\/month$/);
}

/** From the month plan, switch to the week plan. */
export async function openWeek(page: Page) {
  await page.getByRole('radio', { name: 'Week', exact: true }).click();
  await expect(page).toHaveURL(/#\/plan\/week/);
  await expect(page.getByText('Focus this week')).toBeVisible();
}

/** Opens the first session card of the given kind from the week plan. Returns its title. */
export async function openSession(page: Page, kind: 'gym' | 'run'): Promise<string> {
  const titles =
    kind === 'gym'
      ? /^Move (Full body [ABC]|Upper body|Lower body|Push|Pull|Legs)( B)?$/
      : /^Move (Easy run|Recovery run|Tempo run|Intervals|Long run)$/;
  const moveBtn = page.getByRole('button', { name: titles }).first();
  await expect(moveBtn).toBeVisible();
  const title = (await moveBtn.getAttribute('aria-label'))!.replace(/^Move /, '');
  // The card itself is the button that holds the title text.
  await page.getByRole('button', { name: new RegExp(`^${title}\\b`) }).first().click();
  await expect(page).toHaveURL(/#\/workout\//);
  return title;
}
