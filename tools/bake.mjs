// Bakes assets/height.png and assets/terrain.jpg using headless Chromium.
// usage: node tools/bake.mjs   (needs `playwright` resolvable, see tools/README)
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/tools/bake.html`);
await page.waitForFunction(() => window.__result, null, { timeout: 600000 });
const r = await page.evaluate(() => window.__result);
fs.writeFileSync(path.join(root, 'assets/terrain.jpg'), Buffer.from(r.tex.split(',')[1], 'base64'));
fs.writeFileSync(path.join(root, 'assets/height.png'), Buffer.from(r.hm.split(',')[1], 'base64'));
fs.writeFileSync(path.join(root, 'assets/height.json'), JSON.stringify({ GW: r.GW, GH: r.GH, S: 2, min: -2, max: 8 }));
console.log('grid', r.GW, r.GH, 'h range', r.mn.toFixed(2), r.mx.toFixed(2), 'gen ms', r.tGen | 0, 'tex ms', r.tTex | 0);
await browser.close(); srv.close();
