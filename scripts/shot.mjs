// Mobile screenshot of a route with seeded demo data.
// Usage: node scripts/shot.mjs <route> <out.png> [light|dark] [--no-seed] [--scale=1] [--full]
// Example: NODE_PATH=$(npm root -g) node scripts/shot.mjs /today /tmp/today.png dark
import { chromium } from 'playwright';
const [route = '/today', out = 'shot.png', theme = 'light', ...flags] = process.argv.slice(2);
const port = process.env.PORT ?? '5199';
const today = process.env.TODAY ?? '2026-11-03';
const scale = Number((flags.find((f) => f.startsWith('--scale=')) ?? '--scale=1').split('=')[1]);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, colorScheme: theme, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('CONSOLE', m.text()));
await page.goto(`http://localhost:${port}/#/today`);
await page.evaluate((d) => localStorage.setItem('fitness.today', d), today);
if (!flags.includes('--no-seed')) {
  await page.waitForFunction(() => window.fitnessDev);
  await page.evaluate(() => window.fitnessDev.seed());
}
await page.goto(`http://localhost:${port}/#${route}`);
await page.reload();
await page.waitForTimeout(900);
await page.screenshot({ path: out, fullPage: flags.includes('--full') });
await browser.close();
console.log('saved', out);
