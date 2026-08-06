# idkr-buddy (Kata kata) 작업 규칙

인도네시아어–한국어 학습 PWA. 사용자는 개발자 본인과 아내 2명뿐이며 같은 Gemini API 키를 공유합니다.

## 세션 시작 시 (매번)

1. **이 파일(`CLAUDE.md`) 전체를 먼저 읽는다.** 아래 규칙은 사용자가 프롬프트에 다시 적지 않아도 항상 유효하다. 프롬프트에 언급이 없다는 것이 규칙의 예외를 뜻하지 않는다.
2. **`DECISIONS.md`를 함께 읽는다.** 설계 배경·과거 사고 기록·왜 그렇게 되어 있는지가 거기 있다. 기존 구조를 바꾸려 하거나 "이건 왜 이렇게 되어 있지?" 싶은 지점이 나오면 반드시 확인한다.
3. 단어장(`data/categories/*.csv`) 관련 작업이면 **`data/WORDLIST-PLAN.md`를 먼저 읽는다.** 목표 개수·CSV 형식·분류 원칙이 거기 있다.
4. 사용자는 **목회를 하며 주로 폰에서** 작업을 확인한다. 코드베이스를 직접 읽지 않으므로, 보고는 무엇이 어떻게 바뀌었는지 한국어로 분명하게 쓴다.
5. 규칙끼리 충돌하거나 판단이 갈리면 **임의로 정하지 말고 먼저 묻는다.**

| 항목 | 값 |
|---|---|
| 스택 | React + TypeScript + Tailwind + shadcn/ui + Vite |
| 라우터 | react-router-dom, `basename="/idkr-buddy"` |
| 배포 | GitHub Actions → GitHub Pages |
| 배포 URL | https://cura4world.github.io/idkr-buddy/ |
| Android | WebView 껍데기 APK (내용은 GitHub Pages에서 로드) |
| AI | Gemini API (텍스트/이미지/TTS/검색 그라운딩), 유료 키 |
| 오디오 | Cloudflare R2 (성경 낭독 mp3 1,189장) |

## 배포 방식
- 이 프로젝트는 웹(폰) Claude Code 환경에서 작업합니다.
- 코드 수정 후 별도 언급 없이 **항상 자동으로 `main` 브랜치에 push까지 완료**합니다.
- GitHub Actions가 `main` push 시 자동으로 빌드·배포(GitHub Pages)합니다.
- **세션이 다른 브랜치로 지정되어 있어 `main`에 push할 수 없다면, 작업을 시작하기 전에 먼저 알린다.** 브랜치에만 올리면 배포가 돌지 않아 사용자 앱에는 아무 변화가 없다. 작업을 끝낸 뒤 통보하는 것은 늦다(사용자가 이미 완료로 여긴 뒤다).
- **push 후에는 배포 워크플로가 끝날 때까지 확인하고 최종 결과를 보고한다.** push 성공은 배포 성공이 아니다.
- **APK는 껍데기**라 코드 수정은 앱 재실행만으로 두 폰 모두 반영됩니다.
- APK 재빌드가 필요한 경우는 `MainActivity.java` / `build-apk.yml` / `AndroidManifest.xml` 변경 시**뿐**입니다.

## 작업 절차
1. 편집 **직전에** 대상 파일의 최신 내용을 다시 읽는다 (로컬 사본이 오래됐을 수 있음).
2. 치환 앵커는 **파일 내 정확히 1회 등장**하는지 확인한다. Python 스크립트 + `assert s.count(anchor) == 1` 방식이 가장 안전하다.
3. **치환 스크립트는 Write 도구로 파일을 만들어 실행한다. Bash heredoc(`<<'EOF'`)으로 코드를 쓰지 않는다.** — heredoc이 백슬래시를 한 겹 먹어 `new RegExp("\\s+")`가 `\s+`로 기록된 사고가 있었다. esbuild·tsc를 모두 통과한 뒤 실행 시점에만 발각됐다. 백슬래시가 들어가는 코드는 무조건 Edit/Write 도구로 쓸 것.
4. 검증 명령을 모두 통과시킨다.
5. 파일별로 개별 커밋한다.
6. 실패하면 커밋하지 말고 원인을 보고한다.

