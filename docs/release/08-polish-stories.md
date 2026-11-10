# 08. 다듬기 스토리 — 공개판 화면 시안 반영 (2026-11-10 밤)

작성: 2026-11-10 · 단계: BMAD 4 (SM) · 바탕: Claude Docs "Kata kata 출시 결정 정리"(정본),
Claude Design 캔버스 시안(사본: 저장소 밖 `/home/claude/design-boards/` — `INDEX.md`, `png/<이름>.png`, `<이름>.dc.html`)

**목표:** 아침에 사용자가 폰에서 "출시 직전 마지막 검사"를 할 수 있는 **완성품 바로 앞 단계**.
나눠 내지 않는다 — 시안으로 정한 것은 모두 넣는다. 사용자가 폰에서 꼼꼼히 볼 것이므로
"대충 비슷하게"가 아니라 시안의 글자·간격·색·문구를 그대로 맞춘다.

상태: ✅ 완료 · 🟡 부분 · ⬜ 아직 · 🔍 사용자 검토 대기(내용물)

## 공통 규칙 (모든 스토리)

- `CLAUDE.md` 전체를 따른다. 특히: 편집은 Edit/Write 도구로만, 정규식 리터럴 금지(`new RegExp`),
  `PlayButton.tsx` 수정 금지, `tts.ts` 사용법 변경 금지(추가만), `git add -A` 금지, seed.json 커밋 금지,
  fetch 에 AbortController 타임아웃, setState 여러 개 + navigate 동시 호출 금지.
- 작업 브랜치는 `release/public` 에서 갈라진다. **`main` 은 건드리지 않는다.**
- 공개판 판단은 `isStoreApp()` 하나로 한다(관리자판·회원판 화면은 바뀌지 않게). 공개판 화면 변경이
  관리자판에도 보기 좋으면 같이 바꿔도 되지만, 관리자판 기능(성경·설교·묵상·기도·뉴스)은 없애지 않는다.
- 말투: 설명은 "~하세요 / ~해 보세요", 안내는 "~입니다", 버튼·짧은 상태는 명사형. **"~해요" 금지.**
- 헤더: 뒤로가기 + 인니어 대문자 제목(`CLAUDE.md` 화면 헤더 규칙). 소제목 14px 굵게.
- 색: 차분하게. Plus 관련(잠금 상자·체험 버튼·구독 화면)은 귤색 상자 `#FFF6DC`/테두리 `#F1E0AE`/글자 `#6E5612`,
  버튼 황금갈색 `#8A6A12`. 스피커·주 버튼은 청록 `#2C6D63`/연청록 바탕 `#E3EEEC`.
- 검증: 바꾼 파일마다 esbuild, 그리고 `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`. 서버는 `node workers/kata-public/test.mjs`.
- 커밋: 파일별(또는 아주 작은 묶음), 한국어 "영역: 무엇을". 끝에 공동 작성자 줄.

## 등급 API (모든 화면이 이것만 쓴다) — S40 이 만든다

`src/lib/plan.ts`
```ts
export type Tier = "free" | "trial" | "plus" | "special" | "admin";
export function getTier(): Tier;            // 스토어 앱이 아니면 "admin"(관리자판·회원판은 지금처럼 모두 열림)
export function hasPlus(): boolean;          // trial·plus·special·admin
export function isStaffTier(): boolean;      // special·admin (성경과 신앙 단어장, 교회와 신앙 회화집, 선교 역사 핀)
export function usePlan(): { tier: Tier; plus: boolean; staff: boolean }; // 등급이 바뀌면 다시 그림
export const PAYWALL_PATH = "/plus";        // 잠긴 메뉴를 누르면 여기로
```

## 스토리

