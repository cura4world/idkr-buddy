// src/lib/mapContent/types.ts
// 지도 지점 내용(설명 · 단어 · 사진)의 정적 데이터 타입입니다.
//
// 예전에는 지점 설명을 Gemini로 매번 생성했는데, 지점이 131곳으로 한정되어 있고
// 생성 방식은 지점끼리 무엇을 썼는지 모르기 때문에 설명도 단어도 서로 겹쳤습니다.
// 미리 써서 저장소에 두면 전체를 놓고 겹치지 않게 배분할 수 있고, 비용도 0이며,
// API 키가 없어도 나옵니다.
//
// 지역별 파일로 나눠 둡니다. 파일 하나가 곧 한 번의 작업 단위이자 커밋 단위입니다.

export interface MapWord {
  word: string;       // 인니어 단어
  meaning: string;    // 한국어 뜻
  example: string;    // 인니어 예문 (그 지역 이야기로)
  exampleKo: string;  // 예문 번역
}

export interface MapContentEntry {
  // 한국어 설명. 문단은 "\n\n" 으로 나눕니다 (시트가 whitespace-pre-line 으로 그립니다)
  desc: string;
  // 그 지역에서 배우는 단어. 지도 전체에서 한 단어는 한 지점에만 둡니다.
  // 마땅한 단어가 없으면 빈 배열로 두고, 시트는 단어 칸을 그리지 않습니다.
  words: MapWord[];
  // 영문 위키피디아 문서 제목. 핀 id 를 그대로 쓰면 엉뚱한 문서에 걸리는 곳만 적습니다.
  // 지도 사진 고정 목록을 만드는 scripts/build-map-photos.mjs 가 읽습니다(앱은 쓰지 않음).
  wiki?: string;
  // 쓰지 않습니다(예전 실시간 사진 검색용). 사진은 src/lib/mapPhotos.ts 고정 목록만 씁니다.
  photos?: string[];
}

export type MapContentTable = Record<string, MapContentEntry>;
