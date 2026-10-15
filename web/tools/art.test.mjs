import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(path.join(root,'Assets/ArtRemaster/manifest.json')));
const html=readFileSync(path.join(root,'build/wasm/index.html'),'utf8');
const embedded=JSON.parse(html.match(/<script id="embedded-assets" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const original=JSON.parse(readFileSync(path.join(root,'web/.generated/assets.json')));
test('every image in the playable port is replaced by a saved remastered asset',()=>{
 const keys=Object.keys(original).filter(k=>original[k].startsWith('data:image/'));
 assert.equal(keys.length,32);
 for(const key of keys){assert.ok(manifest.assets[key],key);assert.ok(existsSync(path.join(root,manifest.assets[key])));assert.notEqual(embedded[key],original[key],key);}
 assert.equal(Object.keys(manifest.assets).length,42);
});
test('all animation frames, color-state portraits and VFX are present',()=>{
 const keys=[...Array.from({length:7},(_,i)=>'player'+i),...Array.from({length:3},(_,i)=>'boss'+i),...Array.from({length:3},(_,i)=>'explosion'+i),'portrait_player_gray','portrait_fire_gray','portrait_time_gray','shield','muzzle','engine_flare','enemyC','enemyD'];
 for(const key of keys){assert.ok(embedded[key]?.startsWith('data:image/'),key);assert.ok(existsSync(path.join(root,manifest.assets[key])),key);}
 assert.equal(Object.keys(manifest.supplemental).length,6);
});
test('credits retain the original authors and remove the recruiting placeholder',()=>{
 const credit=Buffer.from(embedded.Credit.split(',')[1],'base64').toString();
 for(const name of ['Hhan87','kalmis','roue'])assert.ok(credit.includes(name));
 assert.ok(credit.includes('AI-assisted'));assert.ok(!credit.includes('모집중'));assert.ok(!credit.includes('<image'));
});
test('the packaged image payloads exactly match the current remaster build',()=>{
 const expected=JSON.parse(readFileSync(path.join(root,'web/.generated/remaster-assets.json')));
 for(const [key,value] of Object.entries(expected))assert.equal(embedded[key],value,key);
});

const originalHTML=readFileSync(path.join(root,'build/wasm/original.html'),'utf8');
const originalEmbedded=JSON.parse(originalHTML.match(/<script id="embedded-assets" type="application\/json">([\s\S]*?)<\/script>/)[1]);
test('the standalone original edition retains every original asset without remaster overrides',()=>{
 assert.deepEqual(originalEmbedded,original);
 assert.ok(originalHTML.includes('const GAME_EDITION="original"'));
 assert.ok(html.includes('const GAME_EDITION="remastered"'));
});
test('both editions embed the same complete simulation and story data',()=>{
 for(const marker of ['const WASM_BASE64="','<script id="embedded-data" type="application/json">']){
  const end=marker.startsWith('const')?'";':'</script>';
  const body=text=>text.split(marker)[1].split(end)[0];
  assert.ok(body(originalHTML).length>0);
  assert.equal(body(originalHTML),body(html));
 }
});
