# 03. 아키텍처 — Kata kata 공개판

작성: 2026-11-10 · 단계: BMAD 3 (Architect) · 바탕: `02-prd.md`

## 큰 그림

```
┌──────────── 스토어 앱 (app.naruve.katakata, AAB) ────────────┐
│ 네이티브(MainActivity)                                         │
│   KataStore   — "나는 스토어 앱" 표시, 버전                     │
│   KataAuth    — Credential Manager로 Google ID 토큰 받기          │
│   KataBilling — Play Billing 8 (상품 조회·구매·복원·관리)        │
│   AndroidFile — MediaStore 다운로드 폴더에 저장                   │
│   (AndroidTTS 없음 — 폰 내장 음성 미사용)                         │
│ 웹뷰 → https://cura4world.github.io/idkr-buddy/  (기존과 같은 웹) │
└──────────────────────────────────────────────────────────────┘
          │ Bearer 세션                                ▲
          ▼                                            │
┌──── Cloudflare Worker: kata-public (새로 만듦) ─────┐  │
│ /auth/google  ID 토큰 검증 → 세션                     │  │
│ /me /auth/signout /account/delete                    │  │
│ /ai/gemini/:model:generateContent  한도 + 허용 모델    │──┼─▶ Cloud Run kata-ai (서울) ─▶ Gemini
│ /billing/verify  Play Developer API 검증·acknowledge  │──┼─▶ androidpublisher.googleapis.com
│ /report  AI 신고          /admin/reports  관리자 조회   │  │
│ KV: PUBLIC_KV                                         │  │
└──────────────────────────────────────────────────────┘  │
```

- **웹 앱은 하나다.** 관리자판·회원판 APK와 스토어 앱이 모두 같은 GitHub Pages 주소를 연다. 스토어 앱인지는 네이티브가 넣어 준 `window.KataStore`가 있는지로만 판단한다 (`src/lib/platform.ts`).
- **기존 Worker(`kata-sermon`)는 건드리지 않는다.** 공개판 사용자의 데이터·사용량은 새 Worker와 새 KV에만 쌓인다. 회원키 체계와 섞이지 않는다.
- **Gemini 키는 Cloud Run에만 있다** (기존 결정: Worker → Gemini 직접 호출은 지역 판정으로 거절됨). 새 Worker도 기존 Cloud Run 중계를 같은 방식(`x-kata-proxy`, `x-kata-model` 헤더)으로 부른다.

## 웹 쪽 연결 지점 (기존 코드에 붙이는 곳)

| 파일 | 하는 일 |
|---|---|
| `src/lib/platform.ts` (신규) | `isStoreApp()` — `window.KataStore` 유무 |
| `src/lib/account.ts` (신규) | 세션 보관, 로그인(네이티브 통로 → `/auth/google`), `/me`, 로그아웃, 계정 삭제, `publicHeaders()` |
| `src/lib/access.ts` | `getEdition()` 맨 앞에서 스토어 앱이면 `"public"` |
| `src/lib/aiProxy.ts` | `geminiTarget()`에 세 번째 길: 내 키 없음 + 회원키 없음 + 공개판 세션 있음 → `kata-public` |
| `src/lib/storeTtsShim.ts` (신규) | 스토어 앱에서 `window.AndroidTTS`를 Gemini 음성으로 대신하는 가짜 객체 설치 |
| `src/components/LoginGate.tsx` (신규) | 스토어 앱 + 세션 없음 → 로그인 화면 |
| `src/components/PublicOnlyGuard.tsx` (신규) | 공개판에서 막힌 주소 → 홈 |
| `src/lib/billing.ts` (신규) + `src/pages/Plus.tsx` (신규) | 상품 조회·구매·복원 → `/billing/verify` |
| `src/lib/plusCopy.ts` (신규) | Plus 화면 문구·혜택 목록 한 곳 (재논의 대상) |
| `src/components/AiReportButton.tsx` (신규) | `/report` |

`aiProxy.ts` 한 곳만 바꾸면 사전·이야기·오늘의 문장·지도 설명·회화·음성이 모두 공개판 서버로 간다. 이 함수들(`geminiText.ts`, `tts.ts`, `percakapanAudio.ts`)은 모두 `geminiTarget()`을 거친다 (2026-11-10 확인).

## 네이티브 ↔ 웹 약속

스토어 앱에만 있다. 관리자판 APK에는 없다.

| 객체.메서드 | 결과 전달 |
|---|---|
| `KataStore.version()` → `"1.0.N"` | 동기 |
| `KataAuth.signIn(nonce)` | `window.__kataAuthResult({ok, idToken?, error?})` |
| `KataAuth.signOut()` | 없음 (기기의 자격 증명 상태만 지움) |
| `KataBilling.query(json["productId",...])` | `window.__kataBillingEvent({type:"products", products:[...]})` |
| `KataBilling.purchase(productId, offerToken, obfuscatedAccountId)` | `{type:"purchase", purchases:[...]}` / `{type:"canceled"}` / `{type:"error", code}` |
| `KataBilling.restore()` | `{type:"owned", purchases:[...]}` |
| `KataBilling.manage(productId)` | Play 구독 관리 화면 열기 |
| `AndroidFile.save(name, mime, base64)` → `"OK"` / `"FAIL"` | 동기 |

