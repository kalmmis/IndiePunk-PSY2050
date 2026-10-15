// FPS simulation runs entirely in WebAssembly. All times are seconds and distances metres.
import { coverData, coverOffsets, spawnData, spawnOffsets } from './world.generated';
const CAP: i32 = 256, STRIDE: i32 = 16;
const entities = new StaticArray<f64>(CAP * STRIDE);
// 0..39: combat; 40..48: teleport destination/valid/preview/event/origin/reason;
// 49: last spell kind; 50: meditation; 51: max mana; 52: blink flash; 53: charged casts.
const state = new StaticArray<f64>(54);
let x: f64=0, y: f64=0, z: f64=14, yaw: f64=0, pitch: f64=0, vy: f64=0;
let hp: f64=100, mana: f64=100, charge: f64=0, energy: f64=100, scale: f64=1;
let stage: i32=0, wave: i32=0, status: i32=0, score: i32=0, kills: i32=0;
let cooldown: f64=0, invuln: f64=0, dash: f64=0, shield: f64=50, shieldDelay: f64=0;
let elapsed: f64=0, waveWait: f64=2, shots: i32=0, hits: i32=0, hurts: i32=0, heads: i32=0;
let hitX: f64=0, hitY: f64=0, hitZ: f64=0, hitCount: i32=0, stageKills: i32=0;
let bossHp: f64=0, bossMax: f64=0, bossPhase: i32=0, totalScore: i32=0, totalKills: i32=0;
let rng: u32=2050, slowLocked: bool=false, grounded: bool=true, firingNow: bool=false;
let blinkX:f64=0,blinkZ:f64=0,blinkValid:bool=false,blinkPreview:bool=false,blinkEvents:i32=0;
let blinkFromX:f64=0,blinkFromZ:f64=0,blinkReason:i32=0,blinkFlash:f64=0;
let spellKind:i32=0,meditating:bool=false,chargedCasts:i32=0;
export function statePointer(): usize { return changetype<usize>(state); }
export function entityPointer(): usize { return changetype<usize>(entities); }
export function capacity(): i32 { return CAP; }
function clamp(v:f64,a:f64,b:f64):f64 { return Math.max(a,Math.min(b,v)); }
function len(a:f64,b:f64):f64 { return Math.sqrt(a*a+b*b); }
function random():f64 { rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return <f64>rng/4294967296.0; }
function add(kind:i32,ex:f64,ey:f64,ez:f64):i32 {
  for(let i=0;i<CAP;i++){let n=i*STRIDE;if(entities[n]!=0)continue;
    for(let j=0;j<STRIDE;j++)entities[n+j]=0;
    entities[n]=kind;entities[n+1]=ex;entities[n+2]=ey;entities[n+3]=ez;
    entities[n+14]=random()*6.283185;return n;
  }return -1;
}
function aliveCount():i32 { let count=0;for(let i=0;i<CAP;i++)if(entities[i*STRIDE]==1||entities[i*STRIDE]==5)count++;return count; }
function publish():void {
  state[0]=x;state[1]=y;state[2]=z;state[3]=yaw;state[4]=pitch;state[5]=hp;state[6]=mana;
  state[7]=charge;state[8]=energy;state[9]=scale;state[10]=stage;state[11]=wave;state[12]=status;
  state[13]=score;state[14]=kills;state[15]=aliveCount();state[16]=shots;state[17]=hits;state[18]=hurts;
  state[19]=elapsed;state[20]=bossHp;state[21]=bossMax;state[22]=shots;state[23]=heads;
  state[24]=hitX;state[25]=hitY;state[26]=hitZ;state[27]=shield;state[28]=dash;
  state[29]=3;state[30]=waveWait;let count=0;for(let i=0;i<CAP;i++)if(entities[i*STRIDE]==2)count++;
  state[31]=count;state[32]=bossPhase;state[33]=hitCount;state[34]=slowLocked?1:0;
  state[35]=stageKills;state[36]=scale<1?1:0;state[37]=firingNow?1:0;state[38]=invuln;state[39]=grounded?1:0;
  state[40]=blinkX;state[41]=0;state[42]=blinkZ;state[43]=blinkValid?1:0;state[44]=blinkPreview?1:0;
  state[45]=blinkEvents;state[46]=blinkFromX;state[47]=blinkFromZ;state[48]=blinkReason;
  state[49]=spellKind;state[50]=meditating?1:0;state[51]=100;state[52]=blinkFlash;state[53]=chargedCasts;
}
export function reset(level:i32,seed:u32,carry:i32):void {
  if(carry==0){totalScore=0;totalKills=0;}else{totalScore=score;totalKills=kills;}
  for(let i=0;i<CAP*STRIDE;i++)entities[i]=0;
  stage=<i32>clamp(level,0,2);x=0;y=0;z=14;yaw=0;pitch=0;vy=0;hp=100;mana=100;charge=0;energy=100;
  scale=1;wave=0;status=0;score=totalScore;kills=totalKills;stageKills=0;cooldown=0;invuln=1;
  dash=0;shield=50;shieldDelay=0;elapsed=0;waveWait=1.5;shots=0;hits=0;hurts=0;heads=0;
  hitCount=0;bossHp=0;bossMax=0;bossPhase=0;rng=seed==0?2050:seed;slowLocked=false;grounded=true;firingNow=false;
  blinkX=0;blinkZ=14;blinkValid=false;blinkPreview=false;blinkEvents=0;blinkFromX=0;blinkFromZ=14;blinkReason=0;blinkFlash=0;
  spellKind=0;meditating=false;chargedCasts=0;publish();
}
export function look(horizontal:f64,vertical:f64):void {
  yaw=(yaw+horizontal)%(Math.PI*2);pitch=clamp(pitch+vertical,-1.35,1.35);publish();
}
// Slab intersection returns distance to a solid surface, including cover between a shot and its target.
function boxRay(ox:f64,oy:f64,oz:f64,dx:f64,dy:f64,dz:f64,cx:f64,cy:f64,cz:f64,hx:f64,hy:f64,hz:f64):f64 {
  let near:f64=0,far:f64=120;
  for(let axis=0;axis<3;axis++){
    let o=axis==0?ox:axis==1?oy:oz,d=axis==0?dx:axis==1?dy:dz;
    let c=axis==0?cx:axis==1?cy:cz,h=axis==0?hx:axis==1?hy:hz;
    if(Math.abs(d)<0.00001){if(o<c-h||o>c+h)return 120;}
    else{let a=(c-h-o)/d,b=(c+h-o)/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return 120;}
  }return near;
}
function wallDistance(ox:f64,oy:f64,oz:f64,dx:f64,dy:f64,dz:f64):f64 {
  let nearest:f64=100;
  let start=coverOffsets[stage],end=coverOffsets[stage+1];
  for(let n=start;n<end;n+=5){let d=boxRay(ox,oy,oz,dx,dy,dz,coverData[n],coverData[n+4]/2,coverData[n+1],coverData[n+2]/2,coverData[n+4]/2,coverData[n+3]/2);nearest=Math.min(nearest,d);}
  if(dy<0)nearest=Math.min(nearest,-oy/dy);
  return nearest;
}
function blocked(px:f64,pz:f64,radius:f64,feet:f64=0):bool {
  if(px<-17.25+radius||px>17.25-radius||pz<-25.25+radius||pz>17.25-radius)return true;
  let start=coverOffsets[stage],end=coverOffsets[stage+1];
  for(let n=start;n<end;n+=5){if(feet>=coverData[n+4])continue;
    let nx=clamp(px,coverData[n]-coverData[n+2]/2,coverData[n]+coverData[n+2]/2);
    let nz=clamp(pz,coverData[n+1]-coverData[n+3]/2,coverData[n+1]+coverData[n+3]/2);
    if(len(px-nx,pz-nz)<radius)return true;
  }return false;
}
function move(mx:f64,mz:f64):void {
  // Walking collides with cover. Teleportation checks only the destination.
  let steps=<i32>Math.max(1,Math.ceil(len(mx,mz)/0.15));
  for(let i=0;i<steps;i++){if(!blocked(x+mx/steps,z,0.35,y))x+=mx/steps;if(!blocked(x,z+mz/steps,0.35,y))z+=mz/steps;}
}
function damage(amount:f64):void {
  if(invuln>0||status!=0)return;hurts++;shieldDelay=5;invuln=0.24;
  let absorbed=Math.min(shield,amount);shield-=absorbed;hp-=amount-absorbed;
  if(hp<=0){hp=0;status=2;scale=1;}
}
function kill(n:i32):void {
  let ex=entities[n+1],ey=entities[n+2],ez=entities[n+3],boss=entities[n]==5;
  entities[n]=0;kills++;stageKills++;score+=boss?2000:entities[n+10]==1?250:150;
  let fx=add(3,ex,ey,ez);if(fx>=0)entities[fx+7]=boss?3:1;
  if(boss){bossHp=0;bossPhase=4;}
  else if(stageKills%4==0){let p=add(4,ex,0.5,ez);if(p>=0)entities[p+7]=25;}
  energy=Math.min(100,energy+6);
}
function castSpell(charged:bool):void {
  let cost:f64=charged?18:4;if(mana<cost)return;
  let n=add(6,x,y+1.65,z);if(n<0)return;
  let power=charged?48+charge*88:26,speed:f64=charged?38:55;
  entities[n+4]=Math.sin(yaw)*Math.cos(pitch)*speed;entities[n+5]=Math.sin(pitch)*speed;entities[n+6]=-Math.cos(yaw)*Math.cos(pitch)*speed;
  entities[n+7]=power;entities[n+10]=charged?1:0;entities[n+12]=charged?0.32:0.10;
  mana-=cost;shots++;cooldown=charged?.45:.16;spellKind=charged?2:1;if(charged)chargedCasts++;
}
function teleportTarget():void {
  blinkValid=false;blinkReason=0;
  if(pitch>=-0.025){blinkReason=2;blinkX=x+Math.sin(yaw)*18;blinkZ=z-Math.cos(yaw)*18;return;}
  let distance=(y+1.65)/(-Math.sin(pitch));
  blinkX=x+Math.sin(yaw)*Math.cos(pitch)*distance;blinkZ=z-Math.cos(yaw)*Math.cos(pitch)*distance;
  if(dash>0){blinkReason=1;return;}
  if(distance>55){blinkReason=3;return;}
  if(blocked(blinkX,blinkZ,0.4)){blinkReason=4;return;}
  blinkValid=true;
}
function teleport():void {
  teleportTarget();if(!blinkValid)return;
  blinkFromX=x;blinkFromZ=z;x=blinkX;z=blinkZ;y=0;vy=0;grounded=true;
  dash=.75;invuln=Math.max(invuln,.35);blinkEvents++;blinkFlash=.35;
}
export function spawnEnemy(ex:f64,ey:f64,ez:f64,type:i32):i32 {
  let n=add(type==2?5:1,ex,ey,ez);if(n<0)return -1;
  entities[n+7]=type==2?1000:type==1?130:76;entities[n+8]=entities[n+7];entities[n+9]=1+random();
  entities[n+10]=type;entities[n+12]=type==2?0.7:type==1?0.85:0.68;
  if(type==2){bossMax=entities[n+7];bossHp=bossMax;bossPhase=1;}publish();return n/STRIDE;
}
function spawnWave():void {
  wave++;let start=spawnOffsets[stage],count=(spawnOffsets[stage+1]-start)/2;
  if(stage==2&&wave==3){spawnEnemy(0,2.45,-15,2);spawnEnemy(-13,2.0,-16,0);spawnEnemy(13,2.0,-16,0);return;}
  let total=3+wave+stage;
  for(let i=0;i<total;i++){
    let point=start+(i%count)*2,extra=<f64>(i/count)*1.8;
    spawnEnemy(clamp(spawnData[point]+extra,-15,15),1.8+random()*0.7,spawnData[point+1],wave>=2&&i%3==0?1:0);
  }
}
function projectile(ex:f64,ey:f64,ez:f64,dx:f64,dy:f64,dz:f64,speed:f64,type:i32):void {
  let n=add(2,ex,ey,ez);if(n<0)return;entities[n+4]=dx*speed;entities[n+5]=dy*speed;entities[n+6]=dz*speed;
  entities[n+10]=type;entities[n+12]=0.22;entities[n+7]=type==2?22:12;
}
function shootAtPlayer(n:i32,boss:bool):void {
  let ex=entities[n+1],ey=entities[n+2],ez=entities[n+3];
  let dx=x-ex,dy=y+1.25-ey,dz=z-ez,d=Math.sqrt(dx*dx+dy*dy+dz*dz);
  if(d<0.01)return;dx/=d;dy/=d;dz/=d;
  if(wallDistance(ex,ey,ez,dx,dy,dz)<d-0.5)return;
  if(boss){
    for(let k=-2;k<=2;k++){let a=k*(bossPhase==3?0.16:0.11),c=Math.cos(a),s=Math.sin(a);projectile(ex,ey,ez,dx*c-dz*s,dy,dz*c+dx*s,10,2);}
  }else projectile(ex,ey,ez,dx,dy,dz,entities[n+10]==1?12:9,0);
}
// Input mask: move=1/2/4/8, sprint=16, jump=32, cast=64, time=128,
// teleport preview=256, teleport release=512, charge=1024, charged release=2048, meditate=4096.
export function step(realDt:f64,input:i32):void {
  realDt=clamp(realDt,0,0.05);if(status!=0){publish();return;}
  elapsed+=realDt;invuln=Math.max(0,invuln-realDt);dash=Math.max(0,dash-realDt);
  blinkFlash=Math.max(0,blinkFlash-realDt);
  shieldDelay=Math.max(0,shieldDelay-realDt);if(shieldDelay==0)shield=Math.min(50,shield+realDt*4);
  if(energy<=0)slowLocked=true;if(!(input&128)&&energy>=20)slowLocked=false;
  let slow=(input&128)!=0&&!slowLocked&&energy>0;
  scale=slow?0.28:1;energy=clamp(energy+realDt*(slow?-24:15),0,100);
  let forward:f64=((input&1)?1:0)-((input&2)?1:0),side:f64=((input&8)?1:0)-((input&4)?1:0);
  let norm=Math.max(1,len(forward,side)),speed:f64=(input&16)?8.0:5.2;
  let mx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)/norm,mz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)/norm;
  move(mx*speed*realDt,mz*speed*realDt);
  blinkPreview=(input&256)!=0;if(blinkPreview)teleportTarget();
  if(input&512){teleport();blinkPreview=false;}
  if((input&32)&&grounded){vy=6.5;grounded=false;}vy-=18*realDt;y+=vy*realDt;if(y<=0){y=0;vy=0;grounded=true;}
  cooldown=Math.max(0,cooldown-realDt);meditating=(input&4096)!=0;firingNow=(input&64)!=0&&!meditating;
  mana=Math.min(100,mana+realDt*(meditating?65:firingNow?12:28));
  if(!meditating&&(input&1024)){charge=Math.min(1,charge+realDt*.85);firingNow=false;}
  else if((input&2048)&&charge>=.15&&!meditating){if(cooldown==0)castSpell(true);charge=0;}
  else{charge=0;if(firingNow&&cooldown==0)castSpell(false);}
  let dt=realDt*scale;
  for(let i=0;i<CAP;i++){
    let n=i*STRIDE,kind=<i32>entities[n];if(kind==0)continue;entities[n+11]+=kind==6?realDt:dt;entities[n+13]=Math.max(0,entities[n+13]-realDt);
    let ex=entities[n+1],ey=entities[n+2],ez=entities[n+3];
    if(kind==1||kind==5){
      let boss=kind==5,dx=x-ex,dz=z-ez,d=Math.max(0.01,len(dx,dz)),age=entities[n+11],seed=entities[n+14];
      let speed=boss?1.4:entities[n+10]==1?1.5:2.6;
      let toward=d>(boss?14:9)?1:d<5?-0.7:0;
      let sx=(dx/d*toward+dz/d*Math.sin(age*0.7+seed)*0.7)*speed*dt;
      let sz=(dz/d*toward-dx/d*Math.sin(age*0.7+seed)*0.7)*speed*dt;
      if(!blocked(ex+sx,ez,entities[n+12]*0.75))ex+=sx;
      else if(!blocked(ex+Math.cos(seed+age)*speed*dt,ez,entities[n+12]*0.75))ex+=Math.cos(seed+age)*speed*dt;
      if(!blocked(ex,ez+sz,entities[n+12]*0.75))ez+=sz;
      else if(!blocked(ex,ez+Math.sin(seed+age)*speed*dt,entities[n+12]*0.75))ez+=Math.sin(seed+age)*speed*dt;
      ey=(boss?2.45:entities[n+10]==1?2.1:1.9)+Math.sin(age*1.8+seed)*(boss?.10:.28);
      entities[n+9]-=dt;
      if(boss){bossPhase=entities[n+7]<bossMax*.3?3:entities[n+7]<bossMax*.65?2:1;bossHp=entities[n+7];}
      if(entities[n+9]<=0){entities[n+9]=boss?(bossPhase==3?0.65:1.3):entities[n+10]==1?1.4:2.4;shootAtPlayer(n,boss);}
      let contact:f64=boss?2.5:1.1;
      if(d<contact&&Math.abs(ey-(y+1))<2)damage(20);
    }else if(kind==6){
      let vx=entities[n+4],vyy=entities[n+5],vz=entities[n+6],speed=Math.sqrt(vx*vx+vyy*vyy+vz*vz),travel=speed*realDt;
      let distance=wallDistance(ex,ey,ez,vx/speed,vyy/speed,vz/speed),target:i32=-1,radius=entities[n+12];
      for(let j=0;j<CAP;j++){let e=j*STRIDE;if(entities[e]!=1&&entities[e]!=5)continue;let r=entities[e+12];
        let hit=boxRay(ex,ey,ez,vx/speed,vyy/speed,vz/speed,entities[e+1],entities[e+2],entities[e+3],r+radius,(entities[e]==5?1.45:r*.72)+radius,r+radius);
        if(hit<distance&&hit<=travel){distance=hit;target=e;}
      }
      if(distance<=travel){
        hitX=ex+vx/speed*distance;hitY=ey+vyy/speed*distance;hitZ=ez+vz/speed*distance;
        if(target>=0){hits++;hitCount++;let critical=entities[target]==5?hitY>entities[target+2]+.65:Math.abs(hitY-entities[target+2])<entities[target+12]*.35;
          if(critical)heads++;entities[target+7]-=entities[n+7]*(critical?1.4:1);entities[target+13]=.18;
          if(entities[target]==5)bossHp=Math.max(0,entities[target+7]);if(entities[target+7]<=0)kill(target);
        }
        ex=hitX;ey=hitY;ez=hitZ;entities[n]=0;let fx=add(7,hitX,hitY,hitZ);if(fx>=0)entities[fx+7]=radius;
      }else{ex+=vx*realDt;ey+=vyy*realDt;ez+=vz*realDt;if(entities[n+11]>1.8||Math.abs(ex)>55||Math.abs(ez)>60)entities[n]=0;}
    }else if(kind==2){
      let vx=entities[n+4],vyy=entities[n+5],vz=entities[n+6];let speed=Math.sqrt(vx*vx+vyy*vyy+vz*vz),travel=speed*dt;
      let wall=wallDistance(ex,ey,ez,vx/speed,vyy/speed,vz/speed);
      let playerHit=boxRay(ex,ey,ez,vx/speed,vyy/speed,vz/speed,x,y+0.9,z,0.42,0.85,0.42);
      if(playerHit<=travel+0.15&&playerHit<wall){damage(entities[n+7]);entities[n]=0;}
      else if(wall<=travel||entities[n+11]>10)entities[n]=0;
      ex+=vx*dt;ey+=vyy*dt;ez+=vz*dt;
      if(Math.abs(ex)>18||ez<-27||ez>19||ey<0)entities[n]=0;
    }else if(kind==3||kind==7){if(entities[n+11]>.55)entities[n]=0;}
    else if(kind==4){if(len(x-ex,z-ez)<1.5){hp=Math.min(100,hp+25);mana=Math.min(100,mana+30);energy=Math.min(100,energy+20);entities[n]=0;}else if(entities[n+11]>25)entities[n]=0;}
    entities[n+1]=ex;entities[n+2]=ey;entities[n+3]=ez;
  }
  if(status==0&&aliveCount()==0){waveWait-=dt;if(waveWait<=0){if(wave>=3){status=1;scale=1;}else{spawnWave();waveWait=2.6;}}}
  publish();
}
reset(0,2050,0);