| # | 스토리 | 상태 | 받아들임 조건 |
|---|---|---|---|
| S40 | **미리보기 APK + 등급 전환** | ⬜ | 아래 "S40 상세" |
| S41 | 한도 확정 반영 (서버) | ✅ | 무료·Plus·체험·Special 한도가 결정 문서 표와 같음(아래). 하루·한 달 둘 다. 테스트 추가·통과 — 서버 배포는 아직(Cloudflare 에 붙여 넣기 필요) |
| S42 | 구독 화면 (PW1·PW2) + `plusCopy.ts` | ✅ | 문구·혜택 5줄·요금제 2칸·버튼·안내 시안 그대로. 가격은 Play 값, 없으면(미리보기) 고정 표시 — 폰 확인 🔍 |
| S43 | 단어장 재분류·검토·새 5권 | 🔍 | 01~34 공개, 35~41 성경과 신앙. 34권 합계 3,000단어 안팎. 보관함 ID 이전. WORDLIST-PLAN 갱신 |
| S44 | 회화집 채우기 + 난이도 하 | 🔍 | 공개 14개 폴더 86장면, 교회와 신앙은 staff 만. `PercakapanLevel` 에 "하" 추가, 만들기 기본 "중" |
| S45 | 홈 (H5·H6) + 하단 탭 | ⬜ | 시안 그대로. 무료는 잠긴 메뉴 눌러 구독 화면 |
| S46 | 내 정보 (ME1·ME2·ME3) | ⬜ | 등급별 회원 구역, 학습 기록 그래프, 훈장 설명, 설정 목록 |
| S47 | 사전 결과 (D4) + 오늘의 문장 (P1) | ⬜ | 결정 문서의 확정안 그대로 |
| S48 | 내 단어장 (W1) · 단어장 폴더 (F1) · 단어장 안 (K1·K4) | ⬜ | 시안 그대로. 폴더는 묶음 바로가기 칩, 성경과 신앙은 staff 만 |
| S49 | 카드 (C1) · 퀴즈 (Q1·Q2) | ⬜ | 지금 배치, 차분한 색, "홈으로" → "단어장으로" |
| S50 | 단어장 예문 색연필 그림 | 🔍 | 단어마다 예문 장면 SVG, 단어장별 파일로 나눠 열 때만 불러옴. 단어와 스피커 사이 빈 공간 |
| S51 | 게임방 (G1·G2) + 게임 다듬기 + 새 게임 3개 | ⬜ | 7줄 목록(오늘의 단어 퍼즐 맨 위, 무료도 가능). 짝맞추기·단어장 퀴즈 뺌. 빠른 짝짓기·듣고 고르기·오늘의 단어 퍼즐 추가 |
| S52 | 이야기 (ST1~ST5) | ⬜ | 하/중/상 동그라미, "이야기 불러오기", 무료 하루 1편·듣기 잠금 상자 |
| S53 | 회화집 화면 (PC1~PC4) | ⬜ | 헤더 "+ 회화집 만들기" 알약, ⋮ 없음, 만들기 시트 하/중/상 가운데 정렬 46px |
| S54 | 인도네시아 이해 (IN1·IN2) + 지도 (MP1·MP2) | ⬜ | 지도 큰 카드, 생활 정보, PETA INDONESIA, 가로 보기 버튼, 시트 출처 문구 없음, 종교·역사 핀(공개판 고르게, 선교 10곳 staff) |
| S55 | 사진 출처 화면 (설정 > 앱 정보) | ⬜ | 지역별 작가·라이선스·원본 링크 목록. 지도 사진 고정 목록(겹침 없음) 🔍 |
| S56 | 말투·통일 규칙 전체 훑기 | ⬜ | 공개판에 보이는 모든 문구에서 "~해요" 0건(관리자 전용 화면 제외), 같은 기능 같은 모양 |
| S57 | 통합 QA (작업 안 본 검토자) | ⬜ | 스토리별 받아들임 조건 대조 표 + 미리보기 APK 화면 캡처 |

### S40 상세 — 미리보기 APK

사용자는 이 APK 를 폰에 따로 깔아 아침에 검사한다. 지금 두 분이 쓰는 앱과 **데이터가 섞이면 안 된다.**

- 새 워크플로 `.github/workflows/build-preview.yml` (`release/public` push 와 수동 실행). `build-store.yml` 을 바탕으로:
  - 웹을 `VITE_PREVIEW=1` 로 빌드해 `dist` 를 APK 의 assets 에 넣는다.
  - 패키지 `app.naruve.katakata.preview`, 앱 이름 "Kata kata 미리보기" (스토어 앱·관리자판과 나란히 설치).
  - MainActivity 는 `androidx.webkit.WebViewAssetLoader` 로 `https://appassets.androidplatform.net/idkr-buddy/...` 를
    assets 에서 연다(없는 경로는 `index.html` — SPA). 출처(origin)가 달라 localStorage·IndexedDB 가 지금 앱과 분리된다.
  - 스토어 앱과 같은 네이티브 통로(`KataStore`, `AndroidFile`, …)를 넣되, 로그인·결제는 콘솔 설정 전이라 미리보기에서는 쓰지 않는다.
  - 디버그 서명 APK 를 GitHub **프리릴리스**(`preview-최신`, 매번 덮어씀)에 올려 폰에서 링크로 받게 한다.
  - YAML 안 Java 에 큰따옴표 이스케이프 금지(CLAUDE.md).
