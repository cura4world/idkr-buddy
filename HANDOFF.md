# HANDOFF — 지금 어디까지 왔나

세션을 시작하면 `CLAUDE.md` → `DECISIONS.md` → 이 파일 순서로 읽는다. 이 파일은 **세션을 끝낼 때마다** 고친다.
상세한 기술 기록은 저장소 밖 개발 요약 `../kata-kata-dev-summary.md`(로컬 파일, 이 저장소에는 없음)가 정본이다. 여기에는 복제하지 않는다.

마지막 갱신: 2026-11-11 (아침, 시안 코드 반영·QA·미리보기 APK)

## 공개판(Google Play) 준비 — 2026-11-10, 브랜치 `release/public`

- 공개판 출시 준비 코드가 `release/public` 브랜치에 있습니다(아직 `main` 에 병합 전). 문서는 `docs/release/`:
  `01-brief` → `02-prd` → `03-architecture` → `04-stories` → `05-arga-checklist`(사용자가 직접 할 콘솔 설정) → `06-store-listing` → `07-data-safety`.
- 구조: 같은 웹 앱 + 새 스토어 앱(`app.naruve.katakata`, `.github/workflows/build-store.yml`). 스토어 앱은
  `window.KataStore` 로만 구분하며(`src/lib/platform.ts`), 바뀐 동작은 대부분 스토어 앱일 때만 켜진다.
  서버는 새 Worker `workers/kata-public/`(kata-sermon 과 분리). 상세는 `03-architecture.md`.
- 스토어 빌드는 서명 키 없이 디버그 컴파일까지 Actions 에서 확인됨. 서명 AAB 는 업로드 키 등록 뒤.
- 2026-11-10 밤: 작업을 보지 않은 별도 검토자의 지적(한도 경합, 범용 대리 창구, 구매 알림 유실 등)을
  반영함. 처리 표는 `docs/release/04-stories.md` 맨 아래 "검토 반영". 서버 자동 테스트 8개 통과.
- 요금·한도·Plus 혜택은 2026-11-10 **확정**. 값은 저장소 밖 결정 문서(Claude Docs "Kata kata 출시 결정 정리")의
  "무료와 Plus" 표가 정본이고, 코드에서는 Worker 변수 `LIMITS_JSON`, `src/lib/plusCopy.ts` 로 맞춘다.
  Plus 하루/한 달: 이야기 5/60, 회화집 만들기 3/30, 긴 읽기 5/50, 사전(처음 찾는 단어, 숨김) 50/400. 7일 체험은 절반.
- 2026-11-10 화면 시안 완료(Claude Design 캔버스): 홈, 내 단어장, 단어장 폴더·안(색연필 예문 그림), 카드·퀴즈,
  게임방·게임 7종, 내 정보, 이야기, 회화집(만들기 난이도 하/중/상), 인도네시아 이해·지도, 구독 화면.
  화면별 결정은 위 결정 문서에 있다.
- **2026-11-11 새벽: 시안을 코드로 모두 옮김(BMAD, `docs/release/08-polish-stories.md` S40~S57).** 작업을 보지 않은
  검토자의 QA(`09-qa-report.md`) 18건 중 17건 처리. 사용자는 **미리보기 APK**(프리릴리스 `preview-latest`,
  패키지 `app.naruve.katakata.preview`, 웹 파일을 APK 안에 담아 지금 앱과 데이터 분리)로 출시 전 마지막 검사를 한다.
  왼쪽 가장자리 "미리보기" 탭에서 등급 전환·Gemini 키 입력.
  - 단어장 41권(공개 01~34 3,005단어 + 성경과 신앙 35~41 550단어, staff 만), 색연필 그림 3,005장(공개 34권 전부).
  - 회화집 공개 14개 폴더 86장면 + 교회와 신앙 8(staff), 난이도 하/중/상. 게임 7종. 글꼴은 앱 안에 담음.
  - 서버(Worker kata-public) 한도 코드는 테스트 16개 통과, **Cloudflare 에 아직 배포 안 함**.
  - 지도 사진: Actions(`map-photos.yml`)가 위키미디어에서 자동 선택. 식민지 시대 기록 사진은 화면에서 뺌.
    136곳 중 85곳만 사진 있음 — **사용자 확인 필요**.
  - 사용자 판단 대기: 회화 옛 장면 길이(12~16줄), 구어 은어 단어, 이슬람 생활 예문 7줄, 그림 일부(빈 국기봉·모스크 돔 등).

## 지금 어디까지

