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
| `GET /me` | Bearer | | `{user, plan, usage, limits, features}` (아래 "/me 모양") |
| `POST /auth/signout` | Bearer | | `{ok}` |
| `POST /account/delete` | Bearer | | `{deleted:true}` |
| `POST /ai/gemini/{model}:generateContent` | Bearer + `x-kata-kind` (+ 긴 읽기는 `x-kata-unit`) | Gemini 요청 본문 | Gemini 응답 그대로 / 429 `QUOTA_<KIND>` `{kind, period, limit, plan}` / 403 `PLUS_REQUIRED` `{kind, plan}` |
| `POST /billing/verify` | Bearer | `{productId, purchaseToken}` | `{valid, plan}` |
| `POST /report` | Bearer | `{feature, input, output, reason}` | `{ok}` |
| `GET /admin/reports` | `x-admin-key` | `?limit=` `&cursor=`(앞 응답의 `nextCursor`) | `{items, nextCursor}` |
| `POST /admin/special` | `x-admin-key` | `{email \| uid, action:"grant"\|"revoke", tier?:"special"\|"admin"\|"review", until?:ms(0=무기한), note?}` | `{ok, uid, pending, plan}` |
| `GET /admin/special` | `x-admin-key` | `?email=` 또는 `?uid=` | `{uid, pending, plan}` |
| `POST /admin/delete` | `x-admin-key` | `{email \| uid}` — 앱을 쓸 수 없는 사람의 삭제 요청(이메일 문의)을 대신 처리 | `{deleted, uid, hadSubscription}` / 404 `USER_NOT_FOUND` |

`plan` = `{tier, until, trial?, productId?, autoRenew?}` — `tier` 는 `free`·`trial`·`plus`·`review`·`special`·`admin`. 체험이면 `trial: true`.
`autoRenew` 는 Play 구독(`trial`·`plus`)에만 있고, 사용자가 Play 에서 해지를 예약했으면 `false` 입니다(앱이 "자동 갱신" 대신 "…까지 이용"으로 보여 줌).

**심사용 등급 `review` (2026-11-14)**: Play 심사자에게 주는 등급입니다. 한도·기능이 `plus` 와 똑같고(`getLimits` 가 plus 표를 그대로 씀),
staff 전용 화면(신앙 메뉴·관리자 화면)은 열지 않습니다. `special`·`admin` 과 같은 길(`/admin/special`, `ent.staff`)로 주고 거둡니다.
앱은 `review` 를 Plus 로 다루고(`plan.ts` `getTier`), 내 정보·구독 화면에 "심사용 계정"이라고만 표시합니다(`isReviewAccount`).

**AI 일시 중지 `AI_PAUSED` (2026-11-14)**: Worker 변수. `all` 이면 모든 등급, `free` 면 무료 등급의 `/ai/*` 요청에 503 `SERVICE_PAUSED` 를 줍니다
(한도를 잡기 전에 거절하므로 횟수는 깎이지 않음). 비우면 평소대로.

**전체 하루 상한 `AI_DAILY_BUDGET` (2026-11-14, S-21)**: Worker 변수. 하루(한국 날짜)에 AI 쪽으로 나가는 호출 수의 상한 — `5000` 또는 `{"all":5000,"tts":2000}`(`text` 도 가능).
세는 단위는 실제로 나간 호출(재시도·긴 읽기의 조각도 한 번씩)이고, AI 쪽이 오류로 답한 호출은 돌려줍니다. 닿으면 무료·체험·Plus·심사용에 503 `SERVICE_PAUSED {reason:"budget"}`
(계정 칸은 돌려줌), Special·관리자는 막지 않습니다. 비우면 상한 없음, 잘못 적으면 0 으로 보고 막습니다. `GET /admin/budget` 으로 서버가 읽은 값과 오늘 나간 수를 봅니다.
`SERVICE_PAUSED` 응답에는 머리글 `x-kata-paused: 1` 이 붙고, 앱(`aiProxy.ts` `publicProxyError`)은 이것을 보고 다른 모델로 다시 부르지 않고 "지금은 사용할 수 없습니다"로 끝냅니다.

