// src/pages/BibleRead.tsx
// 성경 읽기 — 장 단위 통독. 앞면 인도네시아어(TB), 뒷면 한국어(새번역).
// 책/장 선택은 아래에서 올라오는 시트. 단어 탭 팝업은 묵상과 동일한 3단 캐시.
// 마지막 읽던 위치는 localStorage("bible-last-pos")에 기억.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown,
  Loader2, RotateCcw, Volume2, X, Check, Plus, Minus,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { BIBLE_BOOKS, getBook, fetchChapter, fetchChapterKo, BibleVerse } from "@/lib/bible";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import { ttsPlayer } from "@/lib/tts";
import { bibleAudioPlayer } from "@/lib/bibleAudio";
import BiblePicker from "@/components/BiblePicker";
import BibleAudioButton from "@/components/BibleAudioButton";
import BibleAudioSeekBar from "@/components/BibleAudioSeekBar";
import { useSwipeFlip } from "@/lib/useSwipeFlip";
import { ReadingTracker } from "@/lib/readingTimer";
import PointFloat from "@/components/PointFloat";

const LAST_POS_KEY = "bible-last-pos";

// ---------- 글자 크기 (이 화면 전용) ----------
// 설교문 읽기와 같은 방식입니다. 다만 배율을 rem 으로 주므로
// 앱 전체 배율(fontScale.ts)에 이 배율이 곱해집니다. 본문 글자는 전부 em 입니다.
const FONT_KEY = "bible-font-step";
const SCALE = [0.85, 0.92, 1.0, 1.08, 1.16, 1.26, 1.36, 1.48, 1.60];

const loadFontStep = (): number => {
  try {
    const n = parseInt(localStorage.getItem(FONT_KEY) || "2", 10);
    if (isFinite(n) && n >= 0 && n < SCALE.length) return n;
  } catch (e) {}
  return 2;
};

const saveFontStep = (n: number) => {
  try {
    localStorage.setItem(FONT_KEY, String(n));
  } catch (e) {}
};

interface BiblePos {
  bookId: string;
  chapter: number;
}

const loadLastPos = (): BiblePos => {
  try {
    const raw = localStorage.getItem(LAST_POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.bookId === "string" && typeof p.chapter === "number" && getBook(p.bookId)) {
        return { bookId: p.bookId, chapter: p.chapter };
      }
    }
  } catch (e) {}
  return { bookId: "kejadian", chapter: 1 };
};

const saveLastPos = (pos: BiblePos) => {
  try { localStorage.setItem(LAST_POS_KEY, JSON.stringify(pos)); } catch (e) {}
};

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