- 웹 쪽 `src/lib/preview.ts`: `isPreview()` (빌드 변수). 미리보기에서는
  - 서비스워커 등록 안 함.
  - 로그인 화면을 건너뛴다.
  - 화면 오른쪽 아래 작은 알약 "미리보기 · Plus" → 누르면 시트: 등급 전환(무료 / 체험 중 / Plus / Special Member / 관리자),
    Gemini API 키 입력칸(AI 기능을 직접 호출로 확인), "체험 이미 사용" 켜기(구독 화면 PW2 확인용), 데이터 비우기.
  - `getTier()` 는 미리보기에서 이 전환값을 따른다.
  - AI 경로: 미리보기에서는 입력한 Gemini 키로 직접 호출(`geminiTarget()` 의 내 키 경로). 한도는 미리보기에서 화면에만 흉내(남은 횟수 표시 확인용).

### S41 한도 (결정 문서 "무료와 Plus" 표가 정본)

| 기능 (`x-kata-kind`) | 무료 | Plus 하루 / 한 달 | 체험(7일) | Special·관리자 |
|---|---|---|---|---|
| 이야기 불러오기 | 하루 1편 | 5 / 60 | Plus 의 절반 | 제한 없음 |
| 회화집 만들기 | 잠김 | 3 / 30 | 절반 | 제한 없음 |
| 긴 읽기(내가 만든 이야기·회화의 소리) | 잠김 | 5 / 50 | 절반(체험 기간 합쳐 15) | 제한 없음 |
| 사전 처음 찾는 단어(숨김) | 하루 50 | 50 / 400 | 절반 | 제한 없음 |
| 오늘의 문장 새로 | 하루 1 | 제한 없음 | 제한 없음 | 제한 없음 |
| 공용 소리(기본 회화집·지도·이해 읽기·단어 발음) | 단어 발음만 | 한도에 안 셈 | 안 셈 | 제한 없음 |

구독 취소 뒤: 내 단어장, 이미 만든 이야기·회화 글, 폰에 저장된 소리는 계속. 새로 만들기·처음 듣는 소리·Plus 기능은 잠김.

## 작업 기록

(각 스토리가 끝날 때 아래에 한 줄씩: 커밋 해시, 바꾼 파일, 검증 결과, 폰에서 볼 것)

- **S41** (2026-11-11) `ea97d8e`·`6386eaa`·`352fe7e` 서버(`workers/kata-public/worker.js`·`test.mjs`·`wrangler.toml`), `d9603a6`~`d3f522d` 앱(aiProxy·geminiText·tts·percakapanAudio·story·dictionary·percakapan·phrase·peribahasa·account·plan·billing·AccountSection·Story·Percakapan·Dictionary).
  기능 이름(`x-kata-kind`): story · percakapan-make · longread · dict-new · phrase · word-audio · shared-audio · text · tts(예전). 하루·한 달·체험 합계, 긴 읽기는 `x-kata-unit` 한 편 = 한 번.
  `/me` 에 `features`, 관리자 `POST/GET /admin/special`. 계약·표는 `03-architecture.md`.
  검증: `node --test workers/kata-public/test.mjs` 16/16(기존 8 그대로 통과 + 새 8), esbuild 바꾼 파일 전부, `tsc` 0, `npm run build` 0.
  판단: 체험 사전은 절반(25)이 무료(50)보다 적어 무료 값으로 올림 · Plus 의 "제한 없음/안 셈" 기능에 숨은 안전 상한 · Plus 필요(403)는 자동 이동 대신 "Plus 보기" 버튼 달린 알림.
  남은 일: **Worker 배포 전에는 폰에 반영 안 됨**(코드만). 폰에서 볼 것: 무료로 이야기 2편째 → "오늘 불러올 수 있는 이야기를 모두 불러왔습니다…", 무료로 이야기 듣기 → "Plus 보기" 알림.
- **S42** (2026-11-11) `800e13a` `src/pages/Plus.tsx` + `src/lib/plusCopy.ts`(내보내는 이름이 바뀌어 한 커밋).
  시안 PW1·PW2 와 390×844 렌더 비교(미리보기 빌드 + Playwright): 두 장 모두 픽셀 차 40 넘는 점 0개. "이용 중" 상자도 확인.
  가격: Play `formattedPrice`(원화 "₩34,800" → "34,800원", 월 환산·할인율은 원화만 계산), 없으면 고정 34,800/3,900원. 체험: Play `freeTrialPeriod`, Play 가 없으면 미리보기 `kata-preview-trial-used` 키(없으면 체험 가능).
  폰에서 볼 것: 글꼴(Pretendard/Gowun Dodum) 실제 모양, 아래 안전 영역 여백, 연간↔월간 눌렀을 때 버튼·안내 문구 바뀜, 미리보기 패널 "체험 이미 사용" 켜면 PW2 문구.
