// Original code-authored 3D meshes, matched to the repository's character illustrations.
// Vertex: position.xyz, normal.xyz, color.rgb, emission, rigid skin-joint index.
const TAU=Math.PI*2;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
export class AnimaMesh {
  constructor(){this.vertices=[];}
  tri(a,b,c,color,joint=0,normals=null){const n=unit(cross(sub(b,a),sub(c,a)));for(const [i,p] of [a,b,c].entries())this.vertices.push(...p,...(normals?normals[i]:n),...color.slice(0,3),color[3]||0,joint);}
  quad(a,b,c,d,color,joint=0){this.tri(a,b,c,color,joint);this.tri(a,c,d,color,joint);}
  sphere(center,radius,color,joint=0,segments=24,rings=14){
    const point=(u,v)=>{const n=[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];return [add(center,n.map((t,i)=>t*radius[i])),unit(n.map((t,i)=>t/radius[i]))];};
    for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
      const a=point(i/segments*TAU,j/rings*Math.PI),b=point((i+1)/segments*TAU,j/rings*Math.PI),c=point((i+1)/segments*TAU,(j+1)/rings*Math.PI),d=point(i/segments*TAU,(j+1)/rings*Math.PI);
      this.tri(a[0],b[0],c[0],color,joint,[a[1],b[1],c[1]]);this.tri(a[0],c[0],d[0],color,joint,[a[1],c[1],d[1]]);
    }
  }
  tube(points,radii,color,joint=0,sides=10,flatten=1){
    const ring=(index,k)=>{const tangent=unit(sub(points[Math.min(index+1,points.length-1)],points[Math.max(0,index-1)]));let side=unit(cross(tangent,[0,0,1]));if(Math.hypot(...side)<.5)side=[1,0,0];const up=unit(cross(tangent,side)),theta=k/sides*TAU;
      const n=add(mul(side,Math.cos(theta)),mul(up,Math.sin(theta)));return [add(points[index],mul(add(mul(side,Math.cos(theta)),mul(up,Math.sin(theta)*flatten)),radii[index])),n];};
    for(let j=0;j<points.length-1;j++)for(let k=0;k<sides;k++){const a=ring(j,k),b=ring(j,k+1),c=ring(j+1,k+1),d=ring(j+1,k);this.tri(a[0],b[0],c[0],color,joint,[a[1],b[1],c[1]]);this.tri(a[0],c[0],d[0],color,joint,[a[1],c[1],d[1]]);}
    for(const end of [0,points.length-1])for(let k=0;k<sides;k++){const a=ring(end,k)[0],b=ring(end,k+1)[0];this.tri(points[end],end?b:a,end?a:b,color,joint);}
  }
  curve(control,widths,color,joint=0,steps=16,sides=9,flatten=1){
    const pts=[],rs=[];for(let i=0;i<=steps;i++){const t=i/steps,s=1-t;pts.push(control[0].map((v,k)=>v*s*s*s+3*control[1][k]*s*s*t+3*control[2][k]*s*t*t+control[3][k]*t*t*t));rs.push(widths[0]*(1-t)+widths[1]*t+Math.sin(t*Math.PI)*(widths[2]||0));}this.tube(pts,rs,color,joint,sides,flatten);
  }
  lathe(profile,color,joint=0,segments=32,pleats=0,smooth=false){
    // Dress layers share the same height-based folds so the trim follows the hem.
    const point=(j,i)=>{const [y,rx,rz]=profile[j],a=i/segments*TAU,w=Math.max(0,Math.min(1,(1.10-y)/.55)),fold=1+Math.cos(a*12)*pleats*w;return [Math.sin(a)*rx*fold,y+Math.sin(a*6)*pleats*.3*w*w*w,Math.cos(a)*rz*fold];};
    const normal=(j,i)=>{const a=i/segments*TAU,[,rx,rz]=profile[j],p=profile[Math.max(0,j-1)],q=profile[Math.min(profile.length-1,j+1)],dy=q[0]-p[0];return unit([Math.sin(a)/rx,-((q[1]-p[1])*Math.sin(a)**2/rx+(q[2]-p[2])*Math.cos(a)**2/rz)/dy,Math.cos(a)/rz]);};
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const shade=smooth?1:1+(i%6<3?.035:-.035),c=color.map((v,k)=>k<3?v*shade:v),p=[point(j,i),point(j,i+1),point(j+1,i+1),point(j+1,i)];
      if(smooth){const n=[normal(j,i),normal(j,i+1),normal(j+1,i+1),normal(j+1,i)];this.tri(p[0],p[1],p[2],c,joint,n.slice(0,3));this.tri(p[0],p[2],p[3],c,joint,[n[0],n[2],n[3]]);}else this.quad(...p,c,joint);
    }
  }
  ring(center,radius,width,color,joint=0,plane='xy',segments=64){
    const p=(a,r)=>plane==='xz'?[center[0]+Math.cos(a)*r,center[1],center[2]+Math.sin(a)*r]:[center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,center[2]];
    for(let i=0;i<segments;i++){const a=i/segments*TAU,b=(i+1)/segments*TAU;this.quad(p(a,radius-width/2),p(b,radius-width/2),p(b,radius+width/2),p(a,radius+width/2),color,joint);}
  }
}

