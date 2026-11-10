// src/components/WordIllust.tsx
// 단어 카드의 색연필 그림. 단어 글자와 스피커 사이 빈칸에 깔립니다(카드 크기는 그대로).
//
//   <PencilDefs />            — 색연필 필터(pcFill·pcLine). 그림이 있는 화면에 한 번만 둡니다.
//   <WordIllust scene={...}/> — 단어 줄(position: relative) 안에 넣습니다. 글자 아래 층(z-0).
//
// 그림은 카드가 화면 가까이 왔을 때만 그립니다(필터가 들어간 SVG 가 수십 개라 긴 목록에서 부담).
//
// 자리 (QA Q02): 장면의 r·t·h 는 "원하는 자리"일 뿐입니다. 실제로 그릴 때는 같은 줄의 글자
// (단어·뜻의 줄마다 실제 글자 폭)와 버튼(스피커)을 재서, 그 사이 빈칸에만 놓습니다.
// 빈칸이 모자라면 오른쪽(스피커 쪽)·위아래로 옮기고, 그래도 모자라면 최소 높이(40px)까지
// 줄이고, 그래도 안 되면 그리지 않습니다. 계산은 src/lib/illustFit.ts.
// 화면 폭·글자 크기가 바뀌면 줄 크기가 바뀌므로 ResizeObserver 하나(모든 그림 공용)가
// 다시 잽니다. 재기는 한꺼번에 읽고 나서 한꺼번에 씁니다(읽기·쓰기를 섞지 않음).

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { IllustScene } from "@/lib/illust";
import { fitIllust, vbAspect, ILLUST_MIN_H, FitRect, FitResult } from "@/lib/illustFit";

// 칠: 가장자리를 살짝 흔들고 종이 결을 남김 / 윤곽선: 더 가늘게 흔들린 진한 선을 반투명으로 겹침
const DEFS_HTML =
  '<defs>' +
  '<filter id="pcFill" x="-15%" y="-15%" width="130%" height="130%">' +
  '<feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="4" result="n1"></feTurbulence>' +
  '<feDisplacementMap in="SourceGraphic" in2="n1" scale="3" xChannelSelector="R" yChannelSelector="G" result="wob"></feDisplacementMap>' +
  '<feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="9" result="g"></feTurbulence>' +
  '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.6" result="ga"></feColorMatrix>' +
  '<feComposite in="wob" in2="ga" operator="in"></feComposite>' +
  '</filter>' +
  '<filter id="pcLine" x="-15%" y="-15%" width="130%" height="130%">' +
  '<feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="11" result="n2"></feTurbulence>' +
  '<feDisplacementMap in="SourceGraphic" in2="n2" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="wob2"></feDisplacementMap>' +
  '<feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="2" result="g2"></feTurbulence>' +
  '<feColorMatrix in="g2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.5" result="ga2"></feColorMatrix>' +
  '<feComposite in="wob2" in2="ga2" operator="in"></feComposite>' +
  '</filter>' +
  '</defs>';

// 윤곽선 겹은 같은 도형을 칠 없이 진한 갈색 가는 선으로 다시 그립니다.
const PCOL_CSS = ".pcol *{fill:none !important;stroke:#6B5444 !important;stroke-width:1.1 !important}";

export function PencilDefs() {
  return (
    <>
      <style>{PCOL_CSS}</style>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        dangerouslySetInnerHTML={{ __html: DEFS_HTML }}
      />
    </>
  );
}

function sceneSvg(s: IllustScene): string {
  const line = s.line !== false;
  return (
    '<g filter="url(#pcFill)">' + s.art + "</g>" +
    (line ? '<g class="pcol" filter="url(#pcLine)" opacity="0.5">' + s.art + "</g>" : "")
  );
}

// ───────────────────────── 화면 가까이 왔는지 (공용 IntersectionObserver 하나)

const nearCallbacks = new Map<Element, () => void>();
let nearIO: IntersectionObserver | null = null;
let nearIOFailed = false;

