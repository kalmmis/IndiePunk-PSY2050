'use strict';
(() => {
  const $=id=>document.getElementById(id),show=(id,on=true)=>{$(id).hidden=!on;};
  const assets=JSON.parse($('embedded-assets').textContent),worlds=JSON.parse($('embedded-worlds').textContent);
  const storage={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
  const savedSettings=storage.get('psy2050-fps-settings',{});
  const settings={sensitivity:Math.min(2,Math.max(.3,Number(savedSettings.sensitivity)||1)),fov:Math.min(105,Math.max(65,Number(savedSettings.fov)||84)),volume:Number.isFinite(savedSettings.volume)?Math.min(1,Math.max(0,savedSettings.volume)):.55,rain:savedSettings.rain!==false};
  const panels=['loading','menu','hud','briefing','pause','settings','result','credits','error','character-view'];
  const keys=new Set(),canvas=$('world');
  let engine,sim,entities,renderer,mode='loading',settingsFrom='menu',mouseFire=false,aim=false,teleportCommitQueued=false,chargeReleaseQueued=false,jumpQueued=false;
  let lastTeleport=0,characterAngle=.12,characterZoom=4.1,modelDragging=false,modelPoint=0;
  let mouseMode='idle',freeLookPreferred=false,lockAttempt=0,lockTimer=0,mousePoint=null;
  let last=0,acc=0,recoil=0,hitFlash=0,hurtFlash=0,noticeTimer=0,lastShot=0,lastHit=0,lastHurt=0,lastKill=0,lastWave=0,lastHead=0;
  let frames=0,fpsTime=0,hudTime=0,audioContext,master,musicGain,musicSource,audioStarting=false,muted=false;
  const audioBuffers=new Map();
  function clearInput(){keys.clear();mouseFire=false;aim=false;teleportCommitQueued=false;chargeReleaseQueued=false;jumpQueued=false;mousePoint=null;modelDragging=false;}
  function panel(name){for(const id of panels)show(id,id===name);}
  function refresh(){sim=new Float64Array(engine.memory.buffer,engine.statePointer(),54);entities=new Float64Array(engine.memory.buffer,engine.entityPointer(),engine.capacity()*16);}
  function counters(){lastShot=sim[16];lastHit=sim[17];lastHurt=sim[18];lastKill=sim[14];lastHead=sim[23];lastWave=sim[11];lastTeleport=sim[45];}
  function notify(title,sub='',seconds=2.6){$('notification').replaceChildren();if(sub){const small=document.createElement('small');small.textContent=sub;$('notification').append(small);}$('notification').append(document.createTextNode(title));noticeTimer=seconds;}
  function sound(name,level=1){
    if(!audioContext||muted||!master)return;
    const promise=audioBuffers.get(name);if(!promise)return;
    promise.then(buffer=>{if(!buffer)return;const source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;gain.gain.value=level;source.connect(gain);gain.connect(master);source.start();}).catch(()=>{});
  }
  function tone(hz,duration=.08,level=.1){
    if(!audioContext||muted)return;const osc=audioContext.createOscillator(),g=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(hz*.5,audioContext.currentTime+duration);g.gain.setValueAtTime(level,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(g);g.connect(master);osc.start();osc.stop(audioContext.currentTime+duration);
  }
  function magicSound(charged=false){
    if(!audioContext||muted)return;
    for(const [ratio,level] of [[1,.075],[1.5,.04],[2,.025]]){const osc=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime,duration=charged?.45:.16;osc.type='sine';osc.frequency.setValueAtTime((charged?240:680)*ratio,t);osc.frequency.exponentialRampToValueAtTime((charged?720:360)*ratio,t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(level,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+duration);}
  }
  function bytes(uri){return Uint8Array.from(atob(uri.split(',').pop()),v=>v.charCodeAt(0));}
  async function audioInit(){
    if(!audioContext){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext=new Audio();master=audioContext.createGain();master.gain.value=muted?0:settings.volume;master.connect(audioContext.destination);musicGain=audioContext.createGain();musicGain.gain.value=.22;musicGain.connect(master);
      for(const name of ['music','hit','hurt','teleport'])audioBuffers.set(name,audioContext.decodeAudioData(bytes(assets[name]).buffer).catch(()=>null));
    }
    if(audioContext.state==='suspended')await audioContext.resume();
    if(!musicSource&&!audioStarting){audioStarting=true;try{const buffer=await audioBuffers.get('music');if(buffer){musicSource=audioContext.createBufferSource();musicSource.buffer=buffer;musicSource.loop=true;musicSource.connect(musicGain);musicSource.start();}}finally{audioStarting=false;}}
  }
  function audioStart(){audioInit().catch(()=>{});}
  function setMouseMode(value){
    mouseMode=value;canvas.dataset.mouseMode=value;
    show('free-look-help',value==='free');
    $('input-mode').textContent=value==='free'?'창 모드 조준':'마우스 고정 조준';
  }
  function unlock(){lockAttempt++;clearTimeout(lockTimer);setMouseMode('idle');if(document.pointerLockElement===canvas)document.exitPointerLock();clearInput();}
  function menu(){mode='menu';unlock();panel('menu');engine.reset(0,2050,0);refresh();renderer?.setLevel(0);counters();const saved=storage.get('psy2050-fps-stage',null);show('continue',Number.isInteger(saved)&&saved>=0&&saved<=2);$('continue').textContent=`${Number(saved)+1}구역 이어하기 →`;}
  function briefing(level,carry=false){
    mode='briefing';unlock();engine.reset(level,(Date.now()>>>0)||2050,carry?1:0);refresh();renderer.setLevel(level);counters();recoil=0;hurtFlash=0;hitFlash=0;acc=0;
    const world=worlds[level];$('briefing-portrait').src=assets[world.portrait];$('briefing-person').textContent=world.speaker;$('briefing-index').textContent=`0${level+1} / 03`;$('briefing-title').textContent=world.name;$('briefing-location').textContent=world.location;$('briefing-text').textContent=world.briefing;panel('briefing');audioStart();
  }
  function lock(){
    audioStart();clearInput();
    const attempt=++lockAttempt;clearTimeout(lockTimer);
    if(freeLookPreferred){useFreeLook(attempt);return;}
    setMouseMode('pending');
    if(typeof canvas.requestPointerLock!=='function'){useFreeLook(attempt);return;}
    // Some embedded browsers reject the Promise, some only emit pointerlockerror,
    // and others never complete the request. Each path must remain playable.
    lockTimer=setTimeout(()=>{if(document.pointerLockElement!==canvas)useFreeLook(attempt);},1200);
    try{const promise=canvas.requestPointerLock();promise?.catch(()=>useFreeLook(attempt));}catch(e){useFreeLook(attempt);}
  }
  function useFreeLook(attempt){
    if(attempt!==lockAttempt||mode!=='playing'||document.pointerLockElement===canvas)return;
    clearTimeout(lockTimer);const first=!freeLookPreferred;freeLookPreferred=true;setMouseMode('free');clearInput();
    show('pause',false);show('hud');
    if(first)notify('창 모드 조준으로 연결했습니다','마우스로 조준 · 화면 가장자리에서 계속 회전',4);
  }
  function edgeLook(dt){
    if(mouseMode!=='free'||!mousePoint)return;
    const bounds=canvas.getBoundingClientRect(),edge=Math.min(64,bounds.width*.07),verticalEdge=Math.min(48,bounds.height*.07);
    const [px,py]=mousePoint,edgeAmount=(value,size,margin)=>value<margin?-(1-value/margin):value>size-margin?1-(size-value)/margin:0;
    engine.look(edgeAmount(px-bounds.left,bounds.width,edge)*dt*1.9*settings.sensitivity,-edgeAmount(py-bounds.top,bounds.height,verticalEdge)*dt*1.3*settings.sensitivity);
  }
  function deploy(){
    const world=worlds[sim[10]];mode='playing';panel('hud');$('sector-number').textContent=`0${sim[10]+1} / 03`;$('sector-name').textContent=world.name;$('objective').textContent=world.objective;
    storage.set('psy2050-fps-stage',sim[10]);notify(world.name,`SECTOR 0${sim[10]+1} / ${world.english}`,3.8);lock();updateHud();
  }
  function pause(){if(mode!=='playing')return;mode='pause';unlock();show('pause');show('hud');clearInput();}
  function resume(){mode='playing';show('pause',false);show('hud');acc=0;lock();}
  function openSettings(from){settingsFrom=from;mode='settings';unlock();show(from==='menu'?'menu':'pause');show('settings');updateSettings();}
  function updateSettings(){
    for(const k of ['sensitivity','fov','volume'])$(k).value=settings[k];$('rain').checked=settings.rain;
    $('sensitivity-out').value=settings.sensitivity.toFixed(1);$('fov-out').value=`${settings.fov}°`;$('volume-out').value=`${Math.round(settings.volume*100)}%`;
  }
  function closeSettings(){show('settings',false);mode=settingsFrom;storage.set('psy2050-fps-settings',settings);}
  function finish(){
    if(mode!=='playing')return;mode='result';unlock();show('hud',false);show('result');const dead=sim[12]===2,complete=!dead&&sim[10]===2;
    $('result-kicker').textContent=dead?'CHRONO LINK / LOST':complete?'OPERATION ANIMA / COMPLETE':`SECTOR 0${sim[10]+1} / SECURED`;
    $('result-title').textContent=dead?'시간은 아직 남아 있어':complete?'그리고, 시간이 흐른다.':'다음 시간으로';
    $('result-text').textContent=dead?'E를 누른 채 빈 지면을 조준하고 놓으면 순간이동합니다. 탄막을 빠져나온 뒤 R로 마력을 회복하세요.':complete?'레이나의 불꽃이 잦아들었다. 멈춰 있던 도시가 다시 숨을 쉰다. 미나와 레이나의 이야기는, 아직 끝나지 않았다.':'이 구역의 위협을 제거했습니다. 다음 구역으로 진입해 아니마의 근원에 다가가세요.';
    $('result-score').textContent=String(sim[13]).padStart(6,'0');$('result-kills').textContent=sim[14];$('result-accuracy').textContent=`${sim[16]?Math.round(sim[33]/sim[16]*100):0}%`;
    $('result-next').textContent=dead?'현재 구역 재도전 →':complete?'새 작전 시작 →':'다음 구역으로 →';
    if(complete)storage.set('psy2050-fps-stage',null);tone(dead?160:660,.4,.15);
  }
  function events(){
    if(sim[16]>lastShot){recoil=1;magicSound(sim[49]===2);lastShot=sim[16];}
    if(sim[17]>lastHit){hitFlash=.16;sound('hit',.16);$('target-label').textContent=sim[23]>lastHead?'RESONANCE':'HIT';lastHead=sim[23];lastHit=sim[17];}
    if(sim[18]>lastHurt){hurtFlash=.8;sound('hurt',.4);lastHurt=sim[18];}
    if(sim[14]>lastKill){tone(840,.06,.08);lastKill=sim[14];}
    if(sim[45]>lastTeleport){renderer.blink([sim[46],.5,sim[47]],[sim[0],.5,sim[2]]);sound('teleport',.3);lastTeleport=sim[45];}
    if(sim[11]>lastWave){lastWave=sim[11];notify(sim[10]===2&&sim[11]===3?'레이나 · 아니마의 불꽃':`WAVE 0${sim[11]}`,sim[10]===2&&sim[11]===3?'WARNING / FLAME ANIMA DETECTED':'HOSTILES INBOUND',2.5);tone(440,.15,.07);}
    if(sim[12]!==0)finish();
  }
  function input(){
    let mask=0;if(keys.has('KeyW')||keys.has('ArrowUp'))mask|=1;if(keys.has('KeyS')||keys.has('ArrowDown'))mask|=2;if(keys.has('KeyA')||keys.has('ArrowLeft'))mask|=4;if(keys.has('KeyD')||keys.has('ArrowRight'))mask|=8;
    if(keys.has('ShiftLeft')||keys.has('ShiftRight'))mask|=16;if(jumpQueued){mask|=32;jumpQueued=false;}if(mouseFire)mask|=64;if(keys.has('KeyQ'))mask|=128;if(keys.has('KeyE'))mask|=256;if(teleportCommitQueued){mask|=512;teleportCommitQueued=false;}if(aim)mask|=1024;if(chargeReleaseQueued){mask|=2048;chargeReleaseQueued=false;}if(keys.has('KeyR'))mask|=4096;return mask;
  }
  function updateHud(){
    $('health').textContent=Math.ceil(sim[5]);$('shield').textContent=Math.ceil(sim[27]);$('mana').textContent=Math.ceil(sim[6]);$('mana').style.color=sim[6]<18?'var(--danger)':'';
    $('health-fill').style.width=`${sim[5]}%`;$('shield-fill').style.width=`${sim[27]*2}%`;$('energy-fill').style.width=`${sim[8]}%`;
    $('energy-label').textContent=sim[34]?'회복 중 · Q를 놓으세요':`${Math.round(sim[8])}% · ${sim[9]<1?'시간 감속 중':'시간 감속'}`;$('slow-card').classList.toggle('active',sim[9]<1);$('slow-card').classList.toggle('unready',!!sim[34]);
    $('teleport-label').textContent=sim[44]?(sim[43]?'E를 놓으면 순간이동':['준비 완료','공간 안정화 중','빈 지면을 조준하세요','더 가까운 지면을 조준하세요','이 위치에는 도착할 수 없어요'][sim[48]]):sim[28]>0?`${sim[28].toFixed(1)}s · 공간 안정화`:'누르고 조준 → 놓기';$('teleport-card').classList.toggle('unready',sim[28]>0);$('teleport-card').classList.toggle('active',!!sim[44]);
    $('wave-label').textContent=`WAVE 0${sim[11]} / 03 · ${sim[15]} HOSTILES`;[...$('wave-dots').children].forEach((e,i)=>e.classList.toggle('active',i<sim[11]));
    $('score').textContent=String(sim[13]).padStart(6,'0');$('heading').textContent=['N','NE','E','SE','S','SW','W','NW'][((Math.round(sim[3]/(Math.PI/4))%8)+8)%8];
    show('channel-label',sim[7]>0||!!sim[50]);$('channel-label').textContent=sim[50]?'마력 회복 중':`공명탄 응축 ${Math.round(sim[7]*100)}% · 우클릭을 놓아 시전`;
    $('mana-fill').style.width=`${sim[6]}%`;show('boss-hud',sim[21]>0&&sim[20]>0);$('boss-fill').style.width=`${sim[21]?sim[20]/sim[21]*100:0}%`;$('boss-phase').textContent=`PHASE 0${sim[32]}`;
    $('tutorial').style.opacity=sim[19]>18?0:1;
  }
  function frame(now){
    const dt=last?Math.min((now-last)/1000,.1):1/60;last=now;
    if(mode==='playing'&&mouseMode!=='pending'){
      edgeLook(dt);acc+=dt;while(acc>=1/60&&mode==='playing'){engine.step(1/60,input());events();acc-=1/60;}
    }else acc=0;
    recoil=Math.max(0,recoil-dt*10);hitFlash=Math.max(0,hitFlash-dt);hurtFlash=Math.max(0,hurtFlash-dt*2);noticeTimer=Math.max(0,noticeTimer-dt);
    $('hitmarker').style.opacity=hitFlash>0?1:0;$('target-label').style.opacity=hitFlash>0?1:0;$('damage-tint').style.opacity=mode==='playing'?hurtFlash:0;$('time-tint').style.opacity=mode==='playing'&&sim[9]<1?.75:0;$('notification').style.opacity=noticeTimer>0?Math.min(1,noticeTimer*2):0;
    $('blink-tint').style.opacity=mode==='playing'?sim[52]*1.8:0;
    hudTime+=dt;if(hudTime>.05){updateHud();hudTime=0;}
    if(musicSource)musicSource.playbackRate.setTargetAtTime(mode==='playing'&&sim[9]<1?.82:1,audioContext.currentTime,.3);
    renderer.render(sim,entities,mode==='playing'||mode==='menu'?dt:0,{menu:['menu','briefing','credits'].includes(mode)||(mode==='settings'&&settingsFrom==='menu'),recoil,moving:mode==='playing'&&[...keys].some(k=>['KeyW','KeyA','KeyS','KeyD'].includes(k)),aim,settings,characterView:mode==='character'?{angle:characterAngle,zoom:characterZoom}:null});
    frames++;fpsTime+=dt;if(fpsTime>=.5){$('fps').textContent=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
    requestAnimationFrame(frame);
  }
  function showError(message){mode='error';unlock();panel('error');$('error-text').textContent=message;}
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement===canvas){if(mode==='playing'){clearTimeout(lockTimer);setMouseMode('locked');mousePoint=null;show('pause',false);show('briefing',false);acc=0;}else document.exitPointerLock();}
    else if(mode==='playing'&&mouseMode==='locked')pause();
  });
  document.addEventListener('pointerlockerror',()=>{if(mouseMode==='pending')useFreeLook(lockAttempt);});
  document.addEventListener('mousemove',e=>{
    if(mode==='character'&&modelDragging){characterAngle+=(e.clientX-modelPoint)*.012;modelPoint=e.clientX;return;}
    if(mode!=='playing')return;
    if(mouseMode==='locked'&&document.pointerLockElement===canvas){engine.look(e.movementX*.002*settings.sensitivity,-e.movementY*.002*settings.sensitivity);return;}
    if(mouseMode!=='free'||e.target!==canvas){mousePoint=null;return;}
    if(mousePoint)engine.look((e.clientX-mousePoint[0])*.002*settings.sensitivity,-(e.clientY-mousePoint[1])*.002*settings.sensitivity);
    mousePoint=[e.clientX,e.clientY];
  });
  document.addEventListener('mousedown',e=>{if(mode==='character'&&e.target===canvas){modelDragging=true;modelPoint=e.clientX;return;}if(mode!=='playing'||!(mouseMode==='locked'||mouseMode==='free'&&e.target===canvas))return;if(e.button===0)mouseFire=true;if(e.button===2)aim=true;});
  document.addEventListener('mouseup',e=>{modelDragging=false;if(e.button===0)mouseFire=false;if(e.button===2){if(aim&&mode==='playing')chargeReleaseQueued=true;aim=false;}});
  document.addEventListener('wheel',e=>{if(mode==='character'){e.preventDefault();characterZoom=Math.min(5,Math.max(2.7,characterZoom+e.deltaY*.002));}},{passive:false});
  document.addEventListener('mouseleave',()=>{if(mode==='playing'&&mouseMode==='free')pause();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('contextmenu',e=>{if(mode==='playing')e.preventDefault();});
  window.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='Escape'){if(mode==='settings')closeSettings();else if(mode==='credits'||mode==='character')menu();else if(mode==='playing')pause();return;}
    if(e.code==='KeyM'){muted=!muted;if(master)master.gain.value=muted?0:settings.volume;return;}
    if(e.code==='KeyP'){if(mode==='playing')pause();else if(mode==='pause')resume();return;}
    if(mode==='playing'){keys.add(e.code);if(e.code==='Space')jumpQueued=true;}
  });
  window.addEventListener('keyup',e=>{if(e.code==='KeyE'&&keys.has('KeyE')&&mode==='playing')teleportCommitQueued=true;keys.delete(e.code);});
  window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
  window.addEventListener('resize',()=>renderer?.resize());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('그래픽 연결이 중단되었습니다. 다시 시도를 눌러 전장을 새로 불러오세요.');});
  $('play').onclick=()=>briefing(0);$('continue').onclick=()=>briefing(Number(storage.get('psy2050-fps-stage',0)));$('deploy').onclick=deploy;
  $('pause-open').onclick=pause;$('resume').onclick=resume;$('restart').onclick=()=>briefing(sim[10]);$('return-title').onclick=menu;
  $('menu-settings').onclick=()=>openSettings('menu');$('pause-settings').onclick=()=>openSettings('pause');$('settings-close').onclick=closeSettings;
  for(const key of ['sensitivity','fov','volume'])$(key).oninput=e=>{settings[key]=Number(e.target.value);if(master)master.gain.value=muted?0:settings.volume;updateSettings();};
  $('rain').onchange=e=>{settings.rain=e.target.checked;};
  $('result-next').onclick=()=>{if(sim[12]===2)briefing(sim[10]);else if(sim[10]===2)briefing(0);else briefing(sim[10]+1,true);};$('result-title-button').onclick=menu;
  $('credits-open').onclick=()=>{mode='credits';panel('credits');audioStart();};$('credits-close').onclick=menu;$('original-credits').textContent='PROGRAMMING   Hhan87\nSTORY & DESIGN   kalmis · roue\nORIGINAL ART   kalmis';
  $('error-retry').onclick=()=>location.reload();document.querySelector('.brand').onclick=e=>{e.preventDefault();};
  $('hud-portrait').src=assets.mina;
  function openCharacter(){mode='character';unlock();panel('character-view');$('model-reference').src=assets.reina;$('model-stats').textContent=`${renderer.characterStats?.triangles.toLocaleString()||''} TRIANGLES · 9 SKIN JOINTS`;}
  $('character-open').onclick=openCharacter;$('character-close').onclick=menu;
  $('model-front').onclick=()=>characterAngle=0;$('model-side').onclick=()=>characterAngle=Math.PI/2;$('model-back').onclick=()=>characterAngle=Math.PI;
  if(matchMedia('(pointer: coarse)').matches)show('touch-warning');
  function snapshot(){return {mode,locked:document.pointerLockElement===canvas,inputMode:mouseMode,stage:sim[10]+1,wave:sim[11],status:sim[12],player:{x:sim[0],y:sim[1],z:sim[2],yaw:sim[3],pitch:sim[4],hp:sim[5],shield:sim[27],mana:sim[6],charge:sim[7],energy:sim[8],timeScale:sim[9]},teleport:{preview:!!sim[44],valid:!!sim[43],x:sim[40],z:sim[42],count:sim[45],cooldown:sim[28],reason:sim[48]},enemies:sim[15],shots:sim[16],hits:sim[33],score:sim[13],kills:sim[14],bossHp:sim[20]};}
  async function init(){
    try{
      renderer=new FPSRenderer(canvas,worlds);$('loading-label').textContent='WASM 엔진 연결 중...';
      const binary=Uint8Array.from(atob($('embedded-wasm').textContent.trim()),c=>c.charCodeAt(0));
      const instance=await WebAssembly.instantiate(binary,{env:{abort(){throw new Error('WASM simulation aborted');}}});engine=instance.instance.exports;refresh();
      window.PSY2050_FPS=Object.freeze({snapshot});
      if(new URLSearchParams(location.search).get('test')==='1')window.__FPS_TEST__={engine,get sim(){return sim;},get entities(){return entities;},worlds,settings,renderer,briefing,deploy,menu,pause,resume,finish,snapshot,advance(seconds,mask=0){for(let i=0;i<Math.round(seconds*60);i++){engine.step(1/60,mask);events();}updateHud();},setMode(value){mode=value;},refresh};
      menu();if(new URLSearchParams(location.search).get('model')==='reina')openCharacter();requestAnimationFrame(frame);
    }catch(e){showError(e.message||String(e));}
  }
  init();
})();
