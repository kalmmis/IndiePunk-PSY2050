"""Package the standalone game and a short Korean player guide for sharing."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[2]
build = root / 'build' / 'tower-defense'
game = build / 'index.html'
if not game.is_file():
    raise SystemExit('Run npm run build --prefix tower-defense first.')

folder = 'PSY2050-LAST-SIGNAL'
archive = build / f'{folder}.zip'
guide = '''PSY2050 · LAST SIGNAL — 마지막 신호

[실행]
1. ZIP의 압축을 모두 풀어 주세요.
2. PSY2050-LAST-SIGNAL 폴더의 START.html을 Chrome, Edge 또는 Safari로 여세요.
3. 작전 시작 → 거점 배치 시작을 누르면 플레이할 수 있습니다.

별도 설치나 인터넷 연결이 필요 없습니다.
START.html에 게임, 이미지, 글꼴, 음악이 모두 들어 있습니다.
HTML이 편집기로 열리면 파일을 우클릭하고 '연결 프로그램'에서 브라우저를 선택하세요.

[플레이]
캐릭터 선택 → 지도 위 빛나는 네모 거점에 배치 → 웨이브 시작!
배치한 캐릭터는 움직이지 않습니다. 클릭해 Lv.3까지 강화하거나 회수할 수 있습니다.
처음에는 미나 + 리타 + 시간의 소녀를 굽은 길 주변에 배치해 보세요.

미나: 속사 / 리타: 연쇄 / 시간의 소녀: 감속
하은: 범위 폭발 / 율: 장갑 무시 관통 / 세린: 공격 증폭과 자원 지원

3개 스테이지, 총 18개 웨이브입니다.
보스: 레이나 → 베스퍼 → 오르페
적이 신호탑에 도착하면 내구도가 감소하며, 보스가 통과하면 즉시 패배합니다.

[조작]
마우스·터치: 캐릭터 선택, 배치, 강화
1~6: 캐릭터 선택 / Space: 웨이브 시작 / U: 선택한 캐릭터 강화
Q: 시간 균열 / P: 일시정지 / Esc: 선택 해제·일시정지·창 닫기
M: 음악·효과음 켜기·끄기 (기본 음소거)
화면의 배속 버튼: 1배·2배·3배 / 자동: 웨이브 자동 시작
지도에서 방향키 → Enter: 거점 순회 → 배치·선택

[저장]
같은 브라우저와 같은 파일 위치에서 진행이 자동 저장됩니다.
이어하기는 가장 최근 웨이브가 시작되기 직전의 배치 상태로 복원됩니다.
스테이지 완료 기록과 획득한 별이 저장됩니다. 새 구역에서는 배치와 자원을 초기화합니다.
브라우저가 로컬 저장소를 차단한 경우 진행 보존은 제한될 수 있습니다.

[크레딧]
원작: IndiePunk / PSY2050
프로그래밍: Hhan87 / 스토리·디자인: kalmis, roue / 원화: kalmis
타워디펜스 외전 구현: Codex
기존 리마스터 AI 보조 아트와 원작 Chrono Storm 음악 재사용
추가 인물 초상화: 코드 기반 벡터 일러스트

원작 설정을 바탕으로 새롭게 구성한 독립 타워디펜스 외전입니다.
'''
payload = game.read_bytes()
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr(f'{folder}/START.html', payload)
    z.writestr(f'{folder}/README.txt', guide.replace('\n', '\r\n').encode('utf-8-sig'))

with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None, 'ZIP integrity check failed'
    assert z.namelist() == [f'{folder}/START.html', f'{folder}/README.txt']
    assert hashlib.sha256(z.read(f'{folder}/START.html')).digest() == hashlib.sha256(payload).digest()
    assert z.read(f'{folder}/README.txt').decode('utf-8-sig').startswith('PSY2050')

print(f'Created {archive.relative_to(root)} ({archive.stat().st_size / 1024 / 1024:.2f} MB)')
print('Verified: ZIP integrity, exact game contents, Korean guide, two distribution files only.')