## 금지 사항
- **정규식 리터럴(`/.../`) 금지** — 항상 `new RegExp("...")` 사용 (주입 과정에서 깨짐)
- **setState 여러 개 + `navigate()` 동시 호출 금지** — 언마운트 중 setState로 WebView가 크래시함. setState 없는 `cancelOperations()` / `teardown()` 패턴을 쓸 것
- **성경 약어에 `toLowerCase()` 금지** — R2 키는 대소문자를 구분하고 66권 중 룻기만 `RUT`(대문자)라 404가 남
- **`src/lib/tts.ts` / `src/components/PlayButton.tsx` 수정 금지** — 여러 페이지 공용
- **`src/lib/bibleAudio.ts`의 `AUDIO_BASE` 변경 금지**
- **이미지를 localStorage에 저장 금지** — 5~10MB 한도라 단어장 데이터까지 깨짐. IndexedDB를 쓸 것
- **YAML 안 Java 코드에서 큰따옴표 이스케이프(`\"`) 금지**
- **필터된 목록에서 인덱스 기반 순서 이동 금지** — ID 기반 함수를 쓸 것
- **`src/data/seed.json` 커밋 금지** — CI가 매 빌드 재생성하는 산출물

## 필수 패턴
- 모든 `speechSynthesis` 호출은 optional chaining + try/catch로 감싼다 (WebView에서 `undefined`일 수 있음)
- 외부 네트워크 호출(fetch)에는 **반드시 `AbortController` 타임아웃**을 건다. 없으면 응답이 안 올 때 로딩이 영원히 안 끝난다
- 폴더/필터 목록 순서 이동은 `reorderCategoryById(movedId, targetId)` / `moveCategoryToEdgeWithin(id, ids, toTop)`
- 단어 추가 시 중복 방지: `addWordIfAbsent` + `hasWordInCategory`
- TTS로 읽는 텍스트 내용이 바뀌면 `cacheKey`를 반드시 올린다 (안 올리면 옛 음성이 계속 재생됨)
- `MY_WORDBOOK_ID`는 각 페이지에 `"my-wordbook"`으로 **로컬 정의**한다 (import하지 않음)
- 페이지 간 뒤로가기는 `goBackOr(navigate, location.key, fallback)` (`src/lib/nav.ts`). `location.key === "default"`면 첫 진입이라 폴백을 쓴다
- 한 화면 안에서의 뒤로가기(결과→목록 등)는 `history.pushState` + `popstate`로 처리한다

## Tailwind / 폰트
- `bg-primary/10` 같은 반투명은 밑바탕에 따라 색이 완전히 달라진다. 어두운 배경 위에서는 **`bg-card`(불투명) + gradient overlay** 조합을 쓸 것
- `accent-color`는 `appearance-none`과 함께 쓰면 무효 — 트랙을 배경 그라디언트로 직접 그린다
- 임의값 `calc()`는 클래스 문자열에 넣으면 깨질 수 있으므로 **인라인 style** 권장
- 폰트: `font-word`(Lora, 인니어) / `font-body`(Gowun Dodum, 기본 한글) / `font-gothic`(Pretendard, 설명·라벨)
- `content-bump`: 사전 결과 카드·단어장 단어 박스 글자를 한 단계 확대하는 클래스
- 글자 크기는 7단계(85~115%, 기본 100%), 기기별 localStorage

## 화면 헤더 규칙
진입 화면 9개는 헤더가 통일되어 있다. 뒤로가기 화살표 + 인니어 대문자 제목만 두고, 클래스는 다음을 그대로 쓴다.

```
<h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">제목</h1>
```

| 화면 | 제목 |
|---|---|
| /dictionary | KAMUS BAHASA INDONESIA |
| /story | CERITA INDONESIA |
| /wordbooks | KOSAKATA |
| /devotion | SAAT TEDUH |
| /bible | ALKITAB |
| /prayer | DOA |
| /news | BERITA HARI INI |
| /insight | WAWASAN INDONESIA |
| /sermons | KHOTBAH |

## 파일 지도

