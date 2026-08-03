# 설계 배경과 사고 기록

`CLAUDE.md`가 "무엇을 하고 하지 말 것"이라면, 이 문서는 **"왜 그런가"**입니다.
규칙만 보고 판단이 안 설 때, 또는 기존 구조를 바꾸려 할 때 먼저 읽으세요.

---

## 1. 앱이 왜 이런 구조인가

```
코드 커밋 → GitHub Actions 빌드 → GitHub Pages 호스팅
                                        ↑ 앱 실행마다 여기서 로드
                              폰의 APK (WebView 껍데기) 2대
```

사용자가 2명(개발자 본인 + 아내)뿐이라 서버를 두지 않고, APK를 껍데기로만 만들어 매번 재설치하지 않아도 되게 했습니다. 그래서 **화면·로직 변경은 커밋만으로 두 폰에 반영**되고, 네이티브 계층(`MainActivity.java` / `build-apk.yml` / `AndroidManifest.xml`)을 건드릴 때만 APK를 다시 빌드합니다.

- `main.tsx`에 서비스워커 자동 업데이트 로직이 있어 포그라운드 복귀 시 새 버전을 확인합니다.
- 반영이 안 보이면 앱을 **완전 종료 후 재실행**하면 됩니다.
- `versionCode`는 `GITHUB_RUN_NUMBER`로 자동 증가시킵니다. 고정값이면 "앱이 설치되지 않음" 오류가 납니다.

---

## 2. 성경 낭독은 왜 TTS가 아니라 R2 스트리밍인가

`/bible`의 '듣기'는 Gemini 합성음이 아니라 **실제 낭독(Alkitab Suara TB) mp3**입니다. 2026-07-27에 교체했습니다. 품질이 확연히 낫고, API 과금이 0이며, 시크가 가능합니다.

| 항목 | 값 |
|---|---|
| 버킷 | `kata-bible-audio` (Cloudflare R2, Asia-Pacific) |
| 공개 주소 | `https://pub-2d9d776a8be94ef886ff6b7e2678aaf9.r2.dev` |
| 경로 접두 | `ororj7zwt6n1` (저작권 노출 최소화용 비공개성 경로) |
| 파일 규칙 | `{BASE}/ororj7zwt6n1/{약어}/{약어}{장3자리}.mp3` |
| 총량 | 1,189 objects / 3.82 GiB |

### 약어는 룻기만 대문자
66권 중 **룻기만 `RUT`**, 나머지 65개는 소문자입니다. R2 키는 대소문자를 구분하므로 `rut/rut001.mp3`는 404입니다.
→ **약어에 `toLowerCase()`를 절대 붙이지 말 것.** 매핑은 `src/lib/bible.ts`의 `audio` 필드에 66권 전부 들어 있습니다(검증 완료: 66/66, 장수 합계 1,189).
혼동 주의: `fil`=빌립보서(4장), `flm`=빌레몬서(1장).

### 알아둘 제약
1. **CORS 헤더가 없다.** `pub-*.r2.dev`는 `Access-Control-Allow-Origin`을 주지 않습니다. `crossOrigin` 미설정 `<audio>` 재생은 문제없지만, 나중에 Web Audio / fetch 캐싱 / 워크박스 런타임 캐시를 붙이려면 **R2에 CORS 정책 추가가 선행**되어야 합니다.
2. **오프라인 재생 불가.** mp3는 서비스워커 캐시 대상이 아닙니다(globPatterns는 빌드 산출물만). 장당 1~10MB 데이터를 씁니다.
3. **시크는 드래그 종료 시 1회만.** 스트리밍 중 `currentTime`을 연속 변경하면 Range 요청이 취소·재개설되면서 `error`로 재생이 끊깁니다. `BibleAudioSeekBar`는 `draggingRef` + state 이중화로 손을 뗄 때만 `seek()`합니다.
4. 커스텀 도메인으로 옮기려면 `bibleAudio.ts`의 `AUDIO_BASE` **한 줄만** 고치면 됩니다.

