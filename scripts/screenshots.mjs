// Takes iPhone-size screenshots of every main screen, light and dark, into docs/screenshots/.
// Needs a running server: `npm run build && npx vite preview --port 4173` (or set BASE).
//   node scripts/screenshots.mjs
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Pin "today" to the Thursday of the current week so Today shows a session.
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
const thursday = new Date(monday);
thursday.setDate(monday.getDate() + 3);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(thursday);
const WEEK = iso(monday);

const browser = await chromium.launch();

async function context(theme) {
  const ctx = await browser.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: 'reduce' });
  await ctx.addInitScript(([t]) => localStorage.setItem('fitness.debugToday', t), [TODAY]);
  return ctx;
}

async function shot(page, name, theme, full = false) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${name}-${theme}.png`, fullPage: full });
  console.log('saved', `${name}-${theme}.png`);
}

/** Read the current week's slots from IndexedDB. */
async function slots(page) {
  return page.evaluate(
    (week) =>
      new Promise((res) => {
        const r = indexedDB.open('fitness');
        r.onsuccess = () => {
          const q = r.result.transaction('weeks').objectStore('weeks').get(week);
          q.onsuccess = () => res(q.result?.plan.slots ?? []);
        };
      }),
    WEEK,
  );
}

for (const theme of ['light', 'dark']) {
  // Onboarding (fresh, no data).
  {
    const ctx = await context(theme);
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/onboarding`);
    await page.getByLabel('Your name').fill('Carlo');
    await shot(page, '01-onboarding-name', theme);
    await page.getByRole('button', { name: 'Next' }).click();
    await shot(page, '02-onboarding-goal', theme);
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
    await shot(page, '03-onboarding-availability', theme);
    await ctx.close();
  }
  // Everything else on demo data.
  const ctx = await context(theme);
  const page = await ctx.newPage();
  await page.goto(`${BASE}#/dev/seed`);
  await page.waitForURL((u) => !u.hash.includes('seed'), { timeout: 30000 });
  await shot(page, '04-today', theme);
  await page.goto(`${BASE}#/plan/month`);
  await shot(page, '05-month', theme);
  await page.goto(`${BASE}#/plan/week`);
  await shot(page, '06-week', theme);
  await shot(page, '06b-week-full', theme, true);
  const s = await slots(page);
  const gym = s.find((x) => x.type === 'gym');
  const run = s.find((x) => x.type === 'run' && x.runKind !== 'easy') ?? s.find((x) => x.type === 'run');
  if (gym) {
    await page.goto(`${BASE}#/workout/${WEEK}/${gym.id}`);
    await shot(page, '07-workout-gym', theme);
    await shot(page, '07b-workout-gym-full', theme, true);
    await page.getByRole('button', { name: "Today I'm doing this" }).click();
    await page.getByRole('button', { name: 'Start workout' }).click();
    await page.waitForURL(/session/);
    // Go to the first main lift.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next exercise' }).click();
    await shot(page, '09-active-gym', theme);
    await page.getByRole('button', { name: 'Mark set 1 done' }).click();
    await shot(page, '10-rest-timer', theme);
  }
  if (run) {
    await page.goto(`${BASE}#/workout/${WEEK}/${run.id}`);
    await shot(page, '08-workout-run', theme);
    await page.getByRole('button', { name: "Today I'm doing this" }).click();
    await page.getByRole('button', { name: 'Start workout' }).click();
    await page.waitForURL(/session/);
    await page.getByRole('button', { name: 'Start' }).click();
    await shot(page, '11-active-run', theme);
  }
  await page.goto(`${BASE}#/progress`);
  await shot(page, '12-progress', theme);
  await shot(page, '12b-progress-full', theme, true);
  await page.goto(`${BASE}#/settings`);
  await shot(page, '13-settings', theme);
  await ctx.close();
}
await browser.close();