```
src/
  App.tsx            라우트 정의 (화면을 새로 만들면 여기에 등록)
  main.tsx           엔트리 + 서비스워커 자동 업데이트
  pages/
    Index.tsx          메인화면
    Dictionary.tsx     사전 (~1,153줄, 최대 파일 — 한 곳만 정밀 수정할 것)
    Story.tsx          이야기
    News.tsx           뉴스
    Devotion.tsx       두란노 QT 묵상
    BibleRead.tsx      성경 읽기 (R2 낭독 스트리밍)
    Prayer.tsx         기도문
    Sermons.tsx        설교문 목록
    SermonRead.tsx     설교문 읽기 + S펜 필기 (~1,829줄)
    IndoMap.tsx        인도네시아 지도 (SVG 85핀)
    Insight*.tsx       인도네시아 이해 허브 + 서브 6개
    PhraseDetail.tsx   오늘의 인도네시아어 문장 상세 (/phrase)
    SavedPhrases.tsx   저장해 둔 문장 목록 (/phrase/saved)
    Percakapan.tsx / PercakapanCategory.tsx / PercakapanRead.tsx   회화집 폴더·목록·읽기
    Permainan.tsx      게임방 입구 (/permainan)
    Game*.tsx          게임 5종 — Match(짝맞추기) / OX(스피드) / Susun(문장조립)
                       / Eja(철자채우기) / Tangkap(단어받기)
    Wordbooks.tsx / CategoryDetail.tsx / StudyMode.tsx / QuizMode.tsx
    SavedWords.tsx / SavedStudyMode.tsx / SavedQuizMode.tsx
    NotFound.tsx       404
  components/
    BiblePicker.tsx / BibleAudioButton.tsx / BibleAudioSeekBar.tsx
    PlayButton.tsx           수정 금지
    MedaliBadge.tsx          헤더 명찰 캡슐 (불꽃 + 별)
    MedaliSheet.tsx          훈장 팝업 (명찰을 누르면 올라옴)
    MedaliNudge.tsx          게임을 며칠 안 하면 뜨는 말풍선
    PointFloat.tsx           점수 확정 순간 "+N"이 잠깐 떠오름
    WordbookPickerSheet.tsx  "어디에 담을까요?" 단어장 선택 시트
    CategoryCard.tsx / EditWordDialog.tsx / AddWordDialog.tsx
    AddCategoryDialog.tsx / EditCategoryDialog.tsx / CSVImportDialog.tsx
    SettingsDialog.tsx
    NavLink.tsx              react-router NavLink 호환 래퍼
    ui/                      shadcn 기본 컴포넌트 (수정할 일 거의 없음)
  lib/
    geminiText.ts   Gemini 텍스트 호출 공용 모듈 — 새 기능에서 fetch를 직접 짜지 말 것
                    (모델 목록·타임아웃·재시도·에러 코드를 여기서만 관리)
    gemini.ts       단어 뜻/예문 자동 채우기 + API 키(localStorage)
    claude.ts       Claude API 호출 (묵상·기도문 생성)
    bible.ts        66권 테이블 (id/folder/ko/idName/chapters/usfm/audio)
    bibleAudio.ts   R2 낭독 스트리밍 싱글톤
    dictionary.ts   사전 Gemini 호출 + 타입
    dictStore.ts    사전 결과 IndexedDB 캐시
    store.ts        localStorage 단어장 데이터
    story.ts / storyStore.ts
    news.ts / newsStore.ts
    prayer.ts / prayerStore.ts
    devotion.ts / devotionStore.ts
    qtToday.ts      두란노 오늘의 QT 가져오기 (저장하지 않고 그때그때 불러옴)
    percakapan.ts   회화집 저장·백업·생성
    percakapanAudio.ts  회화 전용 다화자 TTS 재생기 (남/여 두 목소리)
    peribahasa.ts   오늘의 인도네시아어 문장 풀
    phrase.ts       문장 상세 해설 생성 + IndexedDB 보관
    tips.ts         인도네시아 정보(팁) 생성 + IndexedDB
    medali.ts       Medali 엔진 — 불꽃(주간 점수)·별(확정 단어) 판정, IndexedDB
    gamePool.ts     게임 출제 풀 (단어장·찾아본 단어·시드 3층, API 호출 없음)
    sermon.ts       Cloudflare Worker 호출 + IndexedDB
    sermonInk.ts    S펜 필기 저장 (IndexedDB)
    map.ts          지도 지점 설명 Gemini 생성 + IndexedDB 캐시
    mapData.ts      지도 좌표·핀 (대용량 124KB)
    imageStore.ts / wordStore.ts
    saveTarget.ts   담을 단어장 설정 (앱 전체에 하나)
    readingTimer.ts 화면에 보이지 않는 읽기 타이머
    useSwipeFlip.ts 장문 화면 좌우 스와이프로 앞/뒤 넘기기
    wideMode.ts     넓게 보기 (폴더블용 좌우 폭 확장)
    tts.ts          수정 금지
    nav.ts          goBackOr / wordbookFallback
    fontScale.ts / utils.ts
  hooks/            use-mobile.tsx / use-toast.ts
  data/
    seed.json       생성 파일 — 커밋 금지
    percakapan/     기본 회화집 (코드로 들어 있음, 손대지 않음)
  test/             vitest 설정 + 예제
  qtToday.ts        lib/qtToday.ts와 내용이 같은 미사용 사본 — 고칠 때 lib 쪽을 볼 것
data/categories/*.csv       공용 기본 단어장
data/private/{폴더명}/*.csv  개인 단어장
data/WORDLIST-PLAN.md       단어장 목표 개수·형식·분류 원칙
.github/workflows/deploy.yml, build-apk.yml
```

