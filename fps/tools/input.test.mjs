// Exercise the shipped app/input controller with real WASM and an in-memory DOM.
// No browser permission or physical mouse is needed to reproduce denied APIs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const binary=readFileSync(new URL('../../build/fps/game.wasm',import.meta.url));
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const worlds=readFileSync(new URL('../src/worlds.json',import.meta.url),'utf8');

async function boot(behavior){
  const {instance}=await WebAssembly.instantiate(binary,{env:{abort(){throw Error('WASM abort');}}});
  const handlers=()=>({listeners:new Map(),addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);},emit(type,event={}){for(const fn of this.listeners.get(type)||[])fn(event);}});
  const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,tagName:'DIV',hidden:true,textContent:'',value:'',dataset:{},style:{},classList:{toggle(){}},children:[],replaceChildren(){},append(){},getBoundingClientRect(){return {left:0,top:0,width:1280,height:800};},...handlers()});return elements.get(id);};
  const canvas=element('world'),document={...handlers(),getElementById:element,querySelector:()=>element('brand'),createTextNode:text=>text,createElement:()=>element('temporary'),pointerLockElement:null};
  document.exitPointerLock=()=>{document.pointerLockElement=null;document.emit('pointerlockchange');};
  element('wave-dots').children=Array.from({length:3},(_,i)=>element('wave-'+i));
  element('embedded-assets').textContent=JSON.stringify({mina:'',reina:'',time:''});element('embedded-worlds').textContent=worlds;element('embedded-wasm').textContent=binary.toString('base64');
  let rejectPending,requests=0;
  if(behavior!=='missing')canvas.requestPointerLock=()=>{
    requests++;
    if(behavior==='reject')return Promise.reject(Error('Pointer lock denied'));
    if(behavior==='throw')throw Error('Unsupported API');
    if(behavior==='event'){document.emit('pointerlockerror');return;}
    if(behavior==='pending')return new Promise((resolve,reject)=>{rejectPending=reject;});
    if(behavior==='silent')return;
    document.pointerLockElement=canvas;document.emit('pointerlockchange');return Promise.resolve();
  };
  const window={...handlers()},timers=new Map();let timerId=0,frame,time=0;
  class Renderer{constructor(){this.tracers=[];}setLevel(){}render(){}resize(){}blink(){}}
  const context=vm.createContext({document,window,localStorage:{getItem(){return null;},setItem(){}},location:{search:'?test=1'},matchMedia:()=>({matches:false}),FPSRenderer:Renderer,WebAssembly:{instantiate:async()=>({instance})},Float64Array,Uint8Array,URLSearchParams,atob:v=>Buffer.from(v,'base64').toString('binary'),setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(fn){frame=fn;}});
  vm.runInContext(app,context);await new Promise(resolve=>setImmediate(resolve));assert.ok(window.__FPS_TEST__,element('error-text').textContent);
  const game=window.__FPS_TEST__,snapshot=()=>window.PSY2050_FPS.snapshot();
  return {document,canvas,window,game,element,snapshot,get requests(){return requests;},async deploy(){element('play').onclick();element('deploy').onclick();await Promise.resolve();},tick(frames=1){for(let i=0;i<frames;i++){time+=1000/60;frame(time);}},expire(){const pending=[...timers.values()];timers.clear();for(const fn of pending)fn();},async reject(){rejectPending(Error('late denial'));await Promise.resolve();}};
}

