// src/data/tasteAudio.ts
// 무료 맛보기 회화 장면(01 처음 만나 인사)의 음성 파일 목록 — scripts/gen-taste-audio.mjs 가 만들어 덮어씁니다.
// 서버는 무료 사용자의 회화 음성(shared-audio)을 잠가 두므로(2026-11-23 Arga 결정 D4: 서버는 바꾸지 않음),
// 이 장면만 미리 만든 파일(public/audio/taste/…)을 앱에 담아 듣게 합니다.
//
// 파일을 아직 만들지 않았으면 null — 그동안 무료 사용자에게는 이 장면의 듣기 단추를 보이지 않습니다(글은 보임).
// 장면의 대사를 고쳐 rev 가 오르거나 줄 수가 바뀌면 이 목록과 맞지 않게 되어 파일을 쓰지 않습니다 — 스크립트를 다시 돌립니다.

export interface TasteAudio {
  sceneId: string;
  rev: number;
  lineCount: number;
  /** 앱 주소 기준 경로(BASE_URL 뒤). 예: "audio/taste/dasar-kenalan-r2/all.mp3" */
  all: string;
  /** 줄마다 하나(줄 순서대로) */
  lines: string[];
}

export const TASTE_AUDIO: TasteAudio | null = {
  "sceneId": "dasar-kenalan",
  "rev": 2,
  "lineCount": 13,
  "all": "audio/taste/dasar-kenalan-r2/all.mp3",
  "lines": [
    "audio/taste/dasar-kenalan-r2/line-01.mp3",
    "audio/taste/dasar-kenalan-r2/line-02.mp3",
    "audio/taste/dasar-kenalan-r2/line-03.mp3",
    "audio/taste/dasar-kenalan-r2/line-04.mp3",
    "audio/taste/dasar-kenalan-r2/line-05.mp3",
    "audio/taste/dasar-kenalan-r2/line-06.mp3",
    "audio/taste/dasar-kenalan-r2/line-07.mp3",
    "audio/taste/dasar-kenalan-r2/line-08.mp3",
    "audio/taste/dasar-kenalan-r2/line-09.mp3",
    "audio/taste/dasar-kenalan-r2/line-10.mp3",
    "audio/taste/dasar-kenalan-r2/line-11.mp3",
    "audio/taste/dasar-kenalan-r2/line-12.mp3",
    "audio/taste/dasar-kenalan-r2/line-13.mp3"
  ]
};
