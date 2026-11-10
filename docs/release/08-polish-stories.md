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
| S44 | 회화집 채우기 + 난이도 하 | 🔍 | 공개 14개 폴더 86장면, 교회와 신앙은 staff 만. `PercakapanLevel` 에 "하" 추가, 만들기 기본 "중" — 구현 완료(54장면 새로 씀, 기존 5곳 고침), 내용 검토 대기. 기록: `src/data/percakapan/REVIEW-2026-11.md` |
| S45 | 홈 (H5·H6) + 하단 탭 | 🟡 | 시안 그대로. 무료는 잠긴 메뉴 눌러 구독 화면 — 구현 끝, 폰 확인 대기 |
| S46 | 내 정보 (ME1·ME2·ME3) | 🟡 | 등급별 회원 구역, 학습 기록 그래프, 훈장 설명, 설정 목록 — 구현 끝. 공개판 회원키 확인·서버 자동 백업·친구 비교·상위 % 는 서버가 없어 안내 문구만 |
| S47 | 사전 결과 (D4) + 오늘의 문장 (P1) | ✅ | 결정 문서의 확정안 그대로 (박스 높이 고정 여부는 결정 문서에서 아직 미정 — 넣지 않음) |
| S48 | 내 단어장 (W1) · 단어장 폴더 (F1) · 단어장 안 (K1·K4) | ✅ | 시안 그대로. 폴더는 묶음 바로가기 칩, 성경과 신앙은 staff 만 |
| S49 | 카드 (C1) · 퀴즈 (Q1·Q2) | ✅ | 지금 배치, 차분한 색, "홈으로" → "단어장으로" |
| S50 | 단어장 예문 색연필 그림 | 🟡 | 틀·형식 완료, 그림은 시안 12장면(동물 6·전치사 6)만. 나머지 단어 그림은 내용 작업(🔍) — 형식은 `src/data/illust/README.md` |
| S51 | 게임방 (G1·G2) + 게임 다듬기 + 새 게임 3개 | 🟡 | 7줄 목록(오늘의 단어 퍼즐 맨 위, 무료도 가능). 짝맞추기·단어장 퀴즈 뺌. 빠른 짝짓기·듣고 고르기·오늘의 단어 퍼즐 추가 — 구현 끝, 폰 확인 대기(시간 감각·소리) |
| S52 | 이야기 (ST1~ST5) | ✅ | 하/중/상 동그라미, "이야기 불러오기", 무료 하루 1편·듣기 잠금 상자 |
| S53 | 회화집 화면 (PC1~PC4) | ✅ | 헤더 "+ 회화집 만들기" 알약, ⋮ 없음, 만들기 시트 하/중/상 가운데 정렬 46px |
| S54 | 인도네시아 이해 (IN1·IN2) + 지도 (MP1·MP2) | ✅ | 지도 큰 카드, 생활 정보, PETA INDONESIA, 가로 보기 버튼, 시트 출처 문구 없음, 종교·역사 핀(공개판 고르게, 선교 10곳 staff) |
| S55 | 사진 출처 화면 (설정 > 앱 정보) | 🟡 | 지역별 작가·라이선스·원본 링크 목록. 지도 사진 고정 목록(겹침 없음) 🔍 — 화면·목록 구조·생성 스크립트 완료, **사진 목록은 비어 있음**(작업 환경에서 위키미디어 차단). 설정 > 앱 정보에 `PhotoCreditsLink` 연결 필요 |
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
- S47 (11/11) f6526a9 phrase.ts(알아두기 지시문) · 654e1d2 AiReportButton.tsx(문구) · cec6679 Dictionary.tsx · 496d895 PhraseDetail.tsx · 297be27 SavedPhrases.tsx — esbuild·tsc·build 통과, Playwright 390px 캡처로 D4·P1 대조(단어·문장·한국어 단어/문장·한도 초과·빈 알아두기·공개판 신고). 폰에서 볼 것: 사전 makan 결과 카드 순서·색, 담기 알약, 문장 점선 밑줄 탭, 알아두기 없는 문장에서 구역 숨김, 글자 크기 단계별 줄바꿈
- S44 (2026-11-11) · 커밋: 이 줄을 담은 커밋 바로 앞의 "회화집:" 커밋 20개 · 파일: `src/data/percakapan/` (새 9개 + types·index·01·03·05·08 + REVIEW-2026-11.md), `src/lib/percakapan.ts`·`percakapanAudio.ts`·`peribahasa.ts`, `src/pages/Percakapan.tsx` · 검증: esbuild 21파일·tsc·`npm run build` 통과, 데이터 점검 스크립트(폴더별 장면 수 = 목표, 새 장면 6~10줄, 모든 줄 id·ko 있음, 공개 86/전체 94) 통과 · 폰에서 볼 것: 미리보기에서 무료·Plus 는 폴더 14개(교회와 신앙 없음), Special·관리자는 15개 / 새 장면 소리(남녀 목소리 구분) / 만들기 시트 하·중·상 세 칸, 기본 중 / 고친 3장면(자기소개·오토바이 기사·병문안)이 새 대사로 다시 읽히는지
- S45·S46 (2026-11-11): 8726b21 `BottomTabs.tsx`(새) · e37ef09 `SettingsDialog.tsx`(회원키 서식 함수 export 한 줄) · e3ebe3f `MyInfo.tsx`(새, /me) · c9c7769 `Index.tsx`(스토어 앱일 때만 H5·H6 홈, 관리자판 홈 그대로) · 17636cb `App.tsx`(/me 라우트·탭 막대). esbuild 5파일·tsc·build 통과, 390×844 Playwright 로 무료·Plus·Special 홈/내 정보와 잠금→구독 화면·탭 뒤로가기 확인. 폰에서 볼 것: 탭 막대 안전 영역 여백, 잠긴 메뉴 안개 안내 후 구독 화면, 안드로이드 뒤로가기(탭→홈→앱 뒤로), 공부 시간 막대, Google 사진. 다른 탭 화면(`SavedWords`·`Permainan`)은 아직 뒤로가기 화살표가 있고 하단 여백은 탭 막대의 빈칸이 대신함(그 화면 담당이 `--kata-tabbar-h` 로 맞추면 됨).
- S48·S49·S50 (2026-11-11): c59fec3 `wordbookGroups.ts`(새, 번호→묶음·색, 예전 36권/새 41권 자동 판별) · f5a9928 `src/data/illust/`(새, 그림 2권 12장면 + README) · c36f700 `illust.ts`(새) · 7e3ec50 `WordIllust.tsx`(새) · 7052ef9 `vite.config.ts`(그림 파일 precache 제외·CacheFirst `kata-illust`) · 5918276 `CategoryCard.tsx` · 7066890 `Wordbooks.tsx` · e91ae96·84714e2 `CategoryDetail.tsx` · 77a316b `SavedWords.tsx`(내 단어장 탭 /saved = W1 화면, 뒤로가기 없음, `--kata-tabbar-h`) · 8696ec1 `StudyMode.tsx` · 8c6241a `QuizMode.tsx` · 18ca293 `SavedQuizMode.tsx`. esbuild·tsc·build 통과, 390×844 Playwright(스토어 앱 흉내, 무료·Plus·Special)로 W1·F1·K1·K4·C1·Q1·Q2·탭 대조. 무료는 폴더·기본 단어장·카드·퀴즈 모두 /plus 로, Plus 는 29권(성경과 신앙 없음), Special 은 6칩 36권. 폰에서 볼 것: 동물·전치사 단어장 그림 위치(단어·스피커와 안 겹침)와 긴 목록 스크롤 부드러움, 폴더 칩 누르면 그 묶음으로 내려가고 진해짐, 내 단어장 탭 30개 넘음 안내·묶기, 보관한 단어장 ⋮(이름 변경·삭제), 퀴즈 결과 "단어장으로", 글자 크기 단계별 줄바꿈. 남은 것: 나머지 단어 그림(S50 내용), 단어장 재분류(S43) 뒤 부제 번호가 새 번호로 나오는지.
- S51 (2026-11-11): 0fb4b05 `kataHariIni.ts`(새, 퍼즐 엔진) · e4fee40 `src/test/kataHariIni.test.ts`(새, 20개) · b99c161 `medali.ts`(판 이름 jodoh·dengar·kata 추가만) · dcb6485 `gamePool.ts`(비슷한 단어 고르기) · 21b4abb `tts.ts`(`getSayAudioUrl` 추가만, 기존 함수 그대로) · 7eef74b `components/game/GameKit.tsx`(새) · 4ec3711 `MedaliPill.tsx`(새) · 36dc3c0 `PlusGame.tsx`(새) · ac65d9a `GameKata.tsx` · 86fe925 `GameJodoh.tsx` · f3429f0 `GameDengar.tsx` (새 3개) · b60af32 `GameOX.tsx` · 34ef5e8 `GameSusun.tsx` · 94bba1b `GameEja.tsx` · 95079e2 `GameTangkap.tsx` · 55a2440 `Permainan.tsx` · a6934bc `App.tsx`(라우트, `GameMatch.tsx` 삭제). esbuild 16파일·tsc·vitest 21개·build 통과, 390×844 Playwright(스토어 앱 흉내, 무료·Plus)로 G1·G2·GM-Kata·Jodoh·OX·Dengar·Susun·Eja·Tangkap·결과 대조. 게임방은 공개판에서 뒤로가기 없음 + `calc(100dvh - var(--kata-tabbar-h))`, 관리자판은 탭 막대가 없어 뒤로가기 유지. 무료가 Plus 게임 주소로 들어오면 게임방으로. 퍼즐 정답은 앱에 든 기본 단어장(성경과 신앙 단어장·대문자 단어 제외) 다섯 글자 표제어를 알파벳순 → 고정 씨앗 순열 → 한국 시간 날짜 번호로 고름(목록 한 바퀴 동안 겹침 없음, 입력 단어 목록 검사는 안 함). 듣고 고르기는 시안대로 "비슷한 단어 넷 중 고르기"(뜻 보기 아님), 소리를 못 받으면 뜻을 글자로 보여 줌. 폰에서 볼 것: 빠른 짝짓기 60초·단어 받기 낙하 속도 체감, 듣고 고르기 첫 소리 대기 시간·천천히 듣기(재생 속도 0.7), O/X·짝짓기에서 단어 발음이 너무 잦지 않은지, 퍼즐 자판 크기(30×44)가 손가락에 맞는지, 탭 막대와 게임방 마지막 줄 간격.
- **S52 이야기** (2026-11-11) — 커밋 `505217b`(WordMiniSheet 새로) · `1e8bddf`(LevelCircles 새로) · `03def9b`(Story.tsx).
  오늘의 이야기 카드(진한 책 그림, 반짝이 없음) + 하/중/상 60px 동그라미·점 + "이야기 불러오기" 50px, 지난 이야기 카드(Lora 제목·귤색 카테고리 칩·오늘/어제/11월 7일).
  무료: 하루 1편(한국 시간 자정, 이 기기 기록 + 서버 QUOTA 응답으로 판단) → 다 쓰면 ST2 상태(회색 버튼 + "오늘의 이야기를 불러왔습니다 · 내일 새 이야기가 열립니다"),
  귤색 상자 "인도네시아어 발음으로 이야기 듣기" + "Plus / 7일 무료 체험"(→ `/plus`)은 무료에게 늘 보임. 본문 "듣기"는 자물쇠 → 말풍선 "소리 읽기는 Plus 회원 기능입니다", 한 번 더(또는 말풍선) 누르면 `/plus`.
  Plus 가 한도(429 QUOTA_*)에 걸리면 버튼을 막고 "오늘 불러올 수 있는 이야기를 모두 불러왔습니다 · 내일 다시 열립니다".
  본문 Lora 17px·점선 밑줄·누른 단어 귤색, 뒷면 16px + "이 글을 더 이해하려면" 상자, 단어 시트는 시안 ST3(복사 버튼 뺌).
  검증: esbuild 바꾼 7개 파일 통과, `tsc --noEmit -p tsconfig.app.json` 통과, `npm run build` 통과, Playwright 390×844(스토어 앱 흉내 + 무료/Plus 세션)로 ST1~ST5 대조, QUOTA 429 흉내로 막힘 상태 확인.
  폰에서 볼 것: 무료 계정으로 하루 1편 뒤 버튼이 회색으로 바뀌는지, 잠긴 듣기 말풍선, 체험 버튼 → 구독 화면, 단어 시트 버튼 높이.
