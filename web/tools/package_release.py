"""Bundle both standalone games for friends: extract, then double-click START.html."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import re

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build/wasm'


def package(output: Path) -> None:
    original = (BUILD / 'original.html').read_bytes()
    remastered = (BUILD / 'index.html').read_bytes()
    for name, payload in [('original', original), ('remastered', remastered)]:
        text = payload.decode('utf-8')
        if f'const GAME_EDITION="{name}"' not in text or 'const WASM_BASE64="' not in text:
            raise ValueError(f'Build {name} first with: npm run build --prefix web')
        if re.search(r'/\*__(?:ASSETS|DATA|WASM|APP|STYLES|EDITION)__\*/', text):
            raise ValueError(f'Unresolved build placeholder in {name}')
    launcher = (BUILD / 'versions.html').read_text(encoding='utf-8')
    for old, new in [('href="original.html"', 'href="games/original.html"'),
                     ('href="index.html"', 'href="games/remastered.html"')]:
        if old not in launcher:
            raise ValueError(f'Missing version link: {old}')
        launcher = launcher.replace(old, new)
    footer = '''<footer>압축을 모두 푼 뒤 이 <code>START.html</code> 파일을 더블클릭하면 됩니다.<br>설치·서버·인터넷 연결 없이 실행되며, 진행 상황과 소리 설정은 버전별로 저장됩니다.</footer>'''
    launcher = re.sub(r'<footer>.*?</footer>', lambda _: footer, launcher, flags=re.S)
    instructions = '''PSY2050 — 친구용 브라우저 실행 패키지

실행 방법
1. ZIP 파일의 압축을 전부 풀어주세요. Windows에서는 '모두 압축 풀기'를 사용하세요.
2. 압축을 푼 PSY2050 폴더에서 START.html을 더블클릭하세요.
3. 브라우저가 열리면 '기존 그래픽 버전' 또는 '리마스터 버전'을 선택하세요.
4. 게임 화면에서 New Game을 누르면 시작됩니다.

별도의 설치, 서버 실행, 인터넷 연결이 필요하지 않습니다.
압축파일 안에서 HTML을 직접 열지 말고 먼저 폴더 전체를 꺼내주세요.
START.html이 다른 프로그램에서 열리면 우클릭 → 연결 프로그램에서 브라우저를 선택하세요.
음악은 New Game 등 첫 조작 이후에 재생됩니다.

games 폴더를 START.html과 함께 보관해주세요.
각 게임 HTML은 리소스를 모두 내장하므로 games/original.html이나
 games/remastered.html을 직접 더블클릭해도 실행됩니다.

조작 방법
- 마우스나 터치를 누른 채 움직이기: 이동하며 공격
- 방향키 / WASD: 이동
- Space / Z: 공격
- 공격 유지: 5초마다 단계 상승, 시간이 최대 70% 속도까지 느려짐
- 클릭 / Enter / Space: 다음 대사
- Esc / P: 일시정지
- M: 소리 켜기/끄기
- 설정 / 조작법: 음악·효과음 볼륨 조절

진행 상황은 같은 기기의 같은 브라우저에 버전별로 자동 저장됩니다.

파일 구성
PSY2050/
  START.html              시작 파일 — 이 파일을 여세요
  README.txt              이 안내문
  games/
    original.html         기존 그래픽 버전
    remastered.html       아트 리마스터 버전

Original creators: Hhan87 · kalmis · roue
Art remaster: Codex, AI-assisted
'''
    files = {
        'PSY2050/START.html': launcher.encode('utf-8'),
        'PSY2050/README.txt': instructions.encode('utf-8-sig'),
        'PSY2050/games/original.html': original,
        'PSY2050/games/remastered.html': remastered,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, payload in files.items():
            archive.writestr(name, payload)
    with ZipFile(output) as archive:
        assert archive.testzip() is None, 'ZIP checksum validation failed'
        assert set(archive.namelist()) == set(files), 'Unexpected files in release'
        for name, payload in files.items():
            assert archive.read(name) == payload, f'Payload mismatch: {name}'
    print(f'Created {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output} '
          f'({output.stat().st_size / 1024 / 1024:.2f} MB), {len(files)} files.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=BUILD/'PSY2050-browser.zip')
    package(parser.parse_args().output.resolve())
