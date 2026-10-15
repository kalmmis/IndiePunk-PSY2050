# PSY2050 PlayStation

PS1의 R3000A CPU와 GPU/SPU/CD-ROM API를 사용하는 네이티브 C 포트입니다. 원본 4개 챕터와 에필로그, 589개 대화 명령·286개 한글 대사 페이지, 138개 스테이지 행·258회 적 출현을 가져옵니다. 보스의 처치 여부에 따른 스토리 분기와 챕터 4 처치 엔딩의 에필로그 연결을 유지합니다.

[배포 ZIP](../build/ps1/PSY2050-PS1.zip)을 전부 풀고 PS1 에뮬레이터에서 `PSY2050.cue`를 여세요. 같은 폴더의 `PSY2050.bin`에 게임 데이터와 원본 BGM CD-DA 트랙이 들어 있습니다. [패드 조작·실행 안내·차이점](PLAY.txt).

320×240 NTSC, 더블 버퍼, 256색 캐릭터/초상화 텍스처, 15비트 배경, 한글 글리프 아틀라스로 구성했습니다. 고정 소수점 로직으로 목표 60fps, 적 32 / 아군탄 24 / 적탄 256을 지원합니다. 원본 72초 음악 전체를 CD-DA로 반복하고 발사/피격 효과음을 22.05kHz SPU ADPCM으로 재생합니다. 원작의 UI·일부 효과 및 계산은 간소화했습니다. 메모리카드 저장 대신 챕터 선택과 에뮬레이터 세이브 스테이트를 사용할 수 있습니다.

기존 Unity·웹·SNES·다른 외전 프로젝트는 그대로 두고 `ps1/`, `build/ps1/`에 별도로 구성했습니다.

## 빌드

검증된 호스트는 macOS ARM64입니다. Python 3.12+, Pillow, Xcode command line tools, LLVM `llvm-objcopy` 또는 Rust 툴체인의 `rust-objcopy`가 필요합니다.

```sh
python3 -m venv ps1/.venv
ps1/.venv/bin/pip install 'Pillow>=10'
ps1/.venv/bin/python ps1/tools/build.py
```

빌드 스크립트는 PSn00bSDK 0.24의 타깃 라이브러리·공식 소스, Zig 0.14.1의 Clang/LLD, mkpsxiso 2.30을 공식 배포처에서 SHA-256 검증 후 프로젝트 내부 `.tools/`에 준비합니다. 전역 설치는 하지 않습니다. Linux 배포본의 MIPS 정적 라이브러리를 사용하고 호스트용 도구는 macOS용으로 실행합니다. 다른 호스트에서는 해당 플랫폼의 도구 경로를 조정해야 합니다.

`tools/prepare.py`가 원본 C#의 데이터 문자열과 CSV, 리마스터 그림에서 자료를 직접 변환합니다. Unity 또는 웹 빌드는 필요하지 않습니다. `build/snes/`의 ROM이나 이미지는 사용하지 않습니다.

Clang 타깃은 MIPS-I / o32 / soft-float입니다. PS1에서 지원하지 않는 나눗셈 검사 명령 생성을 끄고, LLVM의 분기 지연 슬롯 채우기를 비활성화해 R3000A의 load delay를 지킵니다. GPU 구조체의 비트 필드 접근은 `-fno-strict-aliasing`으로 빌드합니다. GCC가 만든 SDK 아카이브의 로컬 심벌 메타데이터는 LLVM objcopy로 정규화합니다. ELF의 PT_LOAD 세그먼트에서 PS-X EXE를 생성하고 BSS를 포함한 프로그램 끝 주소가 일반 PS1 RAM 예산 안에 있는지도 확인합니다.

## 검증

PCSX ReARMed의 [소스 리비전 c881679](https://github.com/libretro/pcsx_rearmed/tree/c881679)을 받아 다음 옵션으로 검증 코어를 만들었습니다. 에뮬레이터나 BIOS는 게임 배포본에 동봉하지 않습니다.

```sh
make -f Makefile.libretro -j8 platform=osx DYNAREC=0 \
  HAVE_CHD=0 HAVE_PHYSICAL_CDROM=0 USE_ASYNC_CDROM=0 \
  USE_ASYNC_GPU=0 USE_ASYNC_SPU=0 USE_LIBRETRO_VFS=0 CC=clang CXX=clang++

python3 ps1/tools/build.py --test-core /absolute/path/to/pcsx_rearmed_libretro.dylib
```

MIPS 인터프리터와 오픈 HLE BIOS에서 디스크 부팅, 소리, 패드, 한글 대화의 입력 대기와 진행, 일시정지, 시간 감속, 보스 3단계, 두 결과 분기, 피격/부활 및 엔딩 연결을 검증합니다. 챕터 연결 테스트는 에뮬레이터 RAM에서 대기시간과 보스 결과를 조정합니다. 배포 프로그램에는 테스트 전용 우회 코드를 넣지 않습니다. 실제 PS1 및 DuckStation에서는 아직 검증하지 않았습니다.

`build/ps1/test-report.json`과 캡처는 테스트한 디스크의 SHA-256이 일치할 때만 복사됩니다. SDK 다운로드 출처와 해시는 `.tools/provenance.json`, 프로그램 진입점과 RAM 범위는 `build/ps1/build-report.json`에 기록됩니다.

SDK·음원·이미지 캐시와 중간 파일은 Git에서 제외합니다. 라이브러리와 도구 출처는 [THIRD_PARTY.txt](THIRD_PARTY.txt)를 참고하세요.
