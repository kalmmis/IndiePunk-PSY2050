import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.dirname(project),out=path.join(root,'build/tower-defense');
mkdirSync(out,{recursive:true});
const read=name=>readFileSync(path.join(project,'src',name),'utf8'),assets={},sources=JSON.parse(readFileSync(path.join(project,'assets/sources.json')));
for(const key of Object.keys(sources)){const mime=key==='music'?'audio/wav':'image/webp';assets[key]=`data:${mime};base64,${readFileSync(path.join(project,'assets',key+(key==='music'?'.wav':'.webp'))).toString('base64')}`;}
function avatar({color,hair,coat,style=0,mark='✧',eyes='#c2d9b7'}){
  // Local vector portraits give the new cast a consistent tactical dossier style.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#243938"/><stop offset="1" stop-color="#101e26"/></linearGradient><linearGradient id="hair" x2="1" y2="1"><stop stop-color="${hair}"/><stop offset="1" stop-color="#1e283c"/></linearGradient><linearGradient id="coat" x2=".8" y2="1"><stop stop-color="${coat}"/><stop offset="1" stop-color="#152530"/></linearGradient><radialGradient id="halo"><stop stop-color="${color}" stop-opacity=".2"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><path fill="url(#bg)" d="M0 0h320v420H0z"/><circle cx="160" cy="153" r="150" fill="url(#halo)"/><g fill="none" stroke="${color}" stroke-opacity=".15"><circle cx="160" cy="150" r="119"/><circle cx="160" cy="150" r="107"/><path d="M0 50h320M0 320h320M50 0v420M270 0v420M0 150h320"/></g><path fill="url(#hair)" d="M78 194Q61 94 110 62Q154 34 197 63Q253 88 241 194L260 314L70 314Z"/><path fill="#0a151b" opacity=".3" d="M84 174l-17 150 57-39 76 18 50 26-13-151z"/><path fill="url(#coat)" d="M58 420l11-113q14-38 64-47h54q52 8 65 47l15 113Z"/><path fill="#dac1af" d="M139 226h43v50l-21 30-26-30z"/><path fill="#374f50" d="M123 260l38 39-24 37-31-59zM191 259l-30 40 23 37 28-59z"/><path fill="#182530" d="M139 290l22 15 22-15-10 130h-25z"/><path fill="${color}" opacity=".85" d="M126 268l-15 8 24 52 5-15zM196 268l13 9-23 51-6-15z"/><path fill="#dbc1af" d="M94 126q-9 91 38 124q30 20 60-2q42-30 36-120q-66-70-134-2z"/><path fill="#bc948b" opacity=".3" d="M99 161l12 58 34 31-19-53z"/><path fill="url(#hair)" d="M83 163q-13-85 51-110q63-19 96 40l11 80-22-36-16-35-33 41-14-44-39 51-4-31-23 60z"/>${style%2===0?`<path fill="url(#hair)" d="M87 147l-10 124 30-23 4-104zM225 139l19 138-33-32 2-113z"/>`:`<path fill="url(#hair)" d="M86 147l-8 64 25-23 7-58zM224 141l17 67-29-25 1-61z"/>`}<path fill="none" stroke="#342d3e" stroke-width="3" d="M112 172q12-8 25 0M182 172q12-8 25 0"/><path fill="#f0e4d5" d="M112 180q13-9 26 0q-13 11-26 0M180 180q13-9 26 0q-13 11-26 0"/><g fill="${eyes}"><ellipse cx="126" cy="180" rx="5" ry="6"/><ellipse cx="194" cy="180" rx="5" ry="6"/></g><g fill="#182637"><ellipse cx="126" cy="180" rx="2" ry="4"/><ellipse cx="194" cy="180" rx="2" ry="4"/></g><path fill="none" stroke="#b38c83" stroke-width="1.8" d="M159 186l-4 18 7 2M148 224q12 4 25-1"/><path fill="none" stroke="${color}" stroke-opacity=".5" stroke-width="2" d="M75 307l-2 88M247 307l5 88M153 341v65"/><circle cx="161" cy="331" r="9" fill="#233633" stroke="${color}"/><text x="161" y="335" text-anchor="middle" font-size="13" fill="${color}">${mark}</text><path fill="none" stroke="${color}" stroke-opacity=".4" d="M19 16h35M19 16v35M301 404h-35M301 404v-35"/>${style===2?`<path fill="none" stroke="${color}" stroke-width="3" d="M100 169l40-2 3 26-39 1zm78-2 39 2-4 25-39-1zM141 178h34"/>`:''}${style===3?`<path fill="none" stroke="${color}" stroke-width="3" d="M232 95l20 38-9 49M236 184l-21 12"/><circle cx="232" cy="181" r="8" fill="#283638" stroke="${color}"/>`:''}</svg>`;
}
const avatars={
  rita:{color:'#abe28b',hair:'#83a990',coat:'#526c60',style:3,mark:'ϟ'},
  haeun:{color:'#ffb984',hair:'#bf8d73',coat:'#8c5e50',style:0,mark:'◉',eyes:'#d1a072'},
  yul:{color:'#f0d586',hair:'#93a5ba',coat:'#62677a',style:1,mark:'⌁',eyes:'#97b6cf'},
  serin:{color:'#f0a5cd',hair:'#c59dbf',coat:'#75536d',style:0,mark:'❋',eyes:'#b79dca'},
  vesper:{color:'#b99aff',hair:'#8f82b2',coat:'#4b466d',style:2,mark:'ϟ',eyes:'#b3a1ef'},
  orphe:{color:'#80d3df',hair:'#c2d3d7',coat:'#456c73',style:1,mark:'❋',eyes:'#79c7c7'}
};
for(const [key,opts]of Object.entries(avatars)){const svg=avatar(opts);writeFileSync(path.join(project,'assets',key+'.svg'),svg);assets[key]='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');}
const font='data:font/ttf;base64,'+readFileSync(path.join(root,'Assets/Fonts/OpenSans-Regular.ttf')).toString('base64');
const korean='data:font/ttf;base64,'+readFileSync(path.join(root,'Assets/Fonts/BMDOHYEON_ttf.ttf')).toString('base64');
const css=read('style.css').replaceAll('__FONT__',font).replaceAll('__KOREAN__',korean).replaceAll('__CITY__',assets.city);
const js=['data.js','engine.js','renderer.js','app.js'].map(name=>read(name).replace(/^import .*?;\n/gm,'').replace(/^export /gm,'')).join('\n');
const bundle=`(()=>{'use strict';window.TD_ASSETS=${JSON.stringify(assets)};${js}\n})();`;
const html=read('index.html').replace('/*__STYLES__*/',()=>css).replace('/*__BUNDLE__*/',()=>bundle.replaceAll('</script','<\\/script'));
if(/\/\*__[A-Z]+__\*\//.test(html))throw new Error('Unfilled build token');
writeFileSync(path.join(out,'index.html'),html);
writeFileSync(path.join(out,'asset-sources.json'),JSON.stringify({project:'PSY2050: LAST SIGNAL',simulation:'deterministic JavaScript / fixed-step',...sources,portraits:'New operator and boss portraits: locally authored SVG; see tower-defense/assets/*.svg'},null,2)+'\n');
console.log(`Built build/tower-defense/index.html (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB). Offline; zero runtime dependencies.`);