### 음질
구약(시편 101~150 제외) 879장과 신약 260장은 64kbps입니다. **시편 101~150 중 48장만 16kbps/8kHz**로 유일한 약점입니다. archive.org 컬렉션에 해당 구간이 없어 기존 세트로 메웠습니다. 개선하려면 로컬 `bible-dl4-psalms.ps1`을 재실행해 성공분만 R2에 덮어쓰면 됩니다(언제 중단해도 세트는 완결 유지).

### 재업로드 절차

```
rclone copy "로컬\bible-audio-cd" "r2:kata-bible-audio/ororj7zwt6n1" --transfers 8 --checksum --s3-chunk-size 16M -P
rclone check "로컬\bible-audio-cd" "r2:kata-bible-audio/ororj7zwt6n1" --checksum --one-way
```

**`--checksum`은 필수입니다.** 과거 "크기는 같은데 내용이 다른" 손상 사고가 있었습니다.
API 토큰은 단일 버킷 스코프라 `rclone lsd r2:`가 403인 것이 정상입니다(ListBuckets 권한 밖). 버킷을 명시하면 동작합니다.

---

## 3. 음성 재생이 두 갈래인 이유

| | 엔진 | 사용처 | 컴포넌트 |
|---|---|---|---|
| Gemini Cloud TTS | `gemini-3.1-flash-tts-preview` | 묵상 / 이야기 / 기도 / 사전 등 | `PlayButton` + `ttsPlayer` |
| 실제 낭독 스트리밍 | R2 mp3 | 성경 읽기(`/bible`)만 | `BibleAudioButton` + `bibleAudioPlayer` |

묵상은 **절 단위**라 장 전체 mp3를 붙이는 게 부적합해 Cloud TTS를 유지했습니다.
둘은 **상호 배제**입니다 — `bibleAudioPlayer.play()`가 `ttsPlayer.stop()`을 호출하고, 페이지 전환 시 각자 `stop()`합니다.
Cloud TTS는 PCM→WAV 변환(ArrayBuffer/DataView) 후 문단 단위로 청크를 만들고 IndexedDB에 5,000 FIFO로 캐시합니다.
`tts.ts` / `PlayButton.tsx`는 여러 페이지가 공유하므로 **수정 금지**입니다. 폰 네이티브 TTS(`window.AndroidTTS`)는 발음 듣기 같은 짧은 재생에 남아 있습니다.

---

## 4. 캐시 정책 — 비용이 설계를 결정했다

| 항목 | 비용 |
|---|---|
| 사전 이미지 1장 | 약 55원 ($0.039) ← Gemini 비용의 대부분 |
| 뉴스 | 하루 20~40원 |
| 텍스트(사전/이야기/단어조회) | 몇 원 이하 |
| 성경 낭독 | 0원 (R2 무료 한도 내, 이그레스 영구 무료) |

**원칙: 한 번 생성한 것은 IndexedDB에 영구 보관해 재과금을 0으로 만든다.**

- **이미지는 자동 생성하지 않는다.** "이미지 보기" 수동 버튼을 눌러야 생성되고, 이후 그 단어는 자동 표시됩니다.
- **사전 검색 결과 캐시**(`kata-dict-results`): 4종 전부 저장, 5,000건 FIFO, 유효기간 없음. 캐시 키는 `{kind}:{정규화 검색어}`이며 **인니어만 소문자화하고 한국어는 공백만 정리**합니다. 캐시 적중 시 `setLoading(true)`를 아예 거치지 않아 로딩 화면이 깜빡이지 않습니다. "다시 검색"(RotateCcw) 버튼으로 캐시를 무시하고 갱신할 수 있습니다.
- 이야기는 3단 캐시(카드 메모리 → IndexedDB → API)입니다.
- 뉴스는 날짜 키로 저장해 하루 1회만 API를 호출합니다.
- 설정의 "저장된 사전 이미지·단어 비우기"는 이미지 + 찾아본 단어 + 검색 결과 캐시를 **함께** 지웁니다.

429가 나면 ① 지출 한도 확인 ② 모델 순서 변경 ③ 백오프 재시도 순으로 봅니다.
이미지 모델은 `gemini-3.1-flash-image` → `gemini-2.5-flash-image` 폴백, 텍스트는 `gemini-flash-lite-latest`입니다.

