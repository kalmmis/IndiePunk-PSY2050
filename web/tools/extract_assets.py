"""Extract existing Unity assets; no Unity installation is needed."""
from pathlib import Path
from PIL import Image
import base64, io, json, re, wave, struct, subprocess, sys, tempfile
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'web' / '.generated'
OUT.mkdir(exist_ok=True)
assets = {}
sources = {}
def image(key, relative, max_size=None, crop=None):
    path = ROOT / relative
    if path.suffix.lower() == '.psd':
        # Pillow's PSD composite can have stale RGB and omit merged transparency.
        # macOS ImageIO reads the actual flattened layers, including their alpha.
        if sys.platform == 'darwin':
            with tempfile.TemporaryDirectory() as temp:
                png = Path(temp) / 'sprite.png'
                subprocess.run(['sips','-s','format','png',str(path),'--out',str(png)],check=True,stdout=subprocess.DEVNULL)
                im = Image.open(png).convert('RGBA')
        else:
            from psd_tools import PSDImage
            im = PSDImage.open(path).composite().convert('RGBA')
    else:
        im = Image.open(path).convert('RGBA')
    if key.startswith('ui_'):
        r,g,b,a = im.split()
        im = Image.merge('RGBA', (r.point(lambda v: 0),g.point(lambda v: round(v*140/255)),b,a))
    if crop: im = im.crop(crop)
    if max_size: im.thumbnail(max_size, Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format='WEBP', quality=93, method=4)
    assets[key] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    sources[key] = relative

def sheet(prefix, relative, indices, max_size):
    path = ROOT / relative
    meta = path.with_suffix(path.suffix + '.meta').read_text()
    rects = re.findall(r'      name: (\S+)\n      rect:\n        serializedVersion: \d+\n        x: ([\d.]+)\n        y: ([\d.]+)\n        width: ([\d.]+)\n        height: ([\d.]+)', meta)
    height = Image.open(path).height
    for idx in indices:
        _, x, y, w, h = rects[idx]
        x,y,w,h = map(lambda s: int(float(s)), (x,y,w,h))
        image(f'{prefix}{idx}', relative, max_size, (x,height-y-h,x+w,height-y))

for name in ['portrait_player','portrait_player_gray','portrait_fire','portrait_fire_gray','portrait_time','portrait_time_gray','LOGO','Credit']:
    image(name, f'Assets/Resources/Image/{name}.png', (650,1400))
for i in [1,2]: image(f'background{i}', f'Assets/Template/Sprites/Background/background0{i}.png', (1024,1024))
image('web_background','_ArtDevelop/WebGL_background04.png', (1920,1080))
image('menu_background','Assets/Textures and Sprites/SF UI/Background/SF Background.jpg', (1000,1600))
for key,name in [('ui_button','SF Button'),('ui_title','SF Title'),('ui_window','SF Window')]:
    image(key, f'Assets/Textures and Sprites/SF UI/{name}.psd')
sheet('player', 'Assets/Template/Sprites/Player/SpriteSheet.png', range(7), (186,292))
sheet('boss', 'Assets/Template/Sprites/Enemies/FireSpriteSheet.png', range(3), (340,312))
for key,name in [('enemyA','Enemies/Enemy_01'),('enemyB','Enemies/Enemy_02'),('shot','Weapons/Player_Projectile'),('bulletA','Weapons/Fire_projectile'),('bulletB','Weapons/Machine Gun'),('beam','Weapons/FireSword'),('explosion','VFX/Explosions/Rocket_Explosion_01')]:
    image(key, f'Assets/Template/Sprites/{name}.png', (512,512))
# Downsample existing PCM audio for a portable, dependency-free HTML file.
for name in ['bgm_Chrono_Storm_loopable','Beep_in','beep_out','Hit_03','Hit_02','Shoot_01','Click_Electronic_02','Jingle_Lose_00','outer_space_twinkle_lp_01','teleport_rnd_01']:
    path = ROOT / f'Assets/Resources/{name}.wav'
    with wave.open(str(path),'rb') as w:
        channels,width,rate = w.getnchannels(),w.getsampwidth(),w.getframerate()
        data = w.readframes(w.getnframes())
    if width == 2:
        samples = struct.unpack('<' + 'h' * (len(data)//2), data)
    elif width == 1:
        samples = [(v-128)*256 for v in data]
    else:
        samples = [int.from_bytes(data[i:i+width],'little',signed=True) >> (8*(width-2))
                   for i in range(0,len(data),width)]
    frames = len(samples)//channels
    # Integer resampling keeps the build compatible with Python 3.13+.
    resampled = bytearray()
    for k in range(int(frames * 22050 / rate)):
        offset = min(frames-1, int(k * rate / 22050)) * channels
        value = round(sum(samples[offset:offset+channels]) / channels)
        resampled.extend(struct.pack('<h',value))
    data = bytes(resampled)
    buf = io.BytesIO()
    with wave.open(buf,'wb') as w:
        w.setparams((1,2,22050,0,'NONE','not compressed')); w.writeframes(data)
    assets[name] = 'data:audio/wav;base64,' + base64.b64encode(buf.getvalue()).decode()
    sources[name] = str(path.relative_to(ROOT))
for key,name in [('font','BMDOHYEON_ttf.ttf'),('jupiter','Jupiter/Jupiter.ttf')]:
    assets[key] = 'data:font/ttf;base64,' + base64.b64encode((ROOT/'Assets/Fonts'/name).read_bytes()).decode()
    sources[key] = f'Assets/Fonts/{name}'
source = (ROOT/'Assets/Template/Scripts/ExcelParser.cs').read_text(encoding='utf-8-sig')
dialogue = re.search(r'private static string GetDialog\(\).*?return "(.*?)";',source,re.S)[1]
rows = [r.split(',') for r in dialogue.split('#') if r]
levels = {}
for n in [1,2,3,4,10]:
    if n in [1,2]:
        text = re.search(rf'case {n}:\s+rtn = "(.*?)";',source,re.S)[1]
    else: text = (ROOT/f'Assets/Resources/level{n}.csv').read_text().strip().replace('\n','#')
    levels[str(n)] = [r.split(',') for r in reversed(text.split('#')) if r.strip()]
(OUT/'assets.json').write_text(json.dumps(assets,separators=(',',':')))
(OUT/'data.json').write_text(json.dumps({'dialogue':rows,'levels':levels},ensure_ascii=False,separators=(',',':')))
(OUT/'asset-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
print(f'Extracted {len(assets)} assets, {len(rows)} dialogue commands, {len(levels)} stages')
