"""Build a native MIPS-I PS-X EXE and a CD-DA BIN/CUE disc."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,struct,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parents[2];PS1=ROOT/'ps1';GEN=PS1/'.generated';TOOLS=PS1/'.tools';OUT=ROOT/'build/ps1'
SDK=TOOLS/'sdk/PSn00bSDK-0.24-Linux';ZIG=TOOLS/'zig-aarch64-macos-0.14.1/zig';MKISO=TOOLS/'mkpsxiso/mkpsxiso-2.30-Darwin/bin/mkpsxiso'
ENV=dict(os.environ,ZIG_GLOBAL_CACHE_DIR=str(TOOLS/'zig-cache'),ZIG_LOCAL_CACHE_DIR=str(GEN/'zig-cache'))
def run(*args):subprocess.run([str(a)for a in args],cwd=PS1,env=ENV,check=True)
def elf_exe(path,out):
    raw=path.read_bytes();h=struct.unpack_from('<16sHHIIIIIHHHHHH',raw);assert h[0][:7]==b'\x7fELF\x01\x01\x01' and h[2]==8
    loads=[]
    for i in range(h[10]):
        v=struct.unpack_from('<8I',raw,h[5]+i*h[9])
        if v[0]==1 and v[4] and v[2]>=0x80010000:loads.append(v)
    start=min(v[2]for v in loads);end=max(v[2]+v[4]for v in loads);size=(end-start+2047)//2048*2048
    assert end<0x801c0000,'Executable exceeds retail PS1 RAM budget'
    result=bytearray(2048+size);result[:8]=b'PS-X EXE';struct.pack_into('<4I',result,0x10,h[4],0,start,size);struct.pack_into('<I',result,0x30,0x801ffff0)
    for v in loads:result[2048+v[2]-start:2048+v[2]-start+v[4]]=raw[v[1]:v[1]+v[4]]
    out.write_bytes(result)
    # Export ELF symbols directly for RAM-based emulator validation.
    sections=[struct.unpack_from('<10I',raw,h[6]+i*h[11])for i in range(h[12])];symbols=[]
    for section in sections:
        if section[1]!=2:continue
        strings=sections[section[6]];strings=raw[strings[4]:strings[4]+strings[5]]
        for off in range(section[4],section[4]+section[5],section[9]):
            name,value,length,info,other,index=struct.unpack_from('<IIIBBH',raw,off)
            if name and value>=0x80000000 and index:
                name=strings[name:strings.find(b'\0',name)].decode(errors='replace');symbols.append(f'{value:08x} {name}')
    (GEN/'PSY2050.sym').write_text('\n'.join(symbols)+'\n')
    addresses={n:int(a,16)for a,n in (s.split()for s in symbols)}
    assert addresses['_end']<0x801c0000,'Code, assets and BSS exceed retail RAM budget'
    return {'entry':hex(h[4]),'load_address':hex(start),'executable_payload_bytes':size,'ram_end':hex(addresses['_end']),'sdk':'PSn00bSDK 0.24','compiler':'Zig 0.14.1 Clang / MIPS-I o32, soft-float, branch delay filler disabled'}
def compile_game():
    GEN.mkdir(exist_ok=True)
    for old in GEN.glob('test-*'):old.unlink()
    run(sys.executable,'tools/prepare.py')
    strip=shutil.which('llvm-objcopy')
    if not strip:
        choices=sorted((Path.home()/'.rustup/toolchains').glob('*/lib/rustlib/*/bin/rust-objcopy'))
        if choices:strip=str(choices[0])
    if not strip:raise SystemExit('llvm-objcopy (or the Rust toolchain rust-objcopy) is required to normalize SDK ELF symbols for LLD.')
    libdir=TOOLS/'normalized-sdk';libdir.mkdir(exist_ok=True)
    for lib in (SDK/'lib/libpsn00b/release').glob('*_exe_nogprel.a'):
        output=libdir/lib.name
        if not output.exists():run(strip,'--strip-debug','--discard-all',lib,output)
    objects=[]
    for source in sorted((PS1/'src').glob('*')):
        if source.suffix not in ('.c','.S'):continue
        obj=GEN/(source.stem+'.o');objects.append(obj)
        run(ZIG,'clang','-target','mipsel-none-elf','-march=mips1','-mabi=o32','-msoft-float','-fno-pic','-mno-abicalls','-mno-check-zero-division','-mllvm','-disable-mips-delay-filler','-G0','-ffreestanding','-fno-builtin','-fno-stack-protector','-fsigned-char','-fno-strict-aliasing','-fno-strict-overflow','-O2','-g','-Wall','-Wextra','-Wno-unused-parameter','-I',SDK/'include/libpsn00b','-isystem',ZIG.parent/'lib/include','-I',PS1/'src','-c',source,'-o',obj)
    libs=['psxgpu','psxgte','psxetc','psxspu','psxcd','psxapi','c']
    elf=GEN/'PSY2050.elf'
    run(ZIG,'ld.lld','-m','elf32ltsmip','-T',SDK/'lib/libpsn00b/ldscripts/exe.ld','--undefined=_start','-L',libdir,*objects,'--start-group',*['-l'+n+'_exe_nogprel'for n in libs],SDK/'lib/gcc/mipsel-none-elf/12.3.0/soft-float/libgcc.a','--end-group','-o',elf)
    info=elf_exe(elf,GEN/'PSY2050.EXE');(GEN/'build-report.json').write_text(json.dumps(info,indent=2)+'\n')
def disc():
    OUT.mkdir(parents=True,exist_ok=True)
    (GEN/'SYSTEM.CNF').write_bytes(b'BOOT = cdrom:\\PSY2050.EXE;1\r\nTCB = 4\r\nEVENT = 10\r\nSTACK = 801FFFF0\r\n')
    xml=f'''<?xml version="1.0" encoding="utf-8"?>
<iso_project image_name="{OUT/'PSY2050.bin'}" cue_sheet="{OUT/'PSY2050.cue'}">
 <track type="data">
  <identifiers system="PLAYSTATION" application="PLAYSTATION" volume="PSY2050" publisher="INDIEPUNK" data_preparer="PSN00BSDK" />
  <directory_tree>
   <file name="SYSTEM.CNF" type="data" source="{GEN/'SYSTEM.CNF'}" />
   <file name="PSY2050.EXE" type="data" source="{GEN/'PSY2050.EXE'}" />
   <dummy sectors="75" />
  </directory_tree>
 </track>
 <track type="audio" source="{ROOT/'Assets/Resources/bgm_Chrono_Storm_loopable.wav'}" />
</iso_project>'''
    (GEN/'disc.xml').write_text(xml);run(MKISO,'-y',GEN/'disc.xml')
    # mkpsxiso may put absolute image paths in CUE; the distributed sheet must be relocatable.
    cue=(OUT/'PSY2050.cue').read_text();cue=cue.replace(str(OUT/'PSY2050.bin'),'PSY2050.bin');(OUT/'PSY2050.cue').write_text(cue)
    shutil.copy2(GEN/'PSY2050.EXE',OUT/'PSY2050.EXE')
def package():
    if not (PS1/'PLAY.txt').exists():return
    (OUT/'README.txt').write_text((PS1/'PLAY.txt').read_text(),encoding='utf-8-sig')
    shutil.copy2(TOOLS/'Lameguy64-PSn00bSDK-06e65be/LICENSE.md',OUT/'PSn00bSDK-LICENSE.md')
    shutil.copy2(PS1/'THIRD_PARTY.txt',OUT/'THIRD_PARTY.txt')
    manifest={'format':'PS1 MIPS-I EXE + Mode2/2352 data track + CD-DA music','files_sha256':{n:hashlib.sha256((OUT/n).read_bytes()).hexdigest()for n in ['PSY2050.bin','PSY2050.cue','PSY2050.EXE']}}
    (OUT/'release.json').write_text(json.dumps(manifest,indent=2)+'\n')
    for name in ['assets-report.json','build-report.json']:shutil.copy2(GEN/name,OUT/name)
    report=GEN/'test-report.json'
    tested=report.exists()and json.loads(report.read_text()).get('disc_sha256')==manifest['files_sha256']['PSY2050.bin']
    for name in ['test-report.json','test-title.png','test-dialogue.png','test-combat.png','test-boss2.png','test-credits.png']:
        if tested and (GEN/name).exists():shutil.copy2(GEN/name,OUT/name)
        else:(OUT/name).unlink(missing_ok=True)
    if tested:
        from PIL import Image
        frames=['test-title.png','test-dialogue.png','test-boss2.png']
        if all((OUT/n).exists()for n in frames):
            preview=Image.new('RGB',(1536,384))
            for i,n in enumerate(frames):preview.paste(Image.open(OUT/n).resize((512,384),Image.Resampling.NEAREST),(i*512,0))
            preview.save(OUT/'preview.png')
    else:(OUT/'preview.png').unlink(missing_ok=True)
    (OUT/'package-test.json').unlink(missing_ok=True)
    with zipfile.ZipFile(OUT/'PSY2050-PS1.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for n in ['PSY2050.bin','PSY2050.cue','PSY2050.EXE','README.txt','PSn00bSDK-LICENSE.md','THIRD_PARTY.txt']:z.write(OUT/n,'PSY2050-PS1/'+n)
    with zipfile.ZipFile(OUT/'PSY2050-PS1.zip') as z:assert z.testzip()is None
    print('Release:',OUT/'PSY2050-PS1.zip')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--package-only',action='store_true');parser.add_argument('--test-core',type=Path);args=parser.parse_args()
    if not args.package_only:
        from setup_tools import setup
        setup();compile_game();disc()
        if args.test_core:run(sys.executable,'tools/test_game.py',args.test_core.resolve())
    package()
