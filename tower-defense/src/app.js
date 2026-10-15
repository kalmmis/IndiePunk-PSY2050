import {TOWERS,ENEMIES,STAGES,CELL,waveList} from './data.js';
import {DefenseGame} from './engine.js';
import {Battlefield} from './renderer.js';
const $=id=>document.getElementById(id),keys=Object.keys(TOWERS),ASSETS=window.TD_ASSETS;
const testMode=new URLSearchParams(location.search).has('test'),storagePrefix=testMode?'psy2050-td-test-':'psy2050-td-';
const storage={get(k,fallback){try{return JSON.parse(localStorage.getItem(storagePrefix+k))??fallback;}catch{return fallback;}},set(k,v){try{localStorage.setItem(storagePrefix+k,JSON.stringify(v));}catch{}}};
let progress=storage.get('progress',[0,0,0]);if(!Array.isArray(progress)||progress.length!==3)progress=[0,0,0];
progress=progress.map(n=>Math.max(0,Math.min(3,Number(n)||0)));
let game=new DefenseGame(0),selectedType='mina',selectedId=null,speed=1,auto=false,autoTimer=0,title=true,modal=false,toastUntil=0,hudTimer=0,detailKey='',lastFocused=null;
const renderer=new Battlefield($('battlefield'),ASSETS);
let muted=storage.get('muted',true),audioContext=null,lastShotSound=0;
const music=new Audio(ASSETS.music);music.loop=true;music.volume=.16;
function startAudio(){if(muted)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();music.play().catch(()=>{});}catch{}}
function tone(f=500,length=.08,shape='sine',volume=.035){
  if(muted||!audioContext)return;
  const o=audioContext.createOscillator(),v=audioContext.createGain(),now=audioContext.currentTime;o.type=shape;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*.6,now+length);
  v.gain.setValueAtTime(volume,now);v.gain.exponentialRampToValueAtTime(.001,now+length);o.connect(v);v.connect(audioContext.destination);o.start();o.stop(now+length);
}
function radio(name,text){$('radio-name').textContent=name;$('radio-text').textContent=text;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+2400;}
function unlocked(index){return index===0||progress[index-1]>0;}
function stageList(){
  $('stage-list').innerHTML=STAGES.map((s,i)=>`<button class="stage-card ${game.stage===i?'active':''}" data-stage="${i}" ${unlocked(i)?'':'disabled'}><span class="stage-no">SECTOR 0${i+1}</span><b>${s.title}</b><small class="${progress[i]?'stars':''}">${progress[i]?'★'.repeat(progress[i])+'☆'.repeat(3-progress[i]):unlocked(i)?'작전 대기':'이전 구역 완료 필요'}</small></button>`).join('');
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.stage);if(i===game.stage&&game.wave>0)return;const proceed=()=>beginStage(i);if(game.towers.length||game.wave>0)openModal(`<div class="eyebrow">CHANGE OPERATION</div><h2>작전을 변경할까요?</h2><p>현재 전장의 배치와 자원은 초기화됩니다. 완료한 구역과 별 기록은 보존됩니다.</p><button id="change-confirm" class="primary-button">${STAGES[i].title} 이동 →</button><button id="change-cancel" class="modal-secondary">현재 작전 계속</button>`,()=>{},()=>{$('change-confirm').onclick=proceed;$('change-cancel').onclick=closeModal;});else proceed();});
}
function roster(){
  $('roster').innerHTML=keys.map((key,i)=>{const d=TOWERS[key];return `<button class="operator ${key===selectedType?'active':''}" data-operator="${key}" aria-pressed="${key===selectedType}" aria-label="${d.name}, ${d.role}, ${d.cost} 에테르"><img src="${ASSETS[d.portrait]}" alt=""><span class="hotkey">${i+1}</span><span class="operator-text"><small>${d.title} / ${d.role}</small><b>${d.name}</b></span><span class="cost">${d.cost}<small>◈ 에테르</small></span></button>`;}).join('');
  document.querySelectorAll('[data-operator]').forEach(b=>b.onclick=()=>selectType(b.dataset.operator));
}
function selectType(type){selectedType=type;selectedId=null;renderer.selected=null;renderer.type=type;detailKey='';roster();updateHUD();tone(480,.05);}
function detail(){
  const t=game.towers.find(t=>t.id===selectedId),d=TOWERS[t?.type||selectedType],s=t?game.stats(t):game.stats({type:selectedType,level:1});
  const key=JSON.stringify([t?.id,t?.level,t?.target,d.name,Math.round(s.damage),s.buff]);if(detailKey===key)return;detailKey=key;
  $('operator-detail').innerHTML=`<div class="detail-title"><h3>${d.name}${t?' · Lv.'+t.level:''}</h3><span>${t?'DEPLOYED':d.role}</span></div><p class="detail-description">${d.text}</p><div class="detail-stats"><div><small>${d.kind==='support'?'공격 증폭':'공격력'}</small><b>${d.kind==='support'?Math.round((.25+((t?.level||1)-1)*.1)*100)+'%':Math.round(s.damage)}</b></div><div><small>사거리</small><b>${s.range.toFixed(1)}</b></div><div><small>${d.kind==='support'?'웨이브 수입':'공격 간격'}</small><b>${d.kind==='support'?s.income:s.interval.toFixed(2)+'s'}</b></div></div>${t?`<button id="upgrade" class="upgrade-button">${t.level===3?'최대 강화 완료':'강화 → Lv.'+(t.level+1)}<span>${t.level===3?'MAX':'◈ '+s.upgrade+' / U'}</span></button><p class="upgrade-caption">${t.level===3?'아니마 완전 공명 상태입니다.':d.upgrades[t.level-1]}</p>${d.kind!=='support'&&d.kind!=='slow'?`<div class="target-row"><span>우선 공격</span>${[['first','선두'],['strong','강한 적'],['near','가까운 적']].map(([k,v])=>`<button data-target="${k}" class="${t.target===k?'active':''}">${v}</button>`).join('')}</div>`:''}<button id="sell" class="sell-button">잔상 회수 · ◈ ${Math.floor(t.invested*.7)} 반환 (70%)</button>`:`<div class="detail-hint">${d.icon} 빛나는 빈 거점을 클릭해 배치<br>소모 에테르 <b>◈ ${d.cost}</b> · 거점에 고정</div>`}`;
  if(t){$('upgrade').onclick=upgradeSelected;$('sell').onclick=()=>{const amount=game.sell(t.id);if(amount){selectedId=null;renderer.selected=null;detailKey='';saveCheckpoint();toast(`잔상 회수 · 에테르 ${amount} 반환`);updateHUD();}};document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{game.setTarget(t.id,b.dataset.target);detailKey='';saveCheckpoint();updateHUD();});}
}
function upgradeSelected(){const t=game.towers.find(t=>t.id===selectedId);if(!t)return;if(t.level>=3){toast('이미 최대 강화 상태입니다.');return;}if(!game.upgrade(t.id)){toast('강화에 필요한 에테르가 부족합니다.');return;}detailKey='';renderer.burst(t.x,t.y,TOWERS[t.type].color);tone(750,.15);saveCheckpoint();updateHUD();toast(`${TOWERS[t.type].name} · Lv.${t.level} 강화 완료`);}
function updateHUD(){
  $('life').innerHTML=`${game.life} <em>/ 20</em>`;$('money').textContent=game.money;$('wave-count').innerHTML=`${game.wave} <em>/ 6</em>`;$('kill-count').textContent=String(game.kills).padStart(3,'0');
  $('map-state').textContent=game.state==='wave'?`웨이브 진행 · ${game.enemies.length+game.queue.length}기 남음`:game.state==='build'?'배치 준비':game.state==='victory'?'방어 성공':'신호 소실';
  $('start-wave').disabled=game.state!=='build';$('start-wave').querySelector('span').textContent=game.state==='wave'?'방어 진행 중':game.wave===5?'보스 웨이브 시작':'웨이브 '+(game.wave+1)+' 시작';
  $('rift').disabled=game.state!=='wave'||game.riftCooldown>0;$('rift-label').textContent=game.rift>0?'시간 균열 활성화 중':game.riftCooldown>0?'시간 에너지 회복 중':'4초간 적 전체 감속';$('rift-time').textContent=game.riftCooldown>0?Math.ceil(game.riftCooldown)+'s':'READY';
  document.querySelectorAll('[data-operator]').forEach(b=>{b.classList.toggle('unaffordable',game.money<TOWERS[b.dataset.operator].cost);});
  const boss=game.enemies.find(e=>e.boss&&e.hp>0);$('boss-bar').hidden=!boss;
  if(boss){$('boss-name').textContent=game.config.boss.name+(boss.phase===2?' / 각성':'');$('boss-ability').textContent=game.config.boss.ability;$('boss-hp').textContent=Math.max(0,Math.ceil(boss.hp))+' / '+boss.maxHp;$('boss-fill').style.width=Math.max(0,boss.hp/boss.maxHp)*100+'%';$('boss-fill').style.background=game.config.boss.color;}
  const next=Math.min(6,game.wave+(game.state==='wave'?0:1)),counts={};for(const type of waveList(game.stage,next))counts[type]=(counts[type]||0)+1;
  $('wave-intel').textContent=Object.entries(counts).map(([k,v])=>(k==='boss'?game.config.boss.name:ENEMIES[k].name)+' ×'+v).join(' · ');
  detail();const u=$('upgrade');if(u){const t=game.towers.find(a=>a.id===selectedId);u.disabled=!t||t.level===3||game.money<game.stats(t).upgrade||!['build','wave'].includes(game.state);}
}
function saveCheckpoint(){
  if(game.state!=='build')return;
  const s=game.snapshot();storage.set('checkpoint',{version:1,stage:s.stage,wave:s.wave,money:s.money,life:s.life,kills:s.kills,spent:game.spent,nextId:game.nextId,towers:s.towers.map(({stats,...t})=>t),riftCooldown:s.riftCooldown});
  $('continue').hidden=false;
}
function restore(){
  const cp=storage.get('checkpoint',null);if(!cp||cp.version!==1||!Number.isInteger(cp.stage)||cp.stage<0||cp.stage>2||!unlocked(cp.stage)||!Number.isInteger(cp.wave)||cp.wave<0||cp.wave>5)return false;
  const fresh=new DefenseGame(cp.stage);fresh.wave=cp.wave;fresh.money=Math.max(0,Math.min(100000,Number(cp.money)||0));fresh.life=Math.max(1,Math.min(20,Number(cp.life)||20));fresh.kills=Number(cp.kills)||0;fresh.spent=Number(cp.spent)||0;
  const used=new Set();
  for(const t of Array.isArray(cp.towers)?cp.towers:[]) {
    if(!TOWERS[t.type]||!fresh.canBuild(t.x-.5,t.y-.5)||!Number.isInteger(t.id)||used.has(t.id))continue;
    used.add(t.id);const level=Math.max(1,Math.min(3,Math.floor(t.level)||1)),cost=TOWERS[t.type].cost;
    const invested=cost+(level>=2?Math.round(cost*.85):0)+(level===3?Math.round(cost*1.35):0);
    fresh.towers.push({id:t.id,type:t.type,x:t.x,y:t.y,level,invested,cooldown:.15,locked:0,target:['first','near','strong'].includes(t.target)?t.target:'first',angle:0,kills:Number(t.kills)||0});
  }
  fresh.nextId=Math.max(1,...fresh.towers.map(t=>t.id+1));fresh.riftCooldown=Math.max(0,Math.min(32,Number(cp.riftCooldown)||0));game=fresh;return true;
}
function openModal(html,onClose=()=>{},setup=()=>{}) {
  lastFocused=document.activeElement;modal=true;$('modal-content').innerHTML=html;$('modal').hidden=false;
  const heading=$('modal-content').querySelector('h2');if(heading)heading.id='modal-title';
  $('app').inert=true;$('title-screen').inert=true;
  $('modal-close').onclick=()=>{closeModal();onClose();};setup();requestAnimationFrame(()=>{$('modal-content').querySelector('button')?.focus();});
}
function closeModal(){modal=false;$('modal').hidden=true;$('app').inert=title;$('title-screen').inert=false;lastFocused?.focus?.({preventScroll:true});}
function setStageUI(){
  const s=game.config;selectedId=null;selectedType='mina';renderer.selected=null;renderer.type='mina';renderer.hover=null;renderer.keyboardPad=undefined;renderer.particles=[];renderer.lastStage=-1;detailKey='';autoTimer=0;
  auto=false;$('auto').setAttribute('aria-pressed','false');$('app').inert=title||modal;
  $('stage-kicker').textContent=`SECTOR 0${game.stage+1} / ${s.en}`;$('stage-title').textContent=s.title;$('location').textContent=s.location;$('stage-index').innerHTML=`0${game.stage+1} <em>/ 03</em>`;
  stageList();roster();updateHUD();renderer.draw(game);radio('리타','캐릭터를 선택한 뒤 빛나는 거점에 잔상을 배치해. 준비되면 웨이브를 시작하자.');
}
function beginStage(index){
  closeModal();game=new DefenseGame(index);title=false;$('title-screen').hidden=true;setStageUI();const s=game.config;
  const deploy=()=>{closeModal();saveCheckpoint();startAudio();$('battlefield').focus({preventScroll:true});};
  openModal(`<div class="eyebrow">OPERATION BRIEF / SECTOR 0${index+1}</div><h2>${s.title}</h2><div class="briefing-location">${s.location} / 6 WAVES</div><p>${s.story}</p><div class="briefing-dialogue">${s.dialogue.map(([name,line])=>`<p><b>${name}</b>${line}</p>`).join('')}</div><div class="briefing-boss"><strong>최종 웨이브 · ${s.boss.name} / ${s.boss.title}</strong>${s.boss.detail}</div><button id="deploy" class="primary-button">거점 배치 시작 <span>◈ ${s.money} →</span></button>`,deploy,()=>{$('deploy').onclick=deploy;});
}
function returnTitle(){closeModal();saveCheckpoint();title=true;$('app').inert=true;$('title-screen').hidden=false;$('continue').hidden=!storage.get('checkpoint',null);$('play').focus({preventScroll:true});music.pause();}
function pause(){
  if(title||modal)return;
  openModal(`<div class="eyebrow">SIGNAL ON HOLD</div><h2>잠시 멈춘 시간</h2><p>배치와 전투가 일시정지되었습니다. 저장된 작전은 가장 최근 웨이브가 시작되기 직전의 상태로 이어집니다.</p><button id="resume" class="primary-button">작전 계속 →</button><button id="retry" class="modal-secondary">현재 구역 처음부터 다시</button><button id="to-title" class="modal-secondary">타이틀로</button>`,()=>{},()=>{$('resume').onclick=closeModal;$('retry').onclick=()=>beginStage(game.stage);$('to-title').onclick=returnTitle;});
}
function result(won){
  const stars=game.life>=20?3:game.life>=12?2:1,final=game.stage===2;
  if(won){progress[game.stage]=Math.max(progress[game.stage],stars);storage.set('progress',progress);storage.set('checkpoint',null);stageList();}
  openModal(`<div class="eyebrow">${won?(final?'ALL SIGNALS RESTORED':'SECTOR SECURED'):'SIGNAL LOST'}</div><h2>${won?(final?'이번에는, 아침이 온다.':'신호를 지켜냈습니다.'):'아직 끝난 게 아니야.'}</h2>${won?`<div class="result-stars">${'★'.repeat(stars)+'☆'.repeat(3-stars)}</div>`:''}<p>${won?game.config.ending:'신호탑의 내구도가 모두 소진되었습니다. 시간의 소녀가 다시 한 번 기회를 엽니다. 감속 거점을 길목에 두고, 장갑 감시자에게 율의 관통 공격을 집중해 보세요.'}</p><div class="result-stats"><span><b>${game.life}/20</b><small>신호탑 내구도</small></span><span><b>${game.kills}</b><small>저지한 적</small></span><span><b>${game.wave}/6</b><small>완료 웨이브${won?'':' / 도달'}</small></span></div><button id="result-next" class="primary-button">${won?(final?'엔딩 크레딧 →':'다음 구역 →'):'같은 구역 다시 도전 →'}</button><button id="result-home" class="modal-secondary">타이틀로</button>`,()=>{},()=>{$('result-next').onclick=()=>won?(final?credits():beginStage(game.stage+1)):beginStage(game.stage);$('result-home').onclick=returnTitle;});
}
function credits(){openModal(`<div class="eyebrow">THANK YOU FOR PLAYING</div><h2>LAST SIGNAL</h2><p>친구는 우리가 선택한 가족.<br>도시 바깥에서, 다시 만날 때까지.</p><div class="briefing-dialogue"><p>원작 IndiePunk / PSY2050<br>프로그래밍 Hhan87<br>스토리·디자인 kalmis, roue<br>원화 kalmis</p><p>타워디펜스 외전 · Codex<br>원작 리마스터 아트 및 AI 보조 일러스트 재사용<br>추가 캐릭터 초상화 · 코드 기반 벡터 일러스트<br>원작 음악 · Chrono Storm</p><p>본 캠페인과 새 인물은 타워디펜스를 위한 별도의 시간선입니다. 원작의 정식 후속 시나리오를 뜻하지 않습니다.</p></div><button id="credits-home" class="primary-button">타이틀로 →</button>`,()=>{},()=>{$('credits-home').onclick=returnTitle;});}
function guide(){openModal(`<div class="eyebrow">FIELD MANUAL / 플레이 가이드</div><h2>마지막 신호를 지키는 법</h2><p>적은 밝게 표시된 도로를 따라 신호탑으로 이동합니다. 도착한 적은 내구도를 깎으며, <span class="danger-text">보스가 통과하면 즉시 패배</span>합니다.</p><div class="guide-grid"><div class="guide-item"><b>01 / 잔상 배치</b><p>오른쪽의 캐릭터를 선택하고 지도 위 빛나는 네모 거점을 누르세요. 사거리 원을 확인할 수 있습니다. 배치한 잔상은 움직이지 않습니다.</p></div><div class="guide-item"><b>02 / 강화와 자원</b><p>배치한 캐릭터를 클릭해 Lv.3까지 강화하세요. 적 처치와 웨이브 완료로 에테르를 얻습니다. 회수 시 투자 비용의 70%를 돌려받습니다.</p></div><div class="guide-item"><b>03 / 조합 만들기</b><p>미나 속사 · 리타 연쇄 · 시간의 소녀 감속 · 하은 범위 · 율 장갑 무시 관통 · 세린 증폭과 수입. 세린의 증폭은 가장 강한 효과만 적용됩니다.</p></div><div class="guide-item"><b>04 / 시간 균열</b><p>Q로 4초간 모든 적을 76% 감속하세요. 32초마다 사용 가능합니다. 각 구역은 6개 웨이브, 마지막에는 보스가 등장합니다.</p></div></div><p class="guide-keys">1–6 캐릭터 선택 · Space 웨이브 시작 · U 강화<br>Q 시간 균열 · P / Esc 일시정지 · M 소리 · ×1 / ×2 / ×3 배속<br>지도 키보드: 방향키로 거점 순회 · Enter로 배치 / 선택<br>구역마다 배치·에테르 초기화 · 별과 다음 구역 해금 저장<br>이어하기는 웨이브 시작 직전의 배치 상태로 복원됩니다.</p><button id="guide-done" class="primary-button">알겠습니다 →</button>`,()=>{},()=>{$('guide-done').onclick=closeModal;});}
function archive(){const extra=STAGES.map(s=>({name:s.boss.name,title:s.boss.title,portrait:s.boss.portrait,lore:s.id===0?'[원작] 불꽃의 아니마를 다루는 소녀. 병원에서 목격한 진실에 무너졌다. 이 시간선에서는 베스퍼와 오르페에게 협력한다.':s.id===1?'[신규 보스] 레이나에게 병원의 감시망을 열어 준 전기 해커. 모든 신호를 끊으면 감시도 끝난다고 믿는다.':'[신규 보스] 레이나에게 실험의 기억을 보여 준 기록 보관자. 고통 없는 세계를 위해 모든 인격을 하나의 기억으로 통합하려 한다.'}));openModal(`<div class="eyebrow">ANIMA ARCHIVE</div><h2>이 시간선의 사람들</h2><p>원작의 미나·리타·시간 능력자·레이나를 바탕으로 새롭게 구성한 타워디펜스 외전입니다.</p><div class="archive-grid">${[...Object.values(TOWERS),...extra].map(d=>`<div class="archive-person"><img src="${ASSETS[d.portrait]}" alt="${d.name}"><div><b>${d.name}</b><small>${d.title}</small><p>${d.lore}</p></div></div>`).join('')}</div><button id="archive-close" class="primary-button">기록 닫기 →</button>`,()=>{},()=>{$('archive-close').onclick=closeModal;});}
function bossInfo(){const b=game.config.boss;openModal(`<div class="eyebrow">THREAT ASSESSMENT / SECTOR 0${game.stage+1}</div><h2>${b.name} · ${b.title}</h2><div class="boss-profile"><img src="${ASSETS[b.portrait]}" alt="${b.name}"><blockquote>“${game.config.bossLine}”</blockquote></div><p><strong>${b.ability}</strong><br>${b.detail}</p><p class="guide-keys">체력 ${b.hp} · 마지막 웨이브 출현 · 신호탑 도달 시 즉시 패배</p><button id="boss-close" class="primary-button">전장으로 →</button>`,()=>{},()=>{$('boss-close').onclick=closeModal;});}
function clickMap(x,y){
  if(title||modal||!['build','wave'].includes(game.state))return;
  const t=game.towers.find(t=>Math.floor(t.x)===x&&Math.floor(t.y)===y);
  if(t){selectedId=t.id;renderer.selected=t.id;renderer.hover=null;detailKey='';updateHUD();return;}
  if(!game.canBuild(x,y)){toast('빛나는 네모 거점에 캐릭터를 배치하세요.');return;}
  const tower=game.build(selectedType,x,y);if(!tower){toast(`에테르가 부족합니다. ${TOWERS[selectedType].cost} 필요`);return;}
  renderer.burst(tower.x,tower.y,TOWERS[selectedType].color);selectedId=tower.id;renderer.selected=tower.id;detailKey='';tone(620,.08);saveCheckpoint();updateHUD();
}
function startWave(){if(title||modal||game.state!=='build')return;saveCheckpoint();if(game.startWave()){autoTimer=0;selectedId=null;renderer.selected=null;detailKey='';startAudio();updateHUD();}}
function rift(){if(game.activateRift()){tone(180,.5,'sine',.08);toast('시간 균열 · 4초간 전체 감속');}}
function handleEvents(){
  for(const e of game.drainEvents()) {
    if(e.type==='kill')renderer.burst(e.x,e.y,e.color);
    else if(e.type==='wave')radio('리타',e.boss?`${game.config.boss.name}의 신호가 접근하고 있어. 마지막 웨이브야.`:`웨이브 ${e.wave} 진입. 선두를 놓치지 마.`);
    else if(e.type==='waveClear'){radio('리타',`웨이브 ${game.wave} 저지 완료. 에테르 ${e.reward} 확보했어. 다음 공격 전에 거점을 강화하자.`);toast(`WAVE ${game.wave} CLEAR · ◈ +${e.reward}`);saveCheckpoint();autoTimer=3.5;tone(820,.2);}
    else if(e.type==='boss'){radio(e.name,game.config.bossLine);toast(`${e.name} 출현 · ${game.config.boss.ability}`);tone(100,.5,'sawtooth',.04);}
    else if(e.type==='ability')toast(e.text);
    else if(e.type==='phase'){toast(`${e.name} · 아니마 각성`);radio('리타','아니마 반응 급증! 보스의 다음 패턴에 대비해.');}
    else if(e.type==='leak'){toast(`적 통과 · 내구도 −${e.amount}`);tone(120,.2,'triangle',.1);}
    else if(e.type==='victory'){tone(880,.4);result(true);}
    else if(e.type==='defeat'){tone(90,.6,'triangle',.1);result(false);}
    else if(e.type==='shot'&&performance.now()-lastShotSound>150){tone(e.kind==='beam'?220:e.kind==='chain'?680:440,.035,'triangle',.012);lastShotSound=performance.now();}
  }
}
$('battlefield').addEventListener('pointermove',e=>{const b=e.currentTarget.getBoundingClientRect();renderer.hover={x:Math.floor((e.clientX-b.left)/b.width*18),y:Math.floor((e.clientY-b.top)/b.height*12)};});
$('battlefield').addEventListener('pointerleave',()=>{renderer.hover=null;});
$('battlefield').addEventListener('click',e=>{const b=e.currentTarget.getBoundingClientRect();clickMap(Math.floor((e.clientX-b.left)/b.width*18),Math.floor((e.clientY-b.top)/b.height*12));});
$('battlefield').addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.code)){e.preventDefault();const n=game.config.pads.length;renderer.keyboardPad=((renderer.keyboardPad??-1)+(['ArrowRight','ArrowDown'].includes(e.code)?1:-1)+n)%n;const [x,y]=game.config.pads[renderer.keyboardPad];renderer.hover={x,y};}else if(e.code==='Enter'){e.preventDefault();const p=game.config.pads[renderer.keyboardPad??0];clickMap(...p);}});
$('start-wave').onclick=startWave;$('rift').onclick=rift;$('speed').onclick=()=>{speed=speed===3?1:speed+1;$('speed').textContent=speed+'×';};
$('auto').onclick=()=>{auto=!auto;$('auto').setAttribute('aria-pressed',auto);if(auto&&game.state==='build')autoTimer=3.5;toast(auto?'자동 웨이브 · 3.5초 준비 후 시작':'수동 웨이브 시작');};
$('pause').onclick=pause;$('guide').onclick=guide;$('title-guide').onclick=guide;$('archive').onclick=archive;$('boss-info').onclick=bossInfo;
$('sound').onclick=()=>{muted=!muted;storage.set('muted',muted);$('sound').setAttribute('aria-pressed',!muted);$('sound').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');if(muted)music.pause();else startAudio();};
$('play').onclick=()=>beginStage(Math.max(0,Math.min(2,progress.findIndex(n=>n===0)===-1?0:progress.findIndex(n=>n===0))));
$('continue').onclick=()=>{if(!restore()){toast('저장된 작전을 읽을 수 없습니다.');return;}closeModal();title=false;$('title-screen').hidden=true;setStageUI();startAudio();toast(`웨이브 ${game.wave+1} 시작 전 배치 복원`);};
$('home').onclick=e=>{e.preventDefault();if(!title)pause();};
document.addEventListener('keydown',e=>{
  if(e.code==='Tab'&&modal){const items=[...$('modal').querySelectorAll('button:not(:disabled),a[href]')];if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
  if(e.repeat)return;
  if(e.code==='KeyM'){$('sound').click();return;}
  if(e.code==='Escape'){e.preventDefault();if(modal)$('modal-close').click();else if(!title){if(selectedId!==null){selectedId=null;renderer.selected=null;detailKey='';updateHUD();}else pause();}return;}
  if(title||modal)return;
  if(e.code==='KeyP'){pause();return;}
  if(/^Digit[1-6]$/.test(e.code)){selectType(keys[Number(e.code.slice(-1))-1]);}
  if(e.code==='Space'){e.preventDefault();if(document.activeElement?.tagName!=='BUTTON')startWave();}
  if(e.code==='KeyQ'){e.preventDefault();rift();}if(e.code==='KeyU')upgradeSelected();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(!title&&!modal)pause();music.pause();}else if(!muted&&!title)startAudio();});
$('title-mina').src=ASSETS.mina;$('sound').setAttribute('aria-pressed',!muted);$('sound').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');$('continue').hidden=!storage.get('checkpoint',null);setStageUI();
let previous=performance.now();
function tick(now){const realDt=Math.min(.1,(now-previous)/1000);previous=now;
  if(!title&&!modal&&!document.hidden){const scaled=realDt*speed,steps=Math.max(1,Math.ceil(scaled/(1/60))),dt=scaled/steps;for(let i=0;i<steps&&!modal;i++){game.update(dt);handleEvents();}if(auto&&game.state==='build'){autoTimer-=scaled;if(autoTimer<=0)startWave();}}
  if(!title){renderer.draw(game,modal?0:realDt);hudTimer+=realDt;if(hudTimer>.1){hudTimer=0;updateHUD();}}
  if(now>toastUntil)$('toast').classList.remove('visible');requestAnimationFrame(tick);
}
Promise.all(renderer.ready).then(()=>requestAnimationFrame(tick));
window.PSY2050_TD=Object.freeze({snapshot:()=>({...game.snapshot(),title,paused:modal,selectedType,selectedId,speed,auto,progress:[...progress]})});
if(testMode)window.__TD_TEST__={get game(){return game;},advance(seconds){for(let n=0;n<seconds*60&&!modal;n++){game.update(1/60);handleEvents();}updateHUD();renderer.draw(game);},clickMap,beginStage,closeModal,saveCheckpoint,result,renderer,restore,updateHUD};
