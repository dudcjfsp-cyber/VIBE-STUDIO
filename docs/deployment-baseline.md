# Deployment Baseline

Updated: 2026-04-20
Purpose: 현재 Vibe Studio를 실제 배포 가능한 최소 구조로 운영할 때의 기준을 고정하는 focused note

## Rule
- 이 문서는 현재 배포 기준 메모다
- 이 문서는 `docs/product-intent.md`, `docs/PRD.md`, `docs/TRD.md`를 덮어쓰지 않는다
- 제품 경계보다 운영 경계만 다룬다

## 1. 현재 권장 배포 구조
현재 기준의 가장 안전한 배포 구조는 아래 두 조각이다.

1. `apps/product-web`
- 정적 프론트로 배포한다
- 브라우저 UX와 session storage 기반 provider 세션을 담당한다

2. `apps/product-server`
- Node 런타임으로 별도 배포한다
- provider/model 호출 중계, engine 실행, follow-up 실행을 담당한다

Rule:
- 실제 제품 흐름 배포에서는 `product-web` 단독 정적 배포만으로 끝내지 않는다
- `VITE_PRODUCT_ENGINE_MODE=local`은 데모/로컬 fallback 용도다

## 1.5 GitHub Actions 무료 데모 배포
현재 무료 데모 배포는 아래 기준으로 둔다.

- GitHub Actions가 `main` 기준으로 `apps/product-web`를 GitHub Pages에 자동 배포한다
- 이 배포는 `VITE_PRODUCT_ENGINE_MODE=browser`로 빌드한다
- 이 배포는 기본적으로 `VITE_AVAILABLE_PROVIDERS=local,gemini,openai`로 빌드한다
- Gemini/OpenAI provider/model 호출은 사용자의 브라우저에서 사용자가 입력한 API key로 직접 호출한다

Rule:
- GitHub Pages는 프론트만 호스팅한다
- 무료 데모 배포에서는 `product-server`가 없어도 Gemini 모델 목록과 결과 생성이 가능해야 한다
- browser mode는 데모 편의용이다
- 사용자의 API key는 브라우저 session storage에만 임시 저장되고 Gemini API 호출에 직접 사용된다
- browser mode에서는 현재 Gemini와 OpenAI만 직접 연결한다
- OpenAI 공식 문서는 API key를 브라우저/client-side 코드에 노출하지 말라고 안내한다
- 따라서 OpenAI browser mode는 사용자 본인 키로 쓰는 무료 데모 편의 기능이며, 운영 기본 구조는 server-backed runtime이다

## 1.6 Render product-server 배포
유료 또는 상시 서버 운영을 선택할 경우의 runtime 배포 기준은 Render Web Service다.

루트의 `render.yaml`은 아래를 고정한다.
- service name: `vive-studio-product-server`
- runtime: `node`
- build command: `npm ci && npm run build`
- start command: `npm run start`
- health check path: `/api/health`
- `HOST=0.0.0.0`
- `VIBE_ALLOWED_ORIGINS=https://dudcjfsp-cyber.github.io`

Render 배포 후 실제 API base URL은 보통 아래 형태가 된다.
- `https://vive-studio-product-server.onrender.com/api`

Rule:
- 실제 Render URL이 다르면 GitHub repository variable `PRODUCT_API_URL`에는 실제 URL을 넣는다
- CORS origin은 origin만 넣고 path는 넣지 않는다
- GitHub Pages URL이 custom domain으로 바뀌면 `VIBE_ALLOWED_ORIGINS`도 함께 바꾼다

## 2. 왜 이 구조가 현재 기준인가
- 현재 제품 문서는 `product-web` / `product-server` 경계를 전제로 한다
- 브라우저는 API key를 session storage에만 잠깐 유지한다
- server runtime은 전달받은 key를 저장하지 않고 요청 단위로만 사용한다
- golden case와 제품 프론트 수동 점검 기준도 이 구조를 기준으로 잡혀 있다

## 3. 배포용 명령
루트 기준:

- build: `npm run build:deploy`
- start: `npm run start`
- deploy verify: `npm run verify:deploy`

Note:
- 기존 `npm run build`는 TypeScript 패키지 빌드만 수행한다
- 실제 배포 전에는 `product-web` 정적 빌드까지 포함된 `build:deploy`를 사용한다

## 4. 서버 환경 변수
`apps/product-server/.env.example` 기준:

- `HOST`
  - 기본값: `0.0.0.0`
  - 외부 접속 가능한 바인딩 주소
- `PORT`
  - 기본값: `4177`
  - 런타임 포트
- `VIBE_ALLOWED_ORIGINS`
  - 쉼표 구분 origin allowlist
  - 예: `https://app.example.com,https://staging.example.com`
  - 비우면 모든 origin을 허용한다
- `VIBE_OBSERVABILITY_DEBUG`
  - `1`이면 runtime debug 이벤트를 콘솔에 남긴다

## 5. 프론트 환경 변수
`apps/product-web/.env.example` 기준:

- `VITE_PRODUCT_API_URL`
  - 예: `https://api.example.com/api`
  - `product-server`의 API base URL
- `VITE_PRODUCT_ENGINE_MODE`
  - 기본값: `auto`
  - `local`이면 브라우저 내 fallback engine을 우선 사용한다
  - `browser`이면 지원 provider를 브라우저에서 직접 호출한다
- `VITE_PRODUCT_BASE_PATH`
  - 기본값: `/`
  - GitHub Pages 같은 서브패스 배포 시 base path를 맞춘다
- `VITE_AVAILABLE_PROVIDERS`
  - 기본값: `local,openai,anthropic,gemini`
  - 쉼표 구분 provider allowlist
  - 현재 GitHub Pages 무료 데모 배포에서는 기본적으로 `local,gemini,openai`를 사용한다

Rule:
- server-backed 제품 배포에서는 `VITE_PRODUCT_API_URL`을 명시한다
- 프론트에는 로컬 API 기본값을 두지 않는다
- server-backed 모드에서 `VITE_PRODUCT_API_URL`이 없으면 명시적으로 실패해야 한다

## 6. 현재 운영 전 체크리스트
배포 전 최소 확인:

1. `npm run verify:deploy` 통과
2. GitHub Pages source를 GitHub Actions로 설정
3. 브라우저에서 local runtime 흐름 확인
4. Gemini API key로 모델 목록 조회 확인
5. OpenAI API key로 모델 목록 조회 확인
6. Gemini 또는 OpenAI 모델 선택 후 create, clarify, approval, review 흐름 수동 점검

유료/상시 서버를 쓰는 경우의 GitHub / Render 설정 체크:
1. Render에서 `render.yaml` 기반 Web Service 생성
2. Render 배포 URL의 `/api/health` 확인
3. GitHub repository variable `PRODUCT_API_URL` 생성
4. 필요하면 GitHub repository variable `AVAILABLE_PROVIDERS` 생성
5. GitHub Pages source를 GitHub Actions로 설정

## 7. 지금 문서가 고정하지 않는 것
- 특정 클라우드 벤더 선택
- IaC 도구 선택
- Docker 사용 여부
- 장기 관측 스택의 최종 도입 시점

현재 결론:
- 데모 단계에서는 GitHub Pages + browser Gemini mode가 가장 비용이 낮다
- server-backed 운영 단계에서는 정적 프론트 + Node 서버 분리가 가장 안전하다
- 관측 이벤트 수집은 이후 별도 endpoint로 얇게 붙이는 편이 맞다