**사용량 카운터 — Durable Object (2026-11-14, S-22)**: 바인딩 `USAGE_DO`(클래스 `UsageCounter`, SQLite 방식 — 무료 요금제 가능)가 있으면 사용량을 KV 대신 거기에 셉니다.
계정마다 객체 하나(`u:<uid>`)가 요청을 한 줄로 처리해 동시 요청에도 정확하고, 전체 하루 상한은 객체 `budget` 하나가 셉니다. 저장 키·모양은 아래 KV 표의 `use:`·`usem:`·`uset:` 와 같고(전체 칸은 `budget:<날짜>`),
수명이 없는 저장소라 날짜가 바뀔 때와 하루 한 번 알람으로 지난 칸을 지웁니다(3일·다음 달 10일·400일). 계정 삭제 때 객체를 비웁니다.
바인딩이 없거나 객체 호출이 실패하면 그 요청은 KV 방식으로 처리합니다. 어느 쪽이든 **칸을 적지 못하면 AI 를 부르지 않습니다**(503 `SERVICE_PAUSED {reason:"store"}`).
세는 규칙은 한 벌(`reserveCore`·`refundCore`·`budgetTakeCore`)이고 저장소만 갈아 끼웁니다. 신고의 하루 상한도 같은 카운터로 셉니다.

**신고 알림 — 텔레그램 (2026-11-14, P-19)**: 비밀값 `TELEGRAM_BOT_TOKEN`·`TELEGRAM_CHAT_ID` 가 둘 다 있으면 새 신고를 알립니다(기능·시각·글 앞부분 30자, 계정 정보 없음, 이메일·긴 숫자 모양은 가림).
한 번 알리면 한 시간 동안은 세기만 하고(KV `tg:reports`), 그 뒤 첫 신고 또는 Cron(`scheduled`, 매시간)이 묶어서 알립니다. 알림 실패는 신고 저장·응답에 영향을 주지 않습니다. 하루 상한에 닿았을 때도 하루 한 번 알립니다.

### 기능별 한도 (S41, 2026-11-11 — 정본: 결정 문서 "무료와 Plus", 사본: `08-polish-stories.md`)

앱이 `x-kata-kind` 에 기능 이름을 적어 보내고, 서버가 그 이름별로 **한국 날짜(하루)·한국 달(한 달)** 을 셉니다.

| `x-kata-kind` | 무엇 | 무료 | Plus 하루/한 달 | 체험 | Special·관리자 |
|---|---|---|---|---|---|
| `story` | 이야기 불러오기 | 하루 1 | 5 / 60 | 2 / — | 제한 없음 |
| `percakapan-make` | 회화집 만들기 | 잠김 | 3 / 30 | 1 / 15 | 제한 없음 |
| `longread` | 내가 만든 이야기·회화 듣기 | 잠김 | 5 / 50 | 2 / 25, 체험 합계 15 | 제한 없음 |
| `dict-new` | 사전에서 처음 찾는 말(숨김) | 하루 50 | 50 / 400 | 50 / — | 제한 없음 |
| `phrase` | 오늘의 문장 새로 | 하루 1 | 제한 없음(안전 상한 50) | Plus 와 같음 | 제한 없음 |
| `word-audio` | 단어·예문 발음 (글 600자까지) | 하루 100·한 달 1,500(숨김) | 안 셈(안전 상한 1,000) | Plus 와 같음 | 제한 없음 |
| `shared-audio` | 기본 회화집·문장 하나·지도·이해 읽기 | 잠김 | 안 셈(안전 상한 400) | Plus 와 같음 | 제한 없음 |
| `text` | 그 밖의 짧은 풀이(단어 탭·단어 채우기·지도·이해 설명·문장 해설) | 하루 200(숨김) | 1,000(숨김) | Plus 와 같음 | 제한 없음 |
| `tts` | 예전 이름(음성 전반) — 공개판에서는 관리자·Special 화면(묵상·기도·설교)만 씀 | **잠김**(2026-11-14 S-20 — 잠긴 음성 기능의 뒷문이 되지 않게) | 400 | Plus 와 같음 | 제한 없음 |

