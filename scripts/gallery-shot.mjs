// Screenshot the animation gallery. Usage: node scripts/gallery-shot.mjs [out.png] [port]
import { chromium } from 'playwright';
const out = process.argv[2] ?? 'gallery.png';
const port = process.argv[3] ?? '5199';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
await page.goto(`http://localhost:${port}/#/dev/gallery${process.argv[4] ? '?id=' + process.argv[4] : ''}`);
await page.waitForSelector('[data-anim]');
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('saved', out);
