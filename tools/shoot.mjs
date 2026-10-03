// Screenshot + console check. usage: node tools/shoot.mjs <baseURL> <outDir> [browser] [prefix]
import { chromium, webkit } from 'playwright';
const base = process.argv[2] || 'http://localhost:8765/';
const out = process.argv[3] || '/workspace/middle-earth-shots';
const which = process.argv[4] || 'chromium';
const prefix = process.argv[5] || '';
const B = which === 'webkit' ? webkit : chromium;
const browser = await B.launch(which === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
const errors = [];
async function run(name, ctxOpts, steps) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`[${name}] requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  for (const s of steps) await s(page);
  await ctx.close();
}
const desk = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: which !== 'firefox', hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const ready = async (p, url) => { await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__atlasReady, null, { timeout: 120000 }); };
const shot = (n) => async (p) => { await p.screenshot({ path: `${out}/${prefix}${n}.png` }); console.log('saved', `${out}/${prefix}${n}.png`); };
const wait = (ms) => async (p) => p.waitForTimeout(ms);
const T = 4200;
await run('desktop', desk, [
  async (p) => ready(p, base), wait(T), shot('desktop-overview'),
  async (p) => p.evaluate(() => window.__atlas.openPlace('rivendell')), wait(2600), shot('desktop-place-rivendell'),
  async (p) => p.evaluate(() => window.__atlas.openJourney('frodo')), wait(2600), shot('desktop-journey-frodo'),
  async (p) => { await p.evaluate(() => { window.__atlas.closeCard(); window.__atlas.resetView(); window.__atlas.toggleLegend(true); }); }, wait(2600), shot('desktop-legend-paths'),
  async (p) => p.evaluate(() => { window.__atlas.toggleLegend(false); window.__atlas.openPlace('mountdoom'); }), wait(2600), shot('desktop-place-mountdoom'),
  async (p) => p.evaluate(() => window.__atlas.openPlace('bagend')), wait(2600), shot('desktop-place-bagend'),
  async (p) => p.evaluate(() => window.__atlas.openPlace('erebor')), wait(2600), shot('desktop-place-erebor'),
]);
await run('phone', phone, [
  async (p) => ready(p, base), wait(T), shot('phone-overview'),
  async (p) => {
    // real touch interactions: tap a marker, then one-finger pan and two-finger pinch via CDP
    const pos = await p.evaluate(() => window.__atlas.screenPos('rivendell'));
    if (pos) { await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(1500); console.log('tap rivendell ->', await p.evaluate(() => window.__atlas.cardTitle())); }
    await p.evaluate(() => window.__atlas.closeCard());
    const cdp = await p.context().newCDPSession(p);
    const before = await p.evaluate(() => window.__atlas.cam());
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    await T('touchStart', [[200, 500]]); for (let i = 1; i <= 8; i++) { await T('touchMove', [[200 + i * 10, 500 + i * 8]]); await p.waitForTimeout(30); } await T('touchEnd', []);
    await p.waitForTimeout(400);
    await T('touchStart', [[150, 450], [250, 550]]); for (let i = 1; i <= 8; i++) { await T('touchMove', [[150 - i * 8, 450 - i * 8], [250 + i * 8, 550 + i * 8]]); await p.waitForTimeout(30); } await T('touchEnd', []);
    await p.waitForTimeout(800);
    console.log('touch pan/pinch camera', JSON.stringify(before), '->', JSON.stringify(await p.evaluate(() => window.__atlas.cam())));
    await p.evaluate(() => window.__atlas.resetView());
  }, wait(2500),
  async (p) => p.evaluate(() => window.__atlas.openPlace('minastirith')), wait(2600), shot('phone-place-minastirith'),
  async (p) => p.evaluate(() => window.__atlas.openJourney('aragorn')), wait(2600), shot('phone-journey-aragorn'),
  async (p) => { await p.evaluate(() => { window.__atlas.closeCard(); window.__atlas.resetView(); window.__atlas.toggleLegend(true); }); }, wait(2600), shot('phone-legend'),
  async (p) => { await p.evaluate(() => { window.__atlas.toggleLegend(false); window.__atlas.openJourney('bilbo'); }); }, wait(2500),
  async (p) => p.evaluate(() => window.__atlas.startPlay()), wait(9000), shot('phone-play-bilbo'),
]);
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE ERRORS');
