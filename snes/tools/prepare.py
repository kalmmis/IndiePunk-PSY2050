"""Convert the existing game data/art to SNES bitplanes, palettes and ROM banks."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, struct, math, hashlib, re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'snes/.generated'
OUT.mkdir(parents=True, exist_ok=True)
ART = ROOT/'Assets/ArtRemaster'
asm = ['.include "hdr.asm"']
decl = ['#include "game.h"']
report = {}

def blob(name, data):
    (OUT/(name+'.bin')).write_bytes(data)
    asm.extend([f'.section "asset_{name}" superfree',name+':',f'.incbin ".generated/{name}.bin"',name+'_end:', '.ends'])
    decl.append(f'extern u8 {name};')
    return name

def palette(colors):
    return b''.join(struct.pack('<H',(r>>3)|((g>>3)<<5)|((b>>3)<<10)) for r,g,b in colors)

def planar(im,bpp=4):
    w,h=im.size; pix=im.load(); out=bytearray()
    for y in range(0,h,8):
        for x in range(0,w,8):
            for pair in range(bpp//2):
                for yy in range(8):
                    for p in range(2):
                        out.append(sum(((pix[x+xx,y+yy]>>(pair*2+p))&1)<<(7-xx) for xx in range(8)))
    return bytes(out)

def reduced(im,bpp=4):
    raw=planar(im,bpp); size=8*bpp; tiles=[bytes(size)]; ids={tiles[0]:0}; mapping=[]
    for i in range(0,len(raw),size):
        tile=raw[i:i+size]
        if tile not in ids: ids[tile]=len(tiles); tiles.append(tile)
        mapping.append(ids[tile])
    return b''.join(tiles),mapping

def quantize(im,colors=16):
    rgba=im.convert('RGBA'); rgb=rgba.convert('RGB')
    q=rgb.quantize(colors=colors-1,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    pal=q.getpalette(); cols=[(0,0,0)]+[tuple(pal[i:i+3]) for i in range(0,(colors-1)*3,3)]
    result=Image.new('P',im.size)
    result.putdata([v+1 if a>=80 else 0 for v,a in zip(q.tobytes(),rgba.getchannel('A').tobytes())])
    result.putpalette([v for c in cols for v in c]+[0]*(768-len(cols)*3))
    return result,cols

def mapped(name,im,max_tiles=1024):
    q,p=quantize(im); tiles,ids=reduced(q)
    assert len(tiles)//32<=max_tiles,(name,len(tiles)//32)
    m=ids+[0]*(1024-len(ids))
    blob(name+'_pic',tiles);blob(name+'_map',struct.pack('<1024H',*m));blob(name+'_pal',palette(p))
    decl.append(f'const u16 {name}_size={len(tiles)};')
    q.convert('RGB').save(OUT/(name+'-preview.png'))
    report[name+'_tiles']=len(tiles)//32

# Repeating street strip with stationary dark side columns on the 4:3 display.
road=Image.new('RGB',(256,256),(5,9,24))
strip=Image.open(ART/'backgrounds/background1.png').convert('RGB').resize((144,64),Image.Resampling.LANCZOS)
for y in range(0,256,64): road.paste(strip,(56,y))
d=ImageDraw.Draw(road)
for x in (54,200):d.line((x,0,x,255),fill=(32,110,145))
mapped('road',road,256)

fontfile=ROOT/'Assets/Fonts/BMDOHYEON_ttf.ttf'
font=ImageFont.truetype(str(fontfile),11)
small=ImageFont.truetype(str(ROOT/'Assets/Fonts/OpenSans-Regular.ttf'),9) if (ROOT/'Assets/Fonts/OpenSans-Regular.ttf').exists() else ImageFont.truetype(str(fontfile),9)
title=ImageOps.fit(Image.open(ART/'backgrounds/menu_background.png').convert('RGB'),(256,224),centering=(.5,.34))
shade=Image.new('RGBA',title.size,(0,0,0,0));sd=ImageDraw.Draw(shade)
sd.rectangle((0,0,255,54),fill=(3,5,20,180));sd.rectangle((0,155,255,223),fill=(3,5,20,235));title=Image.alpha_composite(title.convert('RGBA'),shade)
td=ImageDraw.Draw(title)
td.text((128,7),'PSY2050',font=ImageFont.truetype(str(fontfile),28),anchor='mt',fill=(235,245,255))
td.text((128,39),'CHRONO STORM  /  SUPER FAMICOM',font=small,anchor='mt',fill=(105,220,255))
mapped('title',title)

# Static sprite sheet. SNES OBJ rows have a stride of 16 tiles.
sheet=Image.new('P',(128,256)); palbytes=b''
groups=[
 (0, [('player'+str(i),(i*32,0),(24,30),(32,32)) for i in range(4)]),
 (1, [('boss'+str(i),(0,32+i*64),(58,62),(64,64)) for i in range(3)]),
 (2, [(n,(64+(i%2)*32,32+(i//2)*32),(24,26),(32,32)) for i,n in enumerate(['enemyA','enemyB','enemyC','enemyD'])]),
 (3, [('shot',(64,96),(4,8),(8,8)),('bulletA',(72,96),(6,6),(8,8)),('bulletB',(80,96),(5,5),(8,8))]),
 (4, [('explosion',(88,96),(8,8),(8,8)),('time_shard',(96,96),(6,6),(8,8))])]
preview=Image.new('RGBA',sheet.size)
for palid,items in groups:
    atlas=Image.new('RGBA',sheet.size)
    for name,pos,fit,box in items:
        src=Image.open(ART/'sprites'/(name+'.png')).convert('RGBA')
        bb=src.getchannel('A').getbbox()
        if bb:src=src.crop(bb)
        src.thumbnail(fit,Image.Resampling.LANCZOS)
        atlas.alpha_composite(src,(pos[0]+(box[0]-src.width)//2,pos[1]+(box[1]-src.height)//2))
    q,cols=quantize(atlas)
    for name,pos,fit,box in items:sheet.paste(q.crop((pos[0],pos[1],pos[0]+box[0],pos[1]+box[1])),pos)
    palbytes+=palette(cols);preview.alpha_composite(atlas)
# Beam dot is deliberately bright and opaque so its collision line stays legible.
for y in range(8):
    for x in range(8):
        if (x-3.5)**2+(y-3.5)**2<9:sheet.putpixel((104+x,96+y),1)
palbytes+=bytes(3*32)
blob('sprites_pic',planar(sheet));blob('sprites_pal',palbytes);preview.save(OUT/'sprites-preview.png')

# Font tile 0 is transparent; tile 1 is an opaque panel; ASCII starts at 2.
f=Image.new('P',(8*16,8*7));fd=ImageDraw.Draw(f)
fd.rectangle((8,0,15,7),fill=1)
mono=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',8) if Path('/System/Library/Fonts/Menlo.ttc').exists() else small
for k in range(96):fd.text((((k+2)%16)*8,((k+2)//16)*8-2),chr(k+32),font=mono,fill=3)
blob('font_pic',planar(f,2))

portraits=['portrait_player','portrait_player_gray','portrait_fire','portrait_fire_gray','portrait_time','portrait_time_gray']
for i,n in enumerate(portraits):
    path=ART/'portraits'/(n+'.png')
    src=Image.open(path).convert('RGBA'); bb=src.getchannel('A').getbbox();src=src.crop(bb)
    src=ImageOps.contain(src,(64,96),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(64,96));canvas.alpha_composite(src,((64-src.width)//2,96-src.height))
    q,p=quantize(canvas);blob(f'portrait_{i}_pic',planar(q));blob(f'portrait_{i}_pal',palette(p))
decl.append('u8 *portraitPics[]={'+','.join('&portrait_'+str(i)+'_pic' for i in range(6))+'};')
decl.append('u8 *portraitPals[]={'+','.join('&portrait_'+str(i)+'_pal' for i in range(6))+'};')

source=(ROOT/'Assets/Template/Scripts/ExcelParser.cs').read_text(encoding='utf-8-sig')
dialogue=re.search(r'private static string GetDialog\(\).*?return "(.*?)";',source,re.S)[1]
levels={}
for n in [1,2,3,4,10]:
    raw=re.search(rf'case {n}:\s+rtn = "(.*?)";',source,re.S)[1] if n in [1,2] else (ROOT/f'Assets/Resources/level{n}.csv').read_text().strip().replace('\n','#')
    levels[str(n)]=[r.split(',') for r in reversed(raw.split('#')) if r.strip()]
data={'dialogue':[r.split(',')for r in dialogue.split('#')if r],'levels':levels}
book={r[0].strip():i for i,r in enumerate(data['dialogue']) if r[0]}
linecodes=[]; max_page_tiles=0; pagecount=0
for i,r in enumerate(data['dialogue']):
    typ,arg,size,pic,mp=1,0,0,'0','0'
    if r[1]=='l':
        typ=0;pagecount+=1
        page=Image.new('P',(256,80),1);pd=ImageDraw.Draw(page)
        pd.line((0,0,255,0),fill=2);pd.text((9,5),r[2],font=font,fill=2)
        # Preserve explicit original line breaks, wrap at the actual Korean font width.
        text=r[3].replace('$',',').replace(';','\n'); wrapped=[]
        for raw in text.split('\n'):
            current=''
            for ch in raw:
                if pd.textlength(current+ch,font=font)>238:wrapped.append(current);current=''
                current+=ch
            wrapped.append(current)
        assert len(wrapped)<=4,(i,wrapped)
        for y,s in enumerate(wrapped):pd.text((9,22+y*13),s,font=font,fill=3)
        pd.text((244,65),'>',font=small,fill=2)
        raw,ids=reduced(page,2);max_page_tiles=max(max_page_tiles,len(raw)//16)
        assert len(raw)//16+128<=512
        full=[0]*1024
        for j,k in enumerate(ids):full[18*32+j]=(k+128)|(7<<10)|0x2000
        blob(f'dialog_{i}_pic',raw);blob(f'dialog_{i}_map',struct.pack('<1024H',*full))
        pic=f'&dialog_{i}_pic';mp=f'&dialog_{i}_map';size=len(raw)
    elif r[1]=='event':
        if r[2]=='nextStage':typ=2;arg=int(r[3])
        elif r[2].startswith('show '):
            typ=3;name=r[2][5:];arg=(portraits.index(name)+1 if name in portraits else 0)+(16 if r[3]=='right' else 0)
        elif r[2]=='end':typ=1
        else:typ=4
    linecodes.append('{'+f'{typ},{arg},{size},{pic},{mp}'+'}')
decl.append('const Line lines[]={'+',\n'.join(linecodes)+'};')
rowcodes=[];spawncodes=[];first=[];last=[]
for stage in ['1','2','3','4','10']:
    first.append(len(rowcodes))
    for row in data['levels'][stage]:
        wait=round((float(row[0] or 1)+2)*60);command=(row[1] if len(row)>1 else '').strip();typ=0;arg=alt=0;start=len(spawncodes)
        if command.startswith('load'):
            typ=1;label=command.split('=')[1].strip();arg=book[label+'0'] if 'Boss' in label else book[label];alt=book[label+'1'] if 'Boss' in label else arg
        elif command.startswith('boss='):
            typ=2;arg={'inactivated':0,'destroy':2}.get(command.split('|')[1],1)
        else:
            for j in range(len(row)-1,0,-2):
                code=row[j].strip()
                if not code or not row[j-1]:continue
                x=round(128+(float(row[j-1])-216)*7/24)
                spawncodes.append('{'+f'{x},{max(6,int(code[4:7] or 60))},{ord(code[0])-65},{ord(code[1])-65},{ord(code[2])-65}'+'}')
        rowcodes.append('{'+f'{wait},{typ},{arg},{alt},{len(spawncodes)-start},{start}'+'}')
    last.append(len(rowcodes))
decl.extend(['const Row rows[]={'+',\n'.join(rowcodes)+'};','const Spawn spawns[]={'+',\n'.join(spawncodes)+'};','const u16 stageFirst[]={'+','.join(map(str,first))+'};','const u16 stageLast[]={'+','.join(map(str,last))+'};','const s16 sintab[]={'+','.join(str(round(math.sin(i*2*math.pi/256)*256))for i in range(256))+'};'])
(ROOT/'snes/src/assets.asm').write_text('\n'.join(asm)+'\n')
with (ROOT/'snes/src/assets.asm').open('a') as f:
    for name in ['hit','shoot']:
        f.write(f'.section "sfx_{name}" superfree\n{name}_brr:\n.incbin ".generated/{name}.brr"\n{name}_brr_end:\n.ends\n')
for axis,fn in [('X',math.sin),('Y',math.cos)]:
    decl.append('const s16 turn'+axis+'[]={'+','.join(str(round(fn(math.radians(min(75,5+1.01**i)))*22.4))for i in range(511))+'};')
(ROOT/'snes/src/data.c').write_text('\n'.join(decl)+'\n')
report.update(dialogue_commands=len(linecodes),dialogue_pages=pagecount,largest_dialogue_tiles=max_page_tiles,stage_rows=len(rowcodes),enemy_spawns=len(spawncodes),source_sha256=hashlib.sha256(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()).hexdigest())
(OUT/'assets-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
