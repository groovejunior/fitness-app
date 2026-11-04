// Screenshot helper. Usage:
//   node scripts/shoot.mjs <url> <out.png> [light|dark] [width] [height] [fullPage]
// The dev server (npm run dev) or preview (npm run preview) must be running.
import { chromium } from 'playwright';

const [url, out, theme = 'light', w = '390', h = '844', full = 'false'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
  colorScheme: theme === 'dark' ? 'dark' : 'light',
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: out, fullPage: full === 'true' });
await browser.close();
console.log('saved', out);
