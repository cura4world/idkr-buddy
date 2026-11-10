// src/fonts.ts — 앱 글꼴을 앱 안의 파일에서 읽습니다 (Google Fonts·jsdelivr 를 쓰지 않음).
// 스토어 앱(미리보기 APK)은 이 파일들이 APK 안에 들어가므로 처음 오프라인으로 열어도 같은 글꼴로 보입니다.
// 웹(PWA)에서는 처음 보는 글꼴 조각을 받을 때 서비스워커가 "kata-fonts" 캐시에 남깁니다(vite.config.ts).
//
// - Lora (font-word, 인도네시아어): 라틴 글자만. 400·500·600·700 + 400 기울임.
// - Gowun Dodum (font-body, 기본 한글): 400 한 가지. 한글은 글자 범위별로 잘게 나뉜 조각이라
//   화면에 나온 글자가 든 조각만 받습니다.
// - Pretendard (font-gothic, 설명·라벨): src/fonts.css (400·500·600·700, 한글 2,780자 서브셋).
// woff(옛 형식) 대체 파일은 vite.config.ts 의 woff2Only 플러그인이 걷어내 빌드에 넣지 않습니다.

import "@fontsource/lora/latin-400.css";
import "@fontsource/lora/latin-500.css";
import "@fontsource/lora/latin-600.css";
import "@fontsource/lora/latin-700.css";
import "@fontsource/lora/latin-400-italic.css";
import "@fontsource/gowun-dodum/400.css";
import "./fonts.css";
