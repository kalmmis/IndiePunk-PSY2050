"""Exercise the shipped PS1 disc in PCSX ReARMed's MIPS interpreter and HLE BIOS."""
from pathlib import Path
import sys,json,struct,hashlib,tempfile,shutil
from emulator import Emulator
ROOT=Path(__file__).resolve().parents[2];PS1=ROOT/'ps1';OUT=ROOT/'build/ps1';GEN=PS1/'.generated';CORE=Path(sys.argv[1]).resolve()
checks=[]
def check(condition,name):
    assert condition,name
    checks.append(name);print('PASS',name,flush=True)
def boot():
    e=Emulator(CORE,OUT/'PSY2050.cue',GEN/'PSY2050.sym');e.run(240)
    check(e.read('mode',1)==0 and e.read('frame')>120,'disc boots to native PS1 title')
    return e
def play(e):
    e.press(e.Y) # libretro Y is PS1 Square: practice mode
    e.press(e.B) # libretro B is PS1 Cross
    for _ in range(40):
        e.run(10)
        if e.read('mode',1)==2:break
    check(e.read('mode',1)==2 and e.read('lineIndex')==2,'first Korean story page and portrait')
    idx=e.read('lineIndex');e.run(90)
    check(e.read('mode',1)==2 and e.read('lineIndex')==idx,'dialogue waits for player input')
    e.screenshot(GEN/'test-dialogue.png');e.press(e.B)
    check(e.read('mode',1)==2 and e.read('lineIndex')>idx,'Cross advances one dialogue page')
    e.press(e.SELECT);check(e.read('mode',1)==1,'Select skips current dialogue and applies events')

exe=(OUT/'PSY2050.EXE').read_bytes();check(exe[:8]==b'PS-X EXE' and len(exe)%2048==0,'PS-X EXE header and 2 KiB sector alignment')
cue=(OUT/'PSY2050.cue').read_text();check('TRACK 01 MODE2/2352'in cue and 'TRACK 02 AUDIO'in cue and str(ROOT)not in cue,'relocatable BIN/CUE with data and CD-DA tracks')
e=boot();e.screenshot(GEN/'test-title.png')
check(e.read('musicAvailable',1)==1 and e.read('musicStarts')==1 and e.audio_peak>0,'original CD-DA music plays from disc')
# Cross the full original song boundary while title animation keeps rendering.
e.run(2100);check(e.read('musicStarts')==1,'CD-DA plays through the song without premature restart')
e.run(2400);check(e.read('musicStarts')>=2,'full original BGM loops after 72 seconds')
play(e);e.write('wait',30000)
x=e.read('px');e.run(60,1<<e.LEFT)
check(e.read('px')<x and e.read('px')>=70*32,'pad movement and horizontal bounds')
e.press(e.START);tick=e.read('gameTick');e.run(90)
check(e.read('paused',1)==1 and e.read('gameTick')==tick,'Start pauses simulation')
e.press(e.START);e.run(1000,1<<e.B)
check(e.read('power',1)==4,'held fire reaches maximum time slow power')
e.run(20);check(e.read('power',1)==1,'release clears charged power')
e.write('px',128*32);e.write('py',200*32);e.write('bossMode',2,1);e.write('bossDone',0,1);e.write('bx',128*32);e.write('by',85*32)
fps=[]
for phase,hp,tick in [(1,600,200),(2,400,2200),(3,200,3800)]:
    e.write('bossPhase',phase,1);e.write('bossHp',hp);e.write('bossTick',tick)
    f=e.read('frame');e.run(300,1<<e.B);fps.append((e.read('frame')-f)/5)
    check(e.read('bossPhase',1)==phase and e.read('bossHp')<hp,f'boss phase {phase} renders and takes shot damage')
    e.screenshot(GEN/f'test-boss{phase}.png')
check(min(fps)>50 and e.read('renderOverflow')==0,'boss scenes exceed 50 updates/sec without packet overflow')
e.write('bossTick',4802);e.write('bossHp',100);e.run(12)
check(e.read('bossDone',1)==1 and e.read('bossKilled',1)==0,'boss timeout branch')
e.write('bossDone',0,1);e.write('bossPhase',3,1);e.write('by',85*32);e.write('bossTick',100);e.write('bossHp',20);e.run(12)
check(e.read('bossDone',1)==1 and e.read('bossKilled',1)==1,'boss defeat branch')
e.write('bossMode',0,1);e.write('assist',0,1);e.write('invincible',0)
a=e.symbols['bullets']&0x1fffff;e.ram[a:a+10]=struct.pack('<hhhhBB',e.read('px'),e.read('py'),0,0,1,0)
e.run(8);check(e.read('alive',1)==0,'enemy bullet collision kills unprotected player')
e.run(140);e.press(e.B);check(e.read('alive',1)==1 and e.read('invincible')>0,'retry restores player and invulnerability')
# Check that audio continues after combat, death and retry.
e.audio_peak=0;e.run(90,1<<e.B)
check(e.audio_peak>0,'SPU and CD audio remain active during combat')
e.write('alive',1,1);e.write('invincible',0);e.write('assist',0,1);e.write('bossMode',2,1);e.write('bossPhase',1,1);e.write('bossDone',0,1);e.write('bossHp',600);e.write('bossTick',0);e.write('by',85*32);e.write('px',168*32);e.write('py',85*32)
e.run(4);check(e.read('alive',1)==0,'boss beam collision uses the rendered ray direction')
e.close()

e=boot();play(e);visited=set()
for _ in range(1800):
    mode=e.read('mode',1);visited.add(e.read('stage'))
    if mode==3:break
    if mode==2:e.press(e.SELECT);continue
    e.write('wait',0)
    if e.read('bossMode',1)==2 and not e.read('bossDone',1):e.write('by',85*32);e.write('bossHp',20)
    e.run(12,1<<e.B)
check(e.read('mode',1)==3 and visited=={0,1,2,3,4},'all 4 chapters -> epilogue -> credits through defeat story events')
e.screenshot(GEN/'test-credits.png');check(e.read('renderOverflow')==0,'full story flow has no render packet overflow');e.close()
with tempfile.TemporaryDirectory(prefix='PS1 standalone EXE ') as tmp:
    bare=Path(tmp)/'GAME.EXE';shutil.copy2(OUT/'PSY2050.EXE',bare)
    e=Emulator(CORE,bare,GEN/'PSY2050.sym');e.run(600)
    check(e.read('mode',1)==0 and e.read('musicAvailable',1)==0,'standalone EXE boots with no disc or music files')
    play(e);e.audio_peak=0;e.run(150,1<<e.B)
    check(e.audio_peak>0,'native SPU shooting effects work independently of CD-DA')
    e.close()
report={'disc_sha256':hashlib.sha256((OUT/'PSY2050.bin').read_bytes()).hexdigest(),'exe_sha256':hashlib.sha256(exe).hexdigest(),'emulator':'PCSX ReARMed MIPS interpreter / open HLE BIOS / normal CPU clock','checks':checks,'boss_updates_per_second':fps,'notes':'Stage-flow tests accelerate row waits and force boss outcomes through emulator RAM; no proprietary BIOS or physical-console test.'}
(GEN/'test-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(f'{len(checks)} checks passed')
