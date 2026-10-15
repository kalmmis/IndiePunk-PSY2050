import {writeFileSync} from 'node:fs';
import path from 'node:path';
// Export the same skinned mesh used by WebGL as a standard, self-contained GLB.
export function exportModel(model,out){
  const count=model.vertices.length/11,chunks=[],views=[],accessors=[];let offset=0;
  function attribute(array,type,componentType){const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}const data=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const view=views.length;views.push({buffer:0,byteOffset:offset,byteLength:data.length});chunks.push(data);offset+=data.length;accessors.push({bufferView:view,componentType,count:type==='MAT4'?model.joints.length:count,type});return accessors.length-1;}
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*4),joints=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){const v=model.vertices;positions.set(v.slice(i*11,i*11+3),i*3);normals.set(v.slice(i*11+3,i*11+6),i*3);colors.set([...v.slice(i*11+6,i*11+9),1],i*4);joints[i*4]=v[i*11+10];weights[i*4]=1;}
  const p=attribute(positions,'VEC3',5126),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<count;i++)for(let k=0;k<3;k++){min[k]=Math.min(min[k],positions[i*3+k]);max[k]=Math.max(max[k],positions[i*3+k]);}accessors[p].min=min;accessors[p].max=max;
  const n=attribute(normals,'VEC3',5126),c=attribute(colors,'VEC4',5126),j=attribute(joints,'VEC4',5123),w=attribute(weights,'VEC4',5126);
  const bind=new Float32Array(model.joints.length*16);model.joints.forEach((joint,i)=>{bind.set([1,0,0,0,0,1,0,0,0,0,1,0,...joint.pivot.map(v=>-v),1],i*16);});const inverse=attribute(bind,'MAT4',5126);
  const meshNode=model.joints.length+1,nodes=[{name:'Reina',children:[...model.joints.map((_,i)=>i+1),meshNode]},...model.joints.map(b=>({name:b.name,translation:b.pivot})),{name:'Reina_SkinnedMesh',mesh:0,skin:0}];
  const gltf={asset:{version:'2.0',generator:'PSY2050 / illustration-derived Anima mesh authoring'},scene:0,scenes:[{nodes:[0]}],nodes,skins:[{joints:model.joints.map((_,i)=>i+1),inverseBindMatrices:inverse}],meshes:[{name:model.name,primitives:[{attributes:{POSITION:p,NORMAL:n,COLOR_0:c,JOINTS_0:j,WEIGHTS_0:w},material:0}]}],materials:[{name:'Reina_IllustrationPalette',doubleSided:true,pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:.85}}],buffers:[{byteLength:offset}],bufferViews:views,accessors,extras:{reference:model.reference,description:'Volumetric hair, modeled anime face, layered red dress, white sleeves, navy cravat, 9 skin joints. Lower legs/shoes complete the cropped reference.'}};
  let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
  const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  writeFileSync(path.join(out,'reina-model.glb'),Buffer.concat([header,jh,json,bh,bin]));
  writeFileSync(path.join(out,'reina-model.json'),JSON.stringify({name:model.name,reference:model.reference,vertices:count,triangles:count/3,joints:model.joints,format:'glTF 2.0 binary',file:'reina-model.glb'},null,2));
  return {vertices:count,triangles:count/3,joints:model.joints.length};
}
