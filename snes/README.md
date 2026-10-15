# PSY2050 SNES

실제 SNES CPU용 C/65816 코드로 다시 작성한 데메이크입니다. 웹판을 포장한 ROM이 아닙니다.

완성된 배포본은 [`../build/snes/PSY2050-SNES.zip`](../build/snes/PSY2050-SNES.zip)입니다. 압축을 모두 풀고 Snes9x에서 `PSY2050.sfc`를 여세요. 패드 조작과 제한 사항은 [PLAY.txt](PLAY.txt)에 정리했습니다.

원본 4개 챕터와 에필로그의 138개 스테이지 행·258회 적 출현, 589개 대화 명령·286개 한글 대사 페이지를 가져옵니다. 원작의 대화 이벤트와 보스 처치 여부에 따른 분기를 유지하며, 챕터 4의 처치 엔딩은 에필로그로 이어집니다. 리마스터 리소스를 제한된 팔레트와 타일로 변환합니다. 브라우저판 및 Unity 리소스는 수정하지 않습니다.

게임 화면은 256×224, 중앙 플레이필드와 양쪽 HUD로 구성합니다. OBJ는 8×8/32×32 크기를 사용하고 큰 보스는 4개 OBJ로 합성합니다. 적 12개, 아군탄 12개, 적탄 48개를 지원하며 회전 빔은 65816 루틴이 OAM에 직접 기록합니다. 목표 업데이트 속도는 30fps입니다. 탄막·이동·충돌은 고정 소수점 근사이며 UI·효과·애니메이션은 간소화했습니다. 스테이지 선택과 무적 연습 모드를 제공합니다. 진행 저장은 에뮬레이터의 세이브 스테이트로 처리합니다.

효과음은 원본 WAV를 8kHz BRR로 변환해 SPC700에서 재생합니다. 원본 72초 BGM 전체는 선택적인 MSU-1 파일 두 개로 제공합니다. `PSY2050.msu`, `PSY2050-1.pcm`을 ROM 옆에 두면 지원 에뮬레이터에서 음악이 재생됩니다. SFC 단독 실행은 음악 없이 게임·효과음이 동작합니다.

## 빌드

Python 3, Pillow, make가 필요합니다. macOS ARM64 / Linux x86_64용 PVSnesLib 4.6.0 SDK는 빌드 스크립트가 공식 배포본을 내려받아 SHA-256을 확인한 뒤 `.tools/`에 풉니다. 다른 환경에서는 SDK를 준비하고 `PVSNESLIB_HOME`을 지정하세요. 전역 설치는 하지 않습니다.

```sh
python3 -m venv snes/.venv
snes/.venv/bin/pip install 'Pillow>=10'
snes/.venv/bin/python snes/tools/build.py
```

`Assets/Template/Scripts/ExcelParser.cs`, 원본 CSV와 `Assets/ArtRemaster`에서 직접 재생성하므로 Unity·WASM·Node 빌드가 필요하지 않습니다. 결과는 `build/snes/`에 생성됩니다. 로컬 SDK와 중간 산출물은 Git에서 제외합니다.

## 검증

Snes9x 1.63의 공식 소스를 내려받아 `libretro/`에서 공유 라이브러리를 빌드한 뒤 다음과 같이 실행합니다. 에뮬레이터는 배포 ZIP에 포함하지 않습니다.

```sh
python3 snes/tools/build.py --test-core /absolute/path/to/snes9x_libretro.dylib
# Linux에서는 snes9x_libretro.so
```

테스트는 일반 CPU 속도로 ROM을 실행하며 부팅, 체크섬, 패드 이동, 일시정지, 감속, 한글 대화, 보스 3단계와 두 결과, 피격·부활, 모든 챕터와 엔딩 연결, MSU-1 및 SPC700 소리를 확인합니다. 챕터 흐름 테스트는 에뮬레이터 RAM에서 행 대기시간과 보스 결과를 조정하며, 배포 ROM에는 테스트 전용 코드를 넣지 않습니다. 검증 보고서와 캡처는 `build/snes/`에 복사됩니다. 실제 기기·다른 에뮬레이터에서는 아직 검증하지 않았습니다.

VRAM word 주소: OBJ `0000`, BG3 글꼴/대사 `2000`, BG1 배경 `3000`, BG2 초상화 `4000`, 타일맵 `6000/6400/6800`. 타이틀에서는 BG1 `1000`, BG3 `5000`으로 재배치합니다. 큰 DMA는 강제 블랭크 상태에서, HUD 타일맵은 VBlank에서 전송합니다.

개발 도구: [PVSnesLib](https://github.com/alekmaul/pvsneslib), 검증 코어: [Snes9x](https://github.com/snes9xgit/snes9x). 라이브러리의 저작권 고지는 실행 ZIP에도 동봉합니다.
