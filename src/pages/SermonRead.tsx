// src/pages/SermonRead.tsx
// 설교문 읽기 (/sermon/:id).
// 가독성이 목적인 화면이라 위아래 스크롤만 됩니다 — 좌우 스와이프 플립은 없습니다.
// 인도네시아어 단어를 탭하면 성경 읽기와 같은 뜻 팝업이 아래에서 올라옵니다.
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
  Volume2,
  X,
  Check,
} from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { goBackOr } from "@/lib/nav";
import { toast } from "sonner";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import {
  SermonBlock,
  SermonRecord,
  getCachedSermon,
  fetchSermon,
  saveSermon,
  formatSermonDate,
} from "@/lib/sermon";

const MY_WORDBOOK_ID = "my-wordbook";

const speak = (text: string, lang: "id" | "ko") => {
  if ((window as any).AndroidTTS) {
    try { (window as any).AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID"); } catch (e) {}
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
    utterance.rate = 0.9;
    (speechSynthesis as any)?.cancel?.();
    setTimeout(() => { try { (speechSynthesis as any)?.speak?.(utterance); } catch (e) {} }, 150);
  } catch (e) {}
};

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
    koSize: "0.87em",
  },
  ref: {
    wrap: "mb-6 -mt-4",
    idClass: ID_BASE + " italic text-muted-foreground",
    idSize: "0.9em",
    koClass: KO_BASE + " italic",
    koSize: "0.68em",
  },
  heading: {
    wrap: "mt-8 mb-5 scroll-mt-16",
    idClass: ID_BASE + " font-semibold text-indigo-600",
    idSize: "1.15em",
    koClass: KO_BASE + " font-semibold text-foreground",
    koSize: "0.71em",
  },
  verse: {
    wrap: "mb-5 border-l-2 border-indigo-300 pl-3",
    idClass: ID_BASE + " italic",
    idSize: "0.95em",
    koClass: KO_BASE + " italic",
    koSize: "0.64em",
  },
  hymn: {
    wrap: "mb-5 text-center",
    idClass: ID_BASE + " text-rose-600",
    idSize: "0.95em",
    koClass: KO_BASE,
    koSize: "0.63em",
  },
  body: {
    wrap: "mb-5",
    idClass: ID_BASE,
    idSize: "1em",
    koClass: KO_BASE,
    koSize: "0.64em",
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
  const subOpenRef = useRef(false);
  const subPushedRef = useRef(false);
  const pendingScroll = useRef<number | null>(null);

  // 단어 탭 팝업 (성경 읽기와 동일한 3단 캐시)
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

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

  // ---------- 목차 시트 / 단어 팝업: 폰 뒤로가기로도 닫히게 (성경 읽기와 같은 방식) ----------
  const pushSub = () => {
    if (subOpenRef.current) return;
    subOpenRef.current = true;
    try {
      window.history.pushState({ sermonSub: true }, "");
      subPushedRef.current = true;
    } catch (e) {
      subPushedRef.current = false;
    }
  };

  const resetSub = () => {
    setTocOpen(false);
    setPopupWord(null);
  };

  const closeSub = () => {
    if (subPushedRef.current) {
      subPushedRef.current = false;
      subOpenRef.current = false;
      try {
        window.history.back();
        return;
      } catch (e) {
        // 아래에서 직접 닫습니다
      }
    }
    subOpenRef.current = false;
    resetSub();
  };

  const openToc = () => {
    setTocOpen(true);
    pushSub();
  };

  const closeToc = () => closeSub();

  useEffect(() => {
    const onPop = () => {
      if (subOpenRef.current) {
        subOpenRef.current = false;
        subPushedRef.current = false;
        resetSub();
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

  const openWordPopup = async (rawToken: string, sentence: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    setPopupSaved(hasWordInCategory(MY_WORDBOOK_ID, word));
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
      const rec2 = { meaning: stored.meaning, info: stored.info, sentenceKo: "" };
      wordCache.current.set(key, rec2);
      setPopupMeaning(rec2.meaning);
      setPopupInfo(rec2.info);
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
        if (popupReqId.current === reqId) setPopupMeaning("뜻을 불러오지 못했어요. 다시 탭해주세요");
      })
      .finally(() => {
        if (popupReqId.current === reqId) setPopupLoading(false);
      });
  };

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
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=sermon");
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning) return;
    const { added } = addWordIfAbsent({
      word: popupWord,
      meaning: popupMeaning,
      example: popupSentence,
      exampleMeaning: popupSentenceKo,
      categoryId: MY_WORDBOOK_ID,
    });
    setPopupSaved(true);
    toast(added ? "내 단어장에 저장되었습니다" : "이미 내 단어장에 있는 단어입니다");
  };

  const renderTokens = (text: string, keyPrefix: string) =>
    text.split(" ").map((tok, ti) => (
      <span key={keyPrefix + ti}>
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-indigo-500/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

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
            {renderTokens(b.id, "w" + i + "-")}
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

      {popupWord && (
        <div className="fixed inset-0 z-50" onClick={closeSub}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className={"absolute bottom-0 left-0 right-0 " + widthClass + " mx-auto bg-card rounded-t-2xl px-5 pt-5 pb-7"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">{popupWord}</p>
              <button
                onClick={() => speak(popupWord, "id")}
                className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="발음 듣기"
              >
                <Volume2 size={15} />
              </button>
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
              <button
                onClick={savePopupWord}
                disabled={popupSaved || popupLoading || !popupMeaning}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-medium ${
                  popupSaved ? "bg-gray-100 text-gray-400" : "bg-primary text-white disabled:opacity-50"
                }`}
              >
                {popupSaved ? <><Check size={13} /> 저장됨</> : <><Plus size={13} /> 내 단어장에 담기</>}
              </button>
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
    </div>
  );
};

export default SermonRead;
