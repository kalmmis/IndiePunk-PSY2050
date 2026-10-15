"""Build PS1 textures, glyph atlas, source-driven story/stages and SPU effects."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,re,math,struct,wave,hashlib
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'ps1/.generated';ART=ROOT/'Assets/ArtRemaster'
OUT.mkdir(parents=True,exist_ok=True)
asm=['.section .rodata.assets,"a",@progbits'];decl=['#include "game.h"'];report={}
def blob(name,data):
    (OUT/(name+'.bin')).write_bytes(data)
    asm.extend(['.balign 4','.global '+name,name+':',f'.incbin ".generated/{name}.bin"'])
    decl.append(f'extern const u8 {name}[];')
def color(rgb):
    r,g,b=rgb;v=(r>>3)|((g>>3)<<5)|((b>>3)<<10)
    return v or 0x8000
def raw15(im):
    rgb=im.convert('RGB').tobytes()
    return b''.join(struct.pack('<H',color(rgb[i:i+3]))for i in range(0,len(rgb),3))
def quantize(im,name):
    rgba=im.convert('RGBA');q=rgba.convert('RGB').quantize(colors=255,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    p=q.getpalette();cols=[(0,0,0)]+[tuple(p[i:i+3])for i in range(0,765,3)]
    pixels=bytes(v+1 if a>=80 else 0 for v,a in zip(q.tobytes(),rgba.getchannel('A').tobytes()))
    blob(name+'_pic',pixels);blob(name+'_pal',struct.pack('<256H',0,*[color(c)for c in cols[1:]]))
    preview=Image.frombytes('P',im.size,pixels);preview.putpalette([v for c in cols for v in c]);preview.save(OUT/(name+'-preview.png'))
    return cols
def fit(src,size):
    src=src.convert('RGBA');bb=src.getchannel('A').point(lambda v:255 if v>=64 else 0).getbbox()
    if bb:src=src.crop(bb)
    return ImageOps.contain(src,size,Image.Resampling.LANCZOS)
fontfile=ROOT/'Assets/Fonts/BMDOHYEON_ttf.ttf';font=ImageFont.truetype(str(fontfile),12)
title=ImageOps.fit(Image.open(ART/'backgrounds/menu_background.png').convert('RGB'),(320,240),centering=(.5,.34)).convert('RGBA')
shade=Image.new('RGBA',title.size);d=ImageDraw.Draw(shade);d.rectangle((0,0,319,57),fill=(3,6,22,190));d.rectangle((0,158,319,239),fill=(3,6,22,225));title=Image.alpha_composite(title,shade);d=ImageDraw.Draw(title)
d.text((160,5),'PSY2050',font=ImageFont.truetype(str(fontfile),30),anchor='mt',fill=(230,245,255));d.text((160,42),'CHRONO STORM / PLAYSTATION',font=ImageFont.truetype(str(ROOT/'Assets/Fonts/OpenSans-Regular.ttf'),10),anchor='mt',fill=(96,220,255))
blob('title_pic',raw15(title));title.save(OUT/'title-preview.png')
road=Image.open(ART/'backgrounds/background1.png').convert('RGB').resize((160,256),Image.Resampling.LANCZOS);blob('road_pic',raw15(road))
atlas=Image.new('RGBA',(256,256))
items=[('player'+str(i),(i*32,0),(26,38),(32,48))for i in range(7)]
items += [('boss'+str(i),(i*64,48),(54,62),(64,64))for i in range(3)]
items += [(n,(i*32,112),(25,29),(32,32))for i,n in enumerate(['enemyA','enemyB','enemyC','enemyD'])]
items += [(n,(i*16,144),(14,14),(16,16))for i,n in enumerate(['shot','bulletA','bulletB','explosion','time_shard'])]
for name,pos,size,box in items:
    im=fit(Image.open(ART/'sprites'/(name+'.png')),size);atlas.alpha_composite(im,(pos[0]+(box[0]-im.width)//2,pos[1]+(box[1]-im.height)//2))
quantize(atlas,'actors')
atlas=Image.new('RGBA',(256,256))
for i,name in enumerate(['portrait_player','portrait_fire','portrait_time']):
    im=fit(Image.open(ART/'portraits'/(name+'.png')),(84,160));atlas.alpha_composite(im,(i*84+(84-im.width)//2,160-im.height))
cols=quantize(atlas,'portraits');gray=[round(r*.299+g*.587+b*.114)for r,g,b in cols]
blob('portraits_gray_pal',struct.pack('<256H',0,*[color((v,v,v))for v in gray[1:]]))

source=(ROOT/'Assets/Template/Scripts/ExcelParser.cs').read_text(encoding='utf-8-sig')
raw=re.search(r'private static string GetDialog\(\).*?return "(.*?)";',source,re.S)[1]
dialogue=[r.split(',')for r in raw.split('#')if r];levels={}
for n in [1,2,3,4,10]:
    raw=re.search(rf'case {n}:\s+rtn = "(.*?)";',source,re.S)[1] if n in [1,2] else (ROOT/f'Assets/Resources/level{n}.csv').read_text().strip().replace('\n','#')
    levels[str(n)]=[r.split(',')for r in reversed(raw.split('#'))if r.strip()]
book={r[0].strip():i for i,r in enumerate(dialogue)if r[0]}
chars=sorted(set(''.join(r[2]+r[3]for r in dialogue if r[1]=='l').replace('$',',').replace(';','\n'))-{'\n'})
ids={ch:i+1 for i,ch in enumerate(chars)};pages=(len(chars)+255)//256
assert pages<=3,(len(chars),pages)
for page in range(pages):
    im=Image.new('L',(256,256));d=ImageDraw.Draw(im)
    for i,ch in enumerate(chars[page*256:(page+1)*256]):d.text(((i&15)*16,(i>>4)*16-2),ch,font=font,fill=255)
    q=bytes(round(v/17)for v in im.tobytes());blob('font_'+str(page),bytes(q[i]|(q[i+1]<<4)for i in range(0,len(q),2)))
decl.append('const u8 *fontPics[]={'+','.join('font_'+str(i)for i in range(pages))+'};');decl.append(f'const u16 fontPages={pages};')
blob('font_pal',struct.pack('<16H',0,*[color((i*17,)*3)for i in range(1,16)]))
decl.append('const u16 fontAdvance[]={0,'+','.join(str(round(font.getlength(ch)))for ch in chars)+'};')
def encoded(text):return ','.join(['65535'if ch=='\n'else str(ids[ch])for ch in text]+['0'])
linecodes=[];pages_text=0;maxlines=0
for i,r in enumerate(dialogue):
    typ,arg=1,0;speaker=text='0'
    if r[1]=='l':
        typ=0;pages_text+=1;wrapped=[]
        for line in r[3].replace('$',',').replace(';','\n').split('\n'):
            current=''
            for ch in line:
                if font.getlength(current+ch)>300:wrapped.append(current);current=''
                current+=ch
            wrapped.append(current)
        maxlines=max(maxlines,len(wrapped));assert len(wrapped)<=4,(i,wrapped)
        decl.extend([f'static const u16 speaker_{i}[]={{'+encoded(r[2])+'};',f'static const u16 text_{i}[]={{'+encoded('\n'.join(wrapped))+'};'])
        speaker=f'speaker_{i}';text=f'text_{i}'
    elif r[1]=='event':
        if r[2]=='nextStage':typ=2;arg=int(r[3])
        elif r[2].startswith('show '):
            typ=3;n=r[2][5:];names=['portrait_player','portrait_player_gray','portrait_fire','portrait_fire_gray','portrait_time','portrait_time_gray'];arg=(names.index(n)+1 if n in names else 0)+(16 if r[3]=='right'else 0)
        elif r[2]!='end':typ=4
    linecodes.append('{'+f'{typ},{arg},{speaker},{text}'+'}')
decl.append('const Line lines[]={'+',\n'.join(linecodes)+'};')
rows=[];spawns=[];first=[];last=[]
for stage in ['1','2','3','4','10']:
    first.append(len(rows))
    for r in levels[stage]:
        command=(r[1]if len(r)>1 else'').strip();typ=arg=alt=0;start=len(spawns)
        if command.startswith('load'):
            typ=1;label=command.split('=')[1].strip();arg=book[label+'0']if'Boss'in label else book[label];alt=book[label+'1']if'Boss'in label else arg
        elif command.startswith('boss='):typ=2;arg={'inactivated':0,'destroy':2}.get(command.split('|')[1],1)
        else:
            for j in range(len(r)-1,0,-2):
                code=r[j].strip()
                if not code or not r[j-1]:continue
                x=round(128+(float(r[j-1])-216)*7/24)
                spawns.append('{'+f'{x},{max(6,int(code[4:7]or 60))},{ord(code[0])-65},{ord(code[1])-65},{ord(code[2])-65}'+'}')
        rows.append('{'+f'{round((float(r[0]or 1)+2)*60)},{typ},{arg},{alt},{len(spawns)-start},{start}'+'}')
    last.append(len(rows))
decl.extend(['const Row rows[]={'+',\n'.join(rows)+'};','const Spawn spawns[]={'+',\n'.join(spawns)+'};','const u16 stageFirst[]={'+','.join(map(str,first))+'};','const u16 stageLast[]={'+','.join(map(str,last))+'};','const s16 sintab[]={'+','.join(str(round(math.sin(i*2*math.pi/256)*256))for i in range(256))+'};'])
for axis,fn in [('X',math.sin),('Y',math.cos)]:decl.append('const s16 turn'+axis+'[]={'+','.join(str(round(fn(math.radians(min(75,5+1.01**i)))*22.4))for i in range(511))+'};')

# Filter-0 SPU ADPCM, 28 samples/block. Final silent block loops until key-off.
for name in ['Shoot_01','Hit_03']:
    with wave.open(str(ROOT/'Assets/Resources'/(name+'.wav')),'rb') as w:
        assert w.getsampwidth()==2
        c,rate,frames=w.getnchannels(),w.getframerate(),w.getnframes();samples=struct.unpack('<'+'h'*(frames*c),w.readframes(frames))
    mono=[round(sum(samples[int(k*rate/22050)*c:int(k*rate/22050)*c+c])/c)for k in range(int(frames*22050/rate))];packed=bytearray(16)
    for pos in range(0,len(mono),28):
        block=mono[pos:pos+28]+[0]*max(0,pos+28-len(mono));peak=max(1,max(map(abs,block)));shift=max(0,min(12,int(math.log2(28672/peak))))
        step=4096/(1<<shift);n=[max(-8,min(7,round(s/step)))&15 for s in block]
        packed.extend([shift,0]);packed.extend(n[i]|(n[i+1]<<4)for i in range(0,28,2))
    packed.extend(bytes([0,7])+bytes(14));packed.extend(bytes((-len(packed))%64));blob('sfx_'+name,packed);decl.append(f'const u32 sfx_{name}_size={len(packed)};')

(ROOT/'ps1/src/assets.S').write_text('\n'.join(asm)+'\n');(ROOT/'ps1/src/data.c').write_text('\n'.join(decl)+'\n')
report={'dialogue_commands':len(dialogue),'dialogue_pages':pages_text,'glyphs':len(chars),'font_pages':pages,'max_dialogue_lines':maxlines,'stage_rows':len(rows),'enemy_spawns':len(spawns),'source_sha256':hashlib.sha256(json.dumps({'dialogue':dialogue,'levels':levels},ensure_ascii=False,separators=(',',':')).encode()).hexdigest()}
(OUT/'assets-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
