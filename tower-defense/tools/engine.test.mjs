import test from 'node:test';
import assert from 'node:assert/strict';
import {DefenseGame} from '../src/engine.js';
import {STAGES,TOWERS,ENEMIES,makePath,waveList,COLS,ROWS} from '../src/data.js';
const advance=(g,seconds)=>{for(let i=0;i<seconds*60;i++)g.update(1/60);};

test('three connected, nonintersecting routes and legal deployment pads',()=>{
  assert.equal(STAGES.length,3);
  for(const s of STAGES){
    const path=makePath(s.path),seen=new Set();
    for(let i=0;i<path.length;i++){
      const [x,y]=path[i];assert.ok(x>=0&&x<COLS&&y>=0&&y<ROWS);assert.ok(!seen.has(`${x},${y}`));seen.add(`${x},${y}`);
      if(i)assert.equal(Math.abs(path[i-1][0]-x)+Math.abs(path[i-1][1]-y),1);
    }
    assert.equal(new Set(s.pads.map(p=>p.join(','))).size,s.pads.length);
    for(const p of s.pads)assert.ok(!seen.has(p.join(',')));
  }
});
test('18 waves preserve mixed enemy counts and each final wave has exactly one boss',()=>{
  for(let s=0;s<3;s++)for(let w=1;w<=6;w++){
    const list=waveList(s,w),row=STAGES[s].waves[w-1];
    for(let n=0;n<row.length;n+=2)assert.equal(list.filter(k=>k===row[n]).length,row[n+1]);
    assert.equal(list.filter(k=>k==='boss').length,w===6?1:0);if(w===6)assert.equal(list.at(-1),'boss');
  }
});
test('placement, currency, duplicate rejection, three upgrade levels and 70% refund',()=>{
  const g=new DefenseGame();assert.equal(g.build('mina',0,3),null);assert.equal(g.build('missing',1,2),null);
  const t=g.build('mina',1,2);assert.ok(t);assert.equal(g.money,350);assert.equal(g.build('rita',1,2),null);
  assert.ok(g.upgrade(t.id));assert.ok(g.upgrade(t.id));assert.equal(t.level,3);assert.equal(g.upgrade(t.id),false);
  const before=g.money,refund=g.sell(t.id);assert.equal(refund,Math.floor((90+77+122)*.7));assert.equal(g.money,before+refund);assert.equal(g.towers.length,0);
  g.money=0;assert.equal(g.build('mina',3,2),null);assert.equal(g.sell(-1),0);
});
test('towers stay fixed while enemies follow every bend of the route',()=>{
  const g=new DefenseGame();const t=g.build('mina',15,2),xy=[t.x,t.y];g.startWave();g.queue=[];const e=g.spawn('drone');
  advance(g,12);assert.deepEqual([t.x,t.y],xy);assert.ok(e.progress>10);
  const p=g.point(e.progress);assert.deepEqual([e.x,e.y],[p.x,p.y]);
});
test('kills pay once, shield absorbs first, and armor-piercing ignores armor',()=>{
  const g=new DefenseGame();g.wave=1;const e=g.spawn('tank'),hp=e.hp;
  g.hit(e,50);assert.ok(Math.abs(e.hp-(hp-50*(1-ENEMIES.tank.armor)))<.001);
  g.hit(e,50,true);assert.ok(Math.abs(e.hp-(hp-79))<.001);
  const shield=g.spawn('shield'),old=shield.hp;g.hit(shield,10,true);assert.equal(shield.hp,old);assert.equal(shield.shield,32);
  const money=g.money;g.hit(e,10000);g.hit(e,10000);assert.equal(g.money,money+e.reward);assert.equal(g.kills,1);
});
test('chain, splash, time field and beam hit distinct target sets',()=>{
  for(const type of ['rita','haeun','time','yul']){
    const g=new DefenseGame();g.money=1000;const t=g.build(type,6,4);g.wave=1;
    const a=g.spawn('tank'),b=g.spawn('tank'),far=g.spawn('tank');Object.assign(a,{x:7,y:4.5});Object.assign(b,{x:7.3,y:4.6});Object.assign(far,{x:15,y:10});
    const hp=a.hp;g.attack(t,[a,b]);assert.ok(a.hp<hp,type);assert.ok(b.hp<hp,type);assert.equal(far.hp,hp,type);
    if(type==='time'){assert.ok(a.slow>0);assert.equal(a.slowPower,.45);}
    if(type==='yul')assert.equal(a.hp,hp-TOWERS.yul.damage);
  }
});
test('support uses the strongest nearby aura, stops when sealed, and pays wave income',()=>{
  const g=new DefenseGame();g.money=1000;const t=g.build('mina',6,4),s=g.build('serin',6,6),s2=g.build('serin',4,4);
  assert.equal(g.stats(t).buff,1.25);g.upgrade(s.id);assert.equal(g.stats(t).buff,1.35);
  s.locked=2;assert.equal(g.stats(t).buff,1.25);s2.locked=2;assert.equal(g.stats(t).buff,1);
  g.startWave();g.queue=[];const money=g.money;g.update(1/60);assert.equal(g.state,'build');assert.equal(g.money-money,37+20+14);
});
test('time rift slows movement, has a real cooldown and cannot activate during preparation',()=>{
  const g=new DefenseGame();assert.equal(g.activateRift(),false);g.startWave();g.queue=[];
  const e=g.spawn('drone');assert.ok(g.activateRift());assert.equal(g.activateRift(),false);advance(g,1);
  assert.ok(Math.abs(e.progress-ENEMIES.drone.speed*.24)<.001);assert.ok(g.riftCooldown>30);assert.ok(g.rift>2.9);
});
test('bosses seal towers, shield allies and summon echoes; phases and leaks are consequential',()=>{
  for(let stage=0;stage<3;stage++){
    const g=new DefenseGame(stage);g.startWave();g.queue=[];const [x,y]=g.config.pads[0],t=g.build('mina',x,y),boss=g.spawn('boss');
    const e=g.spawn('drone');g.bossSkill(boss);
    if(stage===0)assert.ok(t.locked>0);if(stage===1)assert.ok(boss.shield>0&&e.shield>0);if(stage===2)assert.equal(g.enemies.filter(a=>a.type==='swarm').length,2);
    boss.hp=boss.maxHp*.49;g.update(1/60);assert.equal(boss.phase,2);
    boss.progress=g.path.length;g.update(1/60);assert.equal(g.life,0);assert.equal(g.state,'defeat');assert.equal(g.sell(t.id),0);
  }
});
test('an undefended route loses life; complete failure freezes the simulation',()=>{
  const g=new DefenseGame();g.startWave();g.queue=[];g.spawn('tank',g.path.length);g.update(1/60);assert.equal(g.life,17);
  g.startWave();g.queue=[];g.spawn('boss',g.path.length);g.update(1/60);assert.equal(g.state,'defeat');
  const before=g.snapshot();advance(g,20);assert.deepEqual(g.snapshot(),before);
});

