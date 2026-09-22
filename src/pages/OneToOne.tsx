// src/pages/OneToOne.tsx
// 일대일 교재 — PDF를 그대로 그리고, 그 위에 pdf.js가 만드는 글자 층을 겹쳐
// 단어 하나하나를 탭할 수 있게 합니다. 성경 본문처럼 절 단위로 뜯어 재구성하지
// 않습니다 — 표·빈칸·삽화가 있는 워크북이라 원본 그대로 보여주는 쪽이 안전합니다.
//
// 파일은 기기에 없으면 서버(성경과 같은 Worker·같은 열쇠)에서 받아 IndexedDB에
// 캐시합니다. 마지막 본 쪽은 localStorage("onetoone-last-page")에 남습니다.

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, RotateCcw,
  X, Check, Plus, Minus, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { fetchMaterial } from "@/lib/materials";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, LOOKUP_FAIL_TEXT } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import { cleanToken } from "@/lib/phraseSelect";

// pdfjs-dist는 300KB가 넘는 라이브러리라, 일대일 화면을 실제로 열 때만 불러옵니다
// (정적 import 로 두면 앱을 켤 때마다 모든 화면이 이 무게를 함께 지게 됩니다).
type PdfjsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      return mod;
    });
  }
  return pdfjsPromise;
}

const MATERIAL_ID = "onetoone";
const LAST_PAGE_KEY = "onetoone-last-page";
const ZOOM_KEY = "onetoone-zoom";
const ZOOM_STEPS = [0.8, 0.9, 1.0, 1.1, 1.2, 1.35, 1.5];

const loadLastPage = (): number => {
  try {
    const n = parseInt(localStorage.getItem(LAST_PAGE_KEY) || "1", 10);
    if (isFinite(n) && n >= 1) return n;
  } catch (e) {}
  return 1;
};

const loadZoomStep = (): number => {
  try {
    const n = parseInt(localStorage.getItem(ZOOM_KEY) || "2", 10);
    if (isFinite(n) && n >= 0 && n < ZOOM_STEPS.length) return n;
  } catch (e) {}
  return 2;
};

