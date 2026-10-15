# PSY2050 WebAssembly 포트

Unity 2018.4.19f1 프로젝트의 원본 리소스와 C# 게임 규칙을 분석해 만든 독립 실행 웹 버전입니다. Unity 런타임 자체를 WebGL로 빌드한 파일은 아닙니다. Unity 에디터 없이 원본 대사·웨이브·음악과 게임 규칙을 브라우저 실행 구조로 이식했습니다. 현재 기본 빌드는 신규 아트 리마스터를 사용합니다.

## 실행

`build/wasm/versions.html`을 열면 두 버전 중 선택할 수 있습니다.

- `build/wasm/original.html`: 기존 그래픽·메뉴·전투 이펙트·크레딧, 약 8.8MB
- `build/wasm/index.html`: 아트 리마스터, 약 14MB

각 게임은 **해당 HTML 한 파일만** 열면 독립 실행됩니다. WASM, 이미지, 글꼴, 음악, 대사를 모두 내장하므로 인터넷 연결이나 다른 파일이 필요하지 않습니다. 선택 페이지를 함께 복사하는 경우 두 게임 HTML도 같은 폴더에 두세요.

게임 규칙과 오류 수정은 두 버전이 공유하며, 그래픽·UI·렌더링은 각각 분리되어 있습니다. 기존 버전의 자동 저장과 소리 설정은 `psy2050-original-*`, 리마스터는 기존의 `psy2050-*` 키를 사용해 서로 덮어쓰지 않습니다. 이후 빌드에서도 두 버전을 함께 생성합니다.

HTTP로 서빙하려면 저장소 루트에서 실행합니다.

```sh
python3 -m http.server 8080 --directory build/wasm
```

브라우저에서 `http://localhost:8080`을 엽니다. 외부 CDN, Unity 설치, npm 설치가 실행 조건으로 필요하지 않습니다. 음악은 브라우저 정책에 따라 게임 시작 등 첫 조작 후 재생됩니다.

## 조작

- 마우스 또는 터치를 누른 채 이동: 이동 + 공격
- 방향키 / WASD: 이동, Space / Z: 공격
- 공격을 5초씩 유지: 100% → 90% → 80% → 70% 시간 감속
- 공격 해제: 공격 단계 초기화, 시간 속도 복구
- 클릭 / Enter / Space: 대사 표시 완료 또는 다음 대사
- Esc / P: 일시정지, M: 음소거
- 설정에서 음악·효과음 볼륨 조정

## 재현 범위

- 인디펑크 로고 → SF 메뉴 → 게임 → 크레딧 화면
- 480 × 800 세로 화면, 신규 야간 도시 외곽 배경, 화면 크기에 따른 축소
- Unity 카메라의 좌표계: 중심 Y=7, orthographic size=16.348835
- 신규 플레이어 대기 4프레임·공격 3프레임, 보스 3프레임 애니메이션
- 원본 CSV 배치 순서와 적 생성 간격, A–G/X 이동 패턴과 A–E/X 공격 패턴
- 초당 10발, 탄속 50, 300프레임 기준 단계별 시간 감속, 적 A 체력 5
- 레이나의 스윙 레이저, 회전 레이저, 방화벽 패턴 및 체력/시간 기반 진행
- 1·2·3·4스테이지와 10번 에필로그, 원본 대사 명령 589개와 초상화
- 보스 전투 결과에 따른 대사 분기, 원본의 4스테이지 반복 및 진엔딩 경로
- 원본 BGM과 효과음, 부활 화면

물리 계산·이동·적 공격·플레이어 공격·충돌·시간 감속·보스 진행은 AssemblyScript에서 실제 WebAssembly로 컴파일됩니다. JavaScript는 원본 스테이지와 대사를 진행하고 Canvas 2D 렌더링, 입력, 음향, 메뉴를 담당합니다.

## 원본과의 차이 및 복구 사항

- 원본 `ExcelParser.GetLevel(3/4/10)`은 레벨 대신 대사 문자열을 반환합니다. 1·2는 실제 C# 내장 데이터를 사용하고 3·4·10은 대응하는 `Assets/Resources/level*.csv`를 사용합니다.
- 원본 `isBossKilled`는 갱신되지 않아 격파 분기로 들어갈 수 없습니다. 3단계에서 체력 30 미만까지 공격해 마무리하면 격파 분기로 진행하도록 복구했습니다.
- 원본 4스테이지의 공통 종료 대사는 진엔딩의 `nextStage=10`을 다시 4로 덮어씁니다. 먼저 선택된 전투 결과 분기를 보존해 에필로그로 진입하도록 복구했습니다.
- 원본 스크립트에는 선택지 처리기가 있지만 실제 사용되는 대사 데이터에는 선택지가 없습니다. 원본과 같이 보스 전투 결과로 이야기 흐름이 갈립니다.
- 위치가 누락된 원본 대사 1건은 Unity와 동일하게 오른쪽 초상화로 처리합니다.
- 대사 중에는 전투를 정지합니다. 원본은 정지 주석만 있고 정지 코드가 없어 대사 중에도 피격될 수 있습니다.
- 부활은 외부 Unity Ads SDK 대신 즉시 실행되며, 부활 직후 3초간 보호합니다.
- 키보드 조작, 일시정지, 대사 건너뛰기, 스테이지별 로컬 자동 저장을 추가했습니다.
- Unity ParticleSystem·셰이더 효과는 Canvas 효과로 재구현했습니다. 보스 패턴의 운동과 충돌도 웹 시뮬레이션으로 재구현하여 원본 Unity 실행과 픽셀/물리 수준의 완전 일치를 보장하지 않습니다.
- 새 원화를 WebP로 내장하고 음향을 22.05kHz 모노 PCM으로 변환했습니다. 단일 HTML은 약 14MB입니다. 기존 Unity 원본 이미지와 작업 파일은 수정하지 않았습니다.
- 브라우저는 임의로 창을 닫지 못하므로 Quit은 확인 후 타이틀과 음소거 상태로 돌아갑니다.