export function createReinaModel(){
  const m=new AnimaMesh(),skin=[.96,.73,.64],skinLight=[1,.83,.73],white=[.92,.91,.92],red=[.61,.045,.075],darkRed=[.30,.018,.042],navy=[.07,.065,.16],gold=[.86,.57,.23],hair=[.31,.125,.075],hairLight=[.48,.23,.12],ink=[.055,.025,.034];
  const joints=[{name:'Root',pivot:[0,0,0]},{name:'Head',pivot:[0,1.77,0]},{name:'LongHair',pivot:[0,2.10,-.06]},{name:'LeftSleeve',pivot:[-.24,1.56,0]},{name:'RightCastingArm',pivot:[.24,1.56,0]},{name:'PleatedDress',pivot:[0,1.10,0]},{name:'RightHand',pivot:[.57,1.54,.18]},{name:'LeftLeg',pivot:[-.12,.9,0]},{name:'RightLeg',pivot:[.12,.9,0]}];
  // Legs, heeled shoes and stocking tops. The illustration ends above the knees;
  // the lower legs/shoes are a modest continuation of its navy/red palette.
  for(const sign of [-1,1]){const joint=sign<0?7:8,x=sign*.115;
    m.tube([[x,.16,0],[x,.43,-.01],[x,.70,0],[x,.96,0]],[.056,.061,.077,.09],skin,joint,16);
    m.tube([[x,.12,.01],[x,.32,-.006],[x,.52,-.007]],[.066,.070,.076],navy,joint,16);
    m.sphere([x,.105,.07],[.073,.065,.16],ink,joint,20,10);m.tube([[x,.035,-.065],[x,.10,-.065]],[.026,.027],ink,joint,8);
    m.tube([[x,.515,-.007],[x,.535,-.007]],[.078,.078],gold,joint,16);m.sphere([x,.135,.10],[.018,.012,.021],gold,joint,12,6);
  }
  m.lathe([[.575,.535,.415],[.59,.55,.43],[.7,.48,.37],[1.05,.20,.135]],darkRed,5,96,.10);
  m.lathe([[1.10,.19,.13],[1.00,.25,.18],[.87,.36,.26],[.73,.48,.36],[.62,.56,.43]],red,5,96,.10);
  m.lathe([[.619,.562,.432],[.641,.550,.424]],gold,5,96,.10);
  m.lathe([[1.03,.22,.14],[1.17,.165,.112],[1.32,.19,.135],[1.47,.225,.14],[1.57,.24,.105],[1.63,.11,.075]],red,0,48);
  // Gold piping and the double row of brass buttons.
  for(const sign of [-1,1]){
    m.curve([[sign*.175,1.56,.075],[sign*.13,1.45,.145],[sign*.14,1.20,.12],[sign*.10,1.045,.153]],[.004,.004],gold,0,18,6);
    for(let i=0;i<4;i++)m.sphere([sign*(.078+i*.005),1.08+i*.105,.144],[.012,.012,.008],gold,0,12,8);
    m.tri([sign*.055,1.04,.15],[sign*.17,1.19,.12],[sign*.24,.96,.19],darkRed);m.tri([sign*.055,1.04,.154],[sign*.24,.96,.195],[sign*.16,1.10,.16],red);
  }
  m.tube([[0,1.58,0],[0,1.80,0]],[.075,.068],skin,1,20);
  // A pointed anime jaw, rounded cheeks and forehead.
  const headProfile=[[1.79,.008,.045],[1.815,.052,.083],[1.85,.098,.113],[1.89,.143,.137],[1.96,.179,.16],[2.02,.179,.16],[2.07,.171,.153],[2.12,.151,.135],[2.16,.13,.115],[2.205,.066,.06],[2.22,.004,.004]];
  m.lathe(headProfile,skinLight,1,72,0,true);
  for(const sign of [-1,1]){m.sphere([sign*.172,1.945,.002],[.028,.053,.03],skin,1,16,10);m.sphere([sign*.188,1.94,.017],[.009,.029,.012],[.78,.46,.40],1,12,8);}
  // Face details are actual curved surfaces following the face, not a portrait billboard.
  const faceZ=(x,y,offset=.007)=>{let j=1;while(j<headProfile.length-1&&headProfile[j][0]<y)j++;const p=headProfile[j-1],q=headProfile[j],t=Math.max(0,Math.min(1,(y-p[0])/(q[0]-p[0]))),rx=p[1]+(q[1]-p[1])*t,rz=p[2]+(q[2]-p[2])*t;return rz*Math.sqrt(Math.max(.01,1-(x/rx)**2))+offset;};
  function faceEllipse(cx,cy,rx,ry,c,offset=.014){const center=[cx,cy,faceZ(cx,cy,offset)];for(let i=0;i<40;i++){const a=i/40*TAU,b=(i+1)/40*TAU;const p=(t)=>[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,faceZ(cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,offset)];m.tri(center,p(a),p(b),c,1,[[0,0,1],[0,0,1],[0,0,1]]);}}
  for(const sign of [-1,1]){
    const cx=sign*.079,cy=1.963,outline=[];
    for(let i=0;i<=24;i++){const t=i/24,xx=cx+(t-.5)*.132,yy=cy+Math.sin(t*Math.PI)*.033+(t-.5)*sign*.010;outline.push([xx,yy,faceZ(xx,yy,.010)]);}
    for(let i=24;i>=0;i--){const t=i/24,xx=cx+(t-.5)*.132,yy=cy-Math.sin(t*Math.PI)*.024+(t-.5)*sign*.010;outline.push([xx,yy,faceZ(xx,yy,.010)]);}
    for(let i=0;i<outline.length;i++)m.tri([cx,cy,faceZ(cx,cy,.012)],outline[i],outline[(i+1)%outline.length],white,1,[[0,0,1],[0,0,1],[0,0,1]]);
    faceEllipse(cx,cy,.028,.029,ink,.018);faceEllipse(cx,cy-.003,.023,.026,[.76,.24,.055],.020);faceEllipse(cx,cy-.012,.019,.012,[1,.58,.10,.13],.023);faceEllipse(cx,cy+.003,.009,.023,[.10,.021,.022],.025);faceEllipse(cx-sign*.009,cy+.012,.008,.008,[1,.97,.88,.2],.028);faceEllipse(cx+sign*.010,cy-.014,.003,.004,white,.028);
    const upper=outline.slice(0,25).map(p=>[p[0],p[1]+.001,p[2]+.024]);m.tube(upper,upper.map((_,i)=>.0035+Math.sin(i/24*Math.PI)*.0018),ink,1,7);
    const corner=[cx+sign*.064,cy+sign*.005,faceZ(cx+sign*.064,cy,.036)];m.tri(corner,[corner[0]+sign*.027,corner[1]+.014,corner[2]-.01],[corner[0]-sign*.008,corner[1]+.008,corner[2]],ink,1);
    for(let i=0;i<3;i++)m.tri([corner[0]-sign*i*.01,corner[1]+.004,corner[2]],[corner[0]+sign*(.008-i*.008),corner[1]+.021,corner[2]],[corner[0]-sign*(.010+i*.009),corner[1]+.006,corner[2]],ink,1);
    const brow=[[cx-sign*.055,2.025,faceZ(cx-sign*.055,2.025,.02)],[cx-sign*.015,2.041,faceZ(cx-sign*.015,2.041,.02)],[cx+sign*.05,2.035,faceZ(cx+sign*.05,2.035,.02)]];m.tube(brow,[.003,.004,.002],hair,1,6);
    faceEllipse(cx,1.907,.024,.007,[.95,.64,.59],.008);
  }
  m.tri([-.008,1.91,.165],[.006,1.905,.185],[.010,1.897,.162],[.91,.66,.58],1);
  m.curve([[-.023,1.865],[-.008,1.869],[.012,1.869],[.023,1.866]].map(([x,y])=>[x,y,faceZ(x,y,.006)]),[.0018,.0018],[.66,.28,.27],1,12,5);
  // White stand collar, lapels and layered navy cravat.
  m.lathe([[1.61,.08,.072],[1.69,.077,.072]],white,0,28);
  for(const sign of [-1,1]){
    m.tri([sign*.012,1.672,.075],[sign*.15,1.59,.105],[sign*.082,1.51,.159],white);
    m.tri([sign*.012,1.672,.075],[sign*.082,1.51,.159],[sign*.02,1.57,.146],[.80,.81,.87]);
    m.sphere([sign*.058,1.575,.163],[.068,.043,.025],navy,0,20,10);
    for(let layer=0;layer<3;layer++){const yy=1.55-layer*.075;m.tri([0,yy+.03,.19],[sign*(.10+layer*.015),yy-.075,.20],[sign*.014,yy-.11,.23],navy);m.tri([0,yy+.03,.193],[sign*.014,yy-.11,.233],[sign*(.055+layer*.01),yy-.035,.255],[.13,.12,.26]);}
  }
  m.sphere([0,1.568,.193],[.025,.032,.022],navy,0,20,10);
  // Puffy white sleeves with cuffs. Both arms are separately skinned.
  const arms=[{sign:-1,joint:3,elbow:[-.43,1.31,.025],wrist:[-.29,1.25,.16]},{sign:1,joint:4,elbow:[.43,1.30,.02],wrist:[.57,1.54,.18]}];
  for(const {sign,joint,elbow,wrist} of arms){const shoulder=[sign*.25,1.56,0];
    m.sphere(shoulder,[.10,.13,.105],white,joint,20,12);
    m.tube([shoulder,mul(add(shoulder,elbow),.5),elbow,mul(add(elbow,wrist),.5),wrist],[.085,.093,.063,.074,.048],white,joint,16);
    const cuff=add(wrist,mul(unit(sub(wrist,elbow)),.045));m.tube([wrist,cuff],[.054,.054],white,joint,16);m.sphere(add(cuff,[0,0,.053]),[.01,.01,.006],gold,joint,10,6);
    const handDirection=sign<0?-1:1,palm=add(cuff,[sign*.006,handDirection*.063,.012]);m.sphere(palm,[.038,.068,.024],skinLight,joint,18,12);
    for(let finger=0;finger<4;finger++){const fx=palm[0]+(finger-1.5)*.019,fy=palm[1]+handDirection*.045,len=.075-Math.abs(finger-1)*.011;
      m.tube([[fx,fy,palm[2]],[fx+sign*.008,fy+handDirection*len*.55,palm[2]+.012],[fx+sign*.01,fy+handDirection*len,palm[2]+.006]],[.010,.009,.006],skinLight,joint,8);
    }
    m.tube([add(palm,[-sign*.027,-handDirection*.006,.012]),add(palm,[-sign*.059,handDirection*.025,.026]),add(palm,[-sign*.064,handDirection*.055,.026])],[.013,.011,.008],skinLight,joint,8);
  }
  // Rounded crown and long volumetric locks; the face is left open.
  for(let i=0;i<26;i++){
    const theta=.66+i/25*(TAU-1.32),sx=Math.sin(theta),cz=Math.cos(theta),length=.82+(i%5)*.065;
    m.curve([[sx*.12,2.14+(i%3)*.018,cz*.10-.02],[sx*.25,1.93,cz*.22-.05],[sx*.49,1.17,cz*.22-.17],[sx*(.42+.06*Math.sin(i)),length,cz*.19-.23]], [.043,.002,.020],i%3===0?hairLight:hair,2,20,10,.7);
  }
  // Cap surface covers the scalp without a helmet edge across the eyes.
  for(let i=0;i<36;i++){
    const theta=i/36*TAU,sx=Math.sin(theta),cz=Math.cos(theta),front=cz>.45;
    m.curve([[0,2.235,-.015],[sx*.13,2.25,cz*.11],[sx*.20,2.12,cz*.17],[sx*.19,front?2.075:1.91,cz*.17]], [.024,.019,.015],i%5===0?hairLight:hair,1,12,8,.6);
  }
  for(let i=0;i<7;i++){
    const t=i/6,tip=-.16+t*.32,yy=1.997+Math.abs(t-.42)*.09;
    m.curve([[-.045,2.23,.045],[tip*.45,2.18,.17],[tip,2.08,.188],[tip,yy,.16]],[.031,.001,.009],i%3===0?hairLight:hair,1,18,10,.5);
  }
  for(const sign of [-1,1]){
    m.curve([[sign*.12,2.17,.10],[sign*.23,2.06,.13],[sign*.25,1.86,.12],[sign*.22,1.68,.08]],[.027,.002,.015],hairLight,1,22,9,.7);
    m.curve([[sign*.17,2.10,.06],[sign*.35,1.88,.06],[sign*.40,1.55,.14],[sign*.26,1.31,.20]],[.022,.001,.013],hair,2,24,8,.7);
  }
  return {name:'Reina — Anima flame caster',reference:'Assets/ArtRemaster/portraits/portrait_fire.png',height:2.25,joints,vertices:m.vertices};
}

