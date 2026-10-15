import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReinaModel} from '../src/models.js';
import {exportModel} from './export-model.mjs';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.dirname(project),out=path.join(root,'build/fps');
mkdirSync(out,{recursive:true});
const read=name=>readFileSync(path.join(project,'src',name),'utf8');
const worlds=JSON.parse(read('worlds.json'));
const covers=[],coverOffsets=[0],spawns=[],spawnOffsets=[0];
for(const world of worlds){covers.push(...world.covers.flat());coverOffsets.push(covers.length);spawns.push(...world.spawns.flat());spawnOffsets.push(spawns.length);}
const generated=`// Generated from worlds.json. Do not edit.\nexport const coverData: f64[] = [${covers}];\nexport const coverOffsets: i32[] = [${coverOffsets}];\nexport const spawnData: f64[] = [${spawns}];\nexport const spawnOffsets: i32[] = [${spawnOffsets}];\n`;
// Keep generated source inside the project; an installed compiler is the only build dependency.
writeFileSync(path.join(project,'src/world.generated.ts'),generated);
const compiler=path.join(project,'node_modules/assemblyscript/bin/asc.js');
if(!existsSync(compiler))throw new Error('Run npm ci --prefix fps before building.');
const result=spawnSync(process.execPath,[compiler,path.join(project,'src/engine.ts'),'--outFile',path.join(out,'game.wasm'),'--optimize','--runtime','stub','--initialMemory','4'],{stdio:'inherit',cwd:project});
if(result.status!==0)throw new Error('FPS WebAssembly compilation failed');
const assets={},sources={};
function embed(key,relative,mime){assets[key]=`data:${mime};base64,${readFileSync(path.join(root,relative)).toString('base64')}`;sources[key]=relative;}
embed('mina','Assets/ArtRemaster/portraits/portrait_player.png','image/png');embed('reina','Assets/ArtRemaster/portraits/portrait_fire.png','image/png');embed('time','Assets/ArtRemaster/portraits/portrait_time.png','image/png');
embed('font','Assets/Fonts/OpenSans-Regular.ttf','font/ttf');embed('korean','Assets/Fonts/BMDOHYEON_ttf.ttf','font/ttf');
// Convert original PCM WAVE audio to portable 22.05kHz mono without Python or external codecs.
function audio(key,name){
  const relative=`Assets/Resources/${name}.wav`,buf=readFileSync(path.join(root,relative));let format,data;
  if(buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WAVE')throw new Error('Invalid WAVE: '+relative);
  for(let pos=12;pos+8<=buf.length;){const id=buf.toString('ascii',pos,pos+4),size=buf.readUInt32LE(pos+4);if(id==='fmt ')format=buf.subarray(pos+8,pos+8+size);if(id==='data')data=buf.subarray(pos+8,pos+8+size);pos+=8+size+(size%2);}
  if(!format||!data||format.readUInt16LE(0)!==1||format.readUInt16LE(14)!==16)throw new Error('Expected 16-bit PCM: '+relative);
  const channels=format.readUInt16LE(2),rate=format.readUInt32LE(4),frames=Math.floor(data.length/(channels*2)),target=22050,length=Math.floor(frames*target/rate),wav=Buffer.alloc(44+length*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(target,24);wav.writeUInt32LE(target*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*2,40);
  for(let i=0;i<length;i++){const f=Math.min(frames-1,Math.floor(i*rate/target));let value=0;for(let c=0;c<channels;c++)value+=data.readInt16LE((f*channels+c)*2);wav.writeInt16LE(Math.round(value/channels),44+i*2);}
  assets[key]='data:audio/wav;base64,'+wav.toString('base64');sources[key]=relative;
}
audio('music','bgm_Chrono_Storm_loopable');audio('hit','Hit_03');audio('hurt','Hit_02');audio('teleport','teleport_rnd_01');
const modelStats=exportModel(createReinaModel(),out);
const wasm=readFileSync(path.join(out,'game.wasm'));
const styles=read('style.css').replaceAll('__FONT__',assets.font).replaceAll('__KOREAN__',assets.korean);
let html=read('index.html');
for(const [token,value] of Object.entries({STYLES:styles,ASSETS:JSON.stringify(assets).replaceAll('<','\\u003c'),WORLDS:JSON.stringify(worlds).replaceAll('<','\\u003c'),WASM:wasm.toString('base64'),MODELS:read('models.js').replaceAll('export ',''),RENDERER:read('renderer.js'),APP:read('app.js')}))html=html.replace(`/*__${token}__*/`,()=>value);
if(/\/\*__[A-Z]+__\*\//.test(html))throw new Error('Unfilled build token');
writeFileSync(path.join(out,'index.html'),html);
writeFileSync(path.join(out,'asset-sources.json'),JSON.stringify({project:'PSY2050 ANIMA / FPS',renderer:'WebGL 2 — procedural 3D geometry',simulation:'AssemblyScript / WebAssembly',wasmSha256:createHash('sha256').update(wasm).digest('hex'),sources},null,2));
console.log(`Built build/fps/index.html (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB), game.wasm (${wasm.length} bytes), Reina GLB (${modelStats.triangles} triangles / ${modelStats.joints} joints).`);