## 파일 구조

```text
build/wasm/versions.html       기존/리마스터 버전 선택
build/wasm/original.html       기존 그래픽 단독 배포 파일
build/wasm/index.html          리마스터 단독 배포 파일 (WASM·리소스 내장)
build/wasm/game.wasm           같은 게임 엔진의 별도 바이너리, 검사/재사용용
build/wasm/asset-sources.json  사용한 원본 리소스 경로
web/src/game.ts               WebAssembly 게임 엔진
web/src/app.js                입력·렌더링·음향·대사·스테이지 진행
web/src/index.html            HTML UI
web/src/style.css             리마스터 화면 스타일
web/src/original/             기존 HTML UI 및 스타일
web/src/versions.html         버전 선택 페이지
web/tools/extract_assets.py   원본 Unity 리소스 추출 및 압축
web/tools/build.mjs           WASM 컴파일 및 단일 HTML 패키징
web/tools/game.test.mjs       게임 엔진 및 원본 데이터 검증
```

`game.wasm`과 `asset-sources.json`은 HTML 실행에 필요한 부속 파일이 아닙니다. 다른 곳에 배포할 때는 원하는 버전의 `index.html` 또는 `original.html` 한 파일만 복사하면 됩니다.

## 다시 빌드

Node.js 20 이상과 Python 3 + Pillow가 필요합니다. PSD의 정확한 투명도 추출에 macOS는 기본 `sips`를 사용합니다. 다른 OS에서는 `psd-tools`가 추가로 필요합니다.

```sh
npm ci --prefix web
python3 -m pip install Pillow
# macOS가 아닌 경우: python3 -m pip install psd-tools
npm run build --prefix web
npm test --prefix web
```

원본 리소스를 변경한 뒤에는 `npm run build --prefix web -- --fresh`로 리소스를 다시 추출합니다. Python 실행 파일을 지정하려면 `PYTHON=/path/to/python3` 환경 변수를 사용합니다.

## 브라우저 통합 검증

엔진 테스트 외에 오프라인 HTML·마우스 입력·시간 감속·설정·부활·모바일 화면·전체 엔딩 경로를 Chrome에서 자동 검증할 수 있습니다.

```sh
npm install --prefix web --no-save playwright-core
npm run test:browser --prefix web
# 기존 그래픽 버전도 동일한 전체 테스트 실행
PSY_GAME_EDITION=original npm run test:browser --prefix web
```

Chrome 경로가 자동으로 감지되지 않으면 `CHROME_PATH`를 지정합니다. 이 검증은 `file://`와 오프라인 브라우저 컨텍스트를 사용하며 외부 네트워크 요청이 없는지도 확인합니다.

## 아트 리마스터

`Assets/ArtRemaster/manifest.json`이 실제 런타임 이미지 42종과 보조 스프라이트 6종을 관리합니다. 이전 웹 빌드의 이미지 키 32개는 모두 새 이미지로 교체됐으며, 빌드 시 빠진 키가 있으면 실패합니다. 플레이어·보스는 생성된 아틀라스에서 같은 셀 기준으로 분리해 프레임 크기를 유지합니다.

- 세 캐릭터의 컬러·비활성 초상화, 플레이어 7프레임, 보스 3프레임
- 드론 4종, 투사체·화염 레이저·폭발 3단계·방어막·엔진·발사 이펙트
- 야간 도시 메뉴 원화, 스크롤용 도로 타일, 와이드 도시 배경
- 벡터 버튼·창 프레임·IndiePunk 로고·정식 제작진 크레딧
- 기존 우주 테마용 행성 4종과 아군 기체 2종도 별도 PNG로 제공

신규 원화 11장은 built-in image_gen으로 제작했습니다. 생성 프롬프트는 `Assets/ArtRemaster/prompts.json`, 미술 방향은 `Assets/ArtRemaster/art-direction.md`에 보존했습니다. UI와 크레딧은 코드 기반 SVG이므로 글자가 이미지 생성 과정에서 변형되지 않습니다. 기존 제작진은 그대로 표기하고 AI 보조 리마스터 크레딧을 별도로 표시합니다.

`npm run build --prefix web`은 `prepare_art.py`를 실행해 새 PNG와 내장용 WebP를 준비하고 단일 HTML을 갱신합니다. 원래 Unity 씬의 이미지 참조는 보존되어 있으며, 새 아트는 웹 빌드에 자동 적용됩니다. PNG 원화·프레임은 Unity에서 재사용할 수 있습니다.

## 친구에게 ZIP으로 전달

`build/wasm/PSY2050-browser.zip`을 보내면 됩니다. 친구는 압축을 모두 풀고 `PSY2050/START.html`을 더블클릭한 뒤 기존 또는 리마스터 버전을 선택합니다. 서버나 개발 도구 설치 없이 브라우저에서 실행됩니다.

패키지는 시작 페이지·한국어 안내문·두 게임 HTML만 포함합니다. 소스 코드, 개발 의존성, 원화 작업 파일은 포함하지 않습니다. 게임 파일 두 개는 각각 리소스를 모두 내장합니다.

빌드 결과가 바뀌면 다음 순서로 ZIP을 갱신하세요.

```sh
npm run build --prefix web
npm run package --prefix web
```
