// The grabber bar on a bottom sheet must drag (or tap) to close.
import { expect, test, type Page } from '@playwright/test';

const TODAY = '2026-11-03';

async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate((d) => localStorage.setItem('fitness.today', d), TODAY);
  await page.waitForFunction(() => (window as unknown as { fitnessDev?: unknown }).fitnessDev);
  await page.evaluate(() => (window as unknown as { fitnessDev: { seed: () => Promise<void> } }).fitnessDev.seed());
}

async function openExerciseSheet(page: Page) {
  const gymId = await page.evaluate(async () => {
    const req = indexedDB.open('fitness');
    const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const all: { sessions: { id: string; type: string; date: string }[] }[] = await new Promise((r) => {
      const q = db.transaction('weeks').objectStore('weeks').getAll();
      q.onsuccess = () => r(q.result);
    });
    const s = all.flatMap((w) => w.sessions);
    return s.find((x) => x.type === 'gym' && x.date === '2026-11-03')?.id ?? s.find((x) => x.type === 'gym')!.id;
  });
  await page.goto(`/#/session/${gymId}`);
  await page.reload();
  await expect(page.getByTestId('session-detail')).toBeVisible();
  await page.getByTestId('exercise-row').first().click();
  await expect(page.getByTestId('exercise-sheet')).toBeVisible();
}

async function dragHandle(page: Page, dy: number) {
  const handle = page.getByTestId('sheet-handle');
  await handle.waitFor();
  // Let the slide-up animation finish so the bar is in its rest position.
  await page.waitForTimeout(350);
  const box = await handle.boundingBox();
  if (!box) throw new Error('sheet handle has no box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 12 });
  await page.mouse.up();
}

test('sheet handle tap closes', async ({ page }) => {
  await seed(page);
  await openExerciseSheet(page);
  await page.getByTestId('sheet-handle').click();
  await expect(page.getByTestId('exercise-sheet')).toHaveCount(0, { timeout: 2000 });
});

test('sheet handle drags down to close, a short pull snaps back', async ({ page }) => {
  await seed(page);
  await openExerciseSheet(page);

  await dragHandle(page, 36);
  await expect(page.getByTestId('exercise-sheet')).toBeVisible();

  await dragHandle(page, 280);
  await expect(page.getByTestId('exercise-sheet')).toHaveCount(0, { timeout: 2000 });
});

test('sources sheet opens from settings and the handle closes it', async ({ page }) => {
  await seed(page);
  await page.goto('/#/settings');
  await page.reload();
  await page.getByTestId('training-sources').click();
  await expect(page.getByTestId('sources-sheet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Australian movement guidelines' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Currier, 2023/ })).toBeVisible();
  await page.getByTestId('sheet-handle').click();
  await expect(page.getByTestId('sources-sheet')).toHaveCount(0, { timeout: 2000 });
});