- 체험 = Plus 의 절반(내림, 최소 1). 단 무료보다 박해지지 않게 무료 값으로 올림(사전 50, 무료에 한 달 상한이 없는 기능은 체험도 없음).
- 체험 긴 읽기 합계 15 는 지금 하루 2 × 7일 = 14 라 실제로는 걸리지 않습니다(표대로 넣어 둠).
- **실패한 호출은 세지 않습니다(2026-11-14 C-02).** 응답이 오류이거나, 200 이어도 글·소리가 비어 있으면 잡아 둔 칸을 돌려줍니다.
- **한 번의 누름 = 한 번.** 앱은 글 요청마다 `x-kata-req`(영문·숫자 8~40자)를 붙이고, 재시도·모델 바꿈은 같은 번호로 보냅니다. 서버는 같은 번호 + 같은 요청 내용(본문 해시) + 처음 온 지 5분 안 + 9번까지를 같은 누름으로 보고 한 번만 셉니다(하루 기록 `reqs` 에 최근 40개).
- **긴 읽기는 한 편 = 한 번.** 이야기는 문단마다 따로 부르므로, 앱이 `x-kata-unit`(재생 캐시 키)을 붙이면 그날 첫 조각만 셉니다. 같은 편은 하루 24조각까지.
- 숨김(`hidden`) 상한은 남은 횟수로 보여 주지 않습니다. "안 셈"인 기능에도 안전 상한을 둔 이유: 기능 이름은 앱이 스스로 밝히는 값이라 서버가 내용을 확인할 수 없습니다.
- 앱 쪽 이름 정하기: `geminiText`(호출마다 `kind` 선택 매개변수) · `tts.ts` `ttsKindForKey`(재생 키 `say:`→`word-audio`, `story-`→`longread`) · `percakapanAudio`(`scene.custom`→`longread`, 그 밖→`shared-audio`). 회원판 Worker 로 갈 때는 예전 이름(`text`·`tts`·`news`)으로 바꿔 보냅니다.

### /me 모양

```
usage:  {day:"YYYY-MM-DD", month:"YYYY-MM", text, tts, report}   ← 예전 칸(하루 수) 그대로
limits: {text, tts, report}                                       ← 예전 칸(하루 상한, 제한 없으면 null)
features: { <kind>: { locked, hidden,
                      used:  {day, month, total?},
                      limit: {day|null, month|null, total?},
                      left:  {day|null, month|null, total?} } }   ← null = 제한 없음, total 은 체험만
```

### 체험 판정 (best-effort)

Play `subscriptionsv2` 의 `lineItems[].offerPhase.freeTrial` 이 있으면 체험. `offerPhase` 칸이 없는 응답이면
제안 ID·태그에 `trial` 이 들어 있고 `startTime` 에서 8일이 안 됐을 때만 체험으로 봅니다(체험 뒤에도 offerId 는 남으므로).
Play 콘솔에서 체험 제안 ID 에 `trial` 을 넣어 두면(예: `trial-7d`) 대비책도 맞습니다.
실제로 만든 제안 ID 는 `trial-7d-monthly`·`trial-7d-yearly` 입니다(2026-11-14, `DECISIONS.md` 16장) — 둘 다 `trial` 이 들어 있어 대비책에 맞습니다.

**체험 기록 `trial:<uid>` (2026-11-14)**: 체험으로 판정된 구매 토큰의 해시를 계정별로 적어 둡니다(`{first, firstToken, tokens[], last}`, 400일).
한 계정에서 체험 토큰이 둘 이상이면 `ent.trialRepeat` 에 그 수를 남깁니다 — 지금은 **기록만** 하고 막지는 않습니다
("체험은 계정마다 한 번"은 Play 의 제안 자격 설정에 맡김. 반복이 실제로 보이면 그때 서버에서 막을 근거가 됩니다).
Play 응답에 계정 표식(`obfuscatedExternalAccountId`)이 없는 구매는 `ent.unbound = true` 로 표시합니다(앱 밖에서 산 구매를 가려내는 용도, 기록만).

### 구독 상태를 Play 에 다시 묻는 때 (2026-11-14, 출시 전 점검 B-01·B-02·B-04)

실시간 개발자 알림(RTDN)을 쓰지 않으므로, 서버가 요청을 처리할 때(`getPlan`) 필요하면 Play 에 다시 묻습니다.

| 지금 상태 | 다시 묻는 때 | Play 의 답에 따라 |
|---|---|---|
| 이용 중(만료 전) | 마지막 답에서 **24시간**이 지난 뒤 첫 요청 | 환불·권한 회수·보류면 **바로 무료**. 갱신됐으면 새 만료 시각 |
| 이용 중인데 확인(acknowledge)이 안 됨 | **10분**에 한 번까지 | 확인되면 표시(`ackPending`)와 `ackfail:` 기록을 지움 |
| 만료 시각이 지남 | 만료 뒤 첫 요청에서 바로 | 갱신됐으면 이용 중, 아니면 무료로 적음(구매 토큰은 남김) |
| 무료로 내려감(구매 토큰 있음) | 내려간 뒤 **30일** 동안 **한 시간**에 한 번까지 | 구독이 살아나 있으면(갱신 반영 지연·결제 수단 고침) 다시 이용 중 |

