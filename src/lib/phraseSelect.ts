// src/lib/phraseSelect.ts
// 본문에서 고른 표현 찾기 — 읽기 화면 공용
//
// 인니어에는 kipas angin(선풍기), kambing hitam(희생양)처럼 두 단어가 붙어야
// 뜻이 되는 표현이 많습니다. 단어 하나만 탭하면 이런 표현이 샙니다.
//
// 안드로이드 기본 텍스트 선택을 그대로 씁니다. 우리가 하는 일은
// "지금 고른 게 본문 안의 인니어 1~3단어인가"를 보고 알려주는 것뿐입니다.
// user-select 를 막지 않으므로 본문을 긁어 복사하는 기능은 그대로 살아 있습니다.
//
// 본문인지 아닌지는 renderTokens 가 각 토큰에 붙이는 data-idw 로 판단합니다.
// 헤더·도구막대에서 긁은 것은 걸러집니다.

import { useEffect, useRef, useState } from "react";

/** 한 번에 찾을 수 있는 최대 단어 수 */
export const MAX_PHRASE_WORDS = 3;

/** 화면에 보이는 토큰에는 쉼표·마침표가 붙어 있으므로 조회 전에 걷어냅니다 */
export const cleanToken = (t: string) =>
  t.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();

/** 고른 문자열을 조회에 쓸 표현으로 다듬습니다 (줄바꿈·구두점 정리) */
export const cleanPhrase = (s: string) =>
  s
    .split(new RegExp("\\s+"))
    .map(cleanToken)
    .filter(Boolean)
    .join(" ");

/** 지금 글자를 고르는 중인지 (스와이프 뒤집기를 막는 데 씁니다) */
export function hasLiveSelection(): boolean {
  try {
    const sel = window.getSelection();
    return !!sel && !sel.isCollapsed;
  } catch (e) {
    return false;
  }
}

export interface SelectedPhrase {
  /** 고른 표현 (없으면 빈 문자열) */
  phrase: string;
  /** 고른 표현과 문맥 문장을 넘겨받고 선택을 해제합니다 */
  take: () => { phrase: string; sentence: string };
}

export function useSelectedPhrase(): SelectedPhrase {
  const [phrase, setPhrase] = useState("");
  const sentenceRef = useRef("");

  useEffect(() => {
    let timer = 0;
    const onSel = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setPhrase("");
          return;
        }
        const raw = sel.toString();
        if (!raw || raw.length > 60) {
          setPhrase("");
          return;
        }
        const node = sel.anchorNode;
        const el = node
          ? (node.nodeType === 1 ? (node as Element) : node.parentElement)
          : null;
        const host = el ? el.closest("[data-idw]") : null;
        if (!host) {
          setPhrase("");
          return;
        }
        const p = cleanPhrase(raw);
        const words = p ? p.split(" ") : [];
        if (words.length < 1 || words.length > MAX_PHRASE_WORDS) {
          setPhrase("");
          return;
        }
        // 뜻풀이에 문맥으로 넘길 문장 = 그 토큰들이 들어 있는 덩어리
        sentenceRef.current =
          (host.parentElement && host.parentElement.textContent) || raw;
        setPhrase(p);
      }, 180);
    };
    document.addEventListener("selectionchange", onSel);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const take = () => {
    const p = phrase;
    const s = sentenceRef.current;
    try {
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    } catch (e) {}
    setPhrase("");
    return { phrase: p, sentence: s };
  };

  return { phrase, take };
}
