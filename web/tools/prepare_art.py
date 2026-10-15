"""Slice generated atlases and package the remastered art without changing originals."""
from pathlib import Path
from PIL import Image, ImageOps
import base64, io, json, shutil
ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'Assets/ArtRemaster'
CACHE = ROOT / 'web/.generated'
CACHE.mkdir(exist_ok=True)
manifest = {'version': 2, 'name': 'PSY2050 — Anima / 2050', 'assets': {}, 'supplemental': {}}
embedded = {}

def save(key, im, folder='sprites', size=None, supplemental=False):
    im = im.convert('RGBA')
    if size: im = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
    path = ART / folder / (key + '.png')
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    manifest['supplemental' if supplemental else 'assets'][key] = str(path.relative_to(ROOT))
    if not supplemental:
        out = io.BytesIO()
        im.save(out, 'WEBP', quality=94, method=4)
        embedded[key] = 'data:image/webp;base64,' + base64.b64encode(out.getvalue()).decode()
    return im

def svg(key, source):
    path = ART / 'ui' / (key + '.svg')
    path.write_text(source, encoding='utf-8')
    manifest['assets'][key] = str(path.relative_to(ROOT))
    embedded[key] = 'data:image/svg+xml;base64,' + base64.b64encode(source.encode()).decode()

for character, name in [('mina','player'),('reina','fire'),('time','time')]:
    im = Image.open(ART/'source'/f'{character}-portrait.png').convert('RGBA')
    save('portrait_'+name,im,'portraits',(768,1152))
    gray = ImageOps.grayscale(im)
    gray = ImageOps.colorize(gray, '#162033', '#c9d2e5').convert('RGBA')
    gray.putalpha(im.getchannel('A'))
    save('portrait_'+name+'_gray',gray,'portraits',(768,1152))

