import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sunrise, Volume2, Loader2, Plus, Check, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getBookByKo, fetchQtTbVerses, BibleVerse } from "@/lib/bible";
import { fetchTodayQt, QtToday, QtVerse } from "@/lib/qtToday";
import { generateQtDevotion } from "@/lib/devotion";
import { saveDevotion, listDevotions, qtIdFor, DevotionRecord } from "@/lib/devotionStore";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { hasClaudeApiKey } from "@/lib/claude";
import SettingsDialog from "@/components/SettingsDialog";

const MY_WORDBOOK_ID = "my-wordbook";

// TTS: AndroidTTS 우선, speechSynthesis 폴백 (프로젝트 공통 패턴)
const speak = (text: string, lang: "id" | "ko" = "id") => {
  if (!text) return;
  if ((window as any).AndroidTTS) {
    try { (window as any).AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID"); } catch (e) {}
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
    utterance.rate = 0.9;
    speechSynthesis?.cancel?.();
    setTimeout(() => { try { speechSynthesis?.speak?.(utterance); } catch (e) {} }, 150);
  } catch (e) {}
};

const fmtQtDate = (dateStr: string) => dateStr.replace(new RegExp("-", "g"), ".");

// 카드 헤더용 날짜 라벨: 앞면(인니어) "QT 21 Juli" / 뒷면(한국어) "7월 21일 QT"
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const qtDateLabel = (dateStr: string, ko: boolean) => {
  const parts = dateStr.split("-");
  const m = Number(parts[1]) || 1;
  const d = Number(parts[2]) || 1;
  return ko ? m + "월 " + d + "일 QT" : "QT " + d + " " + (BULAN[m - 1] || "");
};

const tbRangeLabel = (rec: DevotionRecord) =>
  rec.crossChapter
    ? rec.bookIdName + " " + rec.chapter + ":" + rec.verseStart + "-" + rec.endChapter + ":" + rec.verseEnd
    : rec.bookIdName + " " + rec.chapter + ":" + rec.verseStart + "-" + rec.verseEnd;

const Devotion = () => {
  const navigate = useNavigate();

  const [todayQt, setTodayQt] = useState<QtToday | null>(null);
  const [qtLoading, setQtLoading] = useState(true);
  const [qtError, setQtError] = useState(false);

  const [records, setRecords] = useState<DevotionRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [current, setCurrent] = useState<DevotionRecord | null>(null);
  const [flipped, setFlipped] = useState(false);

  // 앞/뒤 문단 DOM 참조 (뒤집을 때 읽던 문단으로 스크롤 맞추기)
  const paraRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const pendingPara = useRef<number | null>(null);

  const currentParaIndex = (side: "id" | "ko") => {
    const marker = 140;
    let best = 0;
    let bestDist = Infinity;
    Object.keys(paraRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      const el = paraRefs.current[k];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const dist = Math.abs(top - marker);
      if (top <= marker + 40 && dist < bestDist) {
        bestDist = dist;
        best = Number(k.split("-")[1]) || 0;
      }
    });
    return best;
  };

  const handleFlip = () => {
    const side = flipped ? "ko" : "id";
    pendingPara.current = currentParaIndex(side);
    setFlipped((f) => !f);
  };

  useEffect(() => {
    const idx = pendingPara.current;
    if (idx === null) return;
    pendingPara.current = null;
    if (idx <= 0) {
      window.scrollTo({ top: 0 });
      return;
    }
    const side = flipped ? "ko" : "id";
    const el = paraRefs.current[side + "-" + idx];
    if (!el) {
      window.scrollTo({ top: 0 });
      return;
    }
    const top = window.scrollY + el.getBoundingClientRect().top - 140;
    window.scrollTo({ top: Math.max(0, top) });
  }, [flipped]);

  const [fullOpen, setFullOpen] = useState(false); // TB 본문 토글 (앞면)
  const [cardVerses, setCardVerses] = useState<BibleVerse[] | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(false);

  const [koOpen, setKoOpen] = useState(false); // 우리말성경 토글 (뒷면) — 레코드에 이미 저장돼 있어 즉시 표시

  // 단어 미니 팝업 (이야기와 동일한 3단 캐시 공유)
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  const subOpenRef = useRef(false);

  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try { window.history.pushState({ devotionSub: true }, ""); } catch (e) {}
    }
  };

  const resetSub = () => {
    setCurrent(null);
    setFlipped(false);
    paraRefs.current = {};
    pendingPara.current = null;
    setFullOpen(false);
    setKoOpen(false);
    setPopupWord(null);
    setCardVerses(null);
    setCardError(false);
    wordCache.current.clear();
  };

  const closeSub = () => {
    if (subOpenRef.current) {
      window.history.back();
    } else {
      resetSub();
    }
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

  // 오늘의 QT 불러오기
  const loadTodayQt = () => {
    setQtLoading(true);
    setQtError(false);
    fetchTodayQt()
      .then((qt) => setTodayQt(qt))
      .catch(() => setQtError(true))
      .finally(() => setQtLoading(false));
  };

  useEffect(() => {
    loadTodayQt();
    listDevotions().then((all) => {
      setRecords(all);
      try {
        const rid = sessionStorage.getItem("devotion-return-id");
        if (rid) {
          sessionStorage.removeItem("devotion-return-id");
          const found = all.find((r) => r.id === rid);
          if (found) openCard(found);
        }
      } catch (e) {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayRec = todayQt ? records.find((r) => r.id === qtIdFor(todayQt.date)) : undefined;

  // ---------- TB(인니어) 본문 로드 ----------
  const loadTbVerses = (rec: DevotionRecord) => {
    if (!rec.bookId) {
      setCardError(true);
      return;
    }
    setCardLoading(true);
    setCardError(false);
    fetchQtTbVerses(rec.bookId, rec)
      .then((v) => setCardVerses(v))
      .catch(() => setCardError(true))
      .finally(() => setCardLoading(false));
  };

  const openCard = (rec: DevotionRecord) => {
    wordCache.current.clear();
    setFlipped(false);
    paraRefs.current = {};
    pendingPara.current = null;
    setFullOpen(false);
    setKoOpen(false);
    setPopupWord(null);
    setCardVerses(null);
    setCardError(false);
    setCurrent(rec);
    pushSub();
  };

  // ---------- 오늘의 묵상 생성 ----------
  const handleGenerate = async () => {
    if (generating || !todayQt) return;
    if (!hasClaudeApiKey()) {
      toast("Claude API 키가 필요합니다. 설정에서 입력해주세요");
      setSettingsOpen(true);
      return;
    }
    setGenerating(true);
    try {
      const book = getBookByKo(todayQt.book);
      const content = await generateQtDevotion(todayQt, book);
      const rec = await saveDevotion(todayQt, book ? book.id : "", book ? book.idName : todayQt.book, content);
      setRecords((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
      openCard(rec);
    } catch (e: any) {
      const code = (e && e.message) || "";
      if (code === "NO_API_KEY" || code === "INVALID_API_KEY") {
        toast("Claude API 키를 설정에서 확인해주세요");
        setSettingsOpen(true);
      } else if (code === "NO_CREDIT") {
        toast("Claude 크레딧이 부족합니다. console.anthropic.com에서 충전해주세요");
      } else if (code === "RATE_LIMIT" || code === "OVERLOADED") {
        toast("지금 요청이 많아요. 잠시 후 다시 시도해주세요");
      } else {
        toast("묵상 생성에 실패했어요. 다시 시도해주세요");
      }
    } finally {
      setGenerating(false);
    }
  };

  // ---------- 단어 탭 → 미니 팝업 ----------
  const openWordPopup = async (rawToken: string, sentence: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    setPopupSaved(hasWordInCategory(MY_WORDBOOK_ID, word));

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
    try { if (current) sessionStorage.setItem("devotion-return-id", current.id); } catch (e) {}
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=devotion");
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
          className="cursor-pointer rounded active:bg-rose-500/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

  const renderIndoParagraphs = (text: string) => {
    const paragraphs = text.split(new RegExp("\\n{2,}")).filter((p) => p.trim());
    return paragraphs.map((para, pi) => {
      const sentences = para.split(new RegExp("(?<=[.!?])\\s+")).filter(Boolean);
      return (
        <p
          key={pi}
          ref={(el) => { paraRefs.current["id-" + pi] = el; }}
          className="mb-4 text-base leading-relaxed font-word text-gray-900"
        >
          {sentences.map((sent, si) => (
            <span key={si}>{renderTokens(sent, pi + "-" + si + "-")}</span>
          ))}
        </p>
      );
    });
  };

  const renderKoParagraphs = (text: string) =>
    text.split(new RegExp("\\n{2,}")).filter((p) => p.trim()).map((para, i) => (
      <p
        key={i}
        ref={(el) => { paraRefs.current["ko-" + i] = el; }}
        className="mb-4 text-xs leading-relaxed text-gray-800 font-body"
      >
        {para}
      </p>
    ));

  const renderTbVerse = (v: BibleVerse) => (
    <p key={v.verse} className="mb-2 text-base leading-relaxed font-word text-gray-900">
      <span className="text-rose-500/70 text-xs align-super mr-1 select-none">{v.verse}</span>
      {renderTokens(v.text, "tb" + v.verse + "-")}
    </p>
  );

  const renderWoorimalVerse = (v: QtVerse) => (
    <p key={"w" + v.n} className="mb-2 text-xs leading-relaxed text-gray-800 font-gothic">
      <span className="text-rose-500/70 text-xs align-super mr-1 select-none">{v.n}</span>
      {v.t}
    </p>
  );

  // ---------- 카드 상세 뷰 ----------
  if (current) {
    const c = current.content;

    return (
      <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
        <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
          <button
            onClick={closeSub}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="목록으로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 text-base font-semibold leading-snug line-clamp-2 break-words">
            {qtDateLabel(current.date, flipped)}
          </h1>
        </header>

        <div className="px-4 py-4">
          <div className="bg-card border border-border/60 rounded-xl pl-5 pr-2 py-5 min-h-[72vh] content-bump select-none flex gap-2">
            <div className="flex-1 min-w-0">
              {!flipped ? (
                <>
                  {/* 앞면: 인니어 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">Saat Teduh</span>
                  </div>
                  <div className="mb-3 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">
                      {renderTokens(c.title, "title-")}
                    </h2>
                  </div>

                  {/* TB 본문 — 토글 */}
                  <div className="rounded-lg bg-rose-500/5 border border-rose-200/60 px-3 py-2.5 mb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !fullOpen;
                        setFullOpen(next);
                        if (next && !cardVerses && !cardLoading) loadTbVerses(current);
                      }}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className="flex-1 min-w-0 text-xs font-semibold text-rose-600 font-gothic truncate">
                        {tbRangeLabel(current)}
                      </span>
                      {fullOpen ? (
                        <ChevronUp size={15} className="shrink-0 text-rose-500" />
                      ) : (
                        <ChevronDown size={15} className="shrink-0 text-rose-500" />
                      )}
                    </button>

                    {fullOpen && (
                      <div className="mt-2.5">
                        {cardLoading && (
                          <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                            <Loader2 size={14} className="animate-spin" /> 본문을 불러오는 중...
                          </div>
                        )}
                        {cardError && !cardLoading && (
                          <div className="text-xs text-gray-500 font-gothic py-1">
                            본문을 불러오지 못했어요.{" "}
                            <button
                              onClick={(e) => { e.stopPropagation(); loadTbVerses(current); }}
                              className="text-rose-600 font-medium underline"
                            >
                              다시 시도
                            </button>
                          </div>
                        )}
                        {cardVerses && cardVerses.map(renderTbVerse)}
                      </div>
                    )}
                  </div>

                  {/* 묵상 도우미 */}
                  {renderIndoParagraphs(c.helper)}

                  {/* 기도 */}
                  {c.doa && (
                    <p className="mt-2 mb-2 pl-3 border-l-2 border-rose-300 text-base leading-relaxed font-word text-gray-800 italic">
                      <span className="not-italic font-semibold text-rose-600 text-sm mr-1">Doa</span>
                      {renderTokens(c.doa, "doa-")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">QT</span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900 break-words mb-3">{c.titleKo}</h2>

                  {/* 우리말성경 본문 — 토글 (레코드에 저장돼 있어 즉시 표시) */}
                  <div className="rounded-lg bg-rose-500/5 border border-rose-200/60 px-3 py-2.5 mb-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setKoOpen((f) => !f); }}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className="flex-1 min-w-0 text-xs font-semibold text-rose-600 font-gothic truncate">
                        {current.rangeText} (우리말성경)
                      </span>
                      {koOpen ? (
                        <ChevronUp size={15} className="shrink-0 text-rose-500" />
                      ) : (
                        <ChevronDown size={15} className="shrink-0 text-rose-500" />
                      )}
                    </button>

                    {koOpen && (
                      <div className="mt-2.5">
                        {current.versesWoorimal.length > 0 ? (
                          current.versesWoorimal.map(renderWoorimalVerse)
                        ) : (
                          <p className="text-xs text-gray-500 font-gothic py-1">
                            이 날은 우리말성경 본문을 가져오지 못했어요.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {renderKoParagraphs(c.helperKo)}
                  {c.doaKo && (
                    <p className="mt-2 mb-4 pl-3 border-l-2 border-rose-300 text-xs leading-relaxed text-gray-800 font-body">
                      <span className="font-semibold text-rose-600 mr-1">기도</span>
                      {c.doaKo}
                    </p>
                  )}

                  <div className="border-t border-gray-200 my-4" />

                  {/* 본문 들여다보기 */}
                  <div className="rounded-lg bg-black/[0.04] px-3 py-3">
                    <p className="text-xs font-bold text-gray-900 font-gothic mb-2">
                      📖 {c.noteTitleKo}
                    </p>
                    <p className="text-xs text-gray-700 font-gothic leading-relaxed">{c.noteKo}</p>
                  </div>
                </>
              )}
            </div>
            {/* 뒤집기 바 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleFlip(); }}
              className="shrink-0 w-2 self-stretch rounded-full bg-rose-500/15 active:bg-rose-500/40"
              aria-label="카드 뒤집기"
              title="카드 뒤집기"
            />
          </div>
          <p className="text-center text-white/50 text-xs mt-3">
            {flipped ? "오른쪽 바를 누르면 원문이 보입니다" : "오른쪽 바를 누르면 해석, 단어를 탭하면 뜻이 나옵니다"}
          </p>
        </div>

        {/* 단어 미니 팝업 */}
        {popupWord && (
          <div className="fixed inset-0 z-50" onClick={() => setPopupWord(null)}>
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
                  onClick={() => setPopupWord(null)}
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
  }

  // ---------- 홈 뷰 ----------
  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold truncate">인도네시아어 묵상</h1>
      </header>

      <div className="px-4 py-4">
        {qtLoading ? (
          <div className="bg-card border border-border/60 rounded-xl px-4 py-8 text-center">
            <Loader2 size={22} className="mx-auto mb-2 text-rose-500 animate-spin" />
            <p className="text-sm text-gray-500 font-gothic">오늘의 QT를 불러오는 중...</p>
          </div>
        ) : qtError || !todayQt ? (
          <div className="bg-card border border-border/60 rounded-xl px-4 py-8 text-center">
            <p className="text-sm text-gray-700 font-gothic mb-4">오늘의 QT를 불러오지 못했어요</p>
            <button
              onClick={loadTodayQt}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium bg-rose-500 text-white"
            >
              <RotateCcw size={14} /> 다시 시도
            </button>
          </div>
        ) : todayRec ? (
          <button
            onClick={() => openCard(todayRec)}
            className="w-full text-left rounded-xl border border-rose-300/60 bg-card bg-gradient-to-br from-transparent to-rose-300/35 px-4 py-3.5"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-rose-600 font-gothic">오늘의 묵상</p>
              <span className="text-[11px] font-medium text-rose-600 bg-rose-500/10 rounded-full px-2 py-0.5">
                {tbRangeLabel(todayRec)}
              </span>
            </div>
            <p className="mt-1 text-base font-bold text-gray-900 font-word break-words">{todayRec.content.title}</p>
            <p className="text-xs text-gray-500 font-gothic mt-0.5 break-words">{todayRec.content.titleKo}</p>
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium bg-rose-500 text-white disabled:opacity-60"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> 묵상 내용을 만드는 중...</>
            ) : (
              <><Sunrise size={16} /> 오늘의 묵상 · {todayQt.rangeText}</>
            )}
          </button>
        )}

        {/* 지난 묵상 */}
        {records.filter((r) => !todayRec || r.id !== todayRec.id).length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-white mb-2 px-1 font-gothic">지난 묵상</p>
            <ul className="space-y-2">
              {records
                .filter((r) => !todayRec || r.id !== todayRec.id)
                .map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => openCard(r)}
                      className="w-full text-left bg-card border border-border/60 rounded-xl px-4 py-3 min-w-0"
                    >
                      <p className="text-sm font-semibold text-gray-900 break-words font-word">{r.content.title}</p>
                      <p className="text-xs text-gray-500 break-words mt-0.5 font-gothic">{r.content.titleKo}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-rose-600 bg-rose-500/10 rounded-full px-2 py-0.5">
                          {r.rangeText}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-auto">{fmtQtDate(r.date)}</span>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Devotion;
