# idkr-buddy (Kata kata) 작업 규칙

인도네시아어–한국어 학습 PWA. 사용자는 개발자 본인과 아내 2명뿐이며 같은 Gemini API 키를 공유합니다.
**설계 배경과 과거 사고 기록은 `DECISIONS.md`에 있습니다.** 왜 이렇게 되어 있는지 궁금하면 그 파일을 먼저 읽으세요.

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
- **APK는 껍데기**라 코드 수정은 앱 재실행만으로 두 폰 모두 반영됩니다.
- APK 재빌드가 필요한 경우는 `MainActivity.java` / `build-apk.yml` / `AndroidManifest.xml` 변경 시**뿐**입니다.

## 작업 절차
1. 편집 **직전에** 대상 파일의 최신 내용을 다시 읽는다 (로컬 사본이 오래됐을 수 있음).
2. 치환 앵커는 **파일 내 정확히 1회 등장**하는지 확인한다. Python heredoc + `assert s.count(anchor) == 1` 방식이 가장 안전하다.
3. 검증 명령을 모두 통과시킨다.
4. 파일별로 개별 커밋한다.
5. 실패하면 커밋하지 말고 원인을 보고한다.

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
  pages/
    Index.tsx          메인화면
    Dictionary.tsx     사전 (~1,043줄, 최대 파일 — 한 곳만 정밀 수정할 것)
    Story.tsx          이야기
    News.tsx           뉴스
    Devotion.tsx       두란노 QT 묵상
    BibleRead.tsx      성경 읽기 (R2 낭독 스트리밍)
    Prayer.tsx         기도문
    Sermons.tsx        설교문 목록
    SermonRead.tsx     설교문 읽기 + S펜 필기 (~1,594줄)
    IndoMap.tsx        인도네시아 지도 (SVG 85핀)
    Insight*.tsx       인도네시아 이해 허브 + 서브 6개
    Wordbooks.tsx / CategoryDetail.tsx / StudyMode.tsx / QuizMode.tsx
    SavedWords.tsx / SavedStudyMode.tsx / SavedQuizMode.tsx
  components/
    BiblePicker.tsx / BibleAudioButton.tsx / BibleAudioSeekBar.tsx
    PlayButton.tsx           수정 금지
    CategoryCard.tsx / EditWordDialog.tsx / AddWordDialog.tsx
    AddCategoryDialog.tsx / EditCategoryDialog.tsx / CSVImportDialog.tsx
    SettingsDialog.tsx
  lib/
    bible.ts        66권 테이블 (id/folder/ko/idName/chapters/usfm/audio)
    bibleAudio.ts   R2 낭독 스트리밍 싱글톤
    dictionary.ts   사전 Gemini 호출 + 타입
    dictStore.ts    사전 결과 IndexedDB 캐시
    store.ts        localStorage 단어장 데이터
    story.ts / storyStore.ts
    news.ts / prayer.ts / devotion.ts
    sermon.ts       Cloudflare Worker 호출 + IndexedDB
    sermonInk.ts    S펜 필기 저장 (IndexedDB)
    mapData.ts      지도 좌표·핀 (대용량 125KB+)
    imageStore.ts / wordStore.ts
    tts.ts          수정 금지
    nav.ts          goBackOr / wordbookFallback
    fontScale.ts / gemini.ts
  data/seed.json    생성 파일 — 커밋 금지
data/categories/*.csv       공용 기본 단어장
data/private/{폴더명}/*.csv  개인 단어장
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

- 시각적 변경은 자동 검증할 수 없다 (Playwright 미설치). 폰에서 눈으로 확인하는 단계이므로, 무엇을 확인해야 하는지 보고에 적을 것.
- 배포 결과 확인:

```bash
curl -s "https://api.github.com/repos/cura4world/idkr-buddy/actions/runs?per_page=4"
```

## 커밋 규칙
- **신규 파일을 먼저 커밋**한 뒤, 그 파일을 import하는 기존 파일을 커밋한다 (중간 빌드 깨짐 방지)
- 파일별로 개별 커밋, 메시지는 한국어로 "영역: 무엇을 바꿨는지"
- 커밋 전 파일 끝이 온전한지 확인한다 (`export default XXX;` 등)

## 보고 형식
작업이 끝나면 다음을 보고한다.
- 수정한 파일과 앵커 위치(줄 번호), 등장 횟수 확인 결과
- 판단이 갈린 지점과 그 근거
- 검증 명령 실행 결과
- 커밋 해시
- 폰에서 눈으로 확인해야 할 항목