# Keep the atlas cell coordinate system: no independent auto-cropping or size jitter.
def atlas(filename, cols, rows, keys, target=384, supplemental=False):
    im = Image.open(ART/'source'/filename).convert('RGBA')
    for i,key in enumerate(keys):
        if key is None: continue
        x,y=i%cols,i//cols
        crop=im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows)))
        crop=ImageOps.contain(crop,(target,target),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(target,target))
        cell.alpha_composite(crop,((target-crop.width)//2,(target-crop.height)//2))
        save(key,cell,supplemental=supplemental)

atlas('player-atlas.png',4,2,[f'player{i}' for i in range(7)],384)
atlas('boss-atlas.png',3,1,[f'boss{i}' for i in range(3)],512)
atlas('enemies-atlas.png',2,2,['enemyA','enemyB','enemyC','enemyD'],384)
atlas('effects-atlas.png',4,3,['shot','bulletA','bulletB','time_shard','beam','shield','powerup','muzzle','explosion0','explosion1','explosion2','engine_flare'],256)
# Keep the old public key as well as three timed explosion frames.
save('explosion',Image.open(ART/'sprites/explosion1.png'))
atlas('cosmos-atlas.png',3,2,['planet_violet','planet_red','planet_blue','planet_cyan','legacy_ship','legacy_interceptor'],512,True)
for key,filename,size in [('background1','street-tile.png',(1254,1254)),('background2','street-tile.png',(1254,1254)),('menu_background','menu-keyart.png',(1024,1536)),('web_background','city-backdrop.png',(1920,1080))]:
    save(key,Image.open(ART/'source'/filename),'backgrounds',size)

# Vector UI is authored as code: precise edges, no generated gibberish, readable type.
svg('ui_button','''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="110" viewBox="0 0 600 110"><defs><linearGradient id="g"><stop stop-color="#182c43" stop-opacity=".94"/><stop offset="1" stop-color="#0c1528" stop-opacity=".96"/></linearGradient></defs><path d="M1 1H579L599 21V109H21L1 89Z" fill="url(#g)" stroke="#679aaf" stroke-opacity=".48"/><path d="M1 74V1H120M480 109H599V36" fill="none" stroke="#65dedf" stroke-width="2"/><path d="M18 20V89" stroke="#9da8ed" stroke-width="3"/></svg>''')
svg('ui_title','''<svg xmlns="http://www.w3.org/2000/svg" width="700" height="160" viewBox="0 0 700 160"><path d="M0 140H184L200 124H590L606 140H700" fill="none" stroke="#6bd8df" stroke-opacity=".5"/><path d="M0 0H92M0 0V48M700 160H608M700 160V112" fill="none" stroke="#a8b4ed" stroke-width="2"/></svg>''')
svg('ui_window','''<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#18223b"/><stop offset="1" stop-color="#080e1b"/></linearGradient></defs><path d="M1 1H671L699 29V699H29L1 671Z" fill="url(#g)" fill-opacity=".97" stroke="#638493"/><path d="M1 110V1H110M589 699H699V589" fill="none" stroke="#67d9dd" stroke-width="3"/></svg>''')
svg('LOGO','''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="800" viewBox="0 0 480 800"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#75e1e6"/><stop offset="1" stop-color="#b6a5ee"/></linearGradient></defs><g transform="translate(240 330)"><circle r="94" fill="none" stroke="#43516a" stroke-width="1"/><path d="M-91 -23A94 94 0 0 1 72 -60M91 23A94 94 0 0 1 -72 60" fill="none" stroke="url(#g)" stroke-width="5"/><path d="M-35 -44H-13V43H-35ZM8 -44H39Q66 -44 66 -14Q66 17 37 17H30V43H8ZM30 -23V-4H37Q44 -4 44 -14Q44 -23 37 -23Z" fill="url(#g)"/><path d="M-116 0H-104M104 0H116M0 -116V-104M0 104V116" stroke="#66dce1" stroke-width="2"/></g><text x="240" y="492" fill="#e4e9fa" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" letter-spacing="7">INDIEPUNK</text><text x="240" y="522" fill="#7992a7" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="4">A STORY BEYOND TIME</text></svg>''')
svg('Credit','''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="1500" viewBox="0 0 480 1500"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#0a1529"/><stop offset="1" stop-color="#080b16"/></linearGradient></defs><path fill="url(#g)" d="M0 0H480V1500H0Z"/><g text-anchor="middle" font-family="Arial,sans-serif"><text x="240" y="145" fill="#e8edff" font-size="57" font-weight="700" letter-spacing="-3">PSY 2050</text><text x="240" y="178" fill="#77d7dc" font-size="11" letter-spacing="6">ANIMA / 2050</text><path d="M150 226H330M150 1110H330" stroke="#547986"/><g fill="#74cdd5" font-size="10" letter-spacing="4"><text x="240" y="323">PROGRAMMING</text><text x="240" y="496">STORY &amp; DESIGN</text><text x="240" y="698">ORIGINAL ART</text><text x="240" y="871">ART REMASTER</text></g><g fill="#e2e9f7" font-size="27"><text x="240" y="374">Hhan87</text><text x="240" y="547">kalmis</text><text x="240" y="589">roue</text><text x="240" y="749">kalmis</text><text x="240" y="922">Codex</text></g><text x="240" y="958" fill="#8895af" font-size="12">AI-assisted illustration &amp; visual direction</text><text x="240" y="1238" fill="#e2e9f7" font-size="19" letter-spacing="2">THANK YOU FOR PLAYING</text><text x="240" y="1276" fill="#79d8dd" font-size="11" letter-spacing="4">THE STORY CONTINUES</text><path d="M240 1350l12 12-12 12-12-12Z" fill="none" stroke="#8cabe0"/></g></svg>''')

(ART/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(CACHE/'remaster-assets.json').write_text(json.dumps(embedded,separators=(',',':')),encoding='utf-8')
print(f'Prepared {len(manifest["assets"])} runtime art assets + {len(manifest["supplemental"])} legacy sprites')