export function createMinaHands(){
  const m=new AnimaMesh(),skin=[1,.79,.70],navy=[.055,.08,.13],metal=[.21,.31,.34],cyan=[.15,.96,.83,1.3];
  for(const sign of [-1,1]){const joint=sign<0?1:2,x=sign*.27;
    m.tube([[x+sign*.12,-.56,.20],[x+sign*.045,-.38,.38],[x,-.23,.53]],[.062,.053,.043],skin,joint,20);
    m.tube([[x+sign*.012,-.27,.49],[x-sign*.006,-.215,.54]],[.058,.058],navy,joint,20);
    m.ring([x,-.235,.587],.044,.008,cyan,joint,'xy',32);
    m.sphere([x,-.154,.56],[.045,.083,.029],skin,joint,22,14);
    for(let i=0;i<4;i++){const fx=x+(i-1.5)*.023,yy=-.096,len=.10-Math.abs(i-1)*.014;
      m.tube([[fx,yy,.56],[fx-sign*.012,yy+len*.55,.58],[fx-sign*.02,yy+len,.61]],[.011,.0095,.007],skin,joint,10);
      m.sphere([fx-sign*.02,yy+len-.005,.617],[.006,.012,.003],[1,.88,.84],joint,10,6);
    }
    m.tube([[x-sign*.038,-.16,.57],[x-sign*.073,-.13,.59],[x-sign*.085,-.085,.61]],[.014,.012,.008],skin,joint,10);
    for(let i=0;i<3;i++)m.sphere([x+(i-1)*.03,-.235,.59],[.012,.023,.009],metal,joint,10,8);
  }
  return {name:'Mina — bare hands and chrono bracelets',joints:[{name:'Root',pivot:[0,0,0]},{name:'LeftHand',pivot:[-.27,-.4,.4]},{name:'RightHand',pivot:[.27,-.4,.4]}],vertices:m.vertices};
}