## 데이터 저장 위치

| 저장소 | 내용 |
|---|---|
| localStorage | 단어장/단어, `geminiApiKey`, `app-font-scale-step`, `dict-search-history`(50개), 개인 폴더명, 난이도, TTS 음성, 설교문 서버 설정 |
| IndexedDB | `kata-dict-images`(5,000 FIFO) · `kata-dict-results`(5,000 FIFO) · `kata-lookup-words` · `kata-stories` · `kata-qt-*` · `kata-sermon` · `kata-sermon-ink` · TTS 캐시(5,000 FIFO) |
| GitHub CSV | `data/categories/*.csv` → 빌드 시 seed.json → 모든 기기 기본 단어장 |
| Cloudflare R2 | 성경 낭독 mp3 1,189장 |
| Cloudflare KV | 설교문 (Worker 경유) |

CSV 형식(헤더 없이 4열): `인니어,한국어,예문,예문뜻`. 파일명이 곧 단어장 이름이며 이모지는 자동 배정됩니다.

## store.ts 주요 함수

```typescript
// 카테고리
getCategories() / addCategory() / updateCategory() / deleteCategory()
reorderCategoryById(movedId, targetId)       // ID 기준 (폴더용)
moveCategoryToEdgeWithin(id, ids, toTop)     // 범위 내 맨위/맨아래
restoreSharedCategories()

// 단어
getWordsByCategory() / addWord() / updateWord() / deleteWord() / reorderWords()
hasWordInCategory(categoryId, word)          // 중복 확인
addWordIfAbsent(word)                        // 중복이면 추가 안 함

// 보관함 / CSV
getSavedWordIds() / toggleSavedWord() / getSavedWords()
importWordsFromCSV(csv, forceCategoryId?)
```

## 검증 (커밋 전 필수)

