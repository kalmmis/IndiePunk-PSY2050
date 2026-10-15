import {CELL,COLS,ROWS,TOWERS,ENEMIES} from './data.js';
export class Battlefield {
  constructor(canvas,assets) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.images={};this.ready=[];
    for(const [key,src] of Object.entries(assets))if(src.startsWith('data:image')){
      const img=new Image();img.src=src;this.images[key]=img;this.ready.push(img.decode().catch(()=>{}));
    }
    this.backdrop=document.createElement('canvas');this.backdrop.width=864;this.backdrop.height=576;
    this.selected=null;this.hover=null;this.type='mina';this.particles=[];this.lastStage=-1;this.uiTime=0;
  }
  line(c,points,color,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  staticMap(g) {
    const c=this.backdrop.getContext('2d');c.clearRect(0,0,864,576);
    const gradient=c.createLinearGradient(0,0,864,576);gradient.addColorStop(0,'#152326');gradient.addColorStop(.55,'#162426');gradient.addColorStop(1,'#111e22');c.fillStyle=gradient;c.fillRect(0,0,864,576);
    const pathKeys=new Set(g.path.map(p=>p.join(','))),padKeys=new Set(g.config.pads.map(p=>p.join(',')));
    const random=(x,y)=>{const z=Math.sin(x*127.1+y*311.7+g.stage*54)*43758.5453;return z-Math.floor(z);};
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) {
      const px=x*CELL,py=y*CELL,r=random(x,y),path=pathKeys.has(`${x},${y}`),pad=padKeys.has(`${x},${y}`);
      c.strokeStyle='#91b5a509';c.lineWidth=1;c.strokeRect(px+.5,py+.5,48,48);
      if(path||pad)continue;
      const nearPath=g.path.some(p=>Math.abs(p[0]-x)+Math.abs(p[1]-y)<2);
      if(r>.32&&!nearPath){
        const w=26+r*12,h=18+r*17,ox=px+5,oy=py+9;
        c.fillStyle='#060e1280';c.fillRect(ox+5,oy+9,w+4,h+10);
        c.fillStyle='#182d31';c.fillRect(ox,oy,w,h+8);
        c.fillStyle=r>.7?'#253a3e':'#203438';c.fillRect(ox,oy-4,w,h);
        c.strokeStyle='#44605b66';c.strokeRect(ox+.5,oy-3.5,w,h);
        c.fillStyle='#17282a';c.fillRect(ox+5,oy+1,w-10,h-10);
        this.line(c,[[ox,oy+h+4],[ox+w,oy+h+4]],'#31504c',2);
        if(r>.6){c.fillStyle=g.stage===1?'#aaa0cc70':'#a3c49a70';for(let n=0;n<3;n++)c.fillRect(ox+5+n*7,oy+h+1,3,2);}
        if(r>.85){c.fillStyle='#4d6660';c.fillRect(ox+10,oy+3,10,8);this.line(c,[[ox+15,oy+3],[ox+15,oy-9]],'#748b7b');}
      } else if(r>.6) {
        c.fillStyle='#31443c';c.fillRect(px+15,py+21,14,10);c.strokeStyle='#6c7d5144';c.strokeRect(px+14.5,py+18.5,14,10);
        c.fillStyle='#263e33';c.beginPath();c.arc(px+24,py+20,9,0,Math.PI*2);c.fill();c.fillStyle='#3e5540';c.beginPath();c.arc(px+21,py+16,6,0,Math.PI*2);c.fill();
      } else if(r<.1) {c.fillStyle='#7e958622';c.fillRect(px+8,py+15,24,3);c.fillRect(px+11,py+21,14,2);}
    }
    // Raised road, recessed asphalt and a lit central route.
    const road=g.config.path.map(([x,y])=>[(x+.5)*CELL,(y+.5)*CELL]);
    c.lineJoin='round';c.lineCap='square';
    this.line(c,road,'#071317',43);this.line(c,road,'#556b6355',39);this.line(c,road,'#2a3a3a',35);this.line(c,road,'#243333',28);
    c.setLineDash([5,12]);this.line(c,road,'#aac0a559',1);c.setLineDash([]);
    for(let n=2;n<g.path.length-2;n+=4) {
      const a=g.path[n],b=g.path[n+1],x=(a[0]+.5)*CELL,y=(a[1]+.5)*CELL,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
      c.save();c.translate(x,y);c.rotate(angle);this.line(c,[[-4,-5],[1,0],[-4,5]],'#a3b69b90',1.2);c.restore();
    }
    for(const [x,y] of g.config.pads) {
      const px=(x+.5)*CELL,py=(y+.5)*CELL;
      c.fillStyle='#0c1c1d';c.fillRect(px-16,py-12,32,29);c.fillStyle='#213534';c.fillRect(px-16,py-16,32,28);
      c.strokeStyle='#78977570';c.strokeRect(px-15.5,py-15.5,31,27);
      c.fillStyle='#7c9a7055';c.fillRect(px-4,py-1,8,1);c.fillRect(px,py-5,1,9);
      c.fillStyle='#79956f80';c.fillRect(px-12,py+13,6,2);c.fillRect(px+6,py+13,6,2);
    }
    c.font='8px Open, sans-serif';c.fillStyle='#8ca09655';c.letterSpacing='2px';
    const label=g.stage===0?'RIAN / HOSPITAL':g.stage===1?'RELAY / SECTOR 07':'ANIMA / ARCHIVE';
    c.fillText(label,29,32);c.fillText('RESTRICTED AREA',620,548);c.letterSpacing='0px';
    // Map inset corner ticks.
    for(const [x,y,sx,sy] of [[12,12,1,1],[852,12,-1,1],[12,564,1,-1],[852,564,-1,-1]])this.line(c,[[x,y+sy*12],[x,y],[x+sx*12,y]],'#8a9f7950',1);
    this.lastStage=g.stage;
  }
  circle(c,x,y,r,color,width=1){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  sprite(c,key,x,y,w,h){const img=this.images[key];if(img?.complete&&img.naturalWidth)c.drawImage(img,x-w/2,y-h/2,w,h);}
  humanoid(c,x,y,color,type,size=1,attack=0) {
    c.save();c.translate(x,y);c.scale(size,size);
    c.fillStyle='#070f17aa';c.beginPath();c.ellipse(0,16,12,5,0,0,Math.PI*2);c.fill();
    // Small readable operator, anchored to its deployment pedestal.
    c.fillStyle='#141d2c';c.fillRect(-7,9,5,9);c.fillRect(2,9,5,9);
    c.fillStyle=color;c.beginPath();c.moveTo(-8,-5);c.lineTo(8,-5);c.lineTo(11,11);c.lineTo(-11,11);c.closePath();c.fill();
    c.fillStyle='#22313d';c.fillRect(-5,-3,10,13);c.fillStyle=color;c.fillRect(-2,0,4,9);
    c.fillStyle=color;c.beginPath();c.ellipse(0,-13,type==='yul'?8:10,12,0,0,Math.PI*2);c.fill();
    c.fillStyle='#e0c6b7';c.beginPath();c.ellipse(0,-11,6,7,0,0,Math.PI*2);c.fill();
    c.fillStyle=type==='time'?'#b4a6d6':type==='rita'?'#789078':type==='haeun'?'#b18b70':type==='yul'?'#697a85':'#d3a6ba';
    c.beginPath();c.arc(0,-16,8,Math.PI,Math.PI*2);c.lineTo(8,-7);c.lineTo(3,-17);c.lineTo(-3,-12);c.lineTo(-8,-10);c.closePath();c.fill();
    if(type!=='yul'){c.fillRect(-10,-13,4,17);c.fillRect(6,-13,4,17);}
    c.fillStyle='#263542';c.fillRect(-4,-11,2,2);c.fillRect(2,-11,2,2);
    c.strokeStyle=color;c.lineWidth=4;c.beginPath();c.moveTo(-8,0);c.lineTo(-14,5-attack*4);c.moveTo(8,0);c.lineTo(15,-3-attack*5);c.stroke();
    c.shadowColor=color;c.shadowBlur=8;c.fillStyle='#e9f5dd';c.beginPath();c.arc(16,-4-attack*5,2.6,0,Math.PI*2);c.fill();
    c.restore();
  }
  draw(g,dt=0) {
    this.uiTime+=dt;const c=this.ctx,t=this.uiTime;
    if(this.lastStage!==g.stage)this.staticMap(g);
    c.clearRect(0,0,864,576);c.drawImage(this.backdrop,0,0);
    const start=g.path[0],end=g.path.at(-1);
    for(const [p,color,label] of [[start,'#dc997f','ENTRY'],[end,'#c7ed9c','SIGNAL']]){
      const x=(p[0]+.5)*CELL,y=(p[1]+.5)*CELL;
      c.save();c.shadowColor=color;c.shadowBlur=14;this.circle(c,x,y,18,color+'80',1.5);this.circle(c,x,y,13+Math.sin(t*2)*2,color+'70');c.restore();
      c.font='7px Open,sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(label,x,y-25);
    }
    // Signal tower at the escape point.
    const ex=(end[0]+.5)*CELL,ey=(end[1]+.5)*CELL;
    c.fillStyle='#334c3e';c.fillRect(ex-6,ey-8,12,18);this.line(c,[[ex,ey+2],[ex,ey-23]],'#b6cb9b',3);
    c.fillStyle='#d8f4b1';c.beginPath();c.arc(ex,ey-25,3,0,Math.PI*2);c.fill();
    this.circle(c,ex,ey-24,8+Math.sin(t*3)*3,'#c7ed9c55');
    const selected=g.towers.find(a=>a.id===this.selected);
    const hovered=this.hover&&g.canBuild(this.hover.x,this.hover.y);
    const rangeTower=selected||(hovered?{x:this.hover.x+.5,y:this.hover.y+.5,type:this.type,level:1}:null);
    if(rangeTower) {
      const x=rangeTower.x*CELL,y=rangeTower.y*CELL,r=g.stats(rangeTower).range*CELL,color=TOWERS[rangeTower.type].color;
      c.fillStyle=color+'0b';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.setLineDash([4,5]);this.circle(c,x,y,r,color+'70',1);c.setLineDash([]);
      if(hovered&&!selected){c.fillStyle=color+'28';c.fillRect(x-18,y-18,36,36);this.humanoid(c,x,y-7,color,this.type,.8);}
    }
    // A soft pulse keeps empty deployment pads discoverable.
    if(!g.towers.length)for(const [x,y] of g.config.pads){const px=(x+.5)*CELL,py=(y+.5)*CELL;c.strokeStyle=`rgba(199,237,156,${.25+Math.sin(t*2)*.15})`;c.strokeRect(px-15.5,py-15.5,31,27);}
    const actors=[...g.towers.map(a=>({...a,tower:true,ref:a})),...g.enemies.map(a=>({...a,tower:false}))].sort((a,b)=>a.y-b.y);
    for(const a of actors) {
      const x=a.x*CELL,y=a.y*CELL;
      if(a.tower) {
        const d=TOWERS[a.type];
        c.fillStyle='#0a161ccc';c.beginPath();c.ellipse(x,y+13,21,9,0,0,Math.PI*2);c.fill();
        c.save();c.translate(x,y+6);c.scale(1,.48);this.circle(c,0,0,20,a.id===this.selected?d.color:d.color+'88',a.id===this.selected?2:1);c.restore();
        if(a.type==='mina')this.sprite(c,'player',x,y-13,37,52);else this.humanoid(c,x,y-7,d.color,a.type,.93,a.cooldown>.7?1:0);
        if(a.type==='serin'){this.circle(c,x,y-9,21+Math.sin(t*2)*2,d.color+'55');}
        c.font='8px Open,sans-serif';c.textAlign='center';c.fillStyle=d.color;c.fillText('✦'.repeat(a.level),x,y+26);
        if(a.locked>0){c.fillStyle='#ff674f35';c.fillRect(x-20,y-35,40,54);c.strokeStyle='#f59b7b';c.strokeRect(x-20,y-35,40,54);c.fillStyle='#ffc6a9';c.font='15px sans-serif';c.fillText('×',x,y-35);}
        if(g.stats(a.ref).buff>1&&a.type!=='serin'){c.fillStyle='#f0a5cd';c.font='8px sans-serif';c.fillText('↑',x+18,y-25);}
      }else {
        const d=a.boss?g.config.boss:ENEMIES[a.type];
        c.fillStyle='#050b11aa';c.beginPath();c.ellipse(x,y+9,a.boss?23:15,a.boss?10:6,0,0,Math.PI*2);c.fill();
        if(a.boss){
          c.save();c.shadowColor=d.color;c.shadowBlur=14;this.circle(c,x,y,26+Math.sin(t*3)*2,d.color+'77',1.4);c.restore();
          if(g.stage===0)this.sprite(c,'boss',x,y-14,54,70);
          else{this.humanoid(c,x,y-13,d.color,g.stage===1?'yul':'time',1.4,Math.sin(t*2));c.fillStyle=d.color;c.font='10px sans-serif';c.textAlign='center';c.fillText(g.stage===1?'ϟ':'❋',x,y-55);}
        } else {
          const size=a.type==='tank'?41:a.type==='swarm'?25:33;
          this.sprite(c,d.sprite,x,y-5,size,size);
        }
        if(a.slow>0||g.rift>0){this.circle(c,x,y,18,'#bdabed80',1);c.fillStyle='#d7cbfa';c.font='9px sans-serif';c.textAlign='center';c.fillText('◷',x+18,y-15);}
        if(a.shield>0){this.circle(c,x,y-5,a.boss?29:20,'#8ed3f7a0',1.7);}
        if(!a.boss){const w=a.type==='tank'?31:23;c.fillStyle='#0a1417';c.fillRect(x-w/2,y-28,w,3);c.fillStyle=d.color;c.fillRect(x-w/2,y-28,w*Math.max(0,a.hp/a.maxHp),3);}
      }
    }
    for(const e of g.effects) {
      const alpha=Math.max(0,e.life/e.maxLife),from=e.from,to=e.to,x=from.x*CELL,y=from.y*CELL,tx=to.x*CELL,ty=to.y*CELL;
      c.save();c.globalAlpha=alpha;c.strokeStyle=e.color;c.fillStyle=e.color;c.shadowColor=e.color;c.shadowBlur=9;
      if(e.kind==='ring'||e.kind==='hostile'||e.kind==='burst') {
        const radius=e.radius*CELL*(1-alpha*.65);this.circle(c,x,y,radius,e.color,e.kind==='burst'?4:1.5);
        c.globalAlpha=alpha*.08;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();
      }else if(e.kind==='chain') {
        const points=[[x,y]];for(let n=1;n<7;n++){const f=n/7;points.push([x+(tx-x)*f+Math.sin(n*2.5)*7,y+(ty-y)*f+Math.cos(n*2.5)*7]);}points.push([tx,ty]);this.line(c,points,e.color,1.8);
      } else if(e.kind==='beam'){this.line(c,[[x,y],[tx,ty]],e.color,5);this.line(c,[[x,y],[tx,ty]],'#fff4d9',1.7);}
      else if(e.kind==='arc'){c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+tx)/2,(y+ty)/2-28,tx,ty);c.strokeStyle=e.color;c.lineWidth=2;c.stroke();}
      else {const f=1-alpha,dx=tx-x,dy=ty-y,off=(e.offset||0)*CELL;c.beginPath();c.moveTo(x+dx*Math.max(0,f-.17)+off,y+dy*Math.max(0,f-.17));c.lineTo(x+dx*f+off,y+dy*f);c.strokeStyle=e.color;c.lineWidth=3;c.stroke();}
      c.restore();
    }
    this.particles=this.particles.filter(p=>p.life>0);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;c.globalAlpha=Math.max(0,p.life/p.maxLife);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size);}c.globalAlpha=1;
    if(g.rift>0){c.fillStyle='#a1a1fd0b';c.fillRect(0,0,864,576);c.strokeStyle='#b6a6f955';c.lineWidth=3;c.strokeRect(1.5,1.5,861,573);}
    if(this.keyboardPad!==undefined){const p=g.config.pads[this.keyboardPad];if(p){c.strokeStyle='#edf4ca';c.lineWidth=2;c.strokeRect(p[0]*48+4,p[1]*48+4,40,40);}}
    c.textAlign='left';
  }
  burst(x,y,color) {
    for(let i=0;i<9;i++){const angle=i*Math.PI*2/9;this.particles.push({x:x*CELL,y:y*CELL,vx:Math.cos(angle)*35,vy:Math.sin(angle)*35,color,size:2+i%2,life:.45,maxLife:.45});}
  }
}
