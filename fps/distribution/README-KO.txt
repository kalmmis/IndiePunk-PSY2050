PSY2050 · ANIMA / FPS — 친구에게 보내는 로컬 실행판

바로 실행
1. ZIP 파일의 압축을 모두 풉니다.
2. PSY2050-FPS 폴더의 index.html을 더블클릭합니다.
3. 브라우저에서 '작전 시작' → '전장 진입'을 누릅니다.

Windows: PLAY-Windows.bat으로도 열 수 있습니다.
macOS: PLAY-macOS.command으로도 열 수 있습니다.
Linux: PLAY-Linux.sh 또는 index.html을 엽니다.

게임 실행에 인터넷 연결, Unity, Node.js, Python 설치가 필요하지 않습니다.
WASM, 이미지, 음악, 글꼴과 3D 모델 생성 코드를 HTML에 포함했습니다.
WebGL 2를 지원하는 데스크톱 브라우저와 키보드·마우스를 사용하세요.
마우스 고정이 제한되면 창 모드 조준으로 자동 전환합니다.
창 모드에서는 화면 가장자리에 커서를 두면 계속 회전합니다.

조작
- 마우스: 시점 / 조준
- WASD 또는 방향키: 이동
- 좌클릭 유지: 사이킥 광탄
- 우클릭 유지 후 놓기: 공명탄 충전 / 시전
- E 누르기 → 빈 지면 조준 → E 놓기: 텔레포트
  도착 지점이 비어 있으면 엄폐물 너머로도 이동할 수 있습니다.
- R 유지: 마력 회복
- Q 유지: 시간 감속
- Shift: 달리기 / Space: 점프
- Esc 또는 P: 일시정지 / P: 재개
- M: 음소거

레이나 모델
타이틀의 '레이나 모델'에서 일러스트와 3D 모델을 비교할 수 있습니다.
드래그로 회전하고 스크롤로 확대합니다.
reina-model.glb는 같은 캐릭터의 별도 3D 파일입니다.

선택 사항: 로컬 서버 실행
index.html을 직접 열어서 플레이할 수 있으므로 이 단계는 필수가 아닙니다.
같은 로컬 주소에서 이어하기와 설정을 이용하려면 Python 3가 설치된 PC에서
다음 명령을 이 폴더에서 실행할 수 있습니다.

Windows: py -3 serve.py
macOS / Linux: python3 serve.py

브라우저가 자동으로 열립니다. 터미널의 Ctrl+C로 서버를 종료합니다.
서버는 이 PC의 127.0.0.1에서만 실행하며 다른 PC에 공개하지 않습니다.
기본 포트 8081이 사용 중이면 비어 있는 포트를 사용하고 주소를 표시합니다.
이어하기는 같은 브라우저와 같은 주소를 사용할 때 유지됩니다.

포함 파일
index.html            게임 실행 파일
game.wasm             독립 WASM 시뮬레이션 (HTML에도 포함됨)
reina-model.glb        레이나 3D 모델
reina-model.json       모델 정보
asset-sources.json     리소스 출처
PLAY-*                운영체제별 바로 열기 파일
serve.py              선택적인 로컬 서버

크레딧
원작: IndiePunk / PSY2050
프로그래밍: Hhan87
스토리·디자인: kalmis, roue
원화: kalmis
리마스터 초상화: 원작 저장소 Assets/ArtRemaster의 AI 보조 일러스트
FPS: AssemblyScript WASM / WebGL 2 / 일러스트를 참고한 입체 메시