```bash
npx esbuild <파일> --loader:.tsx=tsx --outfile=/dev/null
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

- **기대값을 먼저 정하고 대조한다.** 명령을 돌려보고 결과를 해석하는 것이 아니라,
  "무엇이 나와야 정상인지"를 먼저 적어 두고 그것과 맞는지 본다.
  - 치환 횟수 (예: 편집 8곳이 각각 1회씩)
  - 호출 개수 (예: 정의 1 + 사용처 2 = 3곳)
  - **결과가 하나도 없어야 정상인 `grep`을 반드시 하나 넣는다** — 옛 코드·레거시 키가
    남아 있는지 확인하는 용도다. 있어야 할 것만 세면 지우다 만 것을 놓친다
- **기대값과 다르면 커밋하지 말고 보고한다.** 임의로 맞추거나 그럴듯하게 설명하지 않는다.
- **"없어야 정상"인 검증 문구는 대상 파일에만 있는 것으로 고른다.** 지명·종족·지형처럼
  흔한 말은 `mapData.ts`의 핀 힌트나 `Insight*.tsx`의 데이터와 겹쳐, 분리·삭제가
  멀쩡한데도 실패로 보인다. 지도 원고 청크 검증에서 "슬라멧 산"·"브타위"가 연달아
  이 함정에 걸렸다. 인명이나 그 파일에만 나오는 고유 표현을 쓸 것
- **검증 문구 후보를 고를 때는 `.gitignore` 대상까지 포함해 검색한다.** ripgrep은 기본적으로
  무시 목록을 건너뛰므로 `src/data/seed.json`(빌드 생성물이지만 번들에는 들어감)과
  `data/categories/*.csv`에 있는 말은 아무리 검색해도 안 잡힌다. "극락조"가 공용 단어장
  CSV와 겹쳤는데 사전 검색으로 걸러지지 않은 전례가 있다
- 시각적 변경은 자동 검증할 수 없다 (Playwright 미설치). 폰에서 눈으로 확인하는 단계이므로, 무엇을 확인해야 하는지 보고에 적을 것.
- 배포 결과 확인:

```bash
curl -s "https://api.github.com/repos/cura4world/idkr-buddy/actions/runs?per_page=4"
```

## 커밋 규칙
- **신규 파일을 먼저 커밋**한 뒤, 그 파일을 import하는 기존 파일을 커밋한다 (중간 빌드 깨짐 방지)
- 파일별로 개별 커밋, 메시지는 한국어로 "영역: 무엇을 바꿨는지"
- 커밋 전 파일 끝이 온전한지 확인한다 (`export default XXX;` 등)
- **큰 변경은 단계를 나눠 배포하고 각 단계를 확인한다.** 핵심 수정을 먼저 배포해 두면,
  뒤 단계가 잘못돼도 앞 단계의 성과가 묻히지 않는다. 특히 한 줄짜리 핵심 수정과
  여러 화면에 걸친 확장 작업이 섞여 있으면 반드시 나눈다

## 원인 찾기 (증상이 안 잡힐 때)

고치는 것보다 원인을 맞히는 것이 어렵다. 추측으로 고치면 "고쳤다는데 그대로"가 반복된다.

**1. 되는 것과 안 되는 것의 차이부터 찾는다.**
같은 코드인데 어떤 화면은 되고 어떤 화면은 안 된다면 그 차이가 곧 원인이다.
코드를 더 읽기 전에 표부터 만든다.

| | 되는 쪽 | 안 되는 쪽 |
|---|---|---|
| 무엇이 다른가 | … | … |

(실제 사례: 사전에서 돌아온 뒤 뒤로가기가 먹통이던 문제 — 설교문·성경은 정상이고
이야기·뉴스만 증상이 났다. 차이는 "돌아온 뒤 히스토리 칸을 새로 쌓는가" 하나였다.)

**2. 기능이 통째로 안 되면 첫 번째 용의자는 조건문이다.**
코드가 틀린 게 아니라 앞에서 조건 하나가 조용히 막고 있는 경우가 많다. 특히 위험한 것:

- 설계가 확장됐는데 예전 판단 조건이 그대로 남은 경우
  (실제 사례: 스크롤만 담던 값에 "무엇을 보고 있었는지"가 추가됐는데
  `if (t.y < 1) return null;` 이 남아 표 전체를 버렸다)
- 환경 판정(`useNavigationType`, `userAgent`, 기능 감지)에 기대는 조기 반환 —
  개발 환경에서는 맞고 폰에서는 틀릴 수 있다

**판단 조건은 최소로 둔다.** 조건을 추가할 때는 "이 값에 나중에 다른 것이 실려도
이 조건이 여전히 옳은가"를 먼저 묻는다.

**3. 폰에서만 재현되면 일시 진단 장치를 넣는다.**
콘솔을 볼 수 없으므로 추측을 반복하는 대신, 화면에 뜨는 짧은 `toast` 를 한 판만 넣어
어디서 끊기는지 확정한다. 상수 하나(`DEBUG_XXX`)로 켜고 끄되, 단계마다 다른 문구를 띄워
문구만으로 어디까지 갔는지 구분되게 한다. **확인이 끝나면 상수만 `false` 로 두지 말고
코드까지 걷어낸다** (죽은 코드는 다음 사람을 헷갈리게 한다).

**4. 직전 변경을 여러 곳 되돌려야 하면 `git revert` 로 통째로 되돌린다.**
조각조각 되돌리면 빠뜨린 한 조각이 남는다. 되돌린 뒤
`git diff <직전커밋> HEAD -- <파일>` 이 비어 있는지 확인한다.

**5. 원인을 못 정했으면 확신하는 척하지 않는다.**
후보를 적고, 각각을 어떻게 구분할 수 있는지 적는다. 그리고 후보 전부를 무력화하는
보수적인 수정(예: 문제 될 조건을 없애고 예전에 검증된 구조로 되돌리기)을 택한 뒤,
사용자에게 확인해 달라고 부탁할 **관찰 항목 한 가지**를 보고에 남긴다.

## 완료 정의

**"코드를 고쳤다"는 완료가 아니다. "사용자가 앱에서 결과를 볼 수 있다"가 완료다.**

작업 시작 전에 스스로 확인한다.

- 이 변경이 사용자에게 보이려면 어디까지 가야 하는가 — 커밋 → `main` push → Actions 빌드 → Pages 배포 → 폰에서 앱 재실행
- 그 마지막 단계를 내가 실행할 수 있는가. 할 수 있으면 거기까지 한다. 못 하면 **시작 전에** 보고하고 지시를 받는다.
- 제약을 발견하고도 "일단 할 수 있는 데까지 하고 나중에 알린다"는 금지.

보고 직전 자가 점검 5줄.

- [ ] 사용자가 요청한 **목적**이 달성됐는가 (지시받은 행동을 했는가가 아니라)
- [ ] 보고하려는 사실 중 **실제로 확인하지 않은 것**이 섞여 있는가
- [ ] 지시와 다르게 판단한 지점이 있는가. 있다면 보고에 썼는가
- [ ] 폰에서 눈으로 확인해야 할 항목을 적었는가
- [ ] 이번 일에서 이 파일(`CLAUDE.md`)에 올릴 교훈이 생겼는가

**규칙 갱신 트리거** — 아래 상황에서는 사용자가 요청하지 않아도 먼저 제안한다.

- 같은 종류의 실수가 두 번 나왔을 때 → 이 파일에 추가할 항목을 제안
- 기존 규칙끼리 모순이 발견됐을 때 → 최우선으로 고친다
- **이 파일에 규칙은 있는데 코드가 그 규칙을 안 지키고 있는 곳을 발견했을 때**
  → 규칙을 고칠 게 아니라 코드를 고친다. 작업 중 눈에 띄면 보고에 적는다
  (실제 사례: "외부 fetch 에는 반드시 `AbortController`" 규칙이 있는데
  이미지 생성 호출 한 곳만 지키지 않아 로딩이 끝나지 않을 수 있었다)
- 같은 주의사항을 프롬프트에 세 번 이상 반복해 쓰고 있을 때 → 이 파일로 옮길 신호

## 보고 형식
작업이 끝나면 다음을 보고한다.
- 수정한 파일과 앵커 위치(줄 번호), 등장 횟수 확인 결과
- 판단이 갈린 지점과 그 근거
- 검증 명령 실행 결과
- 커밋 해시
- 폰에서 눈으로 확인해야 할 항목

보고에는 사용자가 **대조할 수 있는 값**을 넣는다. "잘 됐습니다" 같은 표현으로 대신하지 않는다.

| 작업 | 반드시 넣을 증거 |
|---|---|
| 코드 수정 | 변경 파일 목록 + `git diff --stat` 출력 |
| 커밋·push | 커밋 해시와 **push한 브랜치 이름** |
| 배포 | 워크플로 런 번호와 `conclusion` 값, 확인에 쓴 명령 그대로 |
| 치환 | 앵커 등장 횟수 `assert` 통과 여부 |
| 검증 | 실행한 명령과 통과 여부. 생략한 것이 있으면 생략했다고 명시 |

실행하지 않은 명령의 예상 결과, 확인하지 않은 배포 상태는 보고에 쓰지 않는다.