`products[]` 원소: `{productId, basePlanId, offerId, offerToken, formattedPrice, billingPeriod, freeTrialPeriod}`
`purchases[]` 원소: `{productId, purchaseToken, orderId, acknowledged, state}`

## 서버 약속 (`kata-public` Worker)

모든 응답은 JSON. 오류는 `{error:"CODE"}`. 앱 주소(`https://cura4world.github.io`)에 CORS 허용.

| 경로 | 인증 | 요청 | 응답 |
|---|---|---|---|
| `POST /auth/google` | 없음 | `{idToken, nonce?}` | `{token, user, plan}` |
| `GET /me` | Bearer | | `{user, plan, usage, limits}` |
| `POST /auth/signout` | Bearer | | `{ok}` |
| `POST /account/delete` | Bearer | | `{deleted:true}` |
| `POST /ai/gemini/{model}:generateContent` | Bearer + `x-kata-kind` | Gemini 요청 본문 | Gemini 응답 그대로 / 429 `QUOTA_TEXT·QUOTA_TTS` |
| `POST /billing/verify` | Bearer | `{productId, purchaseToken}` | `{plan}` |
| `POST /report` | Bearer | `{feature, input, output, reason}` | `{ok}` |
| `GET /admin/reports` | `x-admin-key` | `?limit=` | `{items}` |

### 남용 방지 (AI 대리 호출)

- 허용 모델만: 텍스트 `gemini-3.1-flash-lite`·`3.5-flash-lite`·`2.5-flash-lite`, 음성 `gemini-3.8-flash-lite-tts`·`3.1-flash-tts-preview`
- `x-kata-kind`가 `news`면 거절 (공개판에 뉴스 없음). 요청 본문에 `tools`가 있으면 거절 (검색 그라운딩 차단)
- 본문 최대 32KB, 텍스트 `maxOutputTokens` 상한 16,384
- 한도는 계정 × 한국 날짜 × 종류. 성공한 호출만 센다

### KV 구조 (`PUBLIC_KV`)

| 키 | 값 | 수명 |
|---|---|---|
| `user:<uid>` | `{uid, email, name, picture, createdAt}` | 계정 삭제까지 |
| `sess:<sha256(token)>` | `{uid, exp}` | 60일 |
| `usess:<uid>` | 세션 해시 목록 (삭제용) | 계정 삭제까지 |
| `use:<uid>:<YYYY-MM-DD>` | `{text, tts}` | 3일 |
| `ent:<uid>` | `{tier, productId, tokenHash, until, checkedAt}` | 계정 삭제까지 |
| `ptok:<sha256(purchaseToken)>` | `uid` (한 구매를 여러 계정이 나눠 쓰지 못하게) | 400일 |
| `report:<ts>-<rand>` | 신고 내용 (계정 삭제 시 uid 지움) | 180일 |
| `ureports:<uid>` | 내 신고 키 목록 (삭제용) | 180일 |

`uid` = `g_` + Google `sub`. `obfuscatedAccountId` = `sha256(uid)`의 앞 64자.

### Worker 비밀값·설정

| 이름 | 종류 | 내용 |
|---|---|---|
| `GOOGLE_WEB_CLIENT_ID` | 변수 | 웹 OAuth 클라이언트 ID (ID 토큰의 `aud`) |
| `AI_PROXY_URL` | 비밀 | 기존 Cloud Run 주소 (kata-sermon과 같은 값) |
| `PROXY_SECRET` | 비밀 | 기존 Cloud Run 비밀 (같은 값) |
| `PLAY_PACKAGE` | 변수 | `app.naruve.katakata` |
| `PLAY_SERVICE_ACCOUNT` | 비밀 | Play Developer API 서비스 계정 JSON |
| `ADMIN_KEY` | 비밀 | 신고 조회용 |
| `LIMITS_JSON` | 변수 (선택) | 한도 덮어쓰기 `{"free":{"text":200,"tts":30},"plus":{...}}` |

## 왜 이렇게 했나

- **같은 웹 앱 + 네이티브 표시**: 앱을 두 벌로 나누면 고칠 때마다 두 번 해야 한다. 판 구분은 이미 `access.ts`에 있으니 한 줄 더 얹었다.
- **원격 로드 유지**: 스토어 심사 없이 웹 수정이 바로 반영된다. 대신 네이티브 통로를 바꾸면 스토어 업데이트가 필요하다.
- **새 Worker**: 회원키 체계·설교 데이터와 공개 사용자를 완전히 떼어 둔다. 한쪽 사고가 다른 쪽으로 번지지 않는다.
- **`AndroidTTS` 가짜 객체**: 짧은 발음 듣기가 화면 20곳에 흩어져 있다. 각 화면을 고치는 대신, 스토어 앱에서만 같은 이름의 객체를 Gemini 음성으로 채워 넣는다. `tts.ts`는 한 줄도 바꾸지 않는다.
- **구매를 계정에 묶기**: `obfuscatedAccountId`를 넣어 구매하고, 서버가 검증할 때 같은지 본다. 한 구매를 다른 계정에 붙이지 못한다.
- **edge-to-edge 직접 처리**: targetSdk 35부터 화면이 상단바 뒤까지 그려진다. 웹뷰에 시스템 바 여백을 네이티브에서 준다.
- **예측형 뒤로가기**: targetSdk 36에서는 `onBackPressed`가 불리지 않는다. `OnBackPressedDispatcher`로 처리한다.
