import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReinaModel,createMinaHands} from '../src/models.js';

// Parse the delivered GLB rather than just inspecting its authoring configuration.
const glb=readFileSync(new URL('../../build/fps/reina-model.glb',import.meta.url));
const jsonLength=glb.readUInt32LE(12),gltf=JSON.parse(glb.toString('utf8',20,20+jsonLength)),binStart=28+jsonLength;
function attribute(index){const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView],width={VEC3:3,VEC4:4,MAT4:16}[a.type],bytes=a.componentType===5123?2:4,values=[];for(let n=0;n<a.count*width;n++){const offset=binStart+view.byteOffset+(a.byteOffset||0)+n*bytes;values.push(bytes===2?glb.readUInt16LE(offset):glb.readFloatLE(offset));}return values;}

test('delivered Reina GLB contains a complete volumetric mesh with illustration palette and skin',()=>{
  assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);assert.equal(glb.readUInt32LE(16),0x4e4f534a);assert.equal(glb.readUInt32LE(24+jsonLength),0x004e4942);assert.equal(glb.readUInt32LE(20+jsonLength)+binStart,glb.length);
  assert.equal(gltf.asset.version,'2.0');assert.equal(gltf.images,undefined);assert.equal(gltf.buffers[0].uri,undefined);assert.equal(gltf.extras.reference,'Assets/ArtRemaster/portraits/portrait_fire.png');
  const p=gltf.meshes[0].primitives[0],model=createReinaModel(),positions=attribute(p.attributes.POSITION),normals=attribute(p.attributes.NORMAL),joints=attribute(p.attributes.JOINTS_0),weights=attribute(p.attributes.WEIGHTS_0),colors=attribute(p.attributes.COLOR_0);
  assert.equal(positions.length,model.vertices.length/11*3);assert.equal(positions.length%9,0);assert.ok(positions.length/9>20000);
  const bounds=gltf.accessors[p.attributes.POSITION];assert.ok(bounds.max[0]-bounds.min[0]>1);assert.ok(bounds.max[1]-bounds.min[1]>2.1);assert.ok(bounds.max[2]-bounds.min[2]>.65,'mesh must have front-to-back volume');
  for(const list of [positions,normals,weights,colors])assert.ok(list.every(Number.isFinite));
  for(let i=0;i<normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...normals.slice(i,i+3))-1)<1e-5);
  for(let i=0;i<weights.length;i+=4){assert.equal(weights[i]+weights[i+1]+weights[i+2]+weights[i+3],1);assert.ok(joints[i]>=0&&joints[i]<gltf.skins[0].joints.length);}
  // The GLB and the model drawn in the game have identical positions and joint assignments.
  for(let i=0;i<model.vertices.length/11;i++){for(let k=0;k<3;k++)assert.ok(Math.abs(positions[i*3+k]-model.vertices[i*11+k])<1e-6);assert.equal(joints[i*4],model.vertices[i*11+10]);}
  const bind=attribute(gltf.skins[0].inverseBindMatrices);gltf.skins[0].joints.forEach((node,i)=>{const pivot=gltf.nodes[node].translation;for(let k=0;k<3;k++)assert.ok(Math.abs(bind[i*16+12+k]+pivot[k])<1e-6);});
});
test('Mina first-person model has two articulated bare hands and finite geometry',()=>{
  const model=createMinaHands();assert.equal(model.joints.length,3);assert.ok(model.vertices.every(Number.isFinite));assert.ok(model.vertices.some((v,i)=>i%11===10&&v===1));assert.ok(model.vertices.some((v,i)=>i%11===10&&v===2));
});