- **Play 가 잠깐 안 될 때**(5xx·통신 오류·인증 오류): 지금 등급을 그대로 두고 한 시간 뒤 다시 묻습니다. 만료 시각이 지난 채로 답을 못 받으면 하루까지만 유지합니다.
- **Play 가 "그런 구매 없음"**(4xx)이라고 답하면 무료로 적습니다.
- 유효한 구매는 **권한(`ent`)을 먼저 저장**하고 확인(acknowledge)은 그 뒤에 합니다. 확인이 실패해도 Plus 는 열리고, 사흘 안에 다시 확인합니다(못 하면 Google 이 환불).
- 끝난 옛 구매(만료·환불된 토큰)를 검증해도, 지금 이용 중인 다른 구매를 무료로 덮어쓰지 않습니다.
- 앱은 화면이 다시 보일 때(최소 10분 간격) `/me` 로 등급을 새로 받고, 결제가 끝났는데 검증이 실패한 구매는 "확인 중"으로 두고 성공할 때까지 다시 검증합니다(`src/lib/billing.ts`).

### Special Member·심사용 계정 정하기 (회원키 없이, 임시)

심사용 계정은 아래 명령의 본문에 `"tier":"review"` 를 더합니다(`05-arga-checklist.md` 7절).

```
curl -X POST https://kata-public.cura4world.workers.dev/admin/special \
  -H "x-admin-key: <ADMIN_KEY>" -H "content-type: application/json" \
  -d '{"email":"someone@gmail.com","action":"grant"}'
```
- 아직 로그인한 적 없는 이메일이면 "미리 준 등급"(`pending:true`)으로 두었다가 첫 로그인 때 붙습니다.
- 이 기능 전에 로그인한 사람은 이메일 찾기표가 없으므로 한 번 다시 로그인하거나 `uid`(`g_`+Google sub)로 줍니다.
- 거두기 `{"email":…, "action":"revoke"}` — 관리자가 준 등급만 지우고 Play 구독은 그대로.
- Play 검증이 `ent:` 를 다시 써도 관리자가 준 등급(`ent.staff`)은 남습니다. 계정을 지우면 함께 지워집니다.

### 남용 방지 (AI 대리 호출)

- 허용 모델만: 텍스트 `gemini-3.1-flash-lite`·`3.5-flash-lite`·`2.5-flash-lite`, 음성 `gemini-3.8-flash-lite-tts`·`3.1-flash-tts-preview`
- 위 표에 없는 `x-kata-kind`(예: `news`)면 거절. 요청 본문에 `tools`가 있으면 거절 (검색 그라운딩 차단)
- 본문 최대 32KB, 텍스트 `maxOutputTokens` 상한 16,384, 글자 수는 기능별(텍스트 12,000 · 음성 6,000 · 단어 발음 600)
- 부르기 전에 한 칸 잡고(하루·한 달·체험 합계), 실패하면 돌려줌 — 성공한 호출만 남음

### KV 구조 (`PUBLIC_KV`)

| 키 | 값 | 수명 |
|---|---|---|
| `user:<uid>` | `{uid, email, name, picture, createdAt}` | 계정 삭제까지 |
| `sess:<sha256(token)>` | `{uid, exp}` | 60일 |
| `usess:<uid>` | 세션 해시 목록 (삭제용) | 계정 삭제까지 |
| `use:<uid>:<YYYY-MM-DD>` | 하루 사용량 `{<kind>: n, report, units:{longread:{<unit>: 조각 수}}}` | 3일 |
| `usem:<uid>:<YYYY-MM>` | 한 달 사용량 `{<kind>: n}` | 40일 |
| `uset:<uid>` | 체험 기간 합계 `{longread: n}` | 400일 |
| `ent:<uid>` | `{tier(free·trial·plus·review·special·admin), productId, purchaseToken, tokenHash, until, trial, state, checkedAt, triedAt?, freeSince?, ackPending?, unbound?, trialRepeat?, staff?}` — `staff = {tier, until, note, at}` 는 관리자가 준 등급(special·admin·review). `checkedAt` Play 가 마지막으로 답한 시각 · `triedAt` 물었지만 답을 못 받은 시각 · `freeSince` 무료로 내려간 시각 · `ackPending` 확인(acknowledge)이 아직 안 됨 | 계정 삭제까지 |
| `ackfail:<sha256(purchaseToken)>` | 구매 확인(acknowledge) 실패 기록 `{uid, status, first, last, count}` — 확인되면 지움. 403 이 이어지면 서비스 계정의 "주문 및 구독 관리" 권한 누락 | 7일 |
| `email:<sha256(소문자 이메일)>` | `uid` (관리자가 이메일로 등급을 줄 때 찾기표, 로그인 때 씀) | 계정 삭제까지 |
| `spec:<sha256(소문자 이메일)>` | 로그인 전에 미리 준 등급 `{tier, until, note, at}` — 첫 로그인 때 `ent.staff` 로 옮김 | 붙거나 거둘 때까지, 길어도 400일 |
| `ptok:<sha256(purchaseToken)>` | `uid` (한 구매를 여러 계정이 나눠 쓰지 못하게) | 400일 |
| `trial:<uid>` | 체험 기록 `{first, firstToken, tokens[], last}` (위 "체험 기록") | 400일 (계정 삭제 시 지움) |
| `report:<ts>-<rand>` | 신고 내용 (계정 삭제 시 uid 지움 — 이때 보관 기간을 새로 시작하지 않고 남은 기간만 둠) | 접수부터 180일 |
| `ureports:<uid>` | 내 신고 키 목록 (삭제용, 최근 5,000건) | 180일 |

