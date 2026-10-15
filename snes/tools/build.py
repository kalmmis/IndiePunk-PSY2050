"""Build and package the independent SNES port (Python 3 + Pillow + make)."""
from pathlib import Path
import argparse,hashlib,json,os,platform,shutil,subprocess,sys,tempfile,urllib.request,zipfile
ROOT=Path(__file__).resolve().parents[2]
SNES=ROOT/'snes';OUT=ROOT/'build/snes'
VERSION='4.6.0'
DIGESTS={
 'darwin':'18654ba0761a7b8ba738807c622cd2b82395ee687ba60c85ccabc39feef0052d',
 'linux':'db08f2f95400125f8ae0cc62e87c3c350fa46a3eadb3174dd3161606ee49c84c',
}
def run(*args,**kwargs):subprocess.run([str(x) for x in args],check=True,cwd=SNES,**kwargs)
def sdk():
    configured=os.environ.get('PVSNESLIB_HOME')
    folder=Path(configured).resolve() if configured else SNES/'.tools/pvsneslib'
    if (folder/'devkitsnes').is_dir():return folder
    system=platform.system().lower()
    if system not in DIGESTS:raise SystemExit('Install PVSnesLib 4.6.0 and set PVSNESLIB_HOME on this platform.')
    archive=f'pvsneslib_460_64b_{system}_release.zip'
    url=f'https://github.com/alekmaul/pvsneslib/releases/download/{VERSION}/{archive}'
    with tempfile.TemporaryDirectory(prefix='psy-snes-sdk-') as tmp:
        target=Path(tmp)/archive
        print('Downloading official PVSnesLib',VERSION,flush=True)
        if shutil.which('curl'):run('curl','-L','--fail','--silent','--show-error',url,'-o',target)
        else:urllib.request.urlretrieve(url,target)
        assert hashlib.sha256(target.read_bytes()).hexdigest()==DIGESTS[system],'SDK checksum mismatch'
        tools=SNES/'.tools';tools.mkdir(exist_ok=True)
        with zipfile.ZipFile(target) as z:
            assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in z.namelist())
            z.extractall(tools)
            for info in z.infolist():
                permissions=info.external_attr>>16
                if permissions and not info.is_dir():(tools/info.filename).chmod(permissions)
    return folder
def package(toolchain):
    OUT.mkdir(parents=True,exist_ok=True)
    for name in ['PSY2050.sfc','PSY2050.msu','PSY2050-1.pcm']:shutil.copy2(SNES/name,OUT/name)
    text=(SNES/'PLAY.txt').read_text()
    (OUT/'README.txt').write_text(text,encoding='utf-8-sig')
    shutil.copy2(toolchain/'pvsneslib/pvsneslib_license.txt',OUT/'PVSnesLib-LICENSE.txt')
    report=SNES/'.generated/test-report.json'
    rom_hash=hashlib.sha256((OUT/'PSY2050.sfc').read_bytes()).hexdigest()
    tested=report.exists() and json.loads(report.read_text()).get('rom_sha256')==rom_hash
    shutil.copy2(SNES/'.generated/assets-report.json',OUT/'assets-report.json')
    if tested:shutil.copy2(report,OUT/'test-report.json')
    else:(OUT/'test-report.json').unlink(missing_ok=True)
    previews=['test-title.png','test-dialogue.png','test-boss2.png']
    for name in previews:
        if tested and (SNES/'.generated'/name).exists():shutil.copy2(SNES/'.generated'/name,OUT/name)
        else:(OUT/name).unlink(missing_ok=True)
    hashes={name:hashlib.sha256((OUT/name).read_bytes()).hexdigest() for name in ['PSY2050.sfc','PSY2050.msu','PSY2050-1.pcm']}
    manifest={'format':'SNES LoROM FastROM','rom_bytes':4194304,'sdk':'PVSnesLib '+VERSION,'files_sha256':hashes}
    (OUT/'release.json').write_text(json.dumps(manifest,indent=2)+'\n')
    payload=['PSY2050.sfc','PSY2050.msu','PSY2050-1.pcm','README.txt','PVSnesLib-LICENSE.txt']
    with zipfile.ZipFile(OUT/'PSY2050-SNES.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name in payload:z.write(OUT/name,'PSY2050-SNES/'+name)
    with zipfile.ZipFile(OUT/'PSY2050-SNES.zip') as z:assert z.testzip() is None
    print('Release:',OUT/'PSY2050-SNES.zip',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--test-core',type=Path);parser.add_argument('--package-only',action='store_true');args=parser.parse_args()
    toolchain=sdk()
    if not args.package_only:
        # A new build must never inherit a test report or screenshots from an older ROM.
        for p in (SNES/'.generated').glob('test-*'):p.unlink()
        run(sys.executable,'tools/prepare_audio.py')
        run(sys.executable,'tools/prepare.py')
        run('make','-B',f'PVSNESLIB_HOME={toolchain}')
        if args.test_core:run(sys.executable,'tools/test_rom.py',args.test_core.resolve())
    package(toolchain)
