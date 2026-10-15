'use strict';
(() => {
const $=id=>document.getElementById(id);
const remastered=GAME_EDITION==='remastered';
const storageKey=key=>remastered?key:key.replace(/^psy2050-/,'psy2050-original-');
const assets=JSON.parse($('embedded-assets').textContent);
const data=JSON.parse($('embedded-data').textContent);
const images={};
const canvas=$('canvas'), ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
const WORLD_HEIGHT=32.69767, UNIT=800/WORLD_HEIGHT, TOP=23.348835;
const wx=x=>240+x*UNIT, wy=y=>(TOP-y)*UNIT;
const keys=new Set();
let engine, sim, actors, beams, mode='loading', paused=false, dead=false, dialogue=null;
let stage=1, rowIndex=0, wait=0, nextStage=999, waitingBoss=false, stageElapsed=0;
let pointer={active:false,x:0,y:-5}, lastStamp=0, accumulator=0, bgOffset=0;
let announceTimer=0, splashTimer=0, deathDelay=0, creditTimer=0, settingsOpen=false;
let confirmation=null, lastShot=0, lastHit=0, lastDeath=0;
const book=new Map();
for(let i=0;i<data.dialogue.length;i++){
 const r=data.dialogue[i]; if(r[0])book.set(r[0].trim(),i);
 if(r[1]==='event'&&r[2]==='route')book.set(r[3],i);
 if(r[1]?.startsWith('select')&&r[2]==='end')book.set(r[1],i);
}
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(storageKey(key)))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(storageKey(key),JSON.stringify(value));}catch{}}};
let savedStage=storage.get('psy2050-stage',null);
if(!data.levels[savedStage])savedStage=null;
let volumes=storage.get('psy2050-sound',{music:.45,effects:.6,muted:false});
volumes={music:Math.max(0,Math.min(1,Number(volumes?.music)||0)),effects:Math.max(0,Math.min(1,Number(volumes?.effects)||0)),muted:!!volumes?.muted};
let audioContext, musicGain, effectsGain, musicSource;
const audioBuffers=new Map();
function show(id,visible){$(id).hidden=!visible;}
function resetInput(){pointer.active=false;keys.clear();engine?.release();}
function updateVolume(){if(musicGain){musicGain.gain.value=volumes.muted?0:volumes.music;effectsGain.gain.value=volumes.muted?0:volumes.effects;}$('sound-button').textContent=volumes.muted?'×':'♪';$('sound-button').setAttribute('aria-label',volumes.muted?'소리 켜기':'소리 끄기');$('sound-button').setAttribute('aria-pressed',String(volumes.muted));storage.set('psy2050-sound',volumes);}
async function audioInit(){
 if(!audioContext){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioContext=new Audio();musicGain=audioContext.createGain();effectsGain=audioContext.createGain();musicGain.connect(audioContext.destination);effectsGain.connect(audioContext.destination);updateVolume();
  for(const [name,uri] of Object.entries(assets))if(uri.startsWith('data:audio/')){
   const bytes=Uint8Array.from(atob(uri.split(',')[1]),c=>c.charCodeAt(0));
   audioBuffers.set(name,audioContext.decodeAudioData(bytes.buffer).catch(()=>null));
  }
 }
 if(audioContext.state==='suspended')await audioContext.resume();
 if(!musicSource){
  const buffer=await audioBuffers.get('bgm_Chrono_Storm_loopable');
  if(buffer&&!musicSource){musicSource=audioContext.createBufferSource();musicSource.buffer=buffer;musicSource.loop=true;musicSource.connect(musicGain);musicSource.start();}
 }
}
async function sound(name,volume=1){
 if(!audioContext||volumes.muted||volumes.effects===0)return;
 const key=Object.keys(assets).find(k=>k.toLowerCase()===name.toLowerCase());
 const buffer=await audioBuffers.get(key);if(!buffer)return;
 const s=audioContext.createBufferSource(),g=audioContext.createGain();s.buffer=buffer;g.gain.value=volume;s.connect(g);g.connect(effectsGain);s.start();
}
function click(){sound('Click_Electronic_02',.6);}
function resize(){let scale=Math.min(innerWidth/480,innerHeight/800,1);document.documentElement.style.setProperty('--ui-scale',scale);}
window.addEventListener('resize',resize);resize();
function refreshMemory(){sim=new Float64Array(engine.memory.buffer,engine.statePointer(),20);actors=new Float64Array(engine.memory.buffer,engine.actorPointer(),engine.capacity()*12);beams=new Float64Array(engine.memory.buffer,engine.beamPointer(),24);}
function clearLayers(){for(const id of ['loading','splash','menu','hud','dialogue','pause','death','settings','credits','confirm'])show(id,false);}
function title(){
 resetInput();clearLayers();mode='menu';paused=false;dead=false;dialogue=null;settingsOpen=false;confirmation=null;show('menu',true);
 savedStage=storage.get('psy2050-stage',null);show('continue-button',!!data.levels[savedStage]);$('continue-button').textContent=`이어하기 · Stage ${savedStage}`;
}
function confirm(message,action){resetInput();confirmation=action;$('confirm-message').textContent=message;show('confirm',true);}
function stageStart(n,reset=true){
 if(!data.levels[n]){title();return;}
 clearLayers();mode='playing';paused=false;dead=false;dialogue=null;settingsOpen=false;waitingBoss=false;confirmation=null;resetInput();
 if(reset){engine.reset((Date.now()&0x7fffffff)||2050);refreshMemory();}
 stage=n;rowIndex=0;wait=Number(data.levels[n][0][0]||1)+2;nextStage=999;stageElapsed=0;announceTimer=4;deathDelay=0;
 show('hud',true);show('boss-hud',false);$('stage-label').textContent=n===10?'Epilogue':`Stage ${n}`;$('stage-announcement').textContent=n===10?'Epilogue':`Stage ${n}`;
 storage.set('psy2050-stage',n);lastShot=sim[14];lastHit=sim[15];lastDeath=sim[16];
}
function nextRow(){rowIndex++;const r=data.levels[stage][rowIndex];if(r)wait=Number(r[0]||1)+2;}
function stageStep(dt){
 if(waitingBoss){if(!sim[11])return;waitingBoss=false;nextRow();}
 const rows=data.levels[stage];
 if(rowIndex>=rows.length){
  if(nextStage===999){storage.set('psy2050-stage',null);credits();}else stageStart(nextStage);
  return;
 }
 wait-=dt;if(wait>0)return;
 const r=rows[rowIndex],command=(r[1]||'').trim();
 if(command.startsWith('load')){
  let label=command.split('=')[1].trim();if(label.includes('Boss'))label+=sim[17]?'1':'0';
  nextRow();startDialogue(label);return;
 }
 if(command.startsWith('boss=')){
  const action=command.split('|')[1];
  if(action==='inactivated')engine.setBoss(0);
  else if(action==='destroy')engine.setBoss(2);
  else{engine.setBoss(1);waitingBoss=true;return;}
 }else{
  // Unity iterates the spreadsheet from right to left, bottom to top.
  for(let i=r.length-1;i>0;i-=2){const code=r[i]?.trim();if(!code||!r[i-1])continue;engine.spawnEnemy((Number(r[i-1])-216)/24,code.charCodeAt(0)-65,code.charCodeAt(1)-65,code.charCodeAt(2)-65,Number(code.slice(4,7))/60);}
 }
 nextRow();
}
function setPortrait(side,name){side=side==='left'?'left':'right';const el=$(`portrait-${side}`);if(name==='empty'||!images[name]){el.removeAttribute('src');el.hidden=true;}else{el.src=assets[name];el.hidden=false;el.alt=name.includes('player')?'미나':name.includes('fire')?'레이나':'시간의 소녀';}}
function startDialogue(label){
 if(!book.has(label)){throw new Error(`원본 대사를 찾을 수 없습니다: ${label}`);}
 resetInput();dialogue={index:book.get(label),text:'',shown:0,timer:0,choices:false};setPortrait('left','empty');setPortrait('right','empty');show('dialogue',true);advanceDialogue(true);
}
function endDialogue(){dialogue=null;show('dialogue',false);$('choices').replaceChildren();resetInput();}
function advanceDialogue(force=false){
 if(!dialogue||dialogue.choices||paused||settingsOpen||confirmation)return;
 if(!force&&dialogue.shown<dialogue.text.length){dialogue.shown=dialogue.text.length;$('dialogue-text').textContent=dialogue.text;return;}
 for(let guard=0;guard<1000;guard++){
  const r=data.dialogue[dialogue.index++];if(!r){endDialogue();return;}
  if(r[1]==='event'){
   const cmd=r[2]||'',arg=r[3]||'';
   if(cmd==='end'){endDialogue();return;}
   if(cmd.startsWith('show '))setPortrait(arg,cmd.slice(5));
   else if(cmd==='play_se')sound(arg,.65);
   else if(cmd==='nextStage'&&nextStage===999)nextStage=Number(arg); // Preserve a branch decision before the generic stage-end default.
   else if(cmd==='move'){const i=book.get(arg);if(i!==undefined)dialogue.index=i;}
  }else if(r[1]==='l'){
   $('speaker').textContent=r[2]||'';show('speaker',!!r[2]);dialogue.text=(r[3]||'').replaceAll('$',',').replaceAll(';','\n');dialogue.shown=0;dialogue.timer=0;$('dialogue-text').textContent='';return;
  }else if(r[1]?.startsWith('select')&&r[2]!=='end'){
   const group=r[1],end=book.get(group),choices=[];
   while(dialogue.index-1<=end){const choice=data.dialogue[dialogue.index-1];if(choice[1]===group&&choice[2]!=='end')choices.push(choice);dialogue.index++;}
   dialogue.choices=true;
   $('choices').replaceChildren(...choices.map(choice=>{const b=document.createElement('button');b.className='sf';b.textContent=choice[2];b.onclick=()=>{dialogue.choices=false;dialogue.index=book.get(choice[3]);$('choices').replaceChildren();advanceDialogue(true);};return b;}));return;
  }
 }
 throw new Error('대화 처리 한도를 넘었습니다.');
}
function skipDialogue(){
 if(!dialogue||dialogue.choices)return;
 // Execute remaining events, including nextStage, without losing story routing.
 for(let i=0;i<1000&&dialogue;i++){dialogue.shown=dialogue.text.length;advanceDialogue(true);}
}
function pauseToggle(){if(mode!=='playing'||dead||settingsOpen||confirmation)return;paused=!paused;resetInput();show('pause',paused);}
function settings(){resetInput();settingsOpen=true;$('music-volume').value=volumes.music;$('effects-volume').value=volumes.effects;show('settings',true);}
function credits(){resetInput();clearLayers();mode='credits';dialogue=null;creditTimer=0;show('credits',true);const scroll=$('credits-scroll');scroll.classList.remove('running');void scroll.offsetWidth;scroll.classList.add('running');}
function drawSprite(name,x,y,w,h,alpha=1,rotation=0){const img=images[name];if(!img)return;ctx.save();ctx.translate(x,y);if(rotation)ctx.rotate(rotation);ctx.globalAlpha=alpha;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();}
// Preserve the renderer used before the art remaster; simulation stays shared.
function renderOriginalScene(){
 for(let n=0;n<actors.length;n+=12){
  const kind=actors[n];if(!kind)continue;
  const x=wx(actors[n+1]),y=wy(actors[n+2]);
  if(kind===1)drawSprite(actors[n+5]===0?'enemyA':'enemyB',x,y,2.048*UNIT,2.048*UNIT);
  if(kind===2)drawSprite('shot',x,y,2.56*UNIT,2.56*UNIT);
  if(kind===3)drawSprite(actors[n+5]===1?'bulletB':'bulletA',x,y,(actors[n+5]===1?.45:2.56)*UNIT,(actors[n+5]===1?1.1:2.56)*UNIT,1,Math.atan2(actors[n+3],actors[n+4]));
  if(kind===4){
   const t=actors[n+11]/.65,r=(.5+t*3)*UNIT;
   ctx.save();ctx.globalCompositeOperation='lighter';
   const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,245,210,${1-t})`);g.addColorStop(.25,`rgba(255,153,50,${1-t})`);g.addColorStop(1,'rgba(255,30,0,0)');
   ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();
  }
  if(kind===5){const w=actors[n+6]*UNIT;ctx.save();ctx.shadowColor='#ff6025';ctx.shadowBlur=15;ctx.fillStyle='#ff9d32';ctx.fillRect(x,y-.35*UNIT,w,.7*UNIT);ctx.fillStyle='#ffe5a4';ctx.fillRect(x,y-.13*UNIT,w,.26*UNIT);ctx.restore();}
 }
 if(sim[10])drawSprite(`boss${Math.floor(sim[5]*12)%3}`,wx(sim[6]),wy(sim[7]),5.95*UNIT,5.46*UNIT);
 for(let i=0;i<4;i++){
  const b=i*6;if(!beams[b])continue;
  const x=wx(beams[b+1]),y=wy(beams[b+2]),a=-beams[b+3],length=beams[b+4]*UNIT,width=beams[b+5]*UNIT;
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,-width,0,width);g.addColorStop(0,'#ff1e0000');g.addColorStop(.3,'#ff4b03aa');g.addColorStop(.48,'#ffffd9');g.addColorStop(.52,'#ffffd9');g.addColorStop(.7,'#ff4b03aa');g.addColorStop(1,'#ff1e0000');
  ctx.fillStyle=g;ctx.fillRect(0,-width,length,width*2);
  if(images.beam){ctx.rotate(Math.PI/2);ctx.drawImage(images.beam,-2.25*UNIT,-length,4.5*UNIT,length);}
  ctx.restore();
 }
 if(sim[2]){
  const firing=pointer.active||keys.has('Space')||keys.has('KeyZ');
  const f=firing?4+Math.floor(sim[5]*12)%3:Math.floor(sim[5]*12)%4;
  const x=wx(sim[0]),y=wy(sim[1]);
  drawSprite(`player${f}`,x,y,2.325*UNIT,3.65*UNIT,sim[12]>0&&Math.floor(performance.now()/80)%2?.4:1);
  if(firing){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y-1.1*UNIT,0,x,y-1.1*UNIT,18);g.addColorStop(0,'#e9faffbb');g.addColorStop(1,'#47cfff00');ctx.fillStyle=g;ctx.fillRect(x-18,y-1.1*UNIT-18,36,36);ctx.restore();}
 }
}
function render(){
 ctx.fillStyle='#000';ctx.fillRect(0,0,480,800);
 if(mode!=='playing')return;
 const bh=1024*UNIT/100*2; // two original 2048 textures at their scene scale
 for(let i=-1;i<3;i++){
  const index=((i+Math.floor(bgOffset/bh))%2+2)%2;
  const img=images[`background${index+1}`];if(img)ctx.drawImage(img,(480-bh)/2,i*bh+(bgOffset%bh),bh,bh);
 }
 if(!remastered){renderOriginalScene();}else{
 // Fine rain and a restrained vignette keep the city alive without hiding bullets.
 ctx.save();ctx.strokeStyle='#a3c9e2';ctx.globalAlpha=.09;ctx.lineWidth=.7;
 for(let i=0;i<26;i++){const x=(i*137.3+sim[5]*7)%500,y=(i*83.7+sim[5]*210)%850;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+15);ctx.stroke();}
 ctx.restore();
 const shade=ctx.createLinearGradient(0,0,480,0);shade.addColorStop(0,'#04091766');shade.addColorStop(.24,'#04091700');shade.addColorStop(.76,'#04091700');shade.addColorStop(1,'#04091766');ctx.fillStyle=shade;ctx.fillRect(0,0,480,800);
 for(let n=0;n<actors.length;n+=12){
  const kind=actors[n];if(!kind)continue;
  const x=wx(actors[n+1]),y=wy(actors[n+2]);
  if(kind===1)drawSprite(['enemyA','enemyB','enemyC','enemyD'][actors[n+5]]||'enemyA',x,y,2.7*UNIT,2.7*UNIT);
  if(kind===2)drawSprite('shot',x,y,1.3*UNIT,1.9*UNIT);
  if(kind===3)drawSprite(actors[n+5]===1?'bulletB':'bulletA',x,y,(actors[n+5]===1?.65:1.3)*UNIT,(actors[n+5]===1?1.5:1.3)*UNIT,1,Math.atan2(actors[n+3],actors[n+4]));
  if(kind===4){const t=actors[n+11]/.65,size=(1.5+t*3.5)*UNIT;drawSprite('explosion'+Math.min(2,Math.floor(t*3)),x,y,size,size,Math.max(0,1-t*.8));}
  if(kind===5){const w=actors[n+6]*UNIT;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2);ctx.globalCompositeOperation='lighter';ctx.drawImage(images.beam,-.8*UNIT,-w,1.6*UNIT,w);ctx.restore();}
 }
 if(sim[10])drawSprite(`boss${Math.floor(sim[5]*8)%3}`,wx(sim[6]),wy(sim[7]),6.5*UNIT,6.5*UNIT);
 for(let i=0;i<4;i++){
  const b=i*6;if(!beams[b])continue;
  const x=wx(beams[b+1]),y=wy(beams[b+2]),a=-beams[b+3],length=beams[b+4]*UNIT,width=beams[b+5]*UNIT;
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,-width,0,width);g.addColorStop(0,'#ff1e0000');g.addColorStop(.3,'#ff4b03aa');g.addColorStop(.48,'#ffffd9');g.addColorStop(.52,'#ffffd9');g.addColorStop(.7,'#ff4b03aa');g.addColorStop(1,'#ff1e0000');
  ctx.fillStyle=g;ctx.fillRect(0,-width,length,width*2);
  if(images.beam){ctx.rotate(Math.PI/2);ctx.drawImage(images.beam,-width*1.5,-length,width*3,length);}
  ctx.restore();
 }
 if(sim[2]){
  const firing=pointer.active||keys.has('Space')||keys.has('KeyZ');
  const f=firing?4+Math.floor(sim[5]*12)%3:Math.floor(sim[5]*12)%4;
  const x=wx(sim[0]),y=wy(sim[1]);
  drawSprite('engine_flare',x,y+1.65*UNIT,1.4*UNIT,2.4*UNIT,.42);
  if(sim[12]>0)drawSprite('shield',x,y,4.6*UNIT,4.6*UNIT,.5+.12*Math.sin(sim[5]*6));
  drawSprite(`player${f}`,x,y,4.15*UNIT,4.15*UNIT,sim[12]>0&&Math.floor(performance.now()/80)%2?.5:1);
  if(firing){drawSprite('muzzle',x,y-1.1*UNIT,1.25*UNIT,1.25*UNIT,.6);ctx.beginPath();ctx.arc(x,y,2.3,0,Math.PI*2);ctx.fillStyle='#edffff';ctx.fill();ctx.strokeStyle='#75dce7';ctx.lineWidth=1;ctx.stroke();}
 }
 }
 const bossActive=sim[10]===2&&!sim[11];show('boss-hud',bossActive);$('boss-health').style.width=`${Math.max(0,Math.min(100,sim[8]/600*100))}%`;$('phase-label').textContent=`${Math.min(3,sim[9])} / 3`;
 const slow=sim[3]<.999||sim[18]>0;show('time-hud',slow);$('time-scale').textContent=`${Math.round(sim[3]*100)}%`;$('time-meter').style.width=`${(sim[4]-1)/3*100}%`;
 $('stage-announcement').style.opacity=announceTimer>0&&!dialogue?'1':'0';
}
function update(dt){
 if(mode==='splash'){splashTimer+=dt;if(splashTimer>2.5)title();}
 if(mode==='credits'){creditTimer+=dt;if(creditTimer>36)title();}
 if(mode!=='playing')return;
 if(dialogue&&!paused&&!settingsOpen&&!confirmation){dialogue.timer+=dt;const count=Math.min(dialogue.text.length,Math.floor(dialogue.timer*45));if(count>dialogue.shown){dialogue.shown=count;$('dialogue-text').textContent=dialogue.text.slice(0,count);}return;}
 if(paused||dead||settingsOpen||confirmation)return;
 const firing=pointer.active||keys.has('Space')||keys.has('KeyZ');
 const mask=(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)|(keys.has('ArrowRight')||keys.has('KeyD')?2:0)|(keys.has('ArrowUp')||keys.has('KeyW')?4:0)|(keys.has('ArrowDown')||keys.has('KeyS')?8:0);
 engine.step(dt,pointer.active?pointer.x:-999,pointer.y,firing?1:0,mask);
 const worldDt=dt*sim[3];bgOffset+=worldDt*UNIT;stageElapsed+=worldDt;announceTimer-=worldDt;
 if(sim[14]>lastShot){lastShot=sim[14];if(lastShot%2===0)sound('Shoot_01',.16);}
 if(sim[15]>lastHit){lastHit=sim[15];sound('Hit_03',.6);}
 if(sim[16]>lastDeath){lastDeath=sim[16];sound('Hit_02');resetInput();deathDelay=2;}
 if(!sim[2]){deathDelay-=dt;if(deathDelay<=0){dead=true;show('death',true);}return;}
 stageStep(worldDt);
}
function frame(stamp){
 const elapsed=lastStamp?Math.min((stamp-lastStamp)/1000,.1):0;lastStamp=stamp;accumulator+=elapsed;
 try{while(accumulator>=1/60){update(1/60);accumulator-=1/60;}render();}catch(error){fatal(error);return;}
 requestAnimationFrame(frame);
}
function fatal(error){console.error(error);clearLayers();show('loading',true);$('load-status').textContent=`실행 오류: ${error.message}`;mode='error';}
function pointerPosition(e){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width*480-240)/UNIT;pointer.y=TOP-(e.clientY-rect.top)/rect.height*WORLD_HEIGHT;}
canvas.addEventListener('pointerdown',e=>{if(mode!=='playing'||paused||dialogue||dead||settingsOpen||confirmation)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointerPosition(e);pointer.active=true;});
canvas.addEventListener('pointermove',e=>{if(pointer.active)pointerPosition(e);});
function pointerEnd(){pointer.active=false;engine?.release();}
window.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(mode==='splash'){title();return;}
 if(e.code==='KeyM'){volumes.muted=!volumes.muted;updateVolume();return;}
 if(e.code==='Escape'||e.code==='KeyP'){
  if(confirmation){confirmation=null;show('confirm',false);}else if(settingsOpen){settingsOpen=false;show('settings',false);}else if(mode==='credits')title();else pauseToggle();return;
 }
 if(dialogue&&(e.code==='Enter'||e.code==='Space')){advanceDialogue();return;}
 if(e.code==='Enter'&&(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'))return;
 if(confirmation||settingsOpen)return;
 if(mode==='menu'&&e.code==='Enter'){$('new-game').click();return;}
 if(mode==='playing'&&!paused&&!dead&&!dialogue&&!settingsOpen&&!confirmation)keys.add(e.code);
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'||e.code==='KeyZ')engine?.release();});
window.addEventListener('blur',()=>{resetInput();if(mode==='playing'&&!paused&&!dead){paused=true;show('pause',true);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(mode==='playing'&&!paused&&!dead){paused=true;show('pause',true);}}});
$('splash').onclick=title;
$('new-game').onclick=()=>{click();audioInit().catch(console.warn);if(savedStage)confirm('새 게임을 시작하시겠습니까?',()=>stageStart(1));else stageStart(1);};
$('continue-button').onclick=()=>{audioInit().catch(console.warn);stageStart(Number(savedStage));};
$('credits-button').onclick=()=>{click();audioInit().catch(console.warn);credits();};
$('credits-back').onclick=title;
$('quit-button').onclick=()=>confirm('게임을 종료하시겠습니까?',()=>{title();volumes.muted=true;updateVolume();});
$('settings-button').onclick=settings;$('pause-settings').onclick=settings;
$('close-settings').onclick=()=>{settingsOpen=false;show('settings',false);};
$('music-volume').oninput=e=>{audioInit().catch(console.warn);volumes.music=Number(e.target.value);updateVolume();};
$('effects-volume').oninput=e=>{audioInit().catch(console.warn);volumes.effects=Number(e.target.value);updateVolume();};
$('sound-button').onclick=()=>{audioInit().catch(console.warn);volumes.muted=!volumes.muted;updateVolume();};
$('pause-button').onclick=pauseToggle;$('resume-button').onclick=pauseToggle;
$('restart-button').onclick=()=>confirm('스테이지를 다시 시작하시겠습니까?',()=>stageStart(stage));
$('title-button').onclick=()=>confirm('타이틀로 돌아가시겠습니까?',title);$('death-title').onclick=title;
$('revive-button').onclick=()=>{engine.revive();dead=false;deathDelay=0;show('death',false);sound('teleport_rnd_01',.5);};
$('dialogue-next').onclick=()=>advanceDialogue();$('skip-dialogue').onclick=skipDialogue;
$('confirm-yes').onclick=()=>{const action=confirmation;confirmation=null;show('confirm',false);action?.();};
$('confirm-no').onclick=()=>{confirmation=null;show('confirm',false);};
async function boot(){
 document.body.style.setProperty('--web-bg',`url("${assets.web_background}")`);
 for(const [css,key] of [['--button-bg','ui_button'],['--title-bg','ui_title'],['--menu-bg','menu_background']])$('game').style.setProperty(css,`url("${assets[key]}")`);
 $('splash-logo').src=assets.LOGO;$('credits-image').src=assets.Credit;
 await Promise.all(Object.entries(assets).filter(([,v])=>v.startsWith('data:image/')).map(([key,uri])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(new Error(`이미지 로딩 실패: ${key}`));img.src=uri;})));
 if(!window.WebAssembly)throw new Error('WebAssembly를 지원하는 브라우저가 필요합니다.');
 const binary=Uint8Array.from(atob(WASM_BASE64),c=>c.charCodeAt(0));
 const {instance}=await WebAssembly.instantiate(binary,{env:{abort(){throw new Error('WebAssembly simulation aborted');}}});engine=instance.exports;refreshMemory();
 updateVolume();clearLayers();mode='splash';show('splash',true);requestAnimationFrame(frame);
 const snapshot=()=>({edition:GAME_EDITION,mode,stage,rowIndex,waitingBoss,paused,dead,dialogue:dialogue?{index:dialogue.index,text:dialogue.text}:null,player:{x:sim[0],y:sim[1],alive:!!sim[2],timeScale:sim[3],power:sim[4]},boss:{mode:sim[10],phase:sim[9],health:sim[8],done:!!sim[11],killed:!!sim[17]},actors:Array.from({length:engine.capacity()},(_,i)=>actors[i*12]).filter(Boolean).length});
 window.PSY2050=Object.freeze({edition:GAME_EDITION,snapshot});
 if(new URLSearchParams(location.search).has('test'))window.__PSY_TEST__={title,start:stageStart,skip:skipDialogue,next:()=>advanceDialogue(true),update,render,engine,sim,actors,beams,data,book,snapshot,advance(seconds){for(let t=0;t<seconds;t+=1/60)update(1/60);render();}};
}
boot().catch(fatal);
})();
