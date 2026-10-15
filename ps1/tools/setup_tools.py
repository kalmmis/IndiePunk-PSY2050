"""Pinned, project-local PS1 build tools for macOS ARM64. No global installs."""
from pathlib import Path
import hashlib,json,platform,subprocess,tarfile,tempfile,urllib.request,zipfile
TOOLS=Path(__file__).resolve().parents[1]/'.tools'
PACKAGES=[
 ('PSn00bSDK 0.24 target libraries','https://github.com/Lameguy64/PSn00bSDK/releases/download/v0.24/PSn00bSDK-0.24-Linux.zip','5ada7c9478d795b22bde96ee23d6869290c14a740bcde3d57c01c342a26ded35','sdk','sdk/PSn00bSDK-0.24-Linux/include/libpsn00b/psxgpu.h'),
 ('PSn00bSDK 0.24 source','https://api.github.com/repos/Lameguy64/PSn00bSDK/tarball/v0.24','b8c74c9b10fd64bb6c065b4170cc7a7d0585a7dec050c432742839ede39c960e','','Lameguy64-PSn00bSDK-06e65be/LICENSE.md'),
 ('Zig 0.14.1 / Clang and LLD','https://ziglang.org/download/0.14.1/zig-aarch64-macos-0.14.1.tar.xz','39f3dc5e79c22088ce878edc821dedb4ca5a1cd9f5ef915e9b3cc3053e8faefa','','zig-aarch64-macos-0.14.1/zig'),
 ('mkpsxiso 2.30','https://github.com/Lameguy64/mkpsxiso/releases/download/v2.30/mkpsxiso-2.30-Darwin.zip','a64d4d57d78ce57cd810a6a044602ce3cf1b552ca7c7e8675518f554206e0b49','mkpsxiso','mkpsxiso/mkpsxiso-2.30-Darwin/bin/mkpsxiso'),
]
def setup():
    if platform.system()!='Darwin' or platform.machine()!='arm64':raise SystemExit('This bootstrap is tested on macOS ARM64. Configure equivalent PSn00bSDK/Zig/LLVM tools for your platform.')
    TOOLS.mkdir(parents=True,exist_ok=True)
    for name,url,digest,subdir,sentinel in PACKAGES:
        if (TOOLS/sentinel).exists():continue
        print('Preparing',name,flush=True)
        with tempfile.TemporaryDirectory(prefix='psy-ps1-tools-') as tmp:
            archive=Path(tmp)/'download'
            subprocess.run(['curl','-L','--fail','--silent','--show-error',url,'-o',str(archive)],check=True)
            assert hashlib.sha256(archive.read_bytes()).hexdigest()==digest,'Tool download checksum mismatch: '+name
            target=TOOLS/subdir;target.mkdir(parents=True,exist_ok=True)
            if zipfile.is_zipfile(archive):
                with zipfile.ZipFile(archive)as z:
                    assert all(not Path(n).is_absolute()and'..'not in Path(n).parts for n in z.namelist())
                    z.extractall(target)
                    for info in z.infolist():
                        if not info.is_dir()and info.external_attr>>16:(target/info.filename).chmod(info.external_attr>>16)
            else:
                with tarfile.open(archive)as t:t.extractall(target,filter='data')
        assert (TOOLS/sentinel).exists(),name
    (TOOLS/'provenance.json').write_text(json.dumps([{'name':n,'url':u,'sha256':h}for n,u,h,_,_ in PACKAGES],indent=2)+'\n')
if __name__=='__main__':setup()