function watchNear(el: Element, cb: () => void): () => void {
  if (!nearIO && !nearIOFailed) {
    try {
      nearIO = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const f = nearCallbacks.get(e.target);
            if (!f) continue;
            nearCallbacks.delete(e.target);
            try { nearIO?.unobserve(e.target); } catch (err) {}
            f();
          }
        },
        { rootMargin: "400px 0px" }
      );
    } catch (err) {
      nearIOFailed = true;
    }
  }
  if (!nearIO) {
    cb();
    return () => {};
  }
  nearCallbacks.set(el, cb);
  nearIO.observe(el);
  return () => {
    nearCallbacks.delete(el);
    try { nearIO?.unobserve(el); } catch (err) {}
  };
}

// ───────────────────────── 자리 재기 (공용 ResizeObserver 하나)

interface Placed {
  box: HTMLDivElement;
  scene: IllustScene;
  aspect: number;
}

/** 단어 줄(그림의 부모) → 그 줄의 그림 */
const placed = new Map<Element, Placed>();
let sizeRO: ResizeObserver | null = null;
let sizeROFailed = false;
let sharedRange: Range | null = null;
const pendingRows = new Set<Element>();
let flushHandle = 0;
let globalHooked = false;

function ensureGlobalHooks() {
  if (globalHooked) return;
  globalHooked = true;
  // 웹 글꼴이 늦게 들어오면 글자 폭이 바뀝니다(줄 크기는 그대로일 수 있음)
  try {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.addEventListener?.("loadingdone", () => scheduleAll());
    fonts?.ready?.then(() => scheduleAll()).catch(() => {});
  } catch (err) {}
  if (sizeROFailed) {
    try { window.addEventListener("resize", () => scheduleAll()); } catch (err) {}
  }
}

function getSizeRO(): ResizeObserver | null {
  if (sizeRO || sizeROFailed) return sizeRO;
  try {
    sizeRO = new ResizeObserver((entries) => {
      // 이 시점에는 레이아웃이 끝나 있으므로 바로 읽고, 다 읽은 뒤 씁니다.
      layoutRows(entries.map((e) => e.target));
    });
  } catch (err) {
    sizeROFailed = true;
    sizeRO = null;
  }
  return sizeRO;
}

function scheduleRow(row: Element) {
  pendingRows.add(row);
  if (flushHandle) return;
  const run = () => {
    flushHandle = 0;
    const rows = Array.from(pendingRows);
    pendingRows.clear();
    layoutRows(rows);
  };
  try {
    flushHandle = window.requestAnimationFrame(run);
  } catch (err) {
    flushHandle = window.setTimeout(run, 16);
  }
}

function scheduleAll() {
  placed.forEach((_p, row) => scheduleRow(row));
}

function layoutRows(rows: Element[]) {
  // 1) 읽기만
  const plans: Array<[Placed, FitResult | null]> = [];
  for (const row of rows) {
    const p = placed.get(row);
    if (!p || !row.isConnected) continue;
    let fit: FitResult | null = null;
    try { fit = measure(row as HTMLElement, p); } catch (err) { fit = null; }
    plans.push([p, fit]);
  }
  // 2) 쓰기만 (그림 상자는 absolute 라 줄 크기를 바꾸지 않음 → 다시 재기 고리가 생기지 않음)
  for (const [p, fit] of plans) apply(p, fit);
}

