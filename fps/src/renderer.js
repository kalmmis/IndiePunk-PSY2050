// Dependency-free WebGL 2 renderer. Instanced meshes share one cube and one shader.
class FPSRenderer {
  constructor(canvas,worlds) {
    this.canvas=canvas;this.worlds=worlds;this.level=-1;this.clock=0;this.shot=0;this.particles=[];this.tracers=[];
    const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('WebGL 2를 사용할 수 없습니다. 하드웨어 가속을 켠 최신 브라우저에서 열어 주세요.');
    this.program=this.programFrom(`#version 300 es
      precision highp float;
      layout(location=0) in vec3 vertex; layout(location=1) in vec3 normal;
      layout(location=2) in vec3 center; layout(location=3) in vec3 size;
      layout(location=4) in vec4 tint; layout(location=5) in vec3 rotation;
      uniform mat4 vp; out vec3 worldPos; out vec3 worldNormal; out vec4 color;
      vec3 rotate(vec3 v){
        float a=rotation.x,b=rotation.y,c=rotation.z;
        v=vec3(v.x,cos(b)*v.y-sin(b)*v.z,sin(b)*v.y+cos(b)*v.z);
        v=vec3(cos(a)*v.x+sin(a)*v.z,v.y,-sin(a)*v.x+cos(a)*v.z);
        return vec3(cos(c)*v.x-sin(c)*v.y,sin(c)*v.x+cos(c)*v.y,v.z);
      }
      void main(){worldPos=center+rotate(vertex*size);worldNormal=rotate(normal);color=tint;gl_Position=vp*vec4(worldPos,1.0);}
    `,`#version 300 es
      precision highp float;
      in vec3 worldPos;in vec3 worldNormal;in vec4 color;
      uniform vec3 eye;uniform float time;uniform float slow;out vec4 pixel;
      void main(){
        vec3 n=normalize(worldNormal);float light=max(dot(n,normalize(vec3(-0.4,0.9,0.3))),0.0);
        vec3 base=color.rgb*(0.3+light*0.7);
        float dist=length(worldPos-eye);
        float rim=pow(1.0-abs(dot(n,normalize(eye-worldPos))),3.0);
        base+=vec3(0.03,0.13,0.16)*rim;
        base+=color.rgb*color.a*1.65;
        if(worldPos.y<0.03&&worldPos.y>-.5){
          float stripe=pow(max(0.0,sin(worldPos.x*1.1+worldPos.z*.14)),24.0);
          base+=vec3(.025,.11,.12)*stripe;
          base+=vec3(.025,.09,.11)*pow(max(0.0,n.y),8.0);
        }
        vec3 fog=mix(vec3(.025,.045,.075),vec3(.035,.065,.085),slow*.4);
        base=mix(base,fog,1.0-exp(-dist*.013));
        base=base/(1.0+base*.28);pixel=vec4(pow(base,vec3(.88)),1.0);
      }
    `);
    this.pointProgram=this.programFrom(`#version 300 es
      precision highp float;layout(location=0) in vec3 pos;layout(location=1) in vec4 colorSize;
      uniform mat4 vp;uniform float height;out vec3 color;
      void main(){vec4 p=vp*vec4(pos,1.);gl_Position=p;gl_PointSize=clamp(colorSize.a*height/max(.1,p.w),1.,180.);color=colorSize.rgb;}
    `,`#version 300 es
      precision highp float;in vec3 color;out vec4 pixel;
      void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float alpha=pow(1.-r,2.);pixel=vec4(color*alpha,alpha);}
    `);
    const vertices=[];
    for(const [n,a,b] of [ [[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]] ]){
      for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]])vertices.push(...n.map((t,i)=>(t+a[i]*u+b[i]*v)*.5),...n);
    }
    this.mesh=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.mesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.pointBuffer=gl.createBuffer();
    this.vao=gl.createVertexArray();this.pointVao=gl.createVertexArray();
    const sphere=new AnimaMesh();sphere.sphere([0,0,0],[.5,.5,.5],[1,1,1],0,16,10);
    const sphereVertices=[];for(let i=0;i<sphere.vertices.length;i+=11)sphereVertices.push(...sphere.vertices.slice(i,i+6));
    this.sphereMesh=gl.createBuffer();this.sphereCount=sphereVertices.length/6;gl.bindBuffer(gl.ARRAY_BUFFER,this.sphereMesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(sphereVertices),gl.STATIC_DRAW);
    this.initCharacters();this.blinks=[];
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.025,.045,.075,1);
    this.camera=[0,1.65,14];this.vp=new Float32Array(16);
    this.resize();
  }
  programFrom(v,f){
    const gl=this.gl,p=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
  }
  initCharacters(){
    this.characterProgram=this.programFrom(`#version 300 es
      precision highp float;layout(location=0) in vec3 vertex;layout(location=1) in vec3 normal;layout(location=2) in vec4 tint;layout(location=3) in float joint;
      uniform mat4 vp;uniform mat4 model;uniform mat4 bones[12];out vec3 worldPos;out vec3 worldNormal;out vec4 color;
      void main(){mat4 skin=bones[int(joint)];vec4 p=model*skin*vec4(vertex,1.);worldPos=p.xyz;worldNormal=mat3(model)*mat3(skin)*normal;color=tint;gl_Position=vp*p;}
    `,`#version 300 es
      precision highp float;in vec3 worldPos;in vec3 worldNormal;in vec4 color;uniform vec3 eye;uniform float flash;uniform float studio;out vec4 pixel;
      void main(){vec3 n=normalize(worldNormal);float d=dot(n,normalize(vec3(-.35,.65,.85)));float light=.64+.27*smoothstep(.08,.18,d)+.14*smoothstep(.65,.73,d);
        vec3 c=color.rgb*light;float rim=pow(1.-abs(dot(n,normalize(eye-worldPos))),4.);c+=vec3(.06,.11,.13)*rim*(1.-studio*.5);c+=color.rgb*color.a*1.5;c=mix(c,vec3(1.,.85,.65),flash*.65);
        c=mix(c,vec3(.025,.045,.075),(1.-exp(-length(worldPos-eye)*.008))*(1.-studio));pixel=vec4(c,1.);}
    `);
    const reina=createReinaModel();this.characterStats={triangles:reina.vertices.length/33,joints:reina.joints.length};
    this.reinaMesh=this.uploadModel(reina);this.handMesh=this.uploadModel(createMinaHands());this.effectMesh=this.uploadModel({vertices:[],joints:[]});
  }
  uploadModel(model){const gl=this.gl,vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(model.vertices),gl.STATIC_DRAW);for(const [index,size,offset] of [[0,3,0],[1,3,12],[2,4,24],[3,1,40]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,44,offset);gl.vertexAttribDivisor(index,0);}gl.bindVertexArray(null);return {vao,buffer,count:model.vertices.length/11,joints:model.joints};}
  identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  matrix(x,y,z,angle=0,scale=1){const c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;return [c,0,-s,0,0,scale,0,0,s,0,c,0,x,y,z,1];}
  pose(pivot,rx=0,ry=0,rz=0){
    const rotate=v=>{let [x,y,z]=v;[y,z]=[Math.cos(rx)*y-Math.sin(rx)*z,Math.sin(rx)*y+Math.cos(rx)*z];[x,z]=[Math.cos(ry)*x+Math.sin(ry)*z,-Math.sin(ry)*x+Math.cos(ry)*z];return [Math.cos(rz)*x-Math.sin(rz)*y,Math.sin(rz)*x+Math.cos(rz)*y,z];};
    const c=[rotate([1,0,0]),rotate([0,1,0]),rotate([0,0,1])],p=rotate(pivot);return [...c[0],0,...c[1],0,...c[2],0,...pivot.map((v,i)=>v-p[i]),1];
  }
  drawModel(mesh,matrix,poses=[],flash=0,studio=false){
    const gl=this.gl,p=this.characterProgram,bones=new Float32Array(12*16);for(let i=0;i<12;i++)bones.set(this.pose(mesh.joints[i]?.pivot||[0,0,0],...(poses[i]||[])),i*16);
    gl.useProgram(p);gl.uniformMatrix4fv(gl.getUniformLocation(p,'vp'),false,this.vp);gl.uniformMatrix4fv(gl.getUniformLocation(p,'model'),false,new Float32Array(matrix));gl.uniformMatrix4fv(gl.getUniformLocation(p,'bones[0]'),false,bones);gl.uniform3fv(gl.getUniformLocation(p,'eye'),this.camera);gl.uniform1f(gl.getUniformLocation(p,'flash'),flash);gl.uniform1f(gl.getUniformLocation(p,'studio'),studio?1:0);
    gl.disable(gl.CULL_FACE);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.enable(gl.CULL_FACE);
  }
  reinaPose(time){return [[],[0,Math.sin(time*.55)*.055,Math.sin(time*.7)*.025],[Math.sin(time*.8)*.035,0,Math.sin(time*.6)*.045],[0,0,Math.sin(time*.9)*.025],[Math.sin(time*1.4)*.04,0,.05+Math.sin(time*.9)*.05],[Math.sin(time*.7)*.025,0,Math.sin(time*.5)*.025],[],[Math.sin(time*.6)*.02,0,0],[-Math.sin(time*.6)*.02,0,0]];}
  sigil(mesh,center,right,up,radius,angle,color){
    const point=(a,r)=>center.map((v,i)=>v+(right[i]*Math.cos(a)+up[i]*Math.sin(a))*r);
    for(const [r,w] of [[radius,.004],[radius*.82,.002]])for(let i=0;i<64;i++){const a=i/64*Math.PI*2+angle,b=(i+1)/64*Math.PI*2+angle;mesh.quad(point(a,r-w),point(b,r-w),point(b,r+w),point(a,r+w),color);}
    for(let i=0;i<12;i++){const a=i*Math.PI/6+angle,da=.025;mesh.quad(point(a-da,radius*.88),point(a+da,radius*.88),point(a+da,radius*1.06),point(a-da,radius*1.06),color);}
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3-angle,b=(i+1)*Math.PI*2/3-angle;const p=point(a,radius*.65),q=point(b,radius*.65),dir=q.map((v,k)=>v-p[k]),l=Math.hypot(...dir),off=right.map((v,k)=>(up[k]*dir.reduce((s,t,j)=>s+t*right[j],0)-v*dir.reduce((s,t,j)=>s+t*up[j],0))*.002/l);mesh.quad(p.map((v,k)=>v-off[k]),q.map((v,k)=>v-off[k]),q.map((v,k)=>v+off[k]),p.map((v,k)=>v+off[k]),color);}
  }
  blink(from,to){this.blinks.push({from,to,life:.6});this.burst(...from);this.burst(...to);}
  renderPortrait({angle=0,zoom=3.6}={}){
    const gl=this.gl,time=this.clock;this.clock+=1/60;this.camera=[0,1.25,zoom];this.matrices(this.camera,0,-.025,40*Math.PI/180);gl.clearColor(.055,.065,.09,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    this.drawModel(this.reinaMesh,this.matrix(0,-.04,0,angle),this.reinaPose(time),0,true);
    const ring=new AnimaMesh();ring.ring([0,-.025,0],.75,.008,[.9,.5,.2,.6],0,'xz');gl.bindBuffer(gl.ARRAY_BUFFER,this.effectMesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ring.vertices),gl.DYNAMIC_DRAW);this.effectMesh.count=ring.vertices.length/11;this.drawModel(this.effectMesh,this.identity(),[],0,true);gl.bindVertexArray(null);gl.clearColor(.025,.045,.075,1);
  }
  resize(){const d=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(innerWidth*d);this.canvas.height=Math.round(innerHeight*d);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  box(list,x,y,z,sx,sy,sz,color,glow=0,ry=0,rx=0,rz=0){list.push(x,y,z,sx,sy,sz,...color,glow,ry,rx,rz);}
  setLevel(level){
    if(this.level===level)return;this.level=level;this.particles=[];this.tracers=[];
    const gl=this.gl,a=[],b=(...v)=>this.box(a,...v),cyan=[.16,.78,.72],amber=[1,.33,.16],steel=[.10,.15,.20],ink=[.055,.08,.12];
    const accent=level===1?[.55,.34,1]:level===2?amber:cyan;this.accent=accent;
    b(0,-.4,-4,36,.8,44,[.07,.11,.15]);b(0,-1.5,-4,37,1.4,45,ink);
    // Recessed pavement plates and a luminous central route.
    for(let z=-24;z<18;z+=3.5){b(0,.006,z,33,.014,.025,[.16,.23,.28]);for(const x of [-16.7,16.7])b(x,.018,z,.055,.024,2.8,accent,1.4);}
    for(let x=-15;x<=15;x+=3)b(x,.008,-4,.022,.018,43,[.12,.20,.24]);
    for(let z=-22;z<14;z+=4){b(-1.1,.025,z,.08,.035,1.35,cyan,.65);b(1.1,.025,z,.08,.035,1.35,cyan,.65);}
    for(const x of [-17.8,17.8]){
      b(x,.68,-4,.45,1.35,44,steel);b(x,1.4,-4,.5,.09,44,accent,.7);
      for(let z=-25;z<19;z+=5){b(x,1.1,z,.7,2.2,.7,ink);b(x,2.2,z,.45,.08,.45,accent,2);}
    }
    for(const z of [-25.8,17.8]){b(0,.65,z,36,1.3,.4,steel);b(0,1.36,z,36,.07,.45,accent,.9);}
    // Solid cover has exactly the same dimensions as the WASM collision map.
    for(const [x,z,w,d,h] of this.worlds[level].covers){
      b(x,h/2,z,w,h,d,steel);b(x,h-.15,z,w+.08,.13,d+.08,[.22,.28,.31]);
      b(x,.18,z,w+.16,.36,d+.16,ink);
      for(const sign of [-1,1]){b(x+sign*(w/2+.01),h*.62,z,.025,.09,d*.72,accent,1.4);b(x,h*.62,z+sign*(d/2+.01),w*.72,.09,.025,accent,1.4);}
      for(let i=0;i<3;i++)b(x-w*.28+i*.24,h-.48,z+d/2+.02,.11,.18,.03,[.8,.5,.17],.3);
    }
    // Relay gate and its floating time core.
    for(const x of [-5,5]){b(x,4.4,-24,1,8.8,1.5,ink);b(x,4.4,-23.2,.13,8.4,.08,accent,2);b(x,8.8,-24,1.6,.4,2,steel);}
    b(0,8.4,-24,10,.65,1.4,steel);b(0,8,-23.2,9.7,.1,.07,accent,2);
    b(0,.32,-21,5,.64,4,ink);b(0,.68,-21,4.4,.1,3.4,accent,.4);
    // Distant architecture; a deterministic skyline with rows of lit windows.
    let seed=2050;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<62;i++){
      const side=i%2?1:-1,x=side*(24+rand()*70),z=-110+rand()*165,w=5+rand()*10,h=10+rand()*48,d=6+rand()*9;
      b(x,h/2-13,z,w,h,d,[.045+rand()*.025,.065+rand()*.03,.10+rand()*.035]);
      b(x,h-12.9,z,w+.4,.2,d+.4,[.12,.19,.25]);
      if(i%4===0){b(x,h-9,z,.18,8,.18,steel);b(x,h-5,z,.3,.3,.3,amber,3);}
      for(let row=0;row<Math.floor(h/2);row++)for(let col=0;col<3;col++){
        if(rand()<.28)continue;const c=rand()>.86?[.7,.29,.13]:[.10,.32+rand()*.2,.39+rand()*.2];
        b(x-w/2+w*(col+1)/4,row*2-11,z+d/2+.03,w*.13,.75,.025,c,.65);
        b(x-side*(w/2+.03),row*2-11,z-d*.3+col*d*.3,.025,.75,d*.14,c,.55);
      }
      if(i%9===0){const face=side===1?-1:1;b(x+face*(w/2+.08),h*.7-10,z,.05,7,d*.5,accent,1.2);}
    }
    // Hover roadways below the rooftop.
    for(const x of [-24,24]){b(x,-7,-5,8,.4,160,ink);b(x,-6.7,-5,.1,.05,160,cyan,.7);for(let z=-80;z<60;z+=10)b(x+1,-6.7,z,.1,.05,3,[.8,.65,.35],.7);}
    b(-35,26,-86,3,52,3,[.05,.08,.12]);b(-35,52.5,-86,5,.3,5,accent,3);
    this.staticCount=a.length/13;gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);
  }
  matrices(eye,yaw,pitch,fov){
    const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
    const r=[cy,0,sy],u=[-sy*sp,cp,cy*sp],f=[sy*cp,sp,-cy*cp];this.right=r;this.up=u;this.forward=f;
    const v=[r[0],u[0],-f[0],0,r[1],u[1],-f[1],0,r[2],u[2],-f[2],0,-r.reduce((s,t,i)=>s+t*eye[i],0),-u.reduce((s,t,i)=>s+t*eye[i],0),f.reduce((s,t,i)=>s+t*eye[i],0),1];
    const t=1/Math.tan(fov/2),aspect=this.canvas.width/this.canvas.height,near=.045,far=220;
    const p=[t/aspect,0,0,0,0,t,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
    for(let c=0;c<4;c++)for(let row=0;row<4;row++)this.vp[c*4+row]=p[row]*v[c*4]+p[4+row]*v[c*4+1]+p[8+row]*v[c*4+2]+p[12+row]*v[c*4+3];
  }
  instances(buffer,count,sphere=false){
    const gl=this.gl;gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,sphere?this.sphereMesh:this.mesh);
    for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,i*12);gl.vertexAttribDivisor(i,0);}
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [i,size,offset] of [[2,3,0],[3,3,12],[4,4,24],[5,3,40]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,52,offset);gl.vertexAttribDivisor(i,1);}
    gl.drawArraysInstanced(gl.TRIANGLES,0,sphere?this.sphereCount:36,count);
  }
  glow(points,x,y,z,c,size){points.push(x,y,z,...c,size);}
  burst(x,y,z,boss=false){for(let i=0;i<(boss?65:22);i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;this.particles.push({x,y,z,vx:Math.sin(a)*s,vy:(Math.random()-.25)*s,vz:Math.cos(a)*s,life:.3+Math.random()*.6,c:boss?[1,.3,.12]:[.3,1,.85]});}}
  render(s,entities,dt,{menu=false,recoil=0,moving=false,aim=false,settings={},characterView=null}={}){
    if(characterView){this.renderPortrait(characterView);return;}
    this.setLevel(s[10]);this.clock+=dt;const time=this.clock,gl=this.gl;
    const yaw=menu?-.19+Math.sin(time*.08)*.1:s[3],pitch=menu?-.06:s[4];
    const bob=moving?Math.sin(time*11)*.026:0;
    const eye=menu?[2,3.4,15]:[s[0],s[1]+1.65+bob,s[2]];this.camera=eye;
    this.matrices(eye,yaw,pitch,((settings.fov||84)-(aim?16:0))*Math.PI/180);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program,'vp'),false,this.vp);gl.uniform3fv(gl.getUniformLocation(this.program,'eye'),eye);
    gl.uniform1f(gl.getUniformLocation(this.program,'time'),time);gl.uniform1f(gl.getUniformLocation(this.program,'slow'),1-s[9]);
    this.instances(this.staticBuffer,this.staticCount);
    const a=[],spheres=[],points=[],characters=[],effects=new AnimaMesh(),b=(...v)=>this.box(a,...v),orb=(...v)=>this.box(spheres,...v),glow=(...v)=>this.glow(points,...v),cyan=[.16,.95,.78],red=[1,.25,.12],steel=[.14,.20,.26],black=[.045,.065,.09];
    // Floating relay geometric rings.
    for(let i=0;i<12;i++){
      const t=i*Math.PI/6+time*.25,r=1.4;b(Math.sin(t)*r,4.8+Math.cos(t)*r,-23,.14,.65,.14,this.accent,1.8,0,0,-t);
    }
    b(0,4.8,-23,.72,.72,.72,this.accent,1.3,time*.5,time*.4,time*.3);glow(0,4.8,-22.5,this.accent,3.6);
    for(let n=0;n<entities.length;n+=16){
      const kind=entities[n];if(!kind)continue;const x=entities[n+1],y=entities[n+2],z=entities[n+3],age=entities[n+11];
      if(kind===5){
        const angle=Math.atan2(s[0]-x,s[2]-z),base=y-1.5,mat=this.matrix(x,base,z,angle,1.35);characters.push({mat,hit:entities[n+13]>0});
        this.sigil(effects,[x,base+.025,z],[1,0,0],[0,0,1],1.05,time*.22,[1,.35,.08,.8]);
        const hand=[.78,2.22,.28],hx=x+Math.cos(angle)*hand[0]+Math.sin(angle)*hand[2],hz=z-Math.sin(angle)*hand[0]+Math.cos(angle)*hand[2];
        orb(hx,base+hand[1],hz,.32,.42,.32,[1,.34,.08],2);glow(hx,base+hand[1],hz,[1,.3,.06],1.3);
        for(let i=0;i<9;i++){const t=i*Math.PI*2/9+time*.5;orb(x+Math.sin(t)*1.1,base+.3+((time*.7+i*.3)%2.6),z+Math.cos(t)*.6,.04,.12,.04,[1,.4,.07],2);}
      }else if(kind===1){
        const heavy=entities[n+10]===1,r=entities[n+12],angle=Math.atan2(s[0]-x,s[2]-z),hit=entities[n+13]>0,c=hit?[1,1,1]:heavy?[.30,.20,.19]:steel;
        b(x,y,z,r*1.45,r*.7,r*1.1,c,hit?1:0,angle);
        b(x,y+r*.13,z,r*.66,r*.66,r*.66,red,hit?3:1.7,angle,0,Math.PI/4);
        for(const sign of [-1,1]){
          const lx=Math.cos(angle)*r*sign*1.25,lz=-Math.sin(angle)*r*sign*1.25;
          b(x+lx,y-.08,z+lz,r*.75,r*.25,r*1.5,black,0,angle,0,sign*.13);
          b(x+lx,y+.16,z+lz,r*.52,.08,r*1.2,red,1.6,angle);
          b(x+lx,y-r*.45,z+lz,.12,r*.6,.12,red,.8,angle);
          glow(x+lx,y-r*.5,z+lz,red,r*1.1);
        }
        glow(x,y,z,red,r*1.5);
        // World-space health indicator above each enemy.
        if(entities[n+7]<entities[n+8]){const ratio=entities[n+7]/entities[n+8],w=r*2;
          b(x,y+r+0.35,z,w,.06,.07,[.12,.13,.17]);b(x-w*(1-ratio)/2,y+r+.35,z+.045,w*ratio,.065,.04,red,1);
        }
      }else if(kind===2){const c=entities[n+10]===2?[1,.34,.1]:red;if(entities[n+10]===2)orb(x,y,z,.34,.34,.34,c,2);else b(x,y,z,.14,.14,.5,c,3,Math.atan2(entities[n+4],entities[n+6]));glow(x,y,z,c,1.3);}
      else if(kind===6){const charged=entities[n+10]===1,r=charged?.42:.18,c=charged?[.64,.44,1]:cyan;orb(x,y,z,r,r,r,c,1.8);glow(x,y,z,c,r*3);for(let i=1;i<=3;i++)glow(x-entities[n+4]*i*.003,y-entities[n+5]*i*.003,z-entities[n+6]*i*.003,c,r*(1-i*.15));}
      else if(kind===7){glow(x,y,z,cyan,(1-age/.55)*1.5);this.sigil(effects,[x,y,z],this.right,this.up,.12+age*.8,time*2,[.3,1,.85,1]);}
      else if(kind===3){const r=age*6;for(let k=0;k<8;k++){const t=k*Math.PI/4;b(x+Math.sin(t)*r,y+Math.cos(t)*r*.5,z+Math.cos(t)*r,.12,.12,.12,[1,.65,.2],3);}glow(x,y,z,[1,.5,.13],(1-age/.55)*5);}
      else if(kind===4){b(x,y+.2+Math.sin(time*3)*.15,z,.4,.4,.4,cyan,1.2,time);b(x,y+.7,z,.12,.4,.12,[1,1,1],1);b(x,y+.7,z,.4,.12,.12,[1,1,1],1);glow(x,y,z,cyan,1.8);}
    }
    // Ambient rain is rendered as short light-catching streaks.
    if(settings.rain!==false)for(let i=0;i<95;i++){
      const xx=eye[0]+((i*17.31)%34)-17,zz=eye[2]+((i*7.71)%34)-22,yy=((i*.719-time*8*(s[9]||1))%12+12)%12;
      b(xx,yy,zz,.008,.13,.008,[.25,.39,.46],.15,0,0,-.12);
    }
    this.particles=this.particles.filter(p=>p.life>0);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=6*dt;b(p.x,p.y,p.z,.045,.045,.045,p.c,2);glow(p.x,p.y,p.z,p.c,p.life*.7);}
    if(s[44]){const c=s[43]?[.15,1,.8,1.4]:[1,.25,.16,.7];this.sigil(effects,[s[40],.045,s[42]],[1,0,0],[0,0,1],.65,time*.8,c);glow(s[40],.1,s[42],c.slice(0,3),1.5);}
    this.blinks=this.blinks.filter(t=>t.life>0);for(const blink of this.blinks){blink.life-=dt;for(const p of [blink.from,blink.to])this.sigil(effects,[p[0],.04,p[2]],[1,0,0],[0,0,1],1+(.6-blink.life)*2,time*3,[.3,1,.85,blink.life]);}
    if(!menu)for(const sign of [-1,1]){const pos=eye.map((v,i)=>v+this.right[i]*sign*.27+this.up[i]*(-.018+recoil*.025)+this.forward[i]*(.66+recoil*.025));
      const charge=s[7],r=.08+charge*.12+(s[50]?.03:0);this.sigil(effects,pos,this.right,this.up,r,time*sign*.7,[.17,.9,.82,.6+charge]);orb(...pos,.05+charge*.08,.05+charge*.08,.05+charge*.08,cyan,1);glow(...pos,cyan,.2+charge*.25);
    }
    this.tracers=this.tracers.filter(t=>t.life>0);
    for(const t of this.tracers){t.life-=dt;const d=t.to.map((v,i)=>v-t.from[i]),length=Math.hypot(...d);b(...t.from.map((v,i)=>(v+t.to[i])/2),.015,.015,length,cyan,2.5,Math.atan2(d[0],d[2]),-Math.asin(d[1]/Math.max(.001,length)));}
    gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.DYNAMIC_DRAW);this.instances(this.dynamicBuffer,a.length/13);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(spheres),gl.DYNAMIC_DRAW);gl.disable(gl.CULL_FACE);this.instances(this.dynamicBuffer,spheres.length/13,true);gl.enable(gl.CULL_FACE);
    for(const character of characters)this.drawModel(this.reinaMesh,character.mat,this.reinaPose(time),character.hit?1:0);
    if(!menu){const matrix=[...this.right,0,...this.up,0,...this.forward,0,...eye,1];this.drawModel(this.handMesh,matrix,[[],[recoil*.08,0,-s[7]*.2],[recoil*.08,0,s[7]*.2]]);}
    gl.bindBuffer(gl.ARRAY_BUFFER,this.effectMesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(effects.vertices),gl.DYNAMIC_DRAW);this.effectMesh.count=effects.vertices.length/11;this.drawModel(this.effectMesh,this.identity());
    if(points.length){
      gl.useProgram(this.pointProgram);gl.uniformMatrix4fv(gl.getUniformLocation(this.pointProgram,'vp'),false,this.vp);gl.uniform1f(gl.getUniformLocation(this.pointProgram,'height'),this.canvas.height);
      gl.bindVertexArray(this.pointVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.pointBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,28,12);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.drawArrays(gl.POINTS,0,points.length/7);gl.depthMask(true);gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }
}
