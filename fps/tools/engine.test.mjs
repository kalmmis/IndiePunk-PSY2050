import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const binary=readFileSync(new URL('../../build/fps/game.wasm',import.meta.url));
const worlds=JSON.parse(readFileSync(new URL('../src/worlds.json',import.meta.url)));
async function game(level=0){const {instance}=await WebAssembly.instantiate(binary,{env:{abort(){throw new Error('WASM abort');}}});const e=instance.exports;e.reset(level,2050,0);return {e,s:new Float64Array(e.memory.buffer,e.statePointer(),54),a:new Float64Array(e.memory.buffer,e.entityPointer(),e.capacity()*16)};}
function step(g,seconds,mask=0){for(let i=0;i<Math.round(seconds*60);i++)g.e.step(1/60,mask);}
function aim(g,x,y,z){const dx=x-g.s[0],dy=y-(g.s[1]+1.65),dz=z-g.s[2];const yaw=Math.atan2(dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));g.e.look(yaw-g.s[3],pitch-g.s[4]);}

test('standalone binary is actual WASM with its own memory and simulation exports',async()=>{const g=await game();assert.ok(g.e.memory instanceof WebAssembly.Memory);for(const key of ['reset','step','look','spawnEnemy'])assert.equal(typeof g.e[key],'function');assert.equal(g.e.startReload,undefined);assert.deepEqual([...g.s.slice(0,7)],[0,0,14,0,0,100,100]);assert.equal(g.s[27],50);});
test('FPS movement follows camera yaw; diagonals are normalized',async()=>{const a=await game(),b=await game();step(a,1,1);step(b,1,1|8);assert.ok(Math.abs(14-a.s[2]-5.2)<1e-6);assert.ok(Math.abs(Math.hypot(b.s[0],14-b.s[2])-5.2)<1e-6);const c=await game();c.e.look(Math.PI/2,100);assert.equal(c.s[4],1.35);step(c,1,1);assert.ok(Math.abs(c.s[0]-5.2)<1e-6);});
test('solid cover and arena walls stop walking without tunnelling',async()=>{const g=await game();g.e.look(-Math.PI/2,0);step(g,7/5.2,1);g.e.look(Math.PI/2,0);step(g,2.5,1|16);const box=worlds[0].covers[0];assert.ok(g.s[2]>=box[1]+box[3]/2+.34,`cover collision: ${g.s[2]}`);g.e.look(Math.PI,0);step(g,6,1|16);assert.ok(g.s[2]<=16.9);});
test('jump uses gravity and lands',async()=>{const g=await game();g.e.step(1/60,32);assert.ok(g.s[1]>0);step(g,1);assert.equal(g.s[1],0);assert.equal(g.s[39],1);});
test('teleport previews a ground destination and crosses solid cover instantly on release',async()=>{
  const g=await game();aim(g,-7,0,0);g.e.step(1/60,256);assert.equal(g.s[44],1);assert.equal(g.s[43],1);assert.ok(Math.abs(g.s[40]+7)<1e-9);assert.ok(Math.abs(g.s[42])<1e-9);assert.equal(g.s[0],0);assert.equal(g.s[2],14);
  // The direct route passes through the cover centered at (-7, 5).
  g.e.step(1/60,512);assert.ok(Math.abs(g.s[0]+7)<1e-9);assert.ok(Math.abs(g.s[2])<1e-9);assert.equal(g.s[45],1);assert.equal(g.s[44],0);assert.equal(g.s[46],0);assert.equal(g.s[47],14);assert.ok(g.s[28]>.7);assert.ok(g.s[38]>=.35);
  aim(g,0,0,5);g.e.step(1/60,512);assert.equal(g.s[45],1);assert.equal(g.s[48],1);step(g,.8);g.e.step(1/60,512);assert.equal(g.s[45],2);assert.ok(Math.abs(g.s[2]-5)<1e-9);assert.equal(g.s[6],100);
});
test('teleport rejects horizon, blocked ground, outside arena and out-of-range destinations',async()=>{
  const g=await game();g.e.step(1/60,256|512);assert.equal(g.s[48],2);
  for(const [x,z,reason] of [[0,-4,4],[30,14,4],[0,-43,3]]){aim(g,x,0,z);g.e.step(1/60,256|512);assert.equal(g.s[43],0);assert.equal(g.s[48],reason);assert.equal(g.s[45],0);assert.equal(g.s[28],0);assert.equal(g.s[0],0);assert.equal(g.s[2],14);}
});
test('magic has travel time, consumes mana, damages the nearest target and awards a kill',async()=>{
  const g=await game();const near=g.e.spawnEnemy(0,1.65,8,0),far=g.e.spawnEnemy(0,1.65,5,0);g.e.step(1/60,64);assert.equal(g.s[6],96);assert.equal(g.s[17],0);assert.ok(g.a.some((v,i)=>i%16===0&&v===6));step(g,.12);assert.equal(g.s[17],1);assert.ok(g.a[near*16+7]<76);assert.equal(g.a[far*16+7],76);
  for(let i=0;i<5&&g.a[near*16]===1;i++){step(g,.18);aim(g,g.a[near*16+1],g.a[near*16+2],g.a[near*16+3]);g.e.step(1/60,64);step(g,.15);}
  assert.notEqual(g.a[near*16],1);assert.equal(g.s[14],1);assert.ok(g.s[13]>=150);
});
test('cover stops traveling spells and vertical aim can miss',async()=>{const g=await game();const n=g.e.spawnEnemy(0,1.65,-10,0);g.e.step(1/60,64);step(g,.6);assert.equal(g.s[17],0);assert.equal(g.a[n*16+7],76);assert.ok(g.s[26]>-4&&g.s[26]<0);const h=await game();const t=h.e.spawnEnemy(0,1.65,8,0);h.e.look(0,1);h.e.step(1/60,64);step(h,.5);assert.equal(h.a[t*16+7],76);});
test('mana regenerates, meditation restores faster and suppresses casting; idle never banks casts',async()=>{
  const passive=await game(),meditate=await game();for(const g of [passive,meditate])step(g,.8,64);const mana=passive.s[6],shots=meditate.s[16];assert.ok(mana<100);
  step(passive,.1);step(meditate,.1,4096|64);assert.ok(meditate.s[6]>passive.s[6]);assert.equal(meditate.s[16],shots);assert.equal(meditate.s[50],1);step(passive,1);assert.equal(passive.s[6],100);const before=passive.s[16];passive.e.step(1/60,64);assert.equal(passive.s[16],before+1);
});
test('held secondary charges without firing and releases a stronger, slower resonance spell',async()=>{
  const g=await game();step(g,1.2,1024|64);assert.equal(g.s[16],0);assert.equal(g.s[7],1);assert.equal(g.s[6],100);g.e.step(1/60,2048);assert.equal(g.s[49],2);assert.equal(g.s[53],1);assert.equal(g.s[6],82);assert.equal(g.s[7],0);
  const n=g.a.findIndex((v,i)=>i%16===0&&v===6);assert.ok(n>=0);assert.equal(g.a[n+7],136);assert.equal(g.a[n+10],1);assert.ok(Math.abs(g.a[n+6]+38)<1e-9);
  const short=await game();step(short,.1,1024);short.e.step(1/60,2048);assert.equal(short.s[16],0);
});
test('player spell travel stays at full speed during time dilation',async()=>{
  const normal=await game(),slow=await game();normal.e.step(1/60,64);slow.e.step(1/60,64|128);step(normal,.1);step(slow,.1,128);const z=g=>{const n=g.a.findIndex((v,i)=>i%16===0&&v===6);return g.a[n+3];};assert.equal(z(normal),z(slow));
});
test('time dilation slows enemies, preserves movement, drains and recovers energy',async()=>{const normal=await game(),slow=await game();const n=normal.e.spawnEnemy(8,2,0,0),s=slow.e.spawnEnemy(8,2,0,0);step(normal,1,1);step(slow,1,1|128);assert.equal(slow.s[9],.28);assert.ok(Math.abs(normal.s[2]-slow.s[2])<1e-6);assert.ok(Math.abs(slow.a[s*16+11]/normal.a[n*16+11]-.28)<1e-6);assert.ok(slow.s[8]<77);step(slow,4,128);assert.equal(slow.s[34],1);assert.equal(slow.s[9],1);step(slow,1);assert.equal(slow.s[34],0);assert.ok(slow.s[8]>=20);});
test('enemy projectiles damage shields before health; death stops simulation',async()=>{const g=await game();g.e.spawnEnemy(0,1.7,10,1);step(g,10);assert.ok(g.s[18]>0);assert.ok(g.s[27]<50);step(g,50);assert.equal(g.s[12],2);assert.equal(g.s[5],0);const time=g.s[19];step(g,1,1|64);assert.equal(g.s[19],time);});
test('all campaign maps spawn waves and the final boss has three health phases',async()=>{for(let stage=0;stage<3;stage++){const g=await game(stage);step(g,1.6);assert.equal(g.s[11],1);assert.equal(g.s[15],4+stage);}const g=await game(2),n=g.e.spawnEnemy(0,2,6,2)*16;assert.equal(g.s[21],1000);for(let phase=1;phase<=3;phase++){g.a[n+7]=phase===1?900:phase===2?600:250;g.e.step(1/60,0);assert.equal(g.s[32],phase);}aim(g,g.a[n+1],g.a[n+2],g.a[n+3]);g.a[n+7]=20;g.e.step(1/60,64);step(g,.2);assert.equal(g.s[20],0);assert.notEqual(g.a[n],5);assert.equal(g.s[13],2000);});
test('a moving player can complete all nine waves and the boss using only normal inputs',async()=>{
  const g=await game(),route=[[-14,14],[-14,-21],[14,-21],[14,14]],phases=new Set();
  for(let stage=0;stage<3;stage++){
    g.e.reset(stage,2050,stage?1:0);let waypoint=0,slow=false;
    for(let frame=0;frame<120*60&&g.s[12]===0;frame++){
      let target=-1,distance=Infinity;
      for(let n=0;n<g.a.length;n+=16)if(g.a[n]===1||g.a[n]===5){const d=Math.hypot(g.a[n+1]-g.s[0],g.a[n+3]-g.s[2]);if(d<distance){distance=d;target=n;}}
      if(target>=0)aim(g,g.a[target+1],g.a[target+2],g.a[target+3]);
      let [tx,tz]=route[waypoint];if(Math.hypot(tx-g.s[0],tz-g.s[2])<.7){waypoint=(waypoint+1)%route.length;[tx,tz]=route[waypoint];}
      const dx=tx-g.s[0],dz=tz-g.s[2],length=Math.hypot(dx,dz)||1,forward=(dx*Math.sin(g.s[3])-dz*Math.cos(g.s[3]))/length,side=(dx*Math.cos(g.s[3])+dz*Math.sin(g.s[3]))/length;
      let mask=target>=0?64:0;if(forward>.38)mask|=1;if(forward<-.38)mask|=2;if(side>.38)mask|=8;if(side<-.38)mask|=4;
      if(g.s[8]<10)slow=false;if(g.s[8]>90)slow=true;if(slow&&target>=0)mask|=128;
      g.e.step(1/60,mask);if(g.s[32]>0)phases.add(g.s[32]);
    }
    assert.equal(g.s[12],1,`sector ${stage+1} did not clear`);assert.equal(g.s[11],3);assert.ok(g.s[5]>0);
  }
  assert.equal(g.s[14],49);assert.ok(g.s[13]>=9000);assert.deepEqual([...phases],[1,2,3,4]);
});
test('packaged HTML embeds its binary and all runtime assets; test hooks are opt-in',()=>{const html=readFileSync(new URL('../../build/fps/index.html',import.meta.url),'utf8');assert.ok(!/\/\*__[A-Z]+__\*\//.test(html));assert.ok(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/.test(html));assert.ok(html.includes(binary.toString('base64')));assert.match(html,/get\('test'\)==='1'/);assert.equal(worlds.length,3);for(const world of worlds){assert.ok(world.covers.length>=5);assert.ok(world.spawns.length>=5);}});