const layouts=[[[6,4,'mina'],[6,6,'time'],[10,6,'rita'],[10,4,'yul'],[4,6,'haeun'],[8,9,'mina'],[6,2,'serin']],[[8,5,'mina'],[10,6,'time'],[10,3,'rita'],[12,8,'yul'],[8,8,'haeun'],[4,3,'mina'],[7,3,'serin']],[[4,5,'mina'],[3,7,'time'],[6,5,'rita'],[10,7,'yul'],[3,9,'haeun'],[12,7,'mina'],[6,3,'serin']]];
for(let stage=0;stage<3;stage++)test(`full stage ${stage+1}: all six waves and boss are beatable with only earned currency`,()=>{
  const g=new DefenseGame(stage),origins=new Map();let bosses=0;
  const spend=()=>{
    for(const [x,y,type]of layouts[stage])if(!g.towers.some(t=>t.x===x+.5&&t.y===y+.5)){const t=g.build(type,x,y);if(!t)return;origins.set(t.id,[t.x,t.y]);}
    for(let level=1;level<3;level++)for(const t of g.towers.filter(t=>!['serin','time'].includes(t.type)))if(t.level===level&&!g.upgrade(t.id))return;
  };
  for(let wave=1;wave<=6;wave++){
    spend();assert.ok(g.startWave());assert.equal(g.startWave(),false);
    for(let i=0;i<180*60&&g.state==='wave';i++){
      if(i%60===0)spend();if(g.enemies.some(e=>e.boss&&e.progress>5))g.activateRift();g.update(1/60);
      for(const e of g.drainEvents())if(e.type==='boss')bosses++;
      assert.ok(g.money>=0);
    }
    assert.equal(g.state,wave===6?'victory':'build');assert.equal(g.wave,wave);
  }
  assert.equal(bosses,1);assert.equal(g.life,20);assert.ok(g.kills>70);
  for(const t of g.towers)assert.deepEqual([t.x,t.y],origins.get(t.id));
  assert.equal(g.startWave(),false);
});
