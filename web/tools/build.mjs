import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const web=path.join(root,'web'),out=path.join(root,'build/wasm');
mkdirSync(out,{recursive:true});
function run(command,args){const r=spawnSync(command,args,{cwd:root,stdio:'inherit'});if(r.status!==0)throw new Error(`${command} exited with ${r.status}`);}
function pythonRuntime(){
 const candidates=[process.env.PYTHON,'python3',path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3')].filter(Boolean);
 const python=candidates.find(p=>spawnSync(p,['-c','from PIL import Image']).status===0);
 if(!python)throw new Error('Install Python 3 and Pillow (python3 -m pip install Pillow), or set PYTHON.');
 return python;
}
if(!existsSync(path.join(web,'.generated/assets.json'))||process.argv.includes('--fresh')){
 run(pythonRuntime(),[path.join(web,'tools/extract_assets.py')]);
}
const remastered=existsSync(path.join(root,'Assets/ArtRemaster/source/mina-portrait.png'));
if(remastered)run(pythonRuntime(),[path.join(web,'tools/prepare_art.py')]);
run(process.execPath,[path.join(web,'node_modules/assemblyscript/bin/asc.js'),path.join(web,'src/game.ts'),'--outFile',path.join(out,'game.wasm'),'--optimize','--exportRuntime','--runtime','stub','--noAssert']);
const read=name=>readFileSync(path.join(web,'src',name),'utf8');
const originalAssets=JSON.parse(readFileSync(path.join(web,'.generated/assets.json'),'utf8'));
const originalSources=JSON.parse(readFileSync(path.join(web,'.generated/asset-sources.json'),'utf8'));
const assets={...originalAssets},sources={...originalSources};
if(remastered){
 const art=JSON.parse(readFileSync(path.join(web,'.generated/remaster-assets.json'),'utf8'));
 const missing=Object.keys(originalAssets).filter(k=>originalAssets[k].startsWith('data:image/')&&!art[k]);
 if(missing.length)throw new Error('Remaster coverage missing: '+missing.join(', '));
 Object.assign(assets,art);
 const manifest=JSON.parse(readFileSync(path.join(root,'Assets/ArtRemaster/manifest.json'),'utf8'));
 Object.assign(sources,manifest.assets);
 writeFileSync(path.join(out,'art-manifest.json'),JSON.stringify(manifest,null,2));
}
const data=readFileSync(path.join(web,'.generated/data.json'),'utf8').replaceAll('<','\\u003c');
const wasm=readFileSync(path.join(out,'game.wasm')).toString('base64');
function packageGame(filename,edition,bundle,template,style){
 const css=read(style).replaceAll('__FONT__',bundle.font).replaceAll('__JUPITER__',bundle.jupiter);
 const html=read(template).replace('/*__STYLES__*/',()=>css).replace('/*__ASSETS__*/',()=>JSON.stringify(bundle).replaceAll('<','\\u003c')).replace('/*__DATA__*/',()=>data).replace('/*__WASM__*/',()=>wasm).replace('/*__EDITION__*/',()=>edition).replace('/*__APP__*/',()=>read('app.js'));
 writeFileSync(path.join(out,filename),html);
 console.log(`Built build/wasm/${filename} (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB), ${edition}, standalone offline HTML.`);
}
packageGame('original.html','original',originalAssets,'original/index.html','original/style.css');
packageGame('index.html',remastered?'remastered':'original',assets,remastered?'index.html':'original/index.html',remastered?'style.css':'original/style.css');
writeFileSync(path.join(out,'asset-sources.json'),JSON.stringify(sources,null,2));
writeFileSync(path.join(out,'original-asset-sources.json'),JSON.stringify(originalSources,null,2));
writeFileSync(path.join(out,'versions.html'),read('versions.html'));
