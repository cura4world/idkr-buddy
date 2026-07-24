// src/pages/BibleRead.tsx
// 성경 읽기 — 장 단위 통독. 앞면 인도네시아어(TB), 뒷면 한국어(새번역).
// 책/장 선택은 아래에서 올라오는 시트. 단어 탭 팝업은 묵상과 동일한 3단 캐시.
// 마지막 읽던 위치는 localStorage("bible-last-pos")에 기억.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, ChevronLeft, ChevronRight, ChevronDown,
  Loader2, RotateCcw, Volume2, X, Check, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { BIBLE_BOOKS, getBook, fetchChapter, fetchChapterKo, BibleVerse } from "@/lib/bible";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { ttsPlayer } from "@/lib/tts";

const MY_WORDBOOK_ID = "my-wordbook";
const LAST_POS_KEY = "bible-last-pos";

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

  // ---------- 위치 / 본문 ----------
  const [pos, setPos] = useState<BiblePos>(loadLastPos);
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);     // 앞면 TB
  const [versesKo, setVersesKo] = useState<BibleVerse[] | null>(null); // 뒷면 새번역
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [koError, setKoError] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const loadToken = useRef(0);
  const scrollTopRef = useRef<HTMLDivElement | null>(null);

  const book = getBook(pos.bookId);

  // ---------- 시트 (책 선택 / 장 선택) ----------
  const [bookSheet, setBookSheet] = useState(false);
  const [chapterSheet, setChapterSheet] = useState<string | null>(null); // 장 시트가 가리키는 bookId

  // ---------- 뒤로가기 (시트/팝업만 한 단계 닫기) ----------
  const subOpenRef = useRef(false);
  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try { window.history.pushState({ bibleSub: true }, ""); } catch (e) {}
    }
  };
  const resetSub = () => {
    setBookSheet(false);
    setChapterSheet(null);
    setPopupWord(null);
  };
  const closeSub = () => {
    if (subOpenRef.current) window.history.back();
    else resetSub();
  };
  useEffect(() => {
    const onPop = () => {
      if (subOpenRef.current) {
        subOpenRef.current = false;
        resetSub();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
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
    ttsPlayer.stop();
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
    <p key={v.verse} className="mb-2 text-base leading-relaxed font-word text-gray-900">
      <span className="text-sky-500/70 text-xs align-super mr-1 select-none">{v.verse}</span>
      {renderTokens(v.text, "b" + v.verse + "-")}
    </p>
  );

  const renderKoVerse = (v: BibleVerse) => (
    <p key={"k" + v.verse} className="mb-2 text-sm leading-relaxed text-gray-800 font-gothic">
      <span className="text-sky-500/70 text-xs align-super mr-1 select-none">{v.verse}</span>
      {v.text}
    </p>
  );

  const posLabel = book ? `${book.idName} ${pos.chapter} · ${book.ko} ${pos.chapter}장` : "";

  // ---------- 화면 ----------
  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
      <div ref={scrollTopRef} />
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/devotion")}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
          <BookOpen size={16} className="text-white" />
        </span>
        <h1 className="text-lg font-semibold leading-none">성경 읽기</h1>
      </header>

      <div className="px-4 py-4">
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="flex items-stretch">
            <div className="flex-1 min-w-0 px-5 py-5">
              {/* 위치 필 (탭 → 책 선택 시트) */}
              <button
                onClick={() => { setBookSheet(true); pushSub(); }}
                className="inline-flex items-center gap-1 max-w-full font-bold text-sky-600 bg-sky-500/10 rounded-full px-3 py-1 text-xs mb-4"
              >
                <span className="truncate">{posLabel}</span>
                <ChevronDown size={13} className="shrink-0" />
              </button>

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
                <div>{(verses || []).map(renderTbVerse)}</div>
              ) : versesKo ? (
                <div>{versesKo.map(renderKoVerse)}</div>
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

            {/* 뒤집기 바 */}
            {!loading && !error && (
              <button
                onClick={() => setFlipped((f) => !f)}
                className="shrink-0 w-2 self-stretch rounded-full bg-sky-500/15 active:bg-sky-500/40 my-4 mr-1.5"
                aria-label="카드 뒤집기"
              />
            )}
          </div>
        </div>

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

      {/* 책 선택 시트 (66권, 구약/신약 색 구분) */}
      {bookSheet && (
        <div className="fixed inset-0 z-50" onClick={closeSub}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "80dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-2 flex items-center gap-2 shrink-0">
              <p className="text-sm font-semibold text-gray-900">성경 선택</p>
              <button
                onClick={closeSub}
                className="ml-auto w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto px-3 pb-6" style={{ WebkitOverflowScrolling: "touch" as any }}>
              <p className="text-[11px] font-gothic font-semibold text-teal-600 px-2 pt-2 pb-1">구약 Perjanjian Lama</p>
              {BIBLE_BOOKS.filter((b) => b.folder === "pl").map((b) => (
                <button
                  key={b.id}
                  onClick={() => setChapterSheet(b.id)}
                  className={`w-full flex items-baseline gap-2 text-left px-2 py-2 rounded-lg active:bg-black/5 ${
                    b.id === pos.bookId ? "bg-sky-500/10" : ""
                  }`}
                >
                  <span className="text-sm font-word font-semibold text-teal-700">{b.idName}</span>
                  <span className="text-xs font-gothic text-gray-600">{b.ko}</span>
                </button>
              ))}
              <p className="text-[11px] font-gothic font-semibold text-blue-600 px-2 pt-3 pb-1">신약 Perjanjian Baru</p>
              {BIBLE_BOOKS.filter((b) => b.folder === "pb").map((b) => (
                <button
                  key={b.id}
                  onClick={() => setChapterSheet(b.id)}
                  className={`w-full flex items-baseline gap-2 text-left px-2 py-2 rounded-lg active:bg-black/5 ${
                    b.id === pos.bookId ? "bg-sky-500/10" : ""
                  }`}
                >
                  <span className="text-sm font-word font-semibold text-blue-700">{b.idName}</span>
                  <span className="text-xs font-gothic text-gray-600">{b.ko}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 장 선택 시트 */}
      {chapterSheet && (() => {
        const cb = getBook(chapterSheet);
        if (!cb) return null;
        return (
          <div className="fixed inset-0 z-50" onClick={() => setChapterSheet(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "80dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-4 pb-2 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setChapterSheet(null)}
                  className="w-8 h-8 -ml-2 rounded-full text-gray-500 flex items-center justify-center"
                  title="책 목록으로"
                >
                  <ChevronLeft size={17} />
                </button>
                <p className="text-sm font-semibold text-gray-900">
                  <span className="font-word">{cb.idName}</span>{" "}
                  <span className="font-gothic text-gray-500 text-xs">{cb.ko}</span>
                </p>
                <button
                  onClick={closeSub}
                  className="ml-auto w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                  title="닫기"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="overflow-y-auto px-3 pb-6" style={{ WebkitOverflowScrolling: "touch" as any }}>
                {Array.from({ length: cb.chapters }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => {
                      setPos({ bookId: cb.id, chapter: ch });
                      closeSub();
                      scrollTopRef.current?.scrollIntoView?.();
                    }}
                    className={`w-full text-left px-2 py-2 rounded-lg text-sm font-gothic active:bg-black/5 ${
                      cb.id === pos.bookId && ch === pos.chapter
                        ? "bg-sky-500/10 text-sky-700 font-semibold"
                        : "text-gray-800"
                    }`}
                  >
                    {ch}장
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 단어 미니 팝업 */}
      {popupWord && (
        <div className="fixed inset-0 z-50" onClick={closeSub}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-2xl px-5 pt-5 pb-7"
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

export default BibleRead;
