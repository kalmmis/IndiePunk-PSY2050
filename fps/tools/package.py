#!/usr/bin/env python3
"""Package only the standalone FPS deliverables, never the development checkout."""
import hashlib
from pathlib import Path
import stat
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

project = Path(__file__).resolve().parents[1]
output = project.parent / 'build' / 'fps'
archive = output / 'PSY2050-FPS-local.zip'
runtime = ['index.html', 'game.wasm', 'reina-model.glb', 'reina-model.json', 'asset-sources.json']
extras = ['README-KO.txt', 'PLAY-Windows.bat', 'PLAY-macOS.command', 'PLAY-Linux.sh', 'serve.py']
files = [(output / name, name) for name in runtime]
files += [(project / 'distribution' / name, name) for name in extras]
missing = [str(source) for source, _ in files if not source.is_file()]
if missing:
    raise SystemExit('Build first with npm run build --prefix fps. Missing: ' + ', '.join(missing))

payloads = {}
for source, name in files:
    data = source.read_bytes()
    if name.endswith('.bat'):
        data = data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
    if name == 'README-KO.txt':
        data = data.decode('utf-8-sig').encode('utf-8-sig')
    payloads['PSY2050-FPS/' + name] = data

with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, data in payloads.items():
        info = ZipInfo(name, date_time=(2026, 10, 16, 0, 0, 0))
        info.create_system = 3
        mode = 0o755 if name.endswith(('.command', '.sh', '/serve.py')) else 0o644
        info.external_attr = (stat.S_IFREG | mode) << 16
        bundle.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=9)

with ZipFile(archive) as bundle:
    assert bundle.testzip() is None, 'Archive checksum failure'
    assert set(bundle.namelist()) == set(payloads)
    for name, data in payloads.items():
        assert bundle.read(name) == data, 'Payload mismatch: ' + name
        assert '..' not in Path(name).parts and not name.startswith('/')

digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(digest + '  ' + archive.name + '\n')
print('Created {} ({:.2f} MiB, {} files); ZIP integrity verified.'.format(archive, archive.stat().st_size / 1024**2, len(payloads)))