for(const failure of ['missing','reject','throw','event','silent'])test(`pointer lock ${failure}: starts free-look combat instead of a retry loop`,async()=>{
  const app=await boot(failure);await app.deploy();if(failure==='silent')app.expire();
  assert.equal(app.snapshot().mode,'playing');assert.equal(app.snapshot().inputMode,'free');assert.equal(app.element('pause').hidden,true);assert.equal(app.element('error').hidden,true);assert.equal(app.element('free-look-help').hidden,false);
  const start=app.snapshot();app.window.emit('keydown',{target:app.canvas,code:'KeyW'});app.tick(20);app.window.emit('keyup',{code:'KeyW'});assert.ok(app.snapshot().player.z<start.player.z);
  app.document.emit('mousemove',{target:app.canvas,clientX:600,clientY:400});app.document.emit('mousemove',{target:app.canvas,clientX:650,clientY:420});assert.ok(app.snapshot().player.yaw>0);assert.ok(app.snapshot().player.pitch<0);
  app.document.emit('mousedown',{target:app.canvas,button:0});app.tick(15);app.document.emit('mouseup',{button:0});assert.ok(app.snapshot().shots>0);
  app.game.pause();const calls=app.requests;app.game.resume();assert.equal(app.requests,calls);assert.equal(app.snapshot().inputMode,'free');assert.equal(app.snapshot().mode,'playing');
});
test('free-look keeps turning at the edge, pauses on viewport exit and clears held fire',async()=>{
  const app=await boot('reject');await app.deploy();app.document.emit('mousemove',{target:app.canvas,clientX:1279,clientY:400});app.tick(30);assert.ok(app.snapshot().player.yaw>.5);
  app.document.emit('mousedown',{target:app.canvas,button:0});app.tick(2);app.document.emit('mouseleave');assert.equal(app.snapshot().mode,'pause');const elapsed=app.game.sim[19];app.tick(30);assert.equal(app.game.sim[19],elapsed);
  app.game.resume();const shots=app.snapshot().shots;app.tick(20);assert.equal(app.snapshot().shots,shots);const yaw=app.snapshot().player.yaw;app.tick(20);assert.equal(app.snapshot().player.yaw,yaw);
});
test('working pointer lock retains normal FPS input and pauses on escape/unlock',async()=>{
  const app=await boot('success');await app.deploy();assert.equal(app.snapshot().inputMode,'locked');assert.equal(app.snapshot().locked,true);
  app.document.emit('mousemove',{movementX:20,movementY:10});assert.ok(app.snapshot().player.yaw>0);app.document.exitPointerLock();assert.equal(app.snapshot().mode,'pause');
  app.game.resume();assert.equal(app.snapshot().locked,true);assert.equal(app.snapshot().inputMode,'locked');
});
test('an unfinished request freezes combat; a late rejection cannot resume a paused game',async()=>{
  const app=await boot('pending');await app.deploy();assert.equal(app.snapshot().inputMode,'pending');app.tick(60);assert.equal(app.game.sim[19],0);
  app.game.pause();await app.reject();app.expire();assert.equal(app.snapshot().mode,'pause');assert.equal(app.snapshot().inputMode,'idle');assert.equal(app.element('pause').hidden,false);
});

test('E previews and releases teleport; pausing cancels held teleport instead of committing later',async()=>{
  const app=await boot('reject');await app.deploy();app.game.engine.look(0,-.3);
  app.window.emit('keydown',{target:app.canvas,code:'KeyE'});app.tick(2);assert.equal(app.snapshot().teleport.preview,true);assert.equal(app.snapshot().teleport.valid,true);assert.equal(app.snapshot().player.z,14);
  const target=app.snapshot().teleport.z;app.window.emit('keyup',{code:'KeyE'});app.tick(2);assert.equal(app.snapshot().teleport.count,1);assert.ok(Math.abs(app.snapshot().player.z-target)<1e-9);
  app.window.emit('keydown',{target:app.canvas,code:'KeyE'});app.tick();app.game.pause();app.window.emit('keyup',{code:'KeyE'});app.game.resume();app.tick(60);assert.equal(app.snapshot().teleport.count,1);assert.equal(app.snapshot().teleport.preview,false);
});
test('secondary mouse charges then casts on release; held R meditates and suppresses primary',async()=>{
  const app=await boot('reject');await app.deploy();app.document.emit('mousedown',{target:app.canvas,button:2});app.tick(45);assert.ok(app.snapshot().player.charge>.5);assert.equal(app.snapshot().shots,0);
  app.document.emit('mouseup',{button:2});app.tick();assert.equal(app.snapshot().shots,1);assert.equal(app.game.sim[53],1);assert.equal(app.snapshot().player.charge,0);
  app.document.emit('mousedown',{target:app.canvas,button:0});app.window.emit('keydown',{target:app.canvas,code:'KeyR'});app.tick(20);assert.equal(app.snapshot().shots,1);assert.equal(app.game.sim[50],1);assert.equal(app.snapshot().player.mana,100);
  app.window.emit('keyup',{code:'KeyR'});app.tick(12);assert.ok(app.snapshot().shots>1);
});
test('pause discards charged spells until a fresh secondary press',async()=>{
  const app=await boot('reject');await app.deploy();app.document.emit('mousedown',{target:app.canvas,button:2});app.tick(40);app.game.pause();app.document.emit('mouseup',{button:2});app.game.resume();app.tick(20);assert.equal(app.snapshot().shots,0);assert.equal(app.snapshot().player.charge,0);
});
