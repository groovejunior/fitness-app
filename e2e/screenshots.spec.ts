// Mobile screenshots of every main screen, light + dark, into docs/screenshots/.
import { test, type Page } from '@playwright/test';

const TODAY = '2026-11-03';
const DIR = 'docs/screenshots';

async function prepare(page: Page, theme: 'light' | 'dark', seedData = true) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto('/#/today');
  await page.evaluate((d) => localStorage.setItem('fitness.today', d), TODAY);
  await page.waitForFunction(() => (window as unknown as { fitnessDev?: unknown }).fitnessDev);
  if (seedData) await page.evaluate(() => (window as unknown as { fitnessDev: { seed: () => Promise<void> } }).fitnessDev.seed());
  else await page.evaluate(() => (window as unknown as { fitnessDev: { reset: () => Promise<void> } }).fitnessDev.reset());
}

async function go(page: Page, route: string) {
  await page.goto('/#' + route);
  await page.reload();
  await page.waitForTimeout(700);
}

async function sessionIds(page: Page) {
  return page.evaluate(async () => {
    const req = indexedDB.open('fitness');
    const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const tx = db.transaction('weeks');
    const all: { sessions: { id: string; type: string; date: string }[] }[] = await new Promise((r) => {
      const q = tx.objectStore('weeks').getAll();
      q.onsuccess = () => r(q.result);
    });
    const s = all.flatMap((w) => w.sessions);
    return {
      gym: s.find((x) => x.type === 'gym' && x.date === '2026-11-03')?.id ?? s.find((x) => x.type === 'gym')!.id,
      run: s.find((x) => x.type === 'run')!.id,
    };
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`screenshots ${theme}`, async ({ page }) => {
    const shot = (name: string, fullPage = false) => page.screenshot({ path: `${DIR}/${name}-${theme}.png`, fullPage });

    await prepare(page, theme, false);
    await go(page, '/onboarding');
    await shot('01-onboarding');

    await prepare(page, theme);
    await go(page, '/today');
    await shot('02-today');
    await go(page, '/plan?view=month');
    await shot('03-plan-month', true);
    await go(page, '/plan?view=week');
    await shot('04-plan-week', true);

    const ids = await sessionIds(page);
    await go(page, `/session/${ids.gym}`);
    await shot('05-workout-detail', true);
    const row = page.getByTestId('exercise-row').nth(4);
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(400);
      await shot('06-exercise-sheet');
      await page.keyboard.press('Escape');
    }
    await go(page, `/session/${ids.run}`);
    await shot('07-run-detail', true);

    await go(page, `/session/${ids.gym}/active`);
    await shot('08-active-workout');
    await go(page, `/session/${ids.run}/active`);
    await shot('09-run-mode');
    await go(page, `/session/${ids.gym}/done`);
    await shot('10-finish');

    await go(page, '/progress');
    await shot('11-progress', true);
    await go(page, '/settings');
    await shot('12-settings', true);
  });
}