- **S53 회화집 화면** (2026-11-11) — 커밋 `fec6a95`(percakapanAudio.ts 에 `progress()` 추가 전용) · `119bb32`(Percakapan.tsx) · `3ebb0a6`(PercakapanCategory.tsx) · `9975b50`(PercakapanRead.tsx).
  PC1: 머리 "+ 회화집 만들기" 알약(⋮ 없음), "회화집 N개", 색 타일 + 이모지 + 개수. 무료는 자물쇠 표시, 누르면 "회화집은 Plus 회원 기능입니다" + `/plus` (직접 만든 회화집이 든 폴더는 열림 — 구독 취소 뒤에도 내 회화 글은 계속).
  PC2: 01·02 번호, "N줄". PC3: 청록 "전체 듣기/일시정지" 알약, 화자 안내 줄(역할 · 여자/남자 목소리), 청록 스피커, 전체 듣기 중 지금 줄을 재생 위치 비율로 짐작해 연청록 바탕 + 왼쪽 막대(화면 밖이면 따라 스크롤).
  PC4: 아래 시트, 회화집 이름 / 카테고리(이모지 + 선택) / 상황 설명("자세할수록 대화가 자연스럽습니다") / 난이도 46px 가운데(기본 중) / "+ 회화집 만들기" 48px / "만드는 데 20초쯤 걸립니다". 한도 초과면 버튼 회색 + 안내.
  교회와 신앙은 S44 의 `isCategoryVisible()` 로 거름: 폴더 목록(등급이 바뀌면 다시 불러옴), 장면 목록 주소 직접 진입 → `/percakapan` 으로 되돌림,
  읽기 주소 직접 진입(`findScene` 이 null) → 무한 로딩 대신 "볼 수 없는 회화집입니다" + "회화집 목록으로" 버튼. 관리자판의 "백업 불러오기"는 공개판에서만 숨김.
  난이도: S44 병합 뒤 `PercakapanLevel`("하"|"중"|"상") 그대로 쓰고, 만들기 시트 동그라미는 `PERCAKAPAN_LEVELS` 를 `LevelCircles levels` 로 넘김(기본 중). 새 폴더(uang·hari-raya·kantor) 타일 색 지정.
  검증: 위와 같음, Playwright 로 PC1~PC4 + 무료 잠금(폴더 누르면 `/plus`) + Special 만 교회와 신앙 보임 + 무음 소리로 전체 듣기 줄 표시 확인.
  폰에서 볼 것: 전체 듣기 중 표시 줄이 실제 소리와 대략 맞는지(글자 수 비율 짐작이라 한두 줄 어긋날 수 있음), 만들기 시트가 키보드에 가려지지 않는지.
  남은 것: 본문 "듣기"는 공용 `PlayButton`(수정 금지)이라 아이콘이 ▶(시안은 스피커). 뒷면 신고 버튼은 공용 `AiReportButton`("풀이가 이상합니다", 시안은 "내용이 이상합니다"). 이야기·회화집 만들기는 `geminiText` 가 `x-kata-kind: text` 로 보내므로, 서버가 이야기·회화집 만들기 한도를 따로 세려면 `geminiText` 에 kind 선택값이 필요(S41). 한도 초과 토스트는 `aiProxy` 가 띄우는 공통 문구("오늘 사용량 한도가 넘었습니다" / QUOTA_TEXT 는 "~어요" 말투 — S56).
