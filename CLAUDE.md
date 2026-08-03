# idkr-buddy 프로젝트 작업 규칙

## 배포 방식
- 이 프로젝트는 웹(폰) Claude Code 환경에서 작업합니다.
- 코드 수정 후 별도 언급 없이 **항상 자동으로 `main` 브랜치에 push까지 완료**합니다.
- GitHub Actions가 `main` push 시 자동으로 빌드·배포(GitHub Pages)합니다.

## 코딩 규칙

### 금지 사항
- 정규식 리터럴(`/.../`) 금지 — 항상 `new RegExp("...")` 사용 (주입 시 깨짐)
- setState 여러 개 + `navigate()` 동시 호출 금지 (WebView 크래시) — setState 없는 `cancelOperations()`/`teardown()` 패턴 사용
- 성경 오디오 약어에 `toLowerCase()` 금지 (R2 키는 대소문자 구분, 룻기만 `RUT` 대문자)
- `src/lib/tts.ts`, `src/components/PlayButton.tsx` 수정 금지 (여러 페이지 공용)
- 이미지를 localStorage에 저장 금지 → IndexedDB 사용 (`kata-dict-images`, 5,000장 FIFO)
- YAML 안 Java 코드에서 큰따옴표 이스케이프(`\"`) 금지

### 필수 패턴
- 모든 `speechSynthesis` 호출은 optional chaining + try/catch로 보호 (WebView에서 undefined 가능)
- 외부 네트워크 호출(fetch)에는 반드시 `AbortController` 타임아웃을 건다 (무한 로딩 방지)
- 필터된 목록의 순서 이동은 ID 기반 (`reorderCategoryById`, `moveCategoryToEdgeWithin`) — 인덱스 방식 금지
- 단어 추가 시 중복 방지: `addWordIfAbsent` + `hasWordInCategory`
- TTS 텍스트 내용이 바뀌면 `cacheKey`를 반드시 올린다
- `MY_WORDBOOK_ID`는 각 페이지에 `"my-wordbook"`으로 로컬 정의 (import하지 않음)

### Tailwind
- `bg-primary/10` 등 반투명은 어두운 배경 위에서 거의 안 보임 → `bg-card`(불투명) + gradient overlay 사용
- 임의값 calc는 인라인 style 권장

### 커밋
- 신규 파일은 그 파일을 import하는 기존 파일보다 먼저 커밋
- `src/data/seed.json`은 생성 파일 — 커밋 금지
- 커밋 전 파일 끝이 온전한지 확인 (붙여넣기 잘림 방지)
