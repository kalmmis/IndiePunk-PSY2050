// Optional integration suite: npm install --prefix fps --no-save playwright-core
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {existsSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.dirname(project);
const {chromium}=await import(process.env.PSY_PLAYWRIGHT_MODULE||'playwright-core');
const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-swiftshader']});
mkdirSync(path.join(project,'test-results'),{recursive:true});
try{
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(path.join(root,'build/fps/index.html')).href+'?test=1');
  await page.waitForFunction(()=>window.__FPS_TEST__);await page.waitForFunction(()=>window.PSY2050_FPS.snapshot().mode==='menu');
  await page.screenshot({path:path.join(project,'test-results/menu.png')});
  await page.click('#menu-settings');await page.locator('#sensitivity').fill('1.3');await page.locator('#fov').fill('90');await page.locator('#volume').fill('0.2');await page.click('#settings-close');
  await page.click('#play');assert.match(await page.locator('#briefing-title').textContent(),/네온/);await page.screenshot({path:path.join(project,'test-results/briefing.png')});
  await page.click('#deploy');await page.waitForFunction(()=>window.PSY2050_FPS.snapshot().locked);
  const start=await page.evaluate(()=>window.PSY2050_FPS.snapshot());await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');
  const moved=await page.evaluate(()=>window.PSY2050_FPS.snapshot());assert.ok(moved.player.z<start.player.z-.4);
  await page.mouse.move(800,400);await page.mouse.move(860,420);const looked=await page.evaluate(()=>window.PSY2050_FPS.snapshot());assert.ok(looked.player.yaw!==moved.player.yaw);
  await page.keyboard.down('q');await page.waitForTimeout(200);assert.equal((await page.evaluate(()=>window.PSY2050_FPS.snapshot())).player.timeScale,.28);await page.keyboard.up('q');
  await page.mouse.down();await page.waitForTimeout(300);await page.mouse.up();assert.ok((await page.evaluate(()=>window.PSY2050_FPS.snapshot())).shots>0);
  await page.keyboard.down('r');await page.waitForTimeout(300);assert.equal(await page.locator('#channel-label').textContent(),'마력 회복 중');await page.keyboard.up('r');
  await page.mouse.down({button:'right'});await page.waitForTimeout(500);assert.ok((await page.evaluate(()=>window.PSY2050_FPS.snapshot())).player.charge>.2);await page.mouse.up({button:'right'});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__FPS_TEST__.sim[53]),1);
  await page.waitForTimeout(1700);await page.screenshot({path:path.join(project,'test-results/combat.png')});
  await page.keyboard.press('p');await page.waitForFunction(()=>window.PSY2050_FPS.snapshot().mode==='pause');const pausedTime=await page.evaluate(()=>window.__FPS_TEST__.sim[19]);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__FPS_TEST__.sim[19]),pausedTime);
  await page.click('#pause-settings');await page.click('#settings-close');await page.click('#resume');await page.waitForFunction(()=>window.PSY2050_FPS.snapshot().locked);
  await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>window.PSY2050_FPS.snapshot().mode==='pause');await page.click('#return-title');
  assert.equal(await page.locator('#continue').isVisible(),true);await page.click('#continue');assert.match(await page.locator('#briefing-title').textContent(),/네온/);
  // Exercise progression UI with deterministic engine state; engine.test covers actual spell/collision rules.
  await page.evaluate(()=>{const t=window.__FPS_TEST__;t.setMode('playing');t.sim[12]=1;t.finish();});await page.click('#result-next');assert.equal((await page.evaluate(()=>window.PSY2050_FPS.snapshot())).stage,2);
  await page.evaluate(()=>{const t=window.__FPS_TEST__;t.setMode('playing');t.sim[12]=1;t.finish();});await page.click('#result-next');assert.equal((await page.evaluate(()=>window.PSY2050_FPS.snapshot())).stage,3);
  await page.evaluate(()=>{const t=window.__FPS_TEST__;t.setMode('playing');t.sim[12]=1;t.finish();});assert.match(await page.locator('#result-title').textContent(),/시간이 흐른다/);
  await page.click('#result-title-button');await page.click('#credits-open');assert.match(await page.locator('#original-credits').textContent(),/Hhan87/);await page.click('#credits-close');
  await page.click('#character-open');assert.match(await page.locator('#model-stats').textContent(),/TRIANGLES/);await page.click('#model-side');await page.screenshot({path:path.join(project,'test-results/reina-side.png')});await page.click('#model-back');await page.click('#character-close');
  await page.setViewportSize({width:800,height:600});await page.screenshot({path:path.join(project,'test-results/compact.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  await page.reload();await page.waitForFunction(()=>window.__FPS_TEST__);assert.equal(await page.evaluate(()=>window.__FPS_TEST__.settings.sensitivity),1.3);
  console.log('PASS: offline file, WebGL rendering, trusted pointer lock, mouse look, WASD, magic casting/charging, mana recovery, time dilation, pause/resume, pointer unlock, settings persistence, briefing/progression/ending UI, credits, character model viewer, compact viewport, zero external requests or page errors.');
}finally{await browser.close();}
