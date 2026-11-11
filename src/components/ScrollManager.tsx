// src/components/ScrollManager.tsx
// 화면을 옮길 때 스크롤 위치 정리 (2026-11-11 사용자 요청).
//
// 문제: 앱이 한 페이지(SPA)라 화면을 옮겨도 창의 스크롤 위치가 그대로 남았습니다.
//   그래서 목록 아래쪽을 보다가 들어간 화면이 중간·맨 아래부터 보였습니다
//   (인도네시아 역사, 단어장 등).
//
// 규칙
//   - 새 화면으로 들어가면(PUSH·REPLACE) 맨 위에서 시작합니다.
//   - 뒤로가기로 돌아오면(POP) 그 칸에서 마지막으로 보던 위치로 되돌립니다(내용이 늦게 그려지면 잠깐 기다림).
//   - 화면이 따로 위치를 정하는 경우(단어장 CategoryDetail 의 단어장별 기억, 이야기·회화 등의 돌아올 표)는
//     그 화면의 useEffect 가 이것보다 나중에 돌므로 화면 쪽이 이깁니다.
//   - <Routes> 보다 앞에 두어야 이 레이아웃 효과가 화면들보다 먼저 돕니다.

import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const positions = new Map<string, number>();
const frozen = new Set<string>();

const ScrollManager = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.key;

  // 주의: history.scrollRestoration 은 "auto"(기본) 그대로 둡니다. 한 화면 안에서 pushState 로 쌓은 칸
  // (목록 → 기사 등)을 뒤로 돌아갈 때 브라우저가 보던 자리를 되돌려 주는 데 여러 화면이 기대고 있습니다.

  // 이 칸의 스크롤 위치를 기억합니다. 화면이 바뀌는 순간(레이아웃 정리)부터는 기록을 멈춰,
  // 새 화면 때문에 줄어든 위치가 이전 칸에 잘못 적히지 않게 합니다.
  useLayoutEffect(() => {
    frozen.delete(key);
    const onScroll = () => {
      if (frozen.has(key)) return;
      positions.set(key, window.scrollY || 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      frozen.add(key);
      window.removeEventListener("scroll", onScroll);
    };
  }, [key]);

  useLayoutEffect(() => {
    if (navType !== "POP") {
      try { window.scrollTo(0, 0); } catch (e) {}
      return;
    }
    const y = positions.get(key) || 0;
    if (y <= 0) {
      try { window.scrollTo(0, 0); } catch (e) {}
      return;
    }
    let tries = 0;
    let raf = 0;
    const apply = () => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (max < y && tries < 40) {
        tries++;
        raf = window.requestAnimationFrame(apply);
        return;
      }
      try { window.scrollTo(0, Math.min(y, max)); } catch (e) {}
    };
    apply();
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
};

export default ScrollManager;
