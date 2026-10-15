// Optional: npm install --prefix tower-defense --no-save playwright-core
// Test storage is isolated from normal game progress by ?test=1.
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {existsSync,mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.PSY_PLAYWRIGHT_MODULE||'playwright-core');
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.dirname(project);
const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
mkdirSync(path.join(project,'test-results'),{recursive:true});
try{
  const context=await browser.newContext({offline:true,viewport:{width:1365,height:900}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(path.join(root,'build/tower-defense/index.html')).href+'?test=1');
  await page.waitForFunction(()=>window.PSY2050_TD&&window.__TD_TEST__);
  await page.screenshot({path:path.join(project,'test-results/title.png')});
  await page.click('#title-guide');assert.match(await page.locator('#modal-title').textContent(),/지키는 법/);await page.click('#guide-done');
  await page.click('#play');assert.match(await page.locator('#modal-title').textContent(),/재가/);await page.click('#deploy');
  const select=type=>page.click(`[data-operator="${type}"]`);
  const place=async(x,y)=>{const b=await page.locator('#battlefield').boundingBox();await page.mouse.click(b.x+(x+.5)/18*b.width,b.y+(y+.5)/12*b.height);};
  await select('mina');await place(6,4);assert.equal((await page.evaluate(()=>window.PSY2050_TD.snapshot())).towers.length,1);
  await page.click('#upgrade');assert.equal((await page.evaluate(()=>window.PSY2050_TD.snapshot())).towers[0].level,2);
  await page.click('[data-target="strong"]');assert.equal((await page.evaluate(()=>window.PSY2050_TD.snapshot())).towers[0].target,'strong');
  const invested=(await page.evaluate(()=>window.PSY2050_TD.snapshot())).towers[0].invested;
  await page.click('#sell');assert.equal((await page.evaluate(()=>window.PSY2050_TD.snapshot())).money,440-invested+Math.floor(invested*.7));
  await select('mina');await place(6,4);await select('time');await place(6,6);await select('rita');await place(10,6);
  const saved=await page.evaluate(()=>window.PSY2050_TD.snapshot());await page.reload();await page.click('#continue');
  const restored=await page.evaluate(()=>window.PSY2050_TD.snapshot());assert.equal(restored.money,saved.money);assert.equal(restored.towers.length,3);
  await page.click('#start-wave');await page.waitForFunction(()=>window.PSY2050_TD.snapshot().enemies.length>0);
  await page.click('#rift');assert.ok((await page.evaluate(()=>window.PSY2050_TD.snapshot())).riftCooldown>30);
  await page.click('#pause');const time=await page.evaluate(()=>window.PSY2050_TD.snapshot().time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.PSY2050_TD.snapshot().time),time);await page.click('#resume');
  await page.click('#speed');assert.equal((await page.evaluate(()=>window.PSY2050_TD.snapshot())).speed,2);
  await page.click('#boss-info');assert.match(await page.locator('#modal-title').textContent(),/레이나/);await page.click('#boss-close');
  await page.screenshot({path:path.join(project,'test-results/battle.png')});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(project,'test-results/mobile.png'),fullPage:true});
  // Full campaign uses the same purchases and earned resources as the engine suite.
  const layouts=[[[6,4,'mina'],[6,6,'time'],[10,6,'rita'],[10,4,'yul'],[4,6,'haeun'],[8,9,'mina'],[6,2,'serin']],[[8,5,'mina'],[10,6,'time'],[10,3,'rita'],[12,8,'yul'],[8,8,'haeun'],[4,3,'mina'],[7,3,'serin']],[[4,5,'mina'],[3,7,'time'],[6,5,'rita'],[10,7,'yul'],[3,9,'haeun'],[12,7,'mina'],[6,3,'serin']]];
  for(let stage=0;stage<3;stage++){
    if(stage===0){await page.evaluate(()=>window.__TD_TEST__.beginStage(0));await page.click('#deploy');}
    const outcome=await page.evaluate(layout=>{
      const t=window.__TD_TEST__,g=t.game;
      const spend=()=>{for(const[x,y,type]of layout)if(!g.towers.some(t=>t.x===x+.5&&t.y===y+.5)){if(!g.build(type,x,y))return;}for(let l=1;l<3;l++)for(const a of g.towers.filter(a=>!['serin','time'].includes(a.type)))if(a.level===l&&!g.upgrade(a.id))return;};
      for(let wave=1;wave<=6;wave++){
        spend();g.startWave();
        for(let second=0;second<180&&g.state==='wave';second++){spend();if(g.enemies.some(e=>e.boss&&e.progress>5))g.activateRift();t.advance(1);}
        if(g.life<=0)break;
      }
      t.updateHUD();return {state:g.state,life:g.life};
    },layouts[stage]);
    assert.equal(outcome.state,'victory');assert.equal(outcome.life,20);
    assert.equal(await page.locator('#result-next').isVisible(),true);
    await page.click('#result-next');
    if(stage<2){assert.match(await page.locator('#modal-title').textContent(),new RegExp(stage===0?'침묵':'기억'));await page.click('#deploy');}
  }
  assert.match(await page.locator('#modal-title').textContent(),/LAST SIGNAL/);await page.click('#credits-home');
  assert.deepEqual(await page.evaluate(()=>window.PSY2050_TD.snapshot().progress),[3,3,3]);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('PASS: offline single file, UI purchases/upgrades/refunds/targeting, checkpoint restore, rift, pause, speed, mobile layout, 18-wave campaign UI progression, ending, zero external requests or browser errors.');
}finally{await browser.close();}
