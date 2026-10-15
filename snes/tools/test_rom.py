"""Run hardware-level smoke/flow checks with a locally built Snes9x libretro core.

Usage: python3 tools/test_rom.py /path/to/snes9x_libretro.dylib
RAM writes accelerate scheduling and exercise both boss outcomes; no test hooks ship in ROM.
"""
from pathlib import Path
import json,sys,struct,tempfile,shutil,hashlib
from emulator import Emulator
ROOT=Path(__file__).resolve().parents[2]
SNES=ROOT/'snes';OUT=SNES/'.generated'
CORE=Path(sys.argv[1]).resolve()
checks=[]
def check(condition,name):
    assert condition,name
    checks.append(name);print('PASS',name,flush=True)
def boot(rom=SNES/'PSY2050.sfc'):
    e=Emulator(CORE,rom,SNES/'PSY2050.sym');e.run(240)
    check(e.read('mode',1)==0,'ROM boot to title')
    return e
def play(e):
    e.press(e.X);e.press(e.A)
    for _ in range(60):
        e.run(15)
        if e.read('mode',1)==2:break
    check(e.read('mode',1)==2,'chapter 1 Korean dialogue')
    e.screenshot(OUT/'test-dialogue.png');e.press(e.SELECT)
    check(e.read('mode',1)==1,'skip executes dialogue events')

rom=(SNES/'PSY2050.sfc').read_bytes()
checksum,complement=struct.unpack_from('<HH',rom,0x7fde)[0],struct.unpack_from('<H',rom,0x7fdc)[0]
check(len(rom)==4*1024*1024 and checksum^complement==0xffff and sum(rom)&0xffff==checksum,'4 MiB LoROM header and checksum')
e=boot();e.screenshot(OUT/'test-title.png')
check(e.read('msuPresent',1)==1 and e.audio_peak>0,'MSU-1 original music detected and audible')
play(e);e.write('wait',30000)
x=e.read('px');e.run(60,1<<e.LEFT)
check(e.read('px')<x and e.read('px')>=70*32,'controller movement and playfield bounds')
e.press(e.START);tick=e.read('gameTick');e.run(90)
check(e.read('paused',1)==1 and e.read('gameTick')==tick,'pause freezes simulation')
e.press(e.START);e.run(1100,1<<e.B)
check(e.read('power',1)>=3,'held fire charges power and slows world')
e.run(30)
check(e.read('power',1)==1,'release restores power')
e.write('px',128*32);e.write('py',200*32);e.write('bossMode',2,1);e.write('bossDone',0,1);e.write('bx',128*32);e.write('by',85*32)
fps=[]
for phase,hp,tick in [(1,600,200),(2,400,2200),(3,200,3800)]:
    e.write('bossPhase',phase,1);e.write('bossHp',hp);e.write('bossTick',tick)
    f=e.read('frame');e.run(300,1<<e.B);fps.append((e.read('frame')-f)/5)
    e.screenshot(OUT/f'test-boss{phase}.png')
    check(e.read('bossPhase',1)==phase and e.read('bossHp')<hp,f'boss phase {phase}: pattern and player damage')
check(min(fps)>=24,'boss performance at least 24 updates/sec in tested scenes')
e.write('bossTick',4802);e.write('bossHp',100);e.run(15)
check(e.read('bossDone',1)==1 and e.read('bossKilled',1)==0,'boss timeout outcome')
e.write('bossDone',0,1);e.write('bossPhase',3,1);e.write('by',85*32);e.write('bossTick',100);e.write('bossHp',20);e.run(15)
check(e.read('bossDone',1)==1 and e.read('bossKilled',1)==1,'boss defeated outcome')
# One enemy projectile must kill outside invulnerability; retry must restore control.
e.write('bossMode',0,1);e.write('assist',0,1);e.write('invincible',0)
addr=e.symbols['bullets']&0x1ffff
e.ram[addr:addr+10]=struct.pack('<hhhhBB',e.read('px'),e.read('py'),0,0,1,0)
e.run(12);check(e.read('alive',1)==0,'projectile collision kills player')
e.run(160);e.press(e.A)
check(e.read('alive',1)==1 and e.read('invincible')>0,'retry grants temporary invulnerability')
e.close()

# Follow every stage and execute all story events while accelerating source row waits.
e=boot();play(e);visited=set();bosses=0
for _ in range(1800):
    mode=e.read('mode',1);visited.add(e.read('stage'))
    if mode==3:break
    if mode==2:e.press(e.SELECT);continue
    e.write('wait',0)
    if e.read('bossMode',1)==2 and not e.read('bossDone',1):
        e.write('by',85*32);e.write('bossHp',20);bosses+=1
    e.run(12,1<<e.B)
check(e.read('mode',1)==3 and visited=={0,1,2,3,4},'chapters 1–4 -> epilogue -> credits, including defeated-boss story branches')
e.screenshot(OUT/'test-credits.png');e.close()

# The plain ROM must also run when the optional MSU files are absent.
with tempfile.TemporaryDirectory(prefix='psy-sfc-only-') as tmp:
    bare=Path(tmp)/'PSY2050.sfc';shutil.copy2(SNES/'PSY2050.sfc',bare)
    e=boot(bare);check(e.read('msuPresent',1)==0,'plain SFC works without MSU-1')
    play(e);e.audio_peak=0;e.run(180,1<<e.B)
    check(e.audio_peak>0,'native SPC700 shooting effect is audible without music files')
    e.close()

result={'rom_sha256':hashlib.sha256(rom).hexdigest(),'emulator':'Snes9x 1.63 libretro, normal CPU speed','checks':checks,'boss_updates_per_second':fps,'notes':'Stage-flow checks accelerate waits and force boss outcomes through emulator RAM. No physical console test.'}
(OUT/'test-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'{len(checks)} checks passed')