- 인도네시아어–한국어 학습 PWA. 단어장, 사전, 이야기, 뉴스, 묵상, 기도, 성경 읽기(낭독), 설교문, 회화집, 게임, Medali(점수·훈장).
- 사용자는 개발자 본인과 아내 2명. 폰의 WebView 껍데기 APK가 GitHub Pages(`https://cura4world.github.io/idkr-buddy/`)의 앱을 불러온다. 코드 수정은 `main` push와 Pages 배포만으로 두 폰에 반영된다.
- 회원키(KK-…) + 기기번호 방식의 회원판이 있다. 관리자판·회원판·공개판은 `src/lib/access.ts` 참고.
- **보안 작업 진행 중, 상세는 저장소 밖 security-plan 파일.**
- 최근 코드 작업: AI 모델 교체(음성·뉴스), 설교문 QT 렌더러, 책·장 선택 목록 글자 크기 통일. 상세는 `DECISIONS.md`.
- 폰에서 눈으로 확인하는 항목이 남은 작업은 개발 요약의 "남은 작업" 표를 본다.

## 다음 할 일

0. **사용자 폰 검사(미리보기 APK) 결과를 받아 고친다.** 출시는 완성품으로 한다(2026-11-10 결정). 목표 이번 주, 급하면 다음 주.
   아직 안 한 것: 공용 음성 서버 캐시와 사전 미리 채우기(결정 문서), Worker 배포, 성경과 신앙 35~41권 그림, `public/guide.html` 외부 글꼴.
1. 보안 작업을 마무리한다(순서와 승인은 저장소 밖 security-plan 파일을 따른다). 끝나기 전에는 공개 **배포**를 진행하지 않는다(준비 작업은 `release/public` 에서 진행됨).
2. `docs/release/05-arga-checklist.md` 의 콘솔 설정 → `release/public` 를 `main` 에 병합 → 내부 테스트 트랙.
3. 관리자판 APK 빌드(`build-apk.yml`)의 `android-actions/setup-android@v3` 가 2026-11 러너에서 실패한다(스토어 빌드에서 확인). 다음 APK 재빌드 전에 `build-store.yml` 처럼 러너의 SDK 를 쓰도록 바꾼다.
4. 재사용 가능한 사전·읽기·캐시·게임 자산 목록 갱신.
5. 개발 요약의 "남은 작업" 표에서 우선순위를 다시 정한다.

## 출시까지 남은 것

목표: **Google Play 출시** (조직 개발자 계정, 비공개 테스트 요건 없음).

출시 전 필수:

- 보안 작업 완료(위 참고).
- 공개판의 법적·계정·API 구조 결정: 개인정보처리방침과 약관, 사용자 계정 방식, 공개 사용자가 개발자의 Gemini 키를 쓰지 않는 구조(사용자별 한도 또는 사용자 키), 성경 낭독·설교문 같은 비공개 콘텐츠를 공개판에서 어떻게 보이게 할지.
- Play Console 요건: 개인정보처리방침 주소, 데이터 보안 양식, 콘텐츠 등급, 대상 연령, 스토어 설명과 스크린샷.

**2026-11-10 결정**: 아래 A 안(웹뷰 껍데기를 AAB로)을 택했다. 패키지는 새로 `app.naruve.katakata`,
기존 `io.github.cura4world.twa` 는 관리자판·회원판으로 그대로 둔다. Google 로그인 필수, 전 세계·한국어 화면,
뉴스 제외. 상세는 `docs/release/`.

Play에 올리는 방법 (당시 후보 — 기록용):

| 방법 | 내용 | 장단점 |
|---|---|---|
| A. 기존 WebView 껍데기를 AAB로 | `build-apk.yml`에 `bundleRelease`를 더해 AAB를 만들고 Play App Signing으로 올린다 | 네이티브 TTS(`AndroidTTS`)·마이크·파일 선택·S펜이 그대로 동작한다. 단순 웹뷰 앱은 "최소 기능" 심사에서 지적될 수 있다 |
| B. TWA (Bubblewrap / PWABuilder) | 지금 PWA를 신뢰 웹 활동으로 감싼다 | 심사에 유리하나, `AndroidTTS`·S펜 가로채기 같은 네이티브 통로가 없어진다. 주소가 `github.io/idkr-buddy/`(하위 경로)라서 `/.well-known/assetlinks.json`을 도메인 루트에 둘 수 없다 → 사용자 사이트 저장소(`cura4world.github.io`)나 커스텀 도메인이 필요하다 |

세부 결정(A/B, 도메인, 패키지 이름 `io.github.cura4world.twa` 유지 여부, 업로드 키)은 출시 준비 단계에서 정한다.

## 참고 파일

- `CLAUDE.md` — 작업 규칙과 세션 종료 루틴
- `DECISIONS.md` — 설계 배경과 사고 기록
- `../kata-kata-dev-summary.md` — 개발 요약(저장소 밖, 로컬)
