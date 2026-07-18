# Audience Pixel CCTV

첨부한 CCTV 영상을 4단계 픽셀 패턴으로 변환하고, `[track02] if and only if`의 Kick과 관객의 드래그 입력에 반응하는 개인용 웹 경험입니다.

## 동작

- Start 버튼을 누르면 오디오가 전체 타임라인의 기준이 됩니다.
- CCTV 영상은 곡이 끝날 때까지 반복됩니다.
- 40–160Hz Kick 에너지가 픽셀을 자동으로 크게 만듭니다.
- 각 관객의 드래그 입력은 자신의 브라우저에만 적용됩니다.
- 마이크, 서버, Resolume, 무대 화면 공유 상태를 사용하지 않습니다.
- 출력 캔버스와 지원 브라우저의 MP4 녹화는 1920×1080 H.264/AVC입니다.

## 로컬 실행

Node.js 20 이상과 Yarn/Corepack이 필요합니다.

```bash
corepack enable
yarn install
yarn test
yarn dev
```

브라우저에서 `http://127.0.0.1:3004`를 엽니다. 브라우저 자동재생 정책 때문에 첫 재생에는 Start 버튼이 필요합니다.

## 정적 빌드 확인

```bash
yarn build
yarn verify:static
```

빌드 결과는 `out/`에 생성됩니다. GitHub Pages의 저장소 하위 경로를 로컬에서 확인하려면 다음처럼 빌드합니다.

```bash
BASE_PATH=/repository-name yarn build
```

## H.264 MP4 저장

브라우저가 `MediaRecorder`의 명시적 AVC MP4 MIME 타입을 지원할 때만 버튼이 활성화됩니다. 지원하지 않는 브라우저에서는 WebM으로 몰래 대체하지 않습니다. 이 경우에도 재생, Kick 반응, 드래그 조작은 정상 동작합니다.

## GitHub Pages 배포

1. GitHub 저장소의 **Settings → Pages**에서 Source를 **GitHub Actions**로 선택합니다.
2. `main` 브랜치에 푸시하거나 **Actions → GitHub Pages → Run workflow**를 실행합니다.
3. 워크플로가 테스트, 정적 빌드, 레거시 문자열 검증을 마친 뒤 `out/`을 배포합니다.

## 미디어

- `public/media/cctv-1080p.mp4`: 제공된 CCTV 영상을 1920×1080 H.264로 정규화한 파일
- `public/media/if-and-only-if.mp3`: 제공된 `[track02] if and only if.mp3`