function measure(row: HTMLElement, p: Placed): FitResult | null {
  const rr = row.getBoundingClientRect();
  if (rr.width <= 0) return null;
  // 누르는 동안 카드가 scale(0.96) 되므로 화면 px → 레이아웃 px 로 되돌립니다.
  const ow = row.offsetWidth;
  const sc = ow > 0 ? rr.width / ow : 1;
  const rel = (q: { left: number; top: number; right: number; bottom: number }): FitRect => ({
    l: (q.left - rr.left) / sc,
    t: (q.top - rr.top) / sc,
    r: (q.right - rr.left) / sc,
    b: (q.bottom - rr.top) / sc,
  });

  const texts: FitRect[] = [];
  const buttons: FitRect[] = [];
  if (!sharedRange) sharedRange = document.createRange();
  const range = sharedRange;
  for (const child of Array.from(row.children)) {
    if (child === p.box) continue;
    if (child.tagName === "BUTTON") {
      buttons.push(rel(child.getBoundingClientRect()));
      continue;
    }
    child.querySelectorAll("button").forEach((bt) => buttons.push(rel(bt.getBoundingClientRect())));
    const tw = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = tw.nextNode())) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      range.selectNodeContents(n);
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const q = rects[i];
        if (q.width > 0 && q.height > 0) texts.push(rel(q));
      }
    }
  }

  // 위: 카드 위 끝에서 2px 까지 (장면 t 는 -10~-14). 아래: 예문 상자 위 끝 바로 앞까지.
  const card = row.parentElement;
  const cr = card ? card.getBoundingClientRect() : null;
  const topLimit = cr ? (cr.top - rr.top) / sc - 2 : -14;
  const next = row.nextElementSibling;
  const bottomLimit = next
    ? (next.getBoundingClientRect().top - rr.top) / sc - 1
    : cr
      ? (cr.bottom - rr.top) / sc - 4
      : rr.height / sc + 6;

  const s = p.scene;
  return fitIllust({
    rowW: rr.width / sc,
    texts,
    buttons,
    topLimit,
    bottomLimit,
    h: s.h,
    r: typeof s.r === "number" ? s.r : 56,
    t: typeof s.t === "number" ? s.t : -12,
    aspect: p.aspect,
    minH: ILLUST_MIN_H,
  });
}

function apply(p: Placed, fit: FitResult | null) {
  const st = p.box.style;
  if (!fit) {
    st.display = "none";
    return;
  }
  st.display = "";
  st.left = fit.x.toFixed(1) + "px";
  st.top = fit.y + "px";
  st.width = fit.w.toFixed(1) + "px";
  st.height = fit.h + "px";
  st.visibility = "visible";
}

function register(row: Element, p: Placed): () => void {
  const ro = getSizeRO();
  ensureGlobalHooks();
  placed.set(row, p);
  if (ro) {
    ro.observe(row); // 처음 한 번은 관찰을 시작하면 바로 불립니다(그리기 전)
  } else {
    scheduleRow(row);
  }
  return () => {
    if (placed.get(row) === p) placed.delete(row);
    pendingRows.delete(row);
    try { ro?.unobserve(row); } catch (err) {}
  };
}

export default function WordIllust({
  scene,
  measureKey,
}: {
  scene: IllustScene | undefined;
  /** 같은 줄 글자(단어·뜻)가 바뀌면 다른 값을 주세요 — 자리를 다시 잽니다 */
  measureKey?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const firstKey = useRef(true);

  useEffect(() => {
    if (!scene || near) return;
    const row = boxRef.current?.parentElement;
    if (!row) return;
    return watchNear(row, () => setNear(true));
  }, [scene, near]);

  useLayoutEffect(() => {
    if (!scene || !near) return;
    const box = boxRef.current;
    const row = box?.parentElement;
    if (!box || !row) return;
    return register(row, { box, scene, aspect: vbAspect(scene.vb) });
  }, [scene, near]);

  useLayoutEffect(() => {
    if (firstKey.current) {
      firstKey.current = false;
      return;
    }
    const row = boxRef.current?.parentElement;
    if (row && placed.has(row)) scheduleRow(row);
  }, [measureKey]);

  if (!scene) return null;
  const top = typeof scene.t === "number" ? scene.t : -12;

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      data-illust=""
      data-illust-h={scene.h}
      className="pointer-events-none absolute z-0"
      // 자리를 재기 전에는 보이지 않게 둡니다(재는 즉시 left·top·폭·높이가 정해짐).
      style={{ left: 0, top: top + "px", height: scene.h + "px", visibility: "hidden" }}
    >
      {near ? (
        <svg
          viewBox={scene.vb}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}
          dangerouslySetInnerHTML={{ __html: sceneSvg(scene) }}
        />
      ) : null}
    </div>
  );
}
