// Render PWA icons from an inline SVG. Usage: node scripts/icons.mjs
import { chromium } from 'playwright';
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f7a63"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})" fill="none" stroke="#ffffff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="300" cy="132" r="34"/>
    <path d="M286 186 L246 286 M246 286 L296 336 L276 420 M246 286 L188 340 L132 330 M270 214 L340 254 L384 226 M270 214 L196 236 L166 196"/>
  </g></svg>`;
const out = [
  ['public/pwa-192.png', 192, 40],
  ['public/pwa-512.png', 512, 40],
  ['public/pwa-512-maskable.png', 512, 110],
  ['public/apple-touch-icon.png', 180, 50],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad] of out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg(pad)).toString('base64')}" width="${size}" height="${size}">`);
  await page.screenshot({ path: file });
}
await browser.close();
console.log('icons written');
