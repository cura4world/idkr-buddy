// src/components/WordIllust.tsx
// 단어 카드의 색연필 그림. 단어 글자와 스피커 사이 빈칸에 깔립니다(카드 크기는 그대로).
//
//   <PencilDefs />            — 색연필 필터(pcFill·pcLine). 그림이 있는 화면에 한 번만 둡니다.
//   <WordIllust scene={...}/> — 단어 줄(position: relative) 안에 넣습니다. 글자 아래 층(z-0).
//
// 그림은 카드가 화면 가까이 왔을 때만 그립니다(필터가 들어간 SVG 가 수십 개라 긴 목록에서 부담).

import { useEffect, useRef, useState } from "react";
import type { IllustScene } from "@/lib/illust";

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

export default function WordIllust({ scene }: { scene: IllustScene | undefined }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!scene || near) return;
    const el = boxRef.current;
    if (!el) return;
    let io: IntersectionObserver | null = null;
    try {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setNear(true);
            io?.disconnect();
          }
        },
        { rootMargin: "400px 0px" }
      );
      io.observe(el);
    } catch (e) {
      setNear(true);
    }
    return () => { try { io?.disconnect(); } catch (e) {} };
  }, [scene, near]);

  if (!scene) return null;
  const right = typeof scene.r === "number" ? scene.r : 56;
  const top = typeof scene.t === "number" ? scene.t : -12;

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-0"
      style={{ right: right + "px", top: top + "px", height: scene.h + "px" }}
    >
      {near ? (
        <svg
          height={scene.h}
          viewBox={scene.vb}
          aria-hidden="true"
          style={{ display: "block", overflow: "visible" }}
          dangerouslySetInnerHTML={{ __html: sceneSvg(scene) }}
        />
      ) : null}
    </div>
  );
}
