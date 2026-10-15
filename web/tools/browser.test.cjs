/* Optional browser integration check. Install playwright-core and use Chrome. */
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {existsSync} = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PSY_PLAYWRIGHT_MODULE || 'playwright-core');
const root = path.resolve(__dirname, '../..');
const edition = process.env.PSY_GAME_EDITION === 'original' ? 'original' : 'remastered';
const file = pathToFileURL(path.join(root, 'build/wasm', edition === 'original' ? 'original.html' : 'index.html')).href + '?test=1';
const executablePath = process.env.CHROME_PATH || [
 '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 '/usr/bin/google-chrome', '/usr/bin/chromium',
 process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe')
].filter(Boolean).find(existsSync);
(async () => {
 const browser = await chromium.launch({executablePath, headless: true});
 try {
  const context = await browser.newContext({offline: true, viewport: {width: 1365, height: 980}});
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.goto(file); await page.waitForFunction(() => window.__PSY_TEST__);
  assert.equal(await page.evaluate(() => window.PSY2050.edition), edition);
  await page.evaluate(() => window.__PSY_TEST__.title());
  await page.click('#new-game');
  await page.evaluate(() => window.__PSY_TEST__.advance(2.1));
  assert.match(await page.locator('#speaker').textContent(), /미나/);
  await page.evaluate(() => window.__PSY_TEST__.next());
  assert.equal((await page.evaluate(() => window.PSY2050.snapshot())).dialogue.text, '아니마의 불꽃이잖아.');
  await page.click('#skip-dialogue');
  const bounds = await page.locator('#canvas').boundingBox();
  await page.mouse.move(bounds.x + 190, bounds.y + 600); await page.mouse.down();
  await page.evaluate(() => { window.__PSY_TEST__.engine.protect(10000); window.__PSY_TEST__.advance(15.1); });
  assert.equal((await page.evaluate(() => window.PSY2050.snapshot())).player.power, 4);
  await page.mouse.up();
  await page.click('#pause-button');
  assert.equal((await page.evaluate(() => window.PSY2050.snapshot())).paused, true);
  await page.click('#pause-settings'); await page.locator('#music-volume').fill('0.2');
  await page.click('#close-settings'); await page.click('#resume-button');
  const route = await page.evaluate(() => {
   const t = window.__PSY_TEST__, visited = [], seen = new Set(); t.start(1);
   for (let seconds = 0; seconds < 1500; seconds++) {
    const s = t.snapshot();
    if (!seen.has(s.stage)) { seen.add(s.stage); visited.push(s.stage); }
    if (s.mode === 'credits' || s.mode === 'menu') return {visited, end: s.mode};
    t.engine.protect(10000);
    if (s.dialogue) t.skip();
    else if (s.waitingBoss) { for (let j = 0; j < 5200; j++) t.engine.step(1/60, 0, 4, 1, 0); t.advance(.1); }
    else t.advance(1);
   }
   throw new Error('Stage runner did not finish: ' + JSON.stringify(t.snapshot()));
  });
  assert.deepEqual(route.visited, [1,2,3,4,10]); assert.equal(route.end, 'credits');
  // The default timed-out branch repeats Stage 4, preserving the original route.
  const repeat = await page.evaluate(() => {
   const t = window.__PSY_TEST__; t.start(4); let enteredBoss = false;
   for (let i = 0; i < 500; i++) {
    const s = t.snapshot(); t.engine.protect(10000);
    if (s.waitingBoss) { enteredBoss = true; for(let j=0;j<5200;j++) t.engine.step(1/60,-999,0,0,0); }
    if (s.dialogue) t.skip(); else t.advance(1);
    const after = t.snapshot(); if(enteredBoss && after.rowIndex < 3) return after.stage;
   }
   throw new Error('Expected Stage 4 repeat');
  });
  assert.equal(repeat, 4);
  await page.evaluate(() => {
   const t = window.__PSY_TEST__; t.start(1); t.advance(2.1); t.skip();
   t.engine.spawnEnemy(0,0,23,23,2.5); t.actors[2] = -5; t.advance(2.2);
  });
  assert.equal((await page.evaluate(() => window.PSY2050.snapshot())).dead, true);
  await page.click('#revive-button');
  assert.equal((await page.evaluate(() => window.PSY2050.snapshot())).player.alive, true);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => { window.__PSY_TEST__.start(4); window.__PSY_TEST__.advance(2.1); });
  await page.waitForFunction(() => { const b=document.getElementById('frame').getBoundingClientRect(); return b.width<=390 && b.height<=844; });
  const box = await page.locator('#frame').boundingBox(); assert.ok(box.width <= 390 && box.height <= 844);
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  console.log(edition + ' PASS: offline HTML, menu, dialogue, pointer input, time slowdown, pause/settings, stages 1→2→3→4→10, credits, Stage 4 repeat, death/revive, responsive layout, zero network requests or browser errors.');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
