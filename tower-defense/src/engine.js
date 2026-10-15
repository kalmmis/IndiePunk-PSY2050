import {TOWERS,ENEMIES,STAGES,makePath,waveList} from './data.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class DefenseGame {
  constructor(stage=0) {this.reset(stage);}
  reset(stage=0) {
    this.stage=stage; this.config=STAGES[stage]; this.path=makePath(this.config.path);
    this.money=this.config.money;this.life=20;this.wave=0;this.state='build';this.time=0;
    this.towers=[];this.enemies=[];this.effects=[];this.events=[];this.kills=0;this.spent=0;
    this.queue=[];this.spawnTimer=0;this.nextId=1;this.rift=0;this.riftCooldown=0;this.waveKills=0;
  }
  emit(type,data={}) {this.events.push({type,...data});}
  drainEvents() {return this.events.splice(0);}
  canBuild(x,y) {return ['build','wave'].includes(this.state)&&this.config.pads.some(p=>p[0]===x&&p[1]===y)&&!this.towers.some(t=>t.x===x+.5&&t.y===y+.5);}
  build(type,x,y) {
    const def=TOWERS[type]; if(!def||!this.canBuild(x,y)||this.money<def.cost) return null;
    const t={id:this.nextId++,type,x:x+.5,y:y+.5,level:1,invested:def.cost,cooldown:.15,locked:0,target:'first',angle:0,kills:0};
    this.money-=def.cost;this.spent+=def.cost;this.towers.push(t);this.emit('build',{id:t.id});return t;
  }
  stats(t) {
    const d=TOWERS[t.type],l=t.level-1;
    let buff=1;
    for(const s of this.towers) if(s.type==='serin'&&s.locked<=0&&distance(t,s)<=TOWERS.serin.range+(s.level-1)*.3) buff=Math.max(buff,1.25+(s.level-1)*.1);
    return {damage:d.damage*[1,1.7,2.7][l]*buff,interval:d.interval*[1,.91,.8][l],range:d.range+l*.3,
      upgrade:Math.round(d.cost*[0,.85,1.35][t.level]||0),buff,slow:.45+l*.08,income:14+l*6};
  }
  upgrade(id) {
    const t=this.towers.find(t=>t.id===id); if(!t||t.level>=3||!['build','wave'].includes(this.state))return false;
    const cost=this.stats(t).upgrade;if(this.money<cost)return false;
    this.money-=cost;this.spent+=cost;t.invested+=cost;t.level++;this.emit('upgrade',{id});return true;
  }
  sell(id) {
    if(!['build','wave'].includes(this.state))return 0;
    const i=this.towers.findIndex(t=>t.id===id);if(i<0)return 0;
    const amount=Math.floor(this.towers[i].invested*.7);this.money+=amount;this.towers.splice(i,1);this.emit('sell');return amount;
  }
  setTarget(id,mode) {const t=this.towers.find(t=>t.id===id);if(t&&['first','strong','near'].includes(mode))t.target=mode;}
  startWave() {
    if(this.state!=='build'||this.wave>=6)return false;
    this.wave++;this.queue=waveList(this.stage,this.wave);this.spawnTimer=.75;this.state='wave';this.waveKills=0;
    this.emit('wave',{wave:this.wave,boss:this.wave===6});return true;
  }
  activateRift() {
    if(this.state!=='wave'||this.riftCooldown>0)return false;
    this.rift=4;this.riftCooldown=32;this.emit('rift');return true;
  }
  point(progress) {
    const i=Math.min(this.path.length-1,Math.floor(progress)),a=this.path[i],b=this.path[Math.min(i+1,this.path.length-1)],f=progress-i;
    return {x:a[0]+.5+(b[0]-a[0])*f,y:a[1]+.5+(b[1]-a[1])*f};
  }
  spawn(type,progress=0) {
    const boss=type==='boss',d=boss?this.config.boss:ENEMIES[type];
    const scale=boss?1:1+this.stage*.25+(this.wave-1)*.075;
    const e={id:this.nextId++,type,boss,hp:d.hp*scale,maxHp:d.hp*scale,speed:d.speed,armor:d.armor||0,shield:(d.shield||0)*scale,
      reward:boss?180:d.reward,leak:boss?20:d.leak,progress,slow:0,slowPower:0,skill:boss?4:0,phase:1,...this.point(progress)};
    this.enemies.push(e);if(boss)this.emit('boss',{name:d.name});return e;
  }
  hit(e,amount,pierce=false,source=null) {
    if(e.hp<=0)return;
    let value=amount*(pierce?1:1-e.armor);
    if(e.boss&&this.config.boss.id==='reina'&&e.phase===2&&e.skill<1.5)value*=.65;
    if(e.shield>0){const absorbed=Math.min(e.shield,value);e.shield-=absorbed;value-=absorbed;}
    e.hp-=value;
    if(e.hp<=0){this.money+=e.reward;this.kills++;this.waveKills++;if(source)source.kills++;this.emit('kill',{boss:e.boss,x:e.x,y:e.y,color:e.boss?this.config.boss.color:ENEMIES[e.type].color});}
  }
  attack(t,targets) {
    const d=TOWERS[t.type],s=this.stats(t),e=targets[0]; if(!e)return;
    t.angle=Math.atan2(e.y-t.y,e.x-t.x);
    const fx=(kind,from,to,extra={})=>this.effects.push({kind,from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},color:d.color,life:.28,maxLife:.28,...extra});
    if(d.kind==='slow') {
      for(const enemy of targets){enemy.slow=1.6;enemy.slowPower=Math.max(enemy.slowPower,s.slow);this.hit(enemy,s.damage,false,t);}
      fx('ring',t,t,{radius:s.range,life:.7,maxLife:.7});
    } else if(d.kind==='chain') {
      let from=t,enemy=e;const seen=new Set();
      for(let n=0;n<2+t.level&&enemy;n++) {
        seen.add(enemy.id);this.hit(enemy,s.damage*Math.pow(.8,n),false,t);fx('chain',from,enemy);from=enemy;
        enemy=this.enemies.filter(a=>a.hp>0&&!seen.has(a.id)&&distance(a,from)<2.1).sort((a,b)=>distance(a,from)-distance(b,from))[0];
      }
    } else if(d.kind==='splash') {
      for(const enemy of this.enemies) if(enemy.hp>0&&distance(enemy,e)<1.05+(t.level-1)*.22)this.hit(enemy,s.damage,false,t);
      fx('arc',t,e);fx('burst',e,e,{radius:1.05+(t.level-1)*.22,life:.55,maxLife:.55});
    } else if(d.kind==='beam') {
      const dx=e.x-t.x,dy=e.y-t.y,len=Math.hypot(dx,dy),end={x:t.x+dx/len*s.range,y:t.y+dy/len*s.range};
      for(const a of this.enemies) {
        const dot=((a.x-t.x)*dx+(a.y-t.y)*dy)/len;
        const perp=Math.abs((a.x-t.x)*dy-(a.y-t.y)*dx)/len;
        if(a.hp>0&&dot>=0&&dot<s.range+.2&&perp<.34+(t.level-1)*.05)this.hit(a,s.damage,true,t);
      }
      fx('beam',t,end);
    } else {
      const count=t.level===3?3:1;
      for(let n=0;n<count;n++){this.hit(e,s.damage/count,false,t);fx('bolt',t,e,{offset:(n-(count-1)/2)*.14});}
    }
    this.emit('shot',{kind:d.kind});
  }
  bossSkill(e) {
    const id=this.config.boss.id;
    if(id==='reina') {
      this.towers.slice().sort((a,b)=>distance(a,e)-distance(b,e)).slice(0,2).forEach(t=>{t.locked=2.1;});e.skill=6;
      this.emit('ability',{text:'레이나 · 화염 봉인',color:'#ff886b'});
    }else if(id==='vesper') {
      for(const a of this.enemies) if(a.hp>0)a.shield=Math.max(a.shield,a.boss?120:38);
      e.skill=7;this.emit('ability',{text:'베스퍼 · 신호 탈취',color:'#b99aff'});
    }else {
      for(let i=0;i<(e.phase===1?2:4);i++)this.spawn('swarm',Math.max(0,e.progress-i*.4));
      e.skill=8;this.emit('ability',{text:'오르페 · 기억의 군체',color:'#80d3df'});
    }
    this.effects.push({kind:'hostile',from:{x:e.x,y:e.y},to:{x:e.x,y:e.y},radius:3,color:this.config.boss.color,life:.9,maxLife:.9});
  }
  update(dt) {
    if(!['build','wave'].includes(this.state))return;
    dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
    this.effects.forEach(e=>e.life-=dt);this.effects=this.effects.filter(e=>e.life>0);
    this.rift=Math.max(0,this.rift-dt);this.riftCooldown=Math.max(0,this.riftCooldown-dt);
    this.towers.forEach(t=>{t.locked=Math.max(0,t.locked-dt);});
    if(this.state!=='wave')return;
    this.spawnTimer-=dt;
    if(this.queue.length&&this.spawnTimer<=0){const type=this.queue.shift();this.spawn(type);this.spawnTimer=type==='swarm'?.3:.68;}
    for(const e of [...this.enemies]) {
      if(e.hp<=0)continue;
      e.slow=Math.max(0,e.slow-dt);if(e.slow===0)e.slowPower=0;
      let speed=e.speed*(e.slow>0?1-e.slowPower:1)*(this.rift>0?.24:1);
      if(e.boss) {
        e.skill-=dt;if(e.hp<e.maxHp*.5&&e.phase===1){e.phase=2;this.emit('phase',{name:this.config.boss.name});}
        if(e.phase===2&&this.config.boss.id==='orphe')speed*=1.25;
        if(e.skill<=0)this.bossSkill(e);
      }
      e.progress+=dt*speed;
      Object.assign(e,this.point(e.progress));
      if(e.progress>=this.path.length-1+.5){e.escaped=true;e.hp=0;this.life=Math.max(0,this.life-e.leak);this.emit('leak',{amount:e.leak});}
    }
    if(this.life<=0){this.state='defeat';this.emit('defeat');return;}
    for(const t of this.towers) {
      if(t.locked>0||t.type==='serin')continue;
      const s=this.stats(t);let jam=1;
      if(this.enemies.some(e=>e.hp>0&&(e.type==='jammer'||(e.boss&&this.config.boss.id==='vesper'))&&distance(e,t)<2.6))jam=.58;
      t.cooldown-=dt*jam;if(t.cooldown>0)continue;
      const targets=this.enemies.filter(e=>e.hp>0&&distance(e,t)<=s.range);
      targets.sort(t.target==='strong'?(a,b)=>(b.hp+b.shield)-(a.hp+a.shield):t.target==='near'?(a,b)=>distance(a,t)-distance(b,t):(a,b)=>b.progress-a.progress);
      if(targets.length){this.attack(t,targets);t.cooldown=s.interval;}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
    if(!this.queue.length&&!this.enemies.length) {
      const income=this.towers.filter(t=>t.type==='serin').reduce((n,t)=>n+this.stats(t).income,0);
      const reward=30+this.wave*7+income;this.money+=reward;
      this.state=this.wave===6?'victory':'build';
      this.emit(this.state==='victory'?'victory':'waveClear',{reward,stars:this.life>=20?3:this.life>=12?2:1});
    }
  }
  snapshot() {return {stage:this.stage,state:this.state,wave:this.wave,money:this.money,life:this.life,kills:this.kills,queued:this.queue.length,rift:this.rift,riftCooldown:this.riftCooldown,
    towers:this.towers.map(t=>({...t,stats:this.stats(t)})),enemies:this.enemies.map(e=>({...e})),time:this.time};}
}