const BibleRead = () => {
  const navigate = useNavigate();
  const { widthClass, canWide, wide, toggle } = useWideMode();

  // ---------- 위치 / 본문 ----------
  const [pos, setPos] = useState<BiblePos>(loadLastPos);
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);     // 앞면 TB
  const [versesKo, setVersesKo] = useState<BibleVerse[] | null>(null); // 뒷면 새번역
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [koError, setKoError] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // ---------- 읽기 점수 (보이지 않는 타이머) ----------
  // 화면에는 아무 표시도 없고, 한국어 면을 처음 여는 순간에만 "+N"이 한 번 뜽니다.
  const trackerRef = useRef<ReadingTracker | null>(null);
  const [floatVal, setFloatVal] = useState(0);
  const [floatSeq, setFloatSeq] = useState(0);

  useEffect(() => {
    const t = new ReadingTracker((pt) => {
      setFloatVal(pt);
      setFloatSeq((n) => n + 1);
    });
    trackerRef.current = t;
    t.attach();
    return () => {
      t.dispose();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const t = trackerRef.current;
    if (!t) return;
    t.setSide(!flipped);
    if (flipped) t.koreanOpened();
  }, [flipped]);

  // ---------- 본문 글자 크기 ----------
  const [fontStep, setFontStep] = useState(loadFontStep);

  const changeFont = (delta: number) => {
    setFontStep((prev) => {
      const next = Math.max(0, Math.min(SCALE.length - 1, prev + delta));
      saveFontStep(next);
      return next;
    });
  };

  const bodyFontSize = SCALE[fontStep] + "rem";

  // ---------- 뒤집어도 같은 절이 화면 같은 자리에 오도록 ----------
  //
  // 장이 길면 뜻을 보려고 한국어로 넘겼을 때 위치가 어긋나 다시 찾아야 했습니다.
  // 뒤집기 직전에 "지금 화면 맨 위에 걸린 절"과 그 절이 화면에서 몇 px에 있었는지를
  // 적어 두었다가, 반대쪽에서 같은 절을 같은 높이에 놓습니다.
  // 앞뒤 모두 절 번호를 그리므로 절 번호를 열쇠로 쓸 수 있습니다.

  const HEADER_H = 61; // sticky 헤더 높이 (py-3 24 + 버튼 36 + 테두리 1)

  const verseRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const pendingAnchor = useRef<{ verse: number; offset: number } | null>(null);

  // 화면 맨 위(헤더 바로 아래)에 걸려 있는 절을 찾습니다
  const anchorOf = (side: "id" | "ko") => {
    const line = HEADER_H + 8;
    let best: { verse: number; offset: number } | null = null;
    let firstTop: { verse: number; offset: number } | null = null;
    Object.keys(verseRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      const el = verseRefs.current[k];
      if (!el) return;
      const n = Number(k.slice(side.length + 1));
      if (!n) return;
      const top = el.getBoundingClientRect().top;
      // 기준선을 지난 절 중 가장 아래에 있는 것 = 지금 맨 위에 보이는 절
      if (top <= line && (!best || top > best.offset)) best = { verse: n, offset: top };
      // 아직 아무 절도 기준선을 안 지났을 때를 대비해 첫 절도 들고 있습니다
      if (!firstTop || n < firstTop.verse) firstTop = { verse: n, offset: top };
    });
    return best || firstTop;
  };

  // 반대쪽에서 같은 절을 찾습니다. 번역마다 절 나눔이 조금 다를 수 있어
  // 같은 번호가 없으면 그 위의 가장 가까운 절로 갑니다.
  const findVerseEl = (side: "id" | "ko", verse: number) => {
    const exact = verseRefs.current[side + "-" + verse];
    if (exact) return exact;
    let bestN = 0;
    Object.keys(verseRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      if (!verseRefs.current[k]) return;
      const n = Number(k.slice(side.length + 1));
      if (n && n <= verse && n > bestN) bestN = n;
    });
    return bestN ? verseRefs.current[side + "-" + bestN] : null;
  };

  const handleFlip = () => {
    pendingAnchor.current = anchorOf(flipped ? "ko" : "id");
    setFlipped((f) => !f);
  };

  const { swipeHandlers, shouldIgnoreTap } = useSwipeFlip(handleFlip);

  // 뒤집힌 뒤(또는 한국어 본문이 늦게 도착한 뒤) 적어둔 자리로 맞춥니다
  useEffect(() => {
    const a = pendingAnchor.current;
    if (!a) return;
    const el = findVerseEl(flipped ? "ko" : "id", a.verse);
    if (!el) return; // 아직 안 그려졌으면 다음 렌더에서 다시 시도합니다
    pendingAnchor.current = null;
    const top = window.scrollY + el.getBoundingClientRect().top - a.offset;
    window.scrollTo({ top: Math.max(0, top) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, verses, versesKo]);

  const loadToken = useRef(0);
  const scrollTopRef = useRef<HTMLDivElement | null>(null);

  const book = getBook(pos.bookId);

  // ---------- 책/장 선택 피커 ----------
  const [pickerOpen, setPickerOpen] = useState(false);

  // ---------- 뒤로가기 (시트/팝업만 한 단계 닫기) ----------
  const subOpenRef = useRef(false);
  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try { window.history.pushState({ bibleSub: true }, ""); } catch (e) {}
    }
  };
  const resetSub = () => {
    setPickerOpen(false);
    setPopupWord(null);
  };
  const closeSub = () => {
    if (subOpenRef.current) window.history.back();
    else resetSub();
  };
  useEffect(() => {
    const onPop = () => {
      // 시트가 팝업 위에 떠 있으면 시트만 닫습니다 (팝업은 그대로).
      if (wbPickerOpenRef.current) {
        wbPickerOpenRef.current = false;
        wbPickerPushedRef.current = false;
        setWbPickerOpen(false);
        return;
      }
      if (subOpenRef.current) {
        subOpenRef.current = false;
        resetSub();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // 페이지를 벗어나면 낭독도 함께 정지 (setState 없이 정리만)
      bibleAudioPlayer.stop();
      ttsPlayer.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 장 로드 ----------
  const loadChapter = async (p: BiblePos) => {
    const token = ++loadToken.current;
    setLoading(true);
    setError(false);
    setKoError(false);
    setVerses(null);
    setVersesKo(null);
    setFlipped(false);
    trackerRef.current?.setUnit(p.bookId + ":" + p.chapter);
    // 장을 옮기면 맨 위부터 읽으므로 이전 장의 절 위치는 버립니다
    verseRefs.current = {};
    pendingAnchor.current = null;
    ttsPlayer.stop();
    bibleAudioPlayer.stop();
    try {
      const tb = await fetchChapter(p.bookId, p.chapter);
      if (loadToken.current !== token) return;
      setVerses(tb);
      saveLastPos(p);
    } catch (e) {
      if (loadToken.current !== token) return;
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(false);
    // 한국어(새번역)는 뒷면용으로 백그라운드 로드 (실패해도 앞면은 정상)
    fetchChapterKo(p.bookId, p.chapter)
      .then((ko) => { if (loadToken.current === token) setVersesKo(ko); })
      .catch(() => { if (loadToken.current === token) setKoError(true); });
  };

  useEffect(() => {
    loadChapter(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.bookId, pos.chapter]);

  const goChapter = (delta: number) => {
    if (!book) return;
    const next = pos.chapter + delta;
    if (next >= 1 && next <= book.chapters) {
      setPos({ bookId: pos.bookId, chapter: next });
      scrollTopRef.current?.scrollIntoView?.();
      return;
    }
    // 책 경계를 넘어가면 이전/다음 책으로
    const idx = BIBLE_BOOKS.findIndex((b) => b.id === pos.bookId);
    if (delta > 0 && idx < BIBLE_BOOKS.length - 1) {
      setPos({ bookId: BIBLE_BOOKS[idx + 1].id, chapter: 1 });
      scrollTopRef.current?.scrollIntoView?.();
    } else if (delta < 0 && idx > 0) {
      const prev = BIBLE_BOOKS[idx - 1];
      setPos({ bookId: prev.id, chapter: prev.chapters });
      scrollTopRef.current?.scrollIntoView?.();
    }
  };

  // ---------- 단어 탭 → 미니 팝업 (묵상과 동일한 3단 캐시) ----------
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  // ---- 담을 단어장 (사전에서 고른 대상을 앱 전체가 함께 씁니다) ----
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

  // 시트는 히스토리를 한 칸 더 쌓습니다 — 뒤로가기를 누르면 시트만 닫히고 팝업은 남습니다.
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
      // wbPickerOpenRef 는 여기서 내리지 않습니다 — popstate 핸들러가 이것을 보고 닫습니다.
      try { window.history.back(); return; } catch (e) {}
    }
    wbPickerOpenRef.current = false;
    setWbPickerOpen(false);
  };

  // 대상이 바뀌면 그 단어장 기준으로 담김 여부를 다시 판정합니다.
  useEffect(() => {
    if (!popupWord || !saveTargetId) {
      setPopupSaved(false);
      return;
    }
    setPopupSaved(hasWordInCategory(saveTargetId, popupWord));
  }, [popupWord, saveTargetId]);

  const openWordPopup = async (rawToken: string, sentence: string) => {
    if (shouldIgnoreTap()) return;
    trackerRef.current?.touch();
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
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
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=bible");
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning || !saveTargetId) return;
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

  // ---------- 렌더 도우미 ----------
  const renderTokens = (text: string, keyPrefix: string) =>
    text.split(" ").map((tok, ti) => (
      <span key={keyPrefix + ti}>
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-sky-500/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

  const renderTbVerse = (v: BibleVerse) => (
    <p
      key={v.verse}
      ref={(el) => { verseRefs.current["id-" + v.verse] = el; }}
      className="mb-2 text-[1em] leading-relaxed font-word text-gray-900"
    >
      <span className="text-sky-500/70 text-[0.75em] align-super mr-1 select-none">{v.verse}</span>
      {renderTokens(v.text, "b" + v.verse + "-")}
    </p>
  );

  const renderKoVerse = (v: BibleVerse) => (
    <p
      key={"k" + v.verse}
      ref={(el) => { verseRefs.current["ko-" + v.verse] = el; }}
      className="mb-2 text-[0.875em] leading-relaxed text-gray-800 font-gothic"
    >
      <span className="text-sky-500/70 text-[0.75em] align-super mr-1 select-none">{v.verse}</span>
      {v.text}
    </p>
  );

  // 위치 필 라벨: 앞면은 인니어만("RUT 1"), 뒷면은 한국어만("룻기 1장")
  const posLabel = book
    ? (flipped
        ? `${book.ko} ${pos.chapter}장`
        : `${book.idName.toUpperCase()} ${pos.chapter}`)
    : "";

  // ---------- 화면 ----------
  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      <div ref={scrollTopRef} />
      <PointFloat value={floatVal} seq={floatSeq} />
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">ALKITAB</h1>
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

      <div className="px-4 py-4">
        <div {...swipeHandlers} className="-mx-4 bg-card border-y border-border/60 overflow-hidden px-4 py-5">
              {/* 위치 필 (탭 → 책 선택 시트) */}
              <div className="flex items-center gap-2 mb-4 min-w-0">
                <button
                  onClick={() => { setPickerOpen(true); pushSub(); }}
                  className="inline-flex items-center gap-1 min-w-0 font-bold text-sky-600 bg-sky-500/10 rounded-full px-3 py-1 text-sm"
                >
                  <span className="truncate">{posLabel}</span>
                  <ChevronDown size={13} className="shrink-0" />
                </button>
                {!flipped && !loading && !error && verses && verses.length > 0 && (
                  <span
                    className="ml-auto shrink-0 flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => changeFont(-1)}
                      disabled={fontStep <= 0}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
                      aria-label="글자 작게"
                      title="글자 작게"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeFont(1)}
                      disabled={fontStep >= SCALE.length - 1}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
                      aria-label="글자 크게"
                      title="글자 크게"
                    >
                      <Plus size={14} />
                    </button>
                    <BibleAudioButton
                      bookId={pos.bookId}
                      chapter={pos.chapter}
                      label="듣기"
                    />
                  </span>
                )}
              </div>

              {/* 낭독 시크바 — 재생 중이 아니면 컴포넌트가 null을 반환합니다 */}
              {!flipped && <BibleAudioSeekBar bookId={pos.bookId} chapter={pos.chapter} />}

              {/* 본문 */}
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" /> 본문을 불러오는 중...
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 font-gothic mb-3">본문을 불러오지 못했어요</p>
                  <button
                    onClick={() => loadChapter(pos)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white"
                  >
                    <RotateCcw size={13} /> 다시 시도
                  </button>
                </div>
              ) : !flipped ? (
                <div style={{ fontSize: bodyFontSize }}>
                  {(verses || []).map(renderTbVerse)}
                  <p className="mt-5 text-[0.625rem] text-gray-400 font-gothic text-right leading-relaxed">
                    Alkitab Terjemahan Baru (TB)
                    <br />
                    Lembaga Alkitab Indonesia
                  </p>
                </div>
              ) : versesKo ? (
                <div style={{ fontSize: bodyFontSize }}>
                  {versesKo.map(renderKoVerse)}
                  <p className="mt-5 text-[0.625rem] text-gray-400 font-gothic text-right">
                    성경전서 새번역 · 대한성서공회
                  </p>
                </div>
              ) : koError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 font-gothic mb-3">한국어 본문을 불러오지 못했어요</p>
                  <button
                    onClick={() => loadChapter(pos)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white"
                  >
                    <RotateCcw size={13} /> 다시 시도
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" /> 한국어 본문을 불러오는 중...
                </div>
              )}
        </div>
        <p className="text-center text-muted-foreground text-xs mt-3">
          {flipped ? "옆으로 밀면 원문이 보입니다" : "옆으로 밀면 해석, 단어를 탭하면 뜻이 나옵니다"}
        </p>

        {/* 이전 장 / 다음 장 */}
        {!loading && !error && book && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => goChapter(-1)}
              disabled={pos.chapter <= 1 && BIBLE_BOOKS[0].id === pos.bookId}
              className="flex-1 flex items-center justify-center gap-1 rounded-full py-2.5 text-xs font-medium bg-card border border-border/60 text-gray-700 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> 이전 장
            </button>
            <button
              onClick={() => goChapter(1)}
              disabled={pos.chapter >= book.chapters && BIBLE_BOOKS[BIBLE_BOOKS.length - 1].id === pos.bookId}
              className="flex-1 flex items-center justify-center gap-1 rounded-full py-2.5 text-xs font-medium bg-card border border-border/60 text-gray-700 disabled:opacity-30"
            >
              다음 장 <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 책/장 선택 피커 */}
      <BiblePicker
        open={pickerOpen}
        currentBookId={pos.bookId}
        currentChapter={pos.chapter}
        onClose={closeSub}
        onSelect={(bookId, chapter) => {
          setPos({ bookId, chapter });
          closeSub();
          scrollTopRef.current?.scrollIntoView?.();
        }}
      />

      {/* 단어 미니 팝업 */}
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
              <div className="flex-1 min-w-0 flex items-stretch overflow-hidden rounded-full text-xs font-medium">
                <button
                  onClick={savePopupWord}
                  disabled={popupSaved || popupLoading || !popupMeaning || !saveTargetId}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 ${
                    popupSaved || !saveTargetId ? "bg-gray-100 text-gray-400" : "bg-primary text-white disabled:opacity-50"
                  }`}
                >
                  {popupSaved ? <Check size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0" />}
                  <span className="truncate">
                    {popupSaved ? "저장됨" : saveTargetId ? saveTargetName : "단어장을 먼저 만들어 주세요"}
                  </span>
                </button>
                {/* 담긴 뒤에도 다른 단어장에는 담을 수 있어야 하므로 ⌄ 는 잠그지 않습니다 */}
                <button
                  onClick={(e) => { e.stopPropagation(); openWbPicker(); }}
                  title="담을 단어장 고르기"
                  className="shrink-0 flex items-center px-2.5 border-l border-white/30 bg-primary text-white"
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

      {/* 담을 단어장 고르는 시트 — 팝업(z-50)보다 위에 오도록 한 단계 더 띄웁니다 */}
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

export default BibleRead;
