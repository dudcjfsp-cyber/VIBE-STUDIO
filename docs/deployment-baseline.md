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

## 1.5 임시 GitHub Actions 배포
지금 당장 바로 열어보는 임시 배포는 아래 기준으로 둔다.

- GitHub Actions가 `main` 기준으로 `apps/product-web`를 GitHub Pages에 자동 배포한다
- 이 배포는 `VITE_PRODUCT_ENGINE_MODE=local`로 빌드한다
- 이 배포는 `VITE_AVAILABLE_PROVIDERS=local`로 빌드해 remote provider 선택지를 숨긴다
- 따라서 이 배포는 제품 프론트 데모/검증용 기준면이며, `product-server`가 필요한 실제 remote runtime 배포를 대체하지 않는다

Rule:
- GitHub Pages 임시 배포를 실제 remote-provider 운영 배포와 같은 것으로 오해하지 않는다
- 임시 공개 링크는 create / review / clarify / approval 흐름 데모에 우선 사용한다

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
- `VITE_PRODUCT_BASE_PATH`
  - 기본값: `/`
  - GitHub Pages 같은 서브패스 배포 시 base path를 맞춘다
- `VITE_AVAILABLE_PROVIDERS`
  - 기본값: `local,openai,anthropic,gemini`
  - 쉼표 구분 provider allowlist
  - GitHub Pages 임시 배포에서는 `local`만 사용한다

Rule:
- 실제 제품 배포에서는 `VITE_PRODUCT_API_URL`을 명시한다
- production에서 로컬 기본값 `http://127.0.0.1:4177/api`에 기대지 않는다

## 6. 현재 운영 전 체크리스트
배포 전 최소 확인:

1. `npm run verify:deploy` 통과
2. `product-server` health endpoint 확인
3. `VITE_PRODUCT_API_URL`이 실제 서버 주소를 가리키는지 확인
4. `VIBE_ALLOWED_ORIGINS`를 실제 프론트 도메인으로 제한
5. 브라우저에서 create, clarify, approval, review 흐름 수동 점검

## 7. 지금 문서가 고정하지 않는 것
- 특정 클라우드 벤더 선택
- IaC 도구 선택
- Docker 사용 여부
- 장기 관측 스택의 최종 도입 시점

현재 결론:
- 지금 단계에서는 정적 프론트 + Node 서버 분리가 가장 안전하다
- 관측 이벤트 수집은 이후 별도 endpoint로 얇게 붙이는 편이 맞다