R2는 위험 요소가 사실상 없습니다: 저장 3.82GB(한도 10GB), 이그레스 무료, 읽기 1,000만/월 한도인데 사용자 2명 기준 월 200~600MB 수준입니다.

---

## 5. 네트워크 호출에 타임아웃이 필요한 이유

사전 검색이 "검색 중"에서 영원히 멈추는 버그가 있었습니다. 원인은 `callGeminiJSON`의 fetch에 타임아웃이 없어 응답이 안 오면 무한 대기했기 때문입니다. `finally { setLoading(false) }`가 있어도 **await가 끝나지 않으면 finally에 도달하지 못합니다.**

그래서 Gemini/서버 호출에는 다음을 표준으로 삼습니다.
- `AbortController` 타임아웃 (사전 30초 / 이야기 60초 / 뉴스 120초 / 설교문 서버 15초 — 출력이 길수록 길게)
- 재시도는 `TIMEOUT` · `NETWORK` · 5xx · `EMPTY_RESPONSE`에 대해 **1회만**. 429·400·403은 재시도해도 소용없으므로 즉시 실패시킵니다.
- `maxOutputTokens`를 명시합니다. 없으면 응답이 중간에 잘려 파싱이 실패하고 `EMPTY_RESPONSE`로 보입니다. 뉴스는 기사 6건이 인니어+한국어로 나오므로 32768이 필요합니다.
- 에러 코드는 화면 메시지와 1:1로 대응시킵니다. 과거 **400을 `INVALID_API_KEY`로 매핑**해 두어, 실제로는 요청 형식 문제인데 "API 키가 올바르지 않습니다"가 뜨는 오진이 있었습니다.

---

## 6. 설교문 기능 (2026-08)

주일 설교문을 폰에서 읽고 S펜으로 주석을 다는 기능입니다.

- **Cloudflare Worker** `https://kata-sermon.cura4world.workers.dev`, KV 바인딩 `KATA_KV`, 시크릿 `KATA_KEY`
- 업로드는 `sermon-upload.html` (의존성 없는 단독 HTML, 네이티브 `DecompressionStream`으로 `.docx` 파싱)
- 파서는 **인도네시아어→한국어 교대 쌍**을 기본으로 하되, **한국어만 있는 초안도 처리**합니다(단측 유연 파싱).
- 설교문 메뉴는 `hasSermonConfig()`(localStorage)로 게이팅되어 **설정을 넣은 폰에서만** 보입니다.
- 필기는 `sermonInk.ts`가 IndexedDB(`kata-sermon-ink`)에 좌표 배열로 저장합니다. 양이 커질 수 있어 localStorage는 쓰지 않습니다. 저장 패턴은 `storyStore.ts`와 동일한 openDB 싱글톤 Promise 방식입니다.
- 필기 좌표는 **당시 글자 크기 단계와 본문 폭(px)을 함께 저장**합니다. 나중에 글자 크기가 바뀌어도 위치를 보정하기 위함입니다.
- 성경 인용은 이탤릭 없이 cyan-600 계열로 통일하고 세로선을 맞췄습니다.

---

## 7. 묵상 QT 파이프라인

두란노 QT를 두 저장소로 나눠 가져옵니다.
- `kata-qt-data` (비공개): 크롤러 + 아카이브
- `kata-qt-today` (공개): 오늘 것 단일 JSON, 매일 리셋

EUC-KR 처리, 개역개정 + 우리말성경(`&d=w`), GitHub Actions가 KST 00:30에 실행하고 06:00에 백업 실행합니다. 레코드 ID는 `QT-YYYY-MM-DD`이고 한국어 성경 구절은 생성 시점에 IndexedDB에 저장합니다. `recHasKorean`으로 한국어가 섞여 오염된 캐시를 감지해 재생성합니다.

---

## 8. UI에서 반복해 물린 것들

