// src/pages/SermonRead.tsx
// 설교문 읽기 (/sermon/:id).
// 가독성이 목적인 화면이라 위아래 스크롤만 됩니다 — 좌우 스와이프 플립도, 단어 팝업도 없습니다.
// 인도네시아어와 한국어를 뒤집지 않고 한 화면에 위아래로 같이 보여줍니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BookMarked,
  Minus,
  Plus,
  ChevronUp,
  ChevronDown,
  List,
  Loader2,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { goBackOr } from "@/lib/nav";
import {
  SermonBlock,
  SermonRecord,
  getCachedSermon,
  fetchSermon,
  saveSermon,
  formatSermonDate,
} from "@/lib/sermon";

// ---------- 글자 크기 (이 화면 전용) ----------
// 앱 전체 배율(fontScale.ts)과는 별개입니다.
const FONT_KEY = "sermon-font-step";
const SCALE = [0.85, 0.92, 1.0, 1.08, 1.16, 1.26, 1.36, 1.48, 1.60];
const BASE_PX = 17;

const loadFontStep = (): number => {
  try {
    const n = parseInt(localStorage.getItem(FONT_KEY) || "3", 10);
    if (isFinite(n) && n >= 0 && n < SCALE.length) return n;
  } catch (e) {}
  return 3;
};

const saveFontStep = (n: number) => {
  try {
    localStorage.setItem(FONT_KEY, String(n));
  } catch (e) {}
};

// ---------- 블록 종류별 모양 ----------
// 글자 크기는 전부 em 으로 줍니다. Tailwind 임의값(text-[17px])을 쓰면 배율이 먹지 않습니다.
const ID_BASE = "font-word text-foreground leading-[1.75] break-words";
const KO_BASE = "font-gothic text-muted-foreground leading-[1.7] break-words mt-1.5";

interface KindStyle {
  wrap: string;
  idClass: string;
  idSize: string;
  koClass: string;
  koSize: string;
}

const KIND_STYLE: Record<string, KindStyle> = {
  title: {
    wrap: "mb-6",
    idClass: ID_BASE + " font-semibold",
    idSize: "1.25em",
    koClass: KO_BASE + " font-semibold text-foreground",
    koSize: "0.93em",
  },
  ref: {
    wrap: "mb-6 -mt-4",
    idClass: ID_BASE + " italic text-muted-foreground",
    idSize: "0.9em",
    koClass: KO_BASE + " italic",
    koSize: "0.73em",
  },
  heading: {
    wrap: "mt-8 mb-5 scroll-mt-16",
    idClass: ID_BASE + " font-semibold text-indigo-600",
    idSize: "1.15em",
    koClass: KO_BASE + " font-semibold text-foreground",
    koSize: "0.76em",
  },
  verse: {
    wrap: "mb-5 border-l-2 border-indigo-300 pl-3",
    idClass: ID_BASE + " italic",
    idSize: "0.95em",
    koClass: KO_BASE + " italic",
    koSize: "0.69em",
  },
  hymn: {
    wrap: "mb-5 text-center",
    idClass: ID_BASE + " text-rose-600",
    idSize: "0.95em",
    koClass: KO_BASE,
    koSize: "0.68em",
  },
  body: {
    wrap: "mb-5",
    idClass: ID_BASE,
    idSize: "1em",
    koClass: KO_BASE,
    koSize: "0.69em",
  },
};

const styleFor = (kind: string): KindStyle => KIND_STYLE[kind] || KIND_STYLE.body;