`uid` = `g_` + Google `sub`. `obfuscatedAccountId` = `sha256(uid)`의 앞 64자.

### Worker 비밀값·설정

| 이름 | 종류 | 내용 |
|---|---|---|
| `GOOGLE_WEB_CLIENT_ID` | 변수 | 웹 OAuth 클라이언트 ID (ID 토큰의 `aud`) |
| `AI_PROXY_URL` | 비밀 | 기존 Cloud Run 주소 (kata-sermon과 같은 값) |
| `PROXY_SECRET` | 비밀 | 기존 Cloud Run 비밀 (같은 값) |
| `PLAY_PACKAGE` | 변수 | `app.naruve.katakata` |
| `PLAY_SERVICE_ACCOUNT` | 비밀 | Play Developer API 서비스 계정 JSON |
| `ADMIN_KEY` | 비밀 | 신고 조회·등급 주기·계정 삭제 대행(`/admin/*`) |
| `AI_PAUSED` | 변수 (선택, 평소에는 없음) | `all` / `free` — AI 요청 비상 중지(위 "AI 일시 중지") |
| `AI_DAILY_BUDGET` | 변수 (선택, 권장) | 전체 하루 호출 수 상한(위 "전체 하루 상한"). 비우면 없음 |
| `USAGE_DO` | Durable Object 바인딩 (선택, 권장) | 사용량 카운터 `UsageCounter`. `wrangler deploy` 로만 만들어짐. 없으면 KV 로 셈 |
| `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` | 비밀 (선택) | 신고·하루 상한 알림. 둘 다 있을 때만 보냄 |
| `LIMITS_JSON` | 변수 (선택) | 한도 덮어쓰기 — 적은 칸만 바뀜. `{"plus":{"story":{"day":6,"month":70}},"trial":{"longread":{"total":20}},"free":{"tts":0}}` (숫자 하나 = 하루 상한, `null` = 그 기간 제한 없음, `"locked":true` = 잠금). 예전 모양 `{"free":{"text":200}}` 도 그대로 받음 |

## 왜 이렇게 했나

- **같은 웹 앱 + 네이티브 표시**: 앱을 두 벌로 나누면 고칠 때마다 두 번 해야 한다. 판 구분은 이미 `access.ts`에 있으니 한 줄 더 얹었다.
- **원격 로드 유지**: 스토어 심사 없이 웹 수정이 바로 반영된다. 대신 네이티브 통로를 바꾸면 스토어 업데이트가 필요하다.
- **새 Worker**: 회원키 체계·설교 데이터와 공개 사용자를 완전히 떼어 둔다. 한쪽 사고가 다른 쪽으로 번지지 않는다.
- **`AndroidTTS` 가짜 객체**: 짧은 발음 듣기가 화면 20곳에 흩어져 있다. 각 화면을 고치는 대신, 스토어 앱에서만 같은 이름의 객체를 Gemini 음성으로 채워 넣는다. `tts.ts`는 한 줄도 바꾸지 않는다.
- **구매를 계정에 묶기**: `obfuscatedAccountId`를 넣어 구매하고, 서버가 검증할 때 같은지 본다. 한 구매를 다른 계정에 붙이지 못한다.
- **edge-to-edge 직접 처리**: targetSdk 35부터 화면이 상단바 뒤까지 그려진다. 웹뷰에 시스템 바 여백을 네이티브에서 준다.
- **예측형 뒤로가기**: targetSdk 36에서는 `onBackPressed`가 불리지 않는다. `OnBackPressedDispatcher`로 처리한다.
