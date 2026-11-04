// Renders public/favicon.svg to the PNG icons the manifest needs. Run: node scripts/icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
async function shot(size, file, { maskable = false, square = false } = {}) {
  await p.setViewportSize({ width: size, height: size });
  // Maskable icons need the artwork inside the central 80 %; square icons (iOS) need no rounded corners.
  let inner = svg;
  if (maskable || square) inner = svg.replace('rx="112"', 'rx="0"');
  const scale = maskable ? 0.8 : 1;
  const html = `<html><body style="margin:0;background:#1f7a5c;display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${size * scale}px;height:${size * scale}px">${inner.replace('<svg ', `<svg width="${size * scale}" height="${size * scale}" `)}</div></body></html>`;
  await p.setContent(html);
  await p.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname, omitBackground: !maskable && !square });
}
await shot(192, 'icon-192.png');
await shot(512, 'icon-512.png');
await shot(512, 'icon-maskable-512.png', { maskable: true });
await shot(180, 'apple-touch-icon.png', { square: true });
await b.close();
console.log('icons written');
