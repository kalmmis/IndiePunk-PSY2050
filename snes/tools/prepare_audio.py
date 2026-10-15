"""Native SPC700 effects plus optional, complete original music via MSU-1."""
from pathlib import Path
import wave,struct,subprocess
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'snes/.generated'
encoder=ROOT/'snes/.tools/pvsneslib/devkitsnes/tools/snesbrr'
for name,source in [('hit','Hit_03'),('shoot','Shoot_01')]:
    with wave.open(str(ROOT/'Assets/Resources'/f'{source}.wav'),'rb') as w:
        channels,width,rate,frames=w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes()
        assert width==2
        samples=struct.unpack('<'+'h'*(frames*channels),w.readframes(frames))
    pcm=bytearray()
    for k in range(round(frames*8000/rate)):
        offset=min(frames-1,int(k*rate/8000))*channels
        pcm+=struct.pack('<h',round(sum(samples[offset:offset+channels])/channels))
    with wave.open(str(OUT/(name+'.wav')),'wb') as w:
        w.setparams((1,2,8000,0,'NONE','not compressed'));w.writeframes(pcm)
    subprocess.run([str(encoder),'-e',str(OUT/(name+'.wav')),str(OUT/(name+'.brr'))],check=True)

# MSU-1 PCM is 44.1kHz signed 16-bit stereo. A plain SFC remains playable with SPC effects.
with wave.open(str(ROOT/'Assets/Resources/bgm_Chrono_Storm_loopable.wav'),'rb') as w:
    assert w.getframerate()==44100 and w.getsampwidth()==2
    pcm=w.readframes(w.getnframes())
    if w.getnchannels()==1:
        pcm=b''.join(pcm[i:i+2]*2 for i in range(0,len(pcm),2))
    else:assert w.getnchannels()==2
(ROOT/'snes/PSY2050.msu').write_bytes(b'')
(ROOT/'snes/PSY2050-1.pcm').write_bytes(b'MSU1'+struct.pack('<I',0)+pcm)
print('SPC effects and complete 72-second MSU-1 music prepared')