const SermonRead = () => {
  const navigate = useNavigate();
  const { widthClass, canWide, wide, toggle } = useWideMode();
  const location = useLocation();
  const params = useParams();
  const id = params.id || "";

  const [rec, setRec] = useState<SermonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const [fontStep, setFontStep] = useState(loadFontStep);

  const [tocOpen, setTocOpen] = useState(false);
  const tocOpenRef = useRef(false);
  const tocPushedRef = useRef(false);
  const pendingScroll = useRef<number | null>(null);

  // ---------- 본문 불러오기 (폰 저장분 우선, 없으면 서버) ----------
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);

    getCachedSermon(id)
      .then((cached) => {
        if (cancelled) return null;
        if (cached) {
          setRec(cached);
          setLoading(false);
          return null;
        }
        return fetchSermon(id).then((fresh) => {
          if (cancelled) return null;
          saveSermon(fresh);
          setRec(fresh);
          setLoading(false);
          return null;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadTick]);

  // ---------- 목차 시트: 폰 뒤로가기로도 닫히게 (성경 읽기와 같은 방식) ----------
  const openToc = () => {
    setTocOpen(true);
    tocOpenRef.current = true;
    try {
      window.history.pushState({ sermonToc: true }, "");
      tocPushedRef.current = true;
    } catch (e) {
      tocPushedRef.current = false;
    }
  };

  const closeToc = () => {
    if (tocPushedRef.current) {
      tocPushedRef.current = false;
      tocOpenRef.current = false;
      try {
        window.history.back();
        return;
      } catch (e) {
        // 아래에서 직접 닫습니다
      }
    }
    tocOpenRef.current = false;
    setTocOpen(false);
  };

  useEffect(() => {
    const onPop = () => {
      if (tocOpenRef.current) {
        tocOpenRef.current = false;
        tocPushedRef.current = false;
        setTocOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 시트가 닫힌 뒤에 이동합니다 (닫기와 스크롤을 한 핸들러에서 같이 하지 않습니다)
  useEffect(() => {
    if (tocOpen) return;
    const idx = pendingScroll.current;
    if (idx === null) return;
    pendingScroll.current = null;
    if (idx < 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById("sec-" + idx);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tocOpen]);

  const goSection = (idx: number) => {
    pendingScroll.current = idx;
    closeToc();
  };

  const changeFont = (delta: number) => {
    setFontStep((prev) => {
      const next = Math.max(0, Math.min(SCALE.length - 1, prev + delta));
      saveFontStep(next);
      return next;
    });
  };

  const blocks: SermonBlock[] = (rec && rec.blocks) || [];
  const headings = blocks
    .map((b, i) => ({ b, i }))
    .filter((x) => x.b && x.b.kind === "heading");

  const fontPx = Math.round(BASE_PX * SCALE[fontStep]) + "px";

  const renderBlock = (b: SermonBlock, i: number) => {
    if (!b) return null;
    const st = styleFor(b.kind);
    return (
      <div
        key={i}
        id={b.kind === "heading" ? "sec-" + i : undefined}
        className={st.wrap}
      >
        {b.id ? (
          <p className={st.idClass} style={{ fontSize: st.idSize }}>
            {b.id}
          </p>
        ) : null}
        {b.ko ? (
          <p className={st.koClass} style={{ fontSize: st.koSize }}>
            {b.ko}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/sermon")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <BookMarked size={16} className="text-white" />
        </span>
        <h1 className="min-w-0 flex-1 text-lg font-semibold leading-none truncate">
          {rec ? rec.title || "설교문" : "설교문"}
        </h1>
        {canWide ? (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 w-9 h-9 flex items-center justify-center text-muted-foreground active:text-foreground"
            title={wide ? "원래 크기로" : "넓게 보기"}
            aria-label={wide ? "원래 크기로" : "넓게 보기"}
          >
            {wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        ) : null}
      </header>

      <div className="px-4 py-4 pb-24">
        {/* 날짜 + 글자 크기 (성경 읽기의 '위치 필 + 듣기' 자리와 같은 배치) */}
        <div className="flex items-center gap-2 mb-4 min-w-0">
          <span className="inline-flex items-center min-w-0 font-gothic text-indigo-600 bg-indigo-500/10 rounded-full px-3 py-1 text-sm">
            <span className="truncate">{formatSermonDate(id)}</span>
          </span>
          <span className="ml-auto shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={fontStep <= 0}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
              aria-label="글자 작게"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={fontStep >= SCALE.length - 1}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
              aria-label="글자 크게"
            >
              <Plus size={16} />
            </button>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-16">
            <Loader2 size={16} className="animate-spin" /> 설교문을 불러오는 중...
          </div>
        ) : error || !rec ? (
          <div className="text-center py-16">
            <p className="text-sm font-gothic text-muted-foreground mb-3">
              설교문을 불러오지 못했어요
            </p>
            <button
              type="button"
              onClick={() => setReloadTick((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-indigo-500 text-white"
            >
              <RotateCcw size={13} /> 다시 시도
            </button>
          </div>
        ) : (
          <div style={{ fontSize: fontPx }}>{blocks.map(renderBlock)}</div>
        )}
      </div>

      {/* 빠른 이동 — 본문과 같은 폭에 붙여 넓은 화면에서도 본문 오른쪽에 옵니다 */}
      {!loading && !error && rec ? (
        <div className={"fixed inset-x-0 bottom-6 z-40 mx-auto " + widthClass + " pointer-events-none"}>
          <div className="flex flex-col items-end gap-2 pr-4">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="pointer-events-auto w-11 h-11 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground/70 active:bg-muted"
              aria-label="맨 위로"
            >
              <ChevronUp size={18} />
            </button>
            {headings.length > 0 ? (
              <button
                type="button"
                onClick={openToc}
                className="pointer-events-auto w-11 h-11 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground/70 active:bg-muted"
                aria-label="목차"
              >
                <List size={18} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
              }
              className="pointer-events-auto w-11 h-11 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground/70 active:bg-muted"
              aria-label="맨 아래로"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      ) : null}

      {/* 목차 시트 */}
      {tocOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeToc} />
          <div className={"fixed inset-x-0 bottom-0 z-50 mx-auto " + widthClass + " max-h-[70dvh] overflow-y-auto rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5"}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
            <h2 className="px-4 text-base font-semibold text-foreground">목차</h2>
            <div className="mt-3 border-t border-border">
              <button
                type="button"
                onClick={() => goSection(-1)}
                className="w-full border-b border-border px-4 py-3.5 text-left active:bg-muted/60"
              >
                <span className="block text-[14px] leading-tight text-foreground">처음으로</span>
              </button>
              {headings.map(({ b, i }) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goSection(i)}
                  className="w-full border-b border-border px-4 py-3.5 text-left active:bg-muted/60"
                >
                  {b.ko ? (
                    <span className="block text-[14px] leading-tight text-foreground">{b.ko}</span>
                  ) : null}
                  {b.id ? (
                    <span className="mt-0.5 block font-word text-[11.5px] text-muted-foreground">
                      {b.id}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={closeToc}
              className="mx-4 mt-4 h-12 w-[calc(100%-2rem)] rounded-[13px] bg-primary text-[15px] font-medium text-white"
            >
              닫기
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SermonRead;
