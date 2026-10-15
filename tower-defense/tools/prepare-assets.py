"""Optional: refresh the resized original illustrations. Requires Pillow."""
from pathlib import Path
from PIL import Image
import json, wave, struct

project = Path(__file__).resolve().parents[1]
root = project.parent
out = project / 'assets'
out.mkdir(exist_ok=True)
sources = {
    'mina': ('portraits/portrait_player.png', (650, 960)),
    'reina': ('portraits/portrait_fire.png', (380, 580)),
    'time': ('portraits/portrait_time.png', (380, 580)),
    'city': ('backgrounds/web_background.png', (1440, 960)),
    'player': ('sprites/player4.png', (96, 120)),
    'boss': ('sprites/boss0.png', (120, 150)),
    **{f'enemy{letter}': (f'sprites/enemy{letter}.png', (96, 96)) for letter in 'ABCD'}
}
manifest = {}
for key, (source, size) in sources.items():
    path = root / 'Assets/ArtRemaster' / source
    image = Image.open(path).convert('RGBA')
    image.thumbnail(size, Image.Resampling.LANCZOS)
    image.save(out / f'{key}.webp', 'WEBP', quality=88, method=6)
    manifest[key] = str(path.relative_to(root))
# Original music, mono 16-bit PCM, sampled at 11.025kHz to keep the offline game small.
with wave.open(str(root / 'Assets/Resources/bgm_Chrono_Storm_loopable.wav')) as src:
    channels, rate = src.getnchannels(), src.getframerate()
    assert src.getsampwidth() == 2
    raw = src.readframes(src.getnframes())
    count = len(raw) // (2 * channels)
    target = 11025
    result = bytearray()
    for i in range(int(count * target / rate)):
        frame = int(i * rate / target)
        sample = sum(struct.unpack_from('<h', raw, (frame * channels + c) * 2)[0] for c in range(channels)) // channels
        result.extend(struct.pack('<h', sample))
    with wave.open(str(out / 'music.wav'), 'wb') as dst:
        dst.setparams((1, 2, target, 0, 'NONE', 'not compressed'))
        dst.writeframes(result)
manifest['music'] = 'Assets/Resources/bgm_Chrono_Storm_loopable.wav'
(out / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Prepared offline assets:', len(manifest))
