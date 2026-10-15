// PSY2050 simulation. Coordinates and constants follow the Unity scene/prefabs.
// Browser code only supplies input, schedules source data, renders and plays audio.
const CAP: i32 = 2048;
const STRIDE: i32 = 12;
const actors = new StaticArray<f64>(CAP * STRIDE);
const beams = new StaticArray<f64>(4 * 6);
const state = new StaticArray<f64>(20);
let px: f64 = 0, py: f64 = -5, alive: bool = true;
let invincible: f64 = 0, elapsed: f64 = 0, held: f64 = 0, cooldown: f64 = 0;
let scale: f64 = 1, power: i32 = 1, score: i32 = 0;
let bossMode: i32 = 0, bossPhase: i32 = 0;
let bx: f64 = 0, by: f64 = 23, hp: f64 = 1000, bossTime: f64 = 0;
let bossDone: bool = false, bossKilled: bool = false, wallTimer: f64 = 0;
let shotEvents: i32 = 0, hitEvents: i32 = 0, deathEvents: i32 = 0, frame: i32 = 0;
let rng: u32 = 2050;

export function statePointer(): usize { return changetype<usize>(state); }
export function actorPointer(): usize { return changetype<usize>(actors); }
export function beamPointer(): usize { return changetype<usize>(beams); }
export function capacity(): i32 { return CAP; }
function rand(): f64 { rng ^= rng << 13; rng ^= rng >> 17; rng ^= rng << 5; return <f64>rng / 4294967296.0; }
function clamp(x: f64, low: f64, high: f64): f64 { return Math.max(low, Math.min(x, high)); }
function dist(x: f64, y: f64): f64 { return Math.sqrt(x*x+y*y); }
function approach(x: f64, target: f64, amount: f64): f64 { return x < target ? Math.min(target,x+amount) : Math.max(target,x-amount); }
function slot(): i32 { for (let i=0;i<CAP;i++) if (unchecked(actors[i*STRIDE])==0) return i*STRIDE; return -1; }
function add(kind: i32, x: f64, y: f64, vx: f64=0, vy: f64=0, subtype: i32=0): i32 {
  let n=slot(); if(n<0) return -1;
  for(let j=0;j<STRIDE;j++) unchecked(actors[n+j]=0);
  unchecked(actors[n]=kind); unchecked(actors[n+1]=x); unchecked(actors[n+2]=y);
  unchecked(actors[n+3]=vx); unchecked(actors[n+4]=vy); unchecked(actors[n+5]=subtype);
  return n;
}
function publish(): void {
  state[0]=px; state[1]=py; state[2]=alive?1:0; state[3]=scale; state[4]=power;
  state[5]=elapsed; state[6]=bx; state[7]=by; state[8]=hp; state[9]=bossPhase;
  state[10]=bossMode; state[11]=bossDone?1:0; state[12]=invincible;
  state[13]=score; state[14]=shotEvents; state[15]=hitEvents; state[16]=deathEvents;
  state[17]=bossKilled?1:0; state[18]=held; state[19]=frame;
}
export function reset(seed: u32 = 2050): void {
  for(let j=0;j<CAP*STRIDE;j++) actors[j]=0;
  for(let j=0;j<24;j++) beams[j]=0;
  px=0;py=-5;alive=true;invincible=0;elapsed=0;held=0;cooldown=0;scale=1;power=1;
  score=0;bossMode=0;bossPhase=0;by=23;bx=0;hp=1000;bossTime=0;
  bossDone=false;bossKilled=false;wallTimer=0;shotEvents=0;hitEvents=0;deathEvents=0;frame=0;rng=seed;
  publish();
}
export function spawnEnemy(x: f64, type: i32, movement: i32, attack: i32, interval: f64): void {
  let n=add(1,x,24,0,0,type); if(n<0)return;
  actors[n+6]=type==3?15:type==2?1:5;
  actors[n+7]=movement;actors[n+8]=attack;actors[n+9]=Math.max(0.1,interval);actors[n+10]=0;
}
export function setBoss(mode: i32): void {
  if(mode==0){bossMode=1;by=23;hp=1000;bossDone=false;bossKilled=false;bossPhase=0;}
  if(mode==1){bossMode=2;bossTime=0;bossPhase=1;hp=600;wallTimer=0;}
  if(mode==2){bossMode=0;for(let j=0;j<24;j++)beams[j]=0;}
  publish();
}
export function revive(): void {
  alive=true;px=0;py=-5;invincible=3;held=0;power=1;scale=1;publish();
}
export function release(): void { held=0;power=1;publish(); }
export function protect(seconds: f64): void { invincible=seconds; publish(); }
function die(): void {
  if(!alive||invincible>0)return;
  alive=false;deathEvents++;add(4,px,py);publish();
}
function shootBullet(x: f64,y: f64,vx: f64,vy: f64,type: i32): void { add(3,x,y,vx,vy,type); }
function attack(n: i32): void {
  let x=actors[n+1],y=actors[n+2],type=<i32>actors[n+5],a=<i32>actors[n+8];
  let dx=px-x,dy=py-y,d=dist(dx,dy);if(d<0.0001){dx=0;dy=-1;d=1;}
  dx/=d;dy/=d;
  if(a==0)shootBullet(x,y,dx*8,dy*8,type);
  if(a==1){
    shootBullet(x,y,-8,0,type);shootBullet(x,y,8,0,type);
    for(let sx=-1;sx<=1;sx+=2)for(let sy=-1;sy<=1;sy+=2)shootBullet(x,y,sx*5.656854,sy*5.656854,type);
  }
  if(a==2){
    shootBullet(x,y,dx*8,dy*8,type);
    shootBullet(x,y,(dx-dy)*5.656854,(dx+dy)*5.656854,type);
    shootBullet(x,y,(dx+dy)*5.656854,(dy-dx)*5.656854,type);
  }
  if(a==3){shootBullet(x+(x<0?4:-4),y,0,-8,type);actors[n+10]=360;}
  if(a==4){
    shootBullet(x,y,0,-8,type);
    for(let sx=-1;sx<=1;sx+=2)for(let sy=-1;sy<=1;sy+=2)shootBullet(x,y,sx*5.656854,sy*5.656854,type);
  }
}
function beam(index: i32,x: f64,y: f64,angle: f64,length: f64,width: f64): void {
  let b=index*6;beams[b]=1;beams[b+1]=x;beams[b+2]=y;beams[b+3]=angle;beams[b+4]=length;beams[b+5]=width;
  let dx=px-x,dy=py-y,c=Math.cos(angle),s=Math.sin(angle);
  let along=dx*c+dy*s,across=-dx*s+dy*c;
  if(along>0.65&&along<length&&Math.abs(across)<width/2+0.20)die();
}
function updateBoss(dt: f64): void {
  for(let j=0;j<24;j++) beams[j]=0;
  if(bossMode==0)return;
  if(bossMode==1){by=approach(by,15,dt*5);return;}
  if(bossDone)return;
  if(alive&&Math.abs(px-bx)<1.5&&Math.abs(py-by)<1.8)die();
  by=approach(by,bossPhase==3?20:8,dt*5);
  if(by>8.1&&bossPhase!=3)return;
  bossTime+=dt;
  if(bossPhase==1&&(hp<400||bossTime>30)){bossPhase=2;hp=400;}
  if(bossPhase==2&&(hp<200||bossTime>60)){bossPhase=3;hp=200;wallTimer=0;}
  if(hp<=0){bossKilled=true;bossDone=true;bossPhase=4;hitEvents++;add(4,bx,by);return;}
  if(bossPhase==3&&(hp<30||bossTime>80)){bossKilled=hp<30;bossDone=true;bossPhase=4;return;}
  if(bossPhase==1){
    let sweep=Math.sin(bossTime*0.8726646)*0.785398;
    beam(0,bx,by,-Math.PI+sweep,38,0.9);
    beam(1,bx,by,-sweep,38,0.9);
  }
  if(bossPhase==2){
    let cycle=bossTime*0.8726646;
    let sweep=Math.abs((cycle%(Math.PI*4))-Math.PI*2)-Math.PI;
    for(let k=0;k<4;k++)beam(k,bx,by,sweep+k*Math.PI/2+Math.PI/4,40,0.9);
  }
  if(bossPhase==3){
    wallTimer-=dt;
    if(wallTimer<=0){
      wallTimer=2;
      let n=add(5,-10,by-3,0,-(3+rand()*3));
      if(n>=0){actors[n+6]=2+rand()*5;actors[n+7]=10;}
    }
    if(bossTime>70){
      let sweep=Math.sin(bossTime*0.8726646)*0.785398;
      beam(0,bx,by,-Math.PI+sweep,38,0.9);beam(1,bx,by,-sweep,38,0.9);
    }
  }
}
export function step(realDt: f64, targetX: f64, targetY: f64, firing: i32, keys: i32): void {
  realDt=clamp(realDt,0,0.05);frame++;
  if(alive){
    if(firing){
      if(targetX>-100){px=targetX;py=targetY;}
      held+=realDt;power=<i32>Math.min(4,1+Math.floor(held/5));
      scale=1-0.1*(power-1);
    }else{held=0;power=1;scale=approach(scale,1,realDt*0.3);}
    // Added keyboard equivalent for the original pointer control.
    let speed=realDt*12;
    if(keys&1)px-=speed;if(keys&2)px+=speed;if(keys&4)py+=speed;if(keys&8)py-=speed;
    px=clamp(px,-8.309301,8.309301);py=clamp(py,-7.848835,21.848835);
  }
  let dt=realDt*scale;elapsed+=dt;invincible=Math.max(0,invincible-realDt);
  cooldown-=dt;
  if(!firing)cooldown=Math.max(0,cooldown); // Idle time must never accumulate a burst of overdue shots.
  if(alive&&firing&&cooldown<=0){add(2,px,py+1.102,0,50);cooldown+=0.1;shotEvents++;}
  updateBoss(dt);
  for(let i=0;i<CAP;i++){
    let n=i*STRIDE,kind=<i32>actors[n];if(kind==0)continue;
    let x=actors[n+1],y=actors[n+2];
    actors[n+11]+=dt;
    if(kind==1){
      let m=<i32>actors[n+7],dx: f64=0,dy: f64=-6;
      if(m==1){let d=dist(px-x,py-y);dx=d>0?(px-x)/d*6:0;}
      if(m==2){dx=3;dy=-5.196152;}
      if(m==3){dx=-3;dy=-5.196152;}
      if(m==4||m==5){let a=Math.min(75,5+Math.pow(1.01,actors[n+11]*60))*Math.PI/180;dx=Math.sin(a)*6*(m==4?1:-1);dy=-Math.cos(a)*6;}
      if(m==6&&y<=12){dy=0;dx=0;}
      if(m==23){dy=0;dx=0;}
      x+=dx*dt;y+=dy*dt;
      actors[n+10]-=dt;
      if(actors[n+10]<=0&&alive){attack(n);actors[n+10]+=actors[n+9];}
      if(alive&&dist(px-x,py-y)<1.50)die();
    }else if(kind==2||kind==3){
      x+=actors[n+3]*dt;y+=actors[n+4]*dt;
      if(kind==3&&alive&&Math.abs(px-x)<0.4&&Math.abs(py-y)<0.45){die();actors[n]=0;}
      if(kind==2){
        if(bossMode==2&&!bossDone&&Math.abs(x-bx)<1.5&&Math.abs(y-by)<2.1){hp-=1;actors[n]=0;}
        else for(let j=0;j<CAP;j++){
          let e=j*STRIDE;
          if(actors[e]==1&&Math.abs(x-actors[e+1])<1.25&&Math.abs(y-actors[e+2])<1.55){
            actors[e+6]-=1;actors[n]=0;
            if(actors[e+6]<=0){add(4,actors[e+1],actors[e+2]);actors[e]=0;score+=100;hitEvents++;}
            break;
          }
        }
      }
    }else if(kind==4){if(actors[n+11]>.65)actors[n]=0;}
    else if(kind==5){
      y+=actors[n+4]*dt;
      if(alive&&px>=x&&px<=x+actors[n+6]&&Math.abs(py-y)<0.6)die();
    }
    actors[n+1]=x;actors[n+2]=y;
    if(x< -25||x>25||y< -15||y>45)actors[n]=0;
  }
  publish();
}
reset();