### 붙여넣기 잘림 — 가장 흔한 빌드 실패 원인
폰 GitHub 웹 에디터로 긴 파일을 붙여넣으면 **중간에 잘려서 커밋**됩니다. `Dictionary.tsx`에서 19줄이 누락돼 빌드가 세 번 연속 실패한 전례가 있습니다.
- 커밋 전 맨 아래가 `export default XXX;`로 끝나는지 확인합니다.
- 단, `bible.ts`처럼 named export만 있는 모듈은 `export default`가 없습니다. 파일별로 마지막 줄을 개별 확인해야 합니다.
- 20KB 넘는 파일은 폰 커밋이 위험하고, 50KB 넘으면 PC나 Claude Code를 씁니다. 고위험: `Dictionary.tsx`, `SermonRead.tsx`, `Devotion.tsx`, `IndoMap.tsx`, `mapData.ts`(125KB+, PC 전용).
- 빌드가 깨지면 raw 파일을 받아 esbuild에 물리면 잘린 위치가 바로 나옵니다.

### WebView 크래시
setState 여러 개 + `navigate()`를 같이 호출하면 언마운트 중 setState가 발생해 크래시합니다. setState 없는 `cancelOperations()` / `teardown()`으로 정리만 하고 넘어갑니다.

### 화면 내 뒤로가기
라우트가 하나면 화면 전환이 히스토리에 남지 않아 뒤로가기가 홈으로 튑니다. `history.pushState` + `popstate`로 직접 관리합니다.
페이지 간 이동은 `goBackOr(navigate, location.key, fallback)`을 쓰고, 직접 진입 시 폴백은 `my-wordbook`이면 `/`, 아니면 `/wordbooks`입니다.

### 단어 카드 롱프레스
롱프레스 시각 효과가 스크롤 중에도 뜨는 문제가 있어, **실제 이동이 감지된 뒤에만** 발동하도록 `armedIndex` / `dragMoved`로 나눴습니다. 스와이프 배경 레이어도 스와이프 중에만 렌더합니다(반투명으로 하늘색이 비치던 문제).

### 순서 이동은 ID 기반
폴더 화면은 **필터된 목록**을 보여주므로 인덱스가 전체 배열과 어긋납니다. `reorderCategoryById` / `moveCategoryToEdgeWithin`을 써야 합니다.

### 기타
- `execCommand` 주입은 한글·정규식 리터럴을 깨뜨립니다 → `\uXXXX` 유니코드 이스케이프
- `data/` CSV는 매 빌드 재생성되므로, UI에서 단어장을 지워도 CSV가 남아 있으면 부활합니다
- 지도는 좌표계를 `toVb`로 통일하고, 탭 허용오차 56px, `multiTouched` / `sheetOpenedAt` 500ms 가드를 둡니다

---

## 9. 남은 작업 / 검토 후보

| 항목 | 상태 | 메모 |
|---|---|---|
| R2 API 토큰 rotate/삭제 | 미완 | 업로드가 끝났으므로 삭제해도 재생에는 무관 |
| 시편 101~150 음질 개선 | 보류 | `bible-dl4-psalms.ps1` 재실행 → 48장만 덮어쓰기. sabda 속도 제한 확인 선행 |
| 성경 낭독 오프라인 캐시 | 보류 | R2 CORS 정책 추가 + 서비스워커 작업이 선행되어야 함 |
| Wi-Fi에서만 재생 토글 | 검토 | 장당 1~10MB |
| 지도 확장 | 진행 중 | 도시 데이터 추가, 설명 Gemini 생성 + IndexedDB 캐시 |
| 단어장 폴더 화면 재디자인 | 대기 | 행 리스트를 `rounded-2xl` 안에, 청록 브랜드 헤더, 드래그 정렬 로직 보존 |
| 커스텀 도메인 이전 | 선택 | 확보 시 `AUDIO_BASE` 한 줄 수정 + Cloudflare 캐시로 Class B 절감 |

---

## 10. 소통 방식

- 한국어로 소통합니다.
- 설계 결정은 구현 전에 논의합니다 ("아직 만들지 말고").
- 스크린샷을 받으면 먼저 원인을 파악하고 수정합니다 (두 번 작업 방지).
- 한 번에 한 주제씩 진행하고, 열린 질문은 먼저 정리해 제시합니다.
- 선택지가 있으면 장단점을 설명하고 추천안을 제시합니다.
- 인프라 작업은 단계마다 확인하고 넘어갑니다 (한꺼번에 몰아서 하지 않음).
