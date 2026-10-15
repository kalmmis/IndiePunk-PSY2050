# PSY2050

Unity 2018.4.19f1 기반의 세로형 탄막 슈팅 게임입니다.

**PlayStation / PS1 버전:** [PSY2050-PS1.zip](build/ps1/PSY2050-PS1.zip)을 풀고 PS1 에뮬레이터에서 `PSY2050.cue`를 여세요. MIPS 네이티브 코드, 리마스터 텍스처, 원본 한글 대사·챕터·보스, CD 오디오 BGM을 담은 별도 버전입니다. [조작·검증·빌드 방법](ps1/README.md).

**SNES 에뮬레이터 버전:** [PSY2050-SNES.zip](build/snes/PSY2050-SNES.zip)을 풀고 Snes9x에서 `PSY2050.sfc`를 여세요. C/65816으로 작성한 별도 데메이크로, 원본 스테이지·한글 대사·리마스터 그림·시간 감속·보스·엔딩을 포함합니다. 원본 BGM용 MSU-1 파일도 동봉했습니다. [조작·차이·빌드 방법](snes/README.md).

**새 타워디펜스 외전: [PSY2050 · LAST SIGNAL](tower-defense/README.md)** — [실행 파일](build/tower-defense/index.html)을 브라우저에서 열면 플레이할 수 있습니다. 미나 등 6종 캐릭터의 고정 배치와 3단계 강화, 서로 다른 경로의 3개 스테이지·18개 웨이브, 레이나 → 베스퍼 → 오르페 보스전, 시간 감속과 자동 저장을 제공합니다. 모든 리소스를 HTML 한 파일에 내장한 별도 프로젝트입니다.

```sh
npm run serve --prefix tower-defense
# http://localhost:8082
```

**새 FPS 버전:** 별도 **[`fps/`](fps/README.md)** 프로젝트에서 1인칭 3D 슈팅으로 재구성했습니다. [`build/fps/index.html`](build/fps/index.html)을 열면 실행됩니다. WASM·WebGL 2 기반이며, WASD 이동·마법 시전·지점 지정 텔레포트·시간 감속·3개 구역·일러스트 기반 레이나 3D 보스를 포함합니다.

```sh
npm run serve --prefix fps
# http://localhost:8081
```

[버전 선택](build/wasm/versions.html)에서 실행할 그래픽 버전을 고를 수 있습니다.

- [기존 그래픽 버전](build/wasm/original.html): 리마스터 이전 이미지·메뉴·이펙트
- [리마스터 버전](build/wasm/index.html): 신규 원화·배경·스프라이트·UI

각 게임은 WASM과 모든 리소스가 내장된 독립 HTML 한 파일로 오프라인 실행됩니다. 진행 상황과 소리 설정도 버전별로 저장됩니다.

```sh
python3 -m http.server 8080 --directory build/wasm
```

실행·조작·재빌드 방법과 원본 대비 복구 사항은 [web/README.md](web/README.md)를 참고하세요.

새 원화·스프라이트·배경·UI는 [Assets/ArtRemaster](Assets/ArtRemaster/README.md)에 정리했습니다. 게임용 2D 에셋 42종과 보조 스프라이트 6종을 포함합니다.

친구에게 전달하려면 [PSY2050-browser.zip](build/wasm/PSY2050-browser.zip)을 보내세요. 압축을 모두 풀고 `PSY2050/START.html`을 더블클릭하면 두 버전 중 선택해 실행할 수 있습니다.