- **S54** (2026-11-11) `5b13f58` 허브 Insight.tsx(지도 큰 카드·색 타일·생활 정보·무료 잠금 + 귤색 상자) · `dff6a11` IndoMap.tsx(PETA INDONESIA, 범례 칩·+/−·가로로 보기, 시트 4:3 사진·차분한 칩·청록 스피커·단어 14px 굵게, 오류 문구 "설명을 불러오지 못했습니다. 잠시 뒤 다시 시도하세요." + 다시 시도, 처음 배율 1.55·대도시 핀 1.05부터, tier 4 핀 탭 덤 12px, **지도 위 버튼 눌림 수정**: 포인터를 지도 상자가 붙잡아 click 이 버튼으로 가지 않던 문제 — 헤드리스 크롬에서 확인, 지금 앱에도 있을 수 있음) · `458dd03` mapData(새 종교 핀 5곳 + 선교 10곳 staff) · `097a006` `7de9334` `ef5ae88` 원고 5곳 · `19fa683` InsightGate + `6ce5abd` App.tsx(하위 화면·/map 무료 → /plus) · `568998f` `bd8a27c` `55193fd` `d8eb0e5` `72acf0f` `2fe8993` 하위 화면 헤더(IKHTISAR·SUKU BANGSA·AGAMA·SEJARAH·KEKRISTENAN·INFO DAN TIPS). 검증: esbuild 18개 · tsc · build 통과, 핀 136 = 원고 136, 단어 277 중복 0, Playwright 390×844(무료 /map·/insight/overview·/insight/tips·잠긴 행 → /plus, 공개판 Plus 종교 핀 9 / 관리자판 19, CSS 회전 가로 보기에서 핀 탭·팬·시트 닫기 유지·닫기). 폰에서 볼 것: 가로로 보기 버튼이 화면 자체를 돌리는지(회전 잠금) 지도만 옆으로 눕는지(CSS 대체), 눕힌 화면에서 핀·확대·범례가 손가락 위치대로 눌리는지, 범례·확대 버튼이 한 번에 눌리는지, 이스티크랄·투구 교회(자카르타 바로 옆)를 깊이 확대해 따로 누를 수 있는지.
- **S55** (2026-11-11, 🟡) `edbd6c9` mapPhotos.ts(고정 목록 형식, 지금은 비어 있음) · `49a554d` scripts/build-map-photos.mjs(인터넷 되는 PC에서 `node scripts/build-map-photos.mjs` → 목록 채움 + 임시 폴더에 확인용 HTML, 겹침이면 멈춤) · `5f9b3c2` PhotoCredits.tsx(`/about/photos`, SUMBER FOTO, 지역별 작가·라이선스·원본) · `e76df26` map.ts 실시간 사진 검색 제거. 남은 것: ① 스크립트 실행 후 사진이 그 지점을 보여 주는지 사람이 확인 ② 설정 > 앱 정보에 `PhotoCreditsLink`(PhotoCredits.tsx 의 named export) 연결. 목록이 비어 있는 동안 지도 시트에는 사진이 나오지 않습니다.