const OneToOne = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(loadLastPage);
  const [pageInput, setPageInput] = useState("");
  const [rendering, setRendering] = useState(false);
  const [zoomStep, setZoomStep] = useState(loadZoomStep);
  // 화면 폭이 바뀌면(폴드 펼침·회전·넓게 보기) 다시 재서 그립니다.
  // 처음 한 번만 재면 폴드를 펼쳐도 책이 작은 채로 남습니다.
  const [stageWidthKey, setStageWidthKey] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const scrollTopRef = useRef<HTMLDivElement | null>(null);

  // ---------- 파일 불러오기 ----------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrorMsg(null);
    fetchMaterial(MATERIAL_ID)
      .then(async (blob) => {
        const buf = await blob.arrayBuffer();
        if (!alive) return;
        const pdfjsLib = await loadPdfjs();
        if (!alive) return;
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (!alive) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPageNum((p) => Math.min(Math.max(1, p), doc.numPages));
      })
      .catch((e) => {
        if (!alive) return;
        const m = e instanceof Error ? e.message : "";
        if (m === "NOT_FOUND") setErrorMsg("아직 서버에 교재가 없습니다. PC에서 먼저 올려 주세요");
        else if (m === "NO_CONFIG") setErrorMsg("설정에서 성경 서버 주소·키를 먼저 넣어 주세요");
        else if (m === "UNAUTHORIZED") setErrorMsg("성경 서버 키가 맞지 않습니다");
        else setErrorMsg("교재를 불러오지 못했습니다");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LAST_PAGE_KEY, String(pageNum)); } catch (e) {}
  }, [pageNum]);

  // 스테이지 폭 감시 — 폭이 실제로 달라졌을 때만 다시 그립니다(스크롤로는 안 움직임).
  useEffect(() => {
    if (loading || errorMsg) return;
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let last = el.clientWidth;
    let timer: number | null = null;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - last) < 2) return;
      last = w;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => { setStageWidthKey((k) => k + 1); }, 120);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [loading, errorMsg]);

  // ---------- 쪽 그리기 ----------
  // loading 이 끝나야 캔버스가 화면에 붙습니다. pdf 가 먼저 준비되고 loading 이
  // 나중에 풀리는 순서라, loading 도 의존성에 넣어 캔버스가 붙은 뒤 다시 그립니다.
  useEffect(() => {
    if (!pdf || loading) return;
    let cancelled = false;
    setRendering(true);

    (async () => {
      const pdfjsLib = await loadPdfjs();
      if (cancelled) return;
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;

      const stageWidth = stageRef.current ? stageRef.current.clientWidth : 360;
      const naturalViewport = page.getViewport({ scale: 1 });
      const fitScale = stageWidth / naturalViewport.width;
      const scale = fitScale * ZOOM_STEPS[zoomStep] * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) { setRendering(false); return; }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width / (window.devicePixelRatio || 1) + "px";
      canvas.style.height = viewport.height / (window.devicePixelRatio || 1) + "px";

      // pdf.js 6.x 는 canvas 를 직접 받습니다(canvasContext 는 옛 방식).
      const task = page.render({ canvas, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (e) {
        if (cancelled) return;
      }
      if (cancelled) return;

      // ---- 글자 층: pdf.js가 위치를 잡아 주고, 우리는 그 안의 낱말을 탭 가능하게 나눕니다 ----
      // 위치·크기 값은 pdf.js가 span마다 CSS 변수로 넣어 주고, 그 변수를 실제로 적용하는
      // 규칙은 src/index.css 의 .textLayer 블록에 있습니다. --total-scale-factor(화면 배율)
      // 만 여기서 넣어 줍니다 — 이게 없으면 글자 크기·자리가 전부 어긋납니다.
      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv) {
        textLayerDiv.innerHTML = "";
        const cssScale = scale / (window.devicePixelRatio || 1);
        const cssViewport = page.getViewport({ scale: cssScale });
        textLayerDiv.style.setProperty("--total-scale-factor", String(cssScale));
        const textContent = await page.getTextContent();
        const layer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: cssViewport,
        });
        await layer.render();
        if (cancelled) return;
        splitIntoTappableWords(textLayerDiv);
      }

      setRendering(false);
    })().catch(() => { if (!cancelled) setRendering(false); });

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }
    };
  }, [pdf, pageNum, zoomStep, loading, stageWidthKey]);

  // pdf.js가 그려 넣은 한 줄짜리 span들을, 낱말 단위로 다시 쪼갭니다.
  // 위치·크기는 이미 pdf.js가 정확히 맞춰 뒀으므로 우리는 안의 글자만 바꿉니다.
  // 탭 처리 함수는 ref 로 최신 것을 부릅니다 — DOM 에 박아 둔 핸들러가 오래된
  // 상태(단어장 선택 등)를 붙들지 않게 하기 위해서입니다.
  const openWordPopupRef = useRef<(raw: string, sentence: string) => void>(() => {});
  const splitIntoTappableWords = (container: HTMLDivElement) => {
    const spans = container.querySelectorAll(":scope > span");
    spans.forEach((span) => {
      const text = span.textContent || "";
      if (!text.trim()) return;
      const full = text;
      span.textContent = "";
      const parts = text.split(new RegExp("(\\s+)"));
      parts.forEach((part) => {
        if (part === "") return;
        if (new RegExp("^\\s+$").test(part)) {
          span.appendChild(document.createTextNode(part));
          return;
        }
        const word = document.createElement("span");
        word.textContent = part;
        word.style.pointerEvents = "auto";
        word.style.cursor = "pointer";
        word.addEventListener("click", (e) => {
          e.stopPropagation();
          openWordPopupRef.current(part, full);
        });
        span.appendChild(word);
      });
    });
  };

  const goPage = (delta: number) => {
    setPageNum((p) => Math.max(1, Math.min(numPages, p + delta)));
    scrollTopRef.current?.scrollIntoView?.();
  };

  const jumpToPage = () => {
    const n = parseInt(pageInput, 10);
    if (isFinite(n) && n >= 1 && n <= numPages) {
      setPageNum(n);
      setPageInput("");
      scrollTopRef.current?.scrollIntoView?.();
    } else {
      toast("1~" + numPages + " 사이 쪽 번호를 넣어 주세요");
    }
  };

  const changeZoom = (delta: number) => {
    setZoomStep((prev) => {
      const next = Math.max(0, Math.min(ZOOM_STEPS.length - 1, prev + delta));
      try { localStorage.setItem(ZOOM_KEY, String(next)); } catch (e) {}
      return next;
    });
  };

  // ---------- 단어 탭 팝업 (사전·성경과 같은 3단 캐시) ----------
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  const [saveTargets, setSaveTargets] = useState(loadSaveTargets);
  const [saveTargetId, setSaveTargetId] = useState(() => loadSaveTargetId(loadSaveTargets()));
  const [wbPickerOpen, setWbPickerOpen] = useState(false);
  const wbPickerOpenRef = useRef(false);
  const wbPickerPushedRef = useRef(false);
  const saveTargetName = (saveTargets.find((c) => c.id === saveTargetId) || { name: "" }).name;

  const chooseSaveTarget = (id: string) => {
    setSaveTargetId(id);
    saveSaveTargetId(id);
  };

  const openWbPicker = () => {
    if (wbPickerOpenRef.current) return;
    setSaveTargets(loadSaveTargets());
    setWbPickerOpen(true);
    wbPickerOpenRef.current = true;
    try {
      window.history.pushState({ wordbookPicker: true }, "");
      wbPickerPushedRef.current = true;
    } catch (e) {
      wbPickerPushedRef.current = false;
    }
  };

  const closeWbPicker = () => {
    if (!wbPickerOpenRef.current) return;
    if (wbPickerPushedRef.current) {
      wbPickerPushedRef.current = false;
      try { window.history.back(); return; } catch (e) {}
    }
    wbPickerOpenRef.current = false;
    setWbPickerOpen(false);
  };

  useEffect(() => {
    if (!popupWord || !saveTargetId) { setPopupSaved(false); return; }
    setPopupSaved(hasWordInCategory(saveTargetId, popupWord));
  }, [popupWord, saveTargetId]);

  const subOpenRef = useRef(false);
  const subPushedRef = useRef(false);
  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try {
        window.history.pushState({ oneToOneSub: true }, "");
        subPushedRef.current = true;
      } catch (e) {
        subPushedRef.current = false;
      }
    }
  };
  const closeSub = () => {
    if (subOpenRef.current) window.history.back();
    else setPopupWord(null);
  };

  useEffect(() => {
    const onPop = () => {
      if (wbPickerOpenRef.current) {
        wbPickerOpenRef.current = false;
        wbPickerPushedRef.current = false;
        setWbPickerOpen(false);
        return;
      }
      if (subOpenRef.current) {
        subOpenRef.current = false;
        subPushedRef.current = false;
        setPopupWord(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openWordPopup = async (rawToken: string, sentence: string) => {
    const liveSel = window.getSelection();
    if (liveSel && !liveSel.isCollapsed) return;
    const word = cleanToken(rawToken);
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    setPopupSaved(!!saveTargetId && hasWordInCategory(saveTargetId, word));
    pushSub();

    const cached = wordCache.current.get(key);
    if (cached) {
      setPopupMeaning(cached.meaning);
      setPopupInfo(cached.info);
      setPopupSentenceKo(cached.sentenceKo);
      setPopupLoading(false);
      return;
    }

    setPopupMeaning("");
    setPopupInfo("");
    setPopupSentenceKo("");
    setPopupLoading(true);

    const stored = await getLookupWord(word);
    if (stored && popupReqId.current === reqId) {
      const rec = { meaning: stored.meaning, info: stored.info, sentenceKo: "" };
      wordCache.current.set(key, rec);
      setPopupMeaning(rec.meaning);
      setPopupInfo(rec.info);
      setPopupLoading(false);
      return;
    }

    quickLookupWord(word, sentence)
      .then((r) => {
        wordCache.current.set(key, r);
        saveLookupWord(word, r.meaning, r.info);
        if (popupReqId.current !== reqId) return;
        setPopupMeaning(r.meaning);
        setPopupInfo(r.info);
        setPopupSentenceKo(r.sentenceKo);
      })
      .catch(() => {
        if (popupReqId.current === reqId) setPopupMeaning(LOOKUP_FAIL_TEXT);
      })
      .finally(() => {
        if (popupReqId.current === reqId) setPopupLoading(false);
      });
  };

  openWordPopupRef.current = openWordPopup;

  const copyPopupWord = async () => {
    if (!popupWord) return;
    try {
      await navigator.clipboard.writeText(popupWord);
      toast("복사되었습니다");
    } catch (e) {
      toast("복사에 실패했어요");
    }
  };

  const openInDictionary = () => {
    if (!popupWord) return;
    navigate(
      "/dictionary?q=" + encodeURIComponent(popupWord) + "&from=onetoone",
      { replace: subPushedRef.current }
    );
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning || isFailedMeaning(popupMeaning) || !saveTargetId) return;
    const { added } = addWordIfAbsent({
      word: popupWord,
      meaning: popupMeaning,
      example: popupSentence,
      exampleMeaning: popupSentenceKo,
      categoryId: saveTargetId,
    });
    setPopupSaved(true);
    toast(added ? `${saveTargetName}에 담았습니다` : `이미 ${saveTargetName}에 있는 단어입니다`);
  };

  // ---------- 화면 ----------
  return (
    <div className="min-h-screen w-full mx-auto overflow-x-clip bg-background">
      <div ref={scrollTopRef} />
      <div className="sticky top-0 z-30 bg-background text-foreground border-b border-border">
        <div className="px-4 pt-3.5 pb-3 flex items-center gap-2">
          <button
            onClick={() => goBackOr(navigate, location.key, "/")}
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="shrink-0 font-gothic text-base font-semibold uppercase tracking-[0.08em]">일대일</h1>
          <span className="ml-auto shrink-0 flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              disabled={zoomStep <= 0}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
              aria-label="작게"
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              disabled={zoomStep >= ZOOM_STEPS.length - 1}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
              aria-label="크게"
            >
              <Plus size={13} />
            </button>
          </span>
        </div>

      </div>

      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-16 justify-center">
            <Loader2 size={16} className="animate-spin" /> 교재를 불러오는 중...
          </div>
        ) : errorMsg ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-600 font-gothic mb-3">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white"
            >
              <RotateCcw size={13} /> 다시 시도
            </button>
          </div>
        ) : (
          <div ref={stageRef} className="relative mt-3 w-full overflow-x-auto">
            {rendering ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {/* 캔버스는 계산된 CSS 크기를 그대로 씁니다(max-width 로 줄이지 않음).
                줄이면 글자 층의 글자 크기(px 절대값)와 어긋나므로, 확대 시에는
                옆으로 스크롤하게 둡니다. */}
            <div className="relative inline-block shadow-sm">
              <canvas ref={canvasRef} className="block" />
              <div ref={textLayerRef} className="textLayer select-none" />
            </div>
          </div>
        )}

        {/* 쪽 넘김 — 책 아래에 둡니다(읽던 자리에서 손이 가는 곳) */}
        {!loading && !errorMsg && numPages > 0 ? (
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => goPage(-1)}
              disabled={pageNum <= 1}
              className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center disabled:opacity-30"
              aria-label="이전 쪽"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-gothic text-sm text-foreground/80 shrink-0 min-w-[5.5rem] text-center">
              {pageNum} / {numPages}쪽
            </span>
            <button
              type="button"
              onClick={() => goPage(1)}
              disabled={pageNum >= numPages}
              className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center disabled:opacity-30"
              aria-label="다음 쪽"
            >
              <ChevronRight size={18} />
            </button>
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(new RegExp("[^0-9]", "g"), ""))}
              onKeyDown={(e) => { if (e.key === "Enter") jumpToPage(); }}
              placeholder="쪽 이동"
              inputMode="numeric"
              className="ml-2 w-16 h-9 rounded-full border border-border px-3 text-xs text-center"
            />
          </div>
        ) : null}
      </div>

      {/* 단어 미니 팝업 */}
      {popupWord && (
        <div className="fixed inset-0 z-50" onClick={closeSub}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto bg-card rounded-t-2xl px-5 pt-5 pb-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">{popupWord}</p>
              <span className="flex-1" />
              <button
                onClick={closeSub}
                className="shrink-0 w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>
            {popupLoading ? (
              <div className="flex items-center gap-2 text-gray-400 mt-2 text-sm">
                <Loader2 size={15} className="animate-spin" /> 뜻을 찾고 있어요...
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900 mt-1.5 break-words font-gothic">{popupMeaning}</p>
                {popupInfo && (
                  <p className="text-xs text-gray-500 mt-1 break-words font-gothic">{popupInfo}</p>
                )}
              </>
            )}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 min-w-0 flex items-stretch overflow-hidden rounded-full text-xs font-medium">
                <button
                  onClick={savePopupWord}
                  disabled={popupSaved || popupLoading || !popupMeaning || isFailedMeaning(popupMeaning) || !saveTargetId}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 ${
                    popupSaved || !saveTargetId ? "bg-gray-100 text-gray-400" : "bg-primary text-white disabled:opacity-50"
                  }`}
                >
                  {popupSaved ? <Check size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0" />}
                  <span className="truncate">
                    {popupSaved ? "저장됨" : saveTargetId ? saveTargetName : "단어장을 먼저 만들어 주세요"}
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openWbPicker(); }}
                  title="담을 단어장 고르기"
                  className={`shrink-0 flex items-center px-2.5 border-l ${
                    popupSaved || !saveTargetId
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : "border-white/30 bg-primary text-white"
                  }`}
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              <button
                onClick={copyPopupWord}
                className="shrink-0 rounded-full py-2 px-3.5 text-xs font-medium bg-black/5 text-gray-700"
              >
                복사
              </button>
              <button
                onClick={openInDictionary}
                className="shrink-0 rounded-full py-2 px-3.5 text-xs font-medium bg-black/5 text-gray-700"
              >
                사전에서 보기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-[60]">
        <WordbookPickerSheet
          open={wbPickerOpen}
          onOpenChange={(o) => { if (!o) closeWbPicker(); }}
          targetId={saveTargetId}
          onPick={chooseSaveTarget}
          onChanged={() => setSaveTargets(loadSaveTargets())}
        />
      </div>
    </div>
  );
};

export default OneToOne;
