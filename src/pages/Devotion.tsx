import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sunrise, Volume2, Loader2, Plus, Check, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { BIBLE_BOOKS, getBook, fetchChapter, bibleComUrl, BibleVerse } from "@/lib/bible";
import { generateDevotion } from "@/lib/devotion";
import { saveDevotion, listDevotions, DevotionRecord } from "@/lib/devotionStore";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { hasClaudeApiKey } from "@/lib/claude";
import SettingsDialog from "@/components/SettingsDialog";

const MY_WORDBOOK_ID = "my-wordbook";
const BOOK_KEY = "devotion-book";
const PROG_KEY = "devotion-progress";
const DATE_KEY = "devotion-last-date";
const TODAY_ID_KEY = "devotion-today-id";

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

const fmtDate = (t: number) => {
  const d = new Date(t);
  return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0");
};

const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

const readProgress = (): Record<string, number> => {
  try {
    const v = JSON.parse(localStorage.getItem(PROG_KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

const Devotion = () => {
  const navigate = useNavigate();

  const [bookId, setBookId] = useState<string>(() => {
    try { return localStorage.getItem(BOOK_KEY) || ""; } catch { return ""; }
  });
  const [progress, setProgress] = useState<Record<string, number>>(readProgress);
  const [todayInfo, setTodayInfo] = useState<{ date: string; id: string }>(() => {
    try {
      return {
        date: localStorage.getItem(DATE_KEY) || "",
        id: localStorage.getItem(TODAY_ID_KEY) || "",
      };
    } catch {
      return { date: "", id: "" };
    }
  });
  const [records, setRecords] = useState<DevotionRecord[]>([]);
  const [genPhase, setGenPhase] = useState<null | "bible" | "write">(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 하위 화면: 성경 선택 / 묵상 카드
  const [selectOpen, setSelectOpen] = useState(false);
  const [current, setCurrent] = useState<DevotionRecord | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [fullOpen, setFullOpen] = useState(false); // 본문 전체 토글
  const [cardVerses, setCardVerses] = useState<BibleVerse[] | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(false);

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

  // 하위 화면이 열려 있는지 (히스토리 한 칸)
  const subOpenRef = useRef(false);

  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try { window.history.pushState({ devotionSub: true }, ""); } catch (e) {}
    }
  };

  const resetSub = () => {
    setCurrent(null);
    setSelectOpen(false);
    setFlipped(false);
    setFullOpen(false);
    setPopupWord(null);
    setCardVerses(null);
    setCardError(false);
    wordCache.current.clear();
  };

  const closeSub = () => {
    if (subOpenRef.current) {
      window.history.back(); // popstate 핸들러가 resetSub 처리
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

  useEffect(() => {
    listDevotions().then(setRecords);
  }, []);

  const book = getBook(bookId);
  const doneCh = book ? progress[book.id] || 0 : 0;
  const nextCh = doneCh + 1;
  const completed = !!book && doneCh >= book.chapters;
  const isToday = todayInfo.date === todayStr();
  const todayRec = isToday ? records.find((r) => r.id === todayInfo.id) : undefined;

  // ---------- 하위 화면 열기 ----------
  const loadVerses = (rec: DevotionRecord) => {
    setCardLoading(true);
    setCardError(false);
    fetchChapter(rec.bookId, rec.chapter)
      .then((v) => setCardVerses(v))
      .catch(() => setCardError(true))
      .finally(() => setCardLoading(false));
  };

  const openCard = (rec: DevotionRecord, verses?: BibleVerse[]) => {
    wordCache.current.clear();
    setSelectOpen(false);
    setFlipped(false);
    setFullOpen(false);
    setPopupWord(null);
    setCurrent(rec);
    if (verses) {
      setCardVerses(verses);
      setCardError(false);
      setCardLoading(false);
    } else {
      setCardVerses(null);
      loadVerses(rec);
    }
    pushSub();
  };

  const openSelect = () => {
    setSelectOpen(true);
    pushSub();
  };

  const pickBook = (id: string) => {
    setBookId(id);
    try { localStorage.setItem(BOOK_KEY, id); } catch (e) {}
    closeSub();
  };

  // ---------- 오늘의 묵상 생성 ----------
  const handleGenerate = async () => {
    if (genPhase || !book || completed) return;
    if (!hasClaudeApiKey()) {
      toast("Claude API 키가 필요합니다. 설정에서 입력해주세요");
      setSettingsOpen(true);
      return;
    }
    const ch = nextCh;
    setGenPhase("bible");
    try {
      const verses = await fetchChapter(book.id, ch);
      setGenPhase("write");
      const content = await generateDevotion(book, ch, verses);
      const rec = await saveDevotion(book.id, ch, content);
      const np = { ...progress, [book.id]: ch };
      setProgress(np);
      try {
        localStorage.setItem(PROG_KEY, JSON.stringify(np));
        localStorage.setItem(DATE_KEY, todayStr());
        localStorage.setItem(TODAY_ID_KEY, rec.id);
      } catch (e) {}
      setTodayInfo({ date: todayStr(), id: rec.id });
      setRecords((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
      openCard(rec, verses);
    } catch (e: any) {
      const code = (e && e.message) || "";
      if (code === "NO_API_KEY" || code === "INVALID_API_KEY") {
        toast("Claude API 키를 설정에서 확인해주세요");
        setSettingsOpen(true);
      } else if (code === "NO_CREDIT") {
        toast("Claude 크레딧이 부족합니다. console.anthropic.com에서 충전해주세요");
      } else if (code === "RATE_LIMIT" || code === "OVERLOADED") {
        toast("지금 요청이 많아요. 잠시 후 다시 시도해주세요");
      } else if (code === "BIBLE_FETCH_FAILED" || code === "CHAPTER_NOT_FOUND" || code === "NETWORK_FAILED") {
        toast("성경 본문을 불러오지 못했어요. 네트워크를 확인해주세요");
      } else {
        toast("묵상 생성에 실패했어요. 다시 시도해주세요");
      }
    } finally {
      setGenPhase(null);
    }
  };

  // ---------- 단어 탭 → 미니 팝업 (카드 메모리 → 폰 저장소 → API) ----------
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
    navigate("/dictionary?q=" + encodeURIComponent(popupWord));
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

  const renderIndoBody = (text: string) => {
    const paragraphs = text.split(new RegExp("\\n{2,}")).filter((p) => p.trim());
    return paragraphs.map((para, pi) => {
      const sentences = para.split(new RegExp("(?<=[.!?])\\s+")).filter(Boolean);
      return (
        <p key={pi} className="mb-4 text-base leading-relaxed font-word text-gray-900">
          {sentences.map((sent, si) => (
            <span key={si}>{renderTokens(sent, pi + "-" + si + "-")}</span>
          ))}
        </p>
      );
    });
  };

  const renderKorean = (text: string) =>
    text.split(new RegExp("\\n{2,}")).filter((p) => p.trim()).map((para, i) => (
      <p key={i} className="mb-4 text-xs leading-relaxed text-gray-800 font-body">{para}</p>
    ));

  const renderVerse = (v: BibleVerse) => (
    <p key={v.verse} className="mb-2 text-base leading-relaxed font-word text-gray-900">
      <span className="text-rose-500/70 text-xs align-super mr-1 select-none">{v.verse}</span>
      {renderTokens(v.text, "v" + v.verse + "-")}
    </p>
  );

  // ---------- 카드 뷰 ----------
  if (current) {
    const c = current.content;
    const cBook = getBook(current.bookId);
    const nasVerses = (cardVerses || []).filter((v) => v.verse >= c.nasStart && v.verse <= c.nasEnd);
    const nasRef = c.nasStart === c.nasEnd ? String(c.nasStart) : c.nasStart + "-" + c.nasEnd;

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
            {c.titleKo || c.title}
          </h1>
        </header>

        <div className="px-4 py-4">
          <div className="bg-card border border-border/60 rounded-xl pl-5 pr-2 py-5 min-h-[72vh] content-bump select-none flex gap-2">
            <div className="flex-1 min-w-0">
              {!flipped ? (
                <>
                  {/* 앞면: 인니어 묵상 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-rose-600 bg-rose-500/10 rounded-full px-2 py-0.5">
                      {cBook ? cBook.idName : current.bookId} {current.chapter}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">Saat Teduh</span>
                  </div>
                  <div className="mb-3 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">
                      {renderTokens(c.title, "title-")}
                    </h2>
                  </div>

                  {/* Nas: 묵상 중심 구절 (TB 원문) — 토글 */}
                  <div className="rounded-lg bg-rose-500/5 border border-rose-200/60 px-3 py-2.5 mb-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setFullOpen((f) => !f); }}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className="flex-1 min-w-0 text-xs font-semibold text-rose-600 font-gothic truncate">
                        Nas · {cBook ? cBook.idName : ""} {current.chapter}:{nasRef}
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
                        {cardError && (
                          <div className="text-xs text-gray-500 font-gothic py-1">
                            본문을 불러오지 못했어요. 네트워크를 확인해주세요.{" "}
                            <button
                              onClick={(e) => { e.stopPropagation(); loadVerses(current); }}
                              className="text-rose-600 font-medium underline"
                            >
                              다시 시도
                            </button>
                          </div>
                        )}
                        {nasVerses.map(renderVerse)}
                        {!cardLoading && !cardError && (
                          <a
                            href={bibleComUrl(current.bookId, current.chapter)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-600 font-gothic"
                          >
                            <ExternalLink size={12} />
                            {cBook ? cBook.idName : ""} {current.chapter} 전체 읽기 · 듣기
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 묵상 본문 */}
                  {renderIndoBody(c.body)}

                  {/* 기도 */}
                  {c.doa && (
                    <p className="mt-2 mb-2 pl-3 border-l-2 border-rose-300 text-base leading-relaxed font-word text-gray-800 italic">
                      <span className="not-italic font-semibold text-rose-600 text-sm mr-1">Doa.</span>
                      {renderTokens(c.doa, "doa-")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 번역 + 큰 그림 */}
                  <h2 className="text-base font-bold text-gray-900 break-words mb-1">{c.titleKo}</h2>
                  <p className="text-xs text-gray-500 font-gothic mb-3">
                    {cBook ? cBook.ko : ""} {current.chapter}:{nasRef}
                  </p>
                  {renderKorean(c.bodyKo)}
                  {c.doaKo && (
                    <p className="mt-2 mb-4 pl-3 border-l-2 border-rose-300 text-xs leading-relaxed text-gray-800 font-body">
                      <span className="font-semibold text-rose-600 mr-1">기도.</span>
                      {c.doaKo}
                    </p>
                  )}

                  <div className="border-t border-gray-200 my-4" />

                  {/* 책 들어가기 (1장일 때만) */}
                  {c.bookIntro && (
                    <div className="rounded-lg bg-black/[0.04] px-3 py-3 mb-3">
                      <p className="text-xs font-bold text-gray-900 font-gothic mb-2">
                        📕 {cBook ? cBook.ko : ""} 들어가기
                      </p>
                      <p className="text-xs text-gray-700 font-gothic mb-1.5 leading-relaxed">
                        <span className="font-semibold text-gray-900">저자·시대 · </span>{c.bookIntro.author}
                      </p>
                      <p className="text-xs text-gray-700 font-gothic mb-1.5 leading-relaxed">
                        <span className="font-semibold text-gray-900">기록 목적 · </span>{c.bookIntro.purpose}
                      </p>
                      <p className="text-xs text-gray-700 font-gothic mb-1.5 leading-relaxed">
                        <span className="font-semibold text-gray-900">전체 구조 · </span>{c.bookIntro.structure}
                      </p>
                      <p className="text-xs text-gray-700 font-gothic leading-relaxed">
                        <span className="font-semibold text-gray-900">붙잡을 것 · </span>{c.bookIntro.key}
                      </p>
                    </div>
                  )}

                  {/* 이 장의 자리 (큰 그림 도구) */}
                  <div className="rounded-lg bg-black/[0.04] px-3 py-3">
                    <p className="text-xs font-bold text-gray-900 font-gothic mb-2">
                      🧭 {cBook ? cBook.ko : ""} {current.chapter}장 — 이 장의 자리
                    </p>
                    <p className="text-xs text-gray-700 font-gothic mb-1.5 leading-relaxed">
                      <span className="font-semibold text-gray-900">요지 · </span>{c.overview.summary}
                    </p>
                    <p className="text-xs text-gray-700 font-gothic mb-1.5 leading-relaxed">
                      <span className="font-semibold text-gray-900">흐름 속 위치 · </span>{c.overview.flow}
                    </p>
                    <p className="text-xs text-gray-700 font-gothic leading-relaxed">
                      <span className="font-semibold text-gray-900">강조점 · </span>{c.overview.emphasis}
                    </p>
                  </div>
                </>
              )}
            </div>
            {/* 뒤집기 바 */}
            <button
              onClick={(e) => { e.stopPropagation(); setFlipped((f) => !f); }}
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

  // ---------- 성경 선택 뷰 ----------
  if (selectOpen) {
    const renderBookBtn = (b: (typeof BIBLE_BOOKS)[number]) => {
      const done = progress[b.id] || 0;
      const isDone = done >= b.chapters;
      const isSel = b.id === bookId;
      return (
        <button
          key={b.id}
          onClick={() => pickBook(b.id)}
          className={`flex items-center justify-between gap-2 rounded-lg bg-card border px-3 py-2.5 min-w-0 text-left ${
            isSel ? "border-rose-400" : "border-border/60"
          }`}
        >
          <span className="text-sm font-medium text-gray-900 truncate">{b.ko}</span>
          {isDone ? (
            <Check size={14} className="shrink-0 text-rose-500" />
          ) : done > 0 ? (
            <span className="shrink-0 text-xs text-rose-600 font-gothic">{done}/{b.chapters}</span>
          ) : (
            <span className="shrink-0 text-xs text-gray-400 font-gothic">{b.chapters}장</span>
          )}
        </button>
      );
    };

    return (
      <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
        <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
          <button
            onClick={closeSub}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-lg font-semibold truncate">묵상할 성경 선택</h1>
        </header>
        <div className="px-4 py-4">
          <p className="text-xs text-white mb-2 px-1 font-gothic">구약</p>
          <div className="grid grid-cols-2 gap-2">
            {BIBLE_BOOKS.filter((b) => b.folder === "pl").map(renderBookBtn)}
          </div>
          <p className="text-xs text-white mb-2 mt-5 px-1 font-gothic">신약</p>
          <div className="grid grid-cols-2 gap-2 pb-6">
            {BIBLE_BOOKS.filter((b) => b.folder === "pb").map(renderBookBtn)}
          </div>
        </div>
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
        {!book ? (
          /* 첫 사용: 성경 선택 안내 */
          <div className="bg-card border border-border/60 rounded-xl px-4 py-8 text-center">
            <Sunrise size={30} className="mx-auto mb-3 text-rose-500" />
            <p className="text-sm text-gray-700 font-gothic mb-4">묵상할 성경을 선택해주세요</p>
            <button
              onClick={openSelect}
              className="rounded-full px-6 py-2.5 text-sm font-medium bg-rose-500 text-white"
            >
              성경 선택하기
            </button>
          </div>
        ) : (
          <>
            {/* 현재 책 + 진도 */}
            <div className="bg-card border border-border/60 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2">
                <p className="flex-1 min-w-0 truncate">
                  <span className="text-base font-semibold text-gray-900">{book.ko}</span>{" "}
                  <span className="text-xs text-gray-500 font-word">{book.idName}</span>
                </p>
                <button
                  onClick={openSelect}
                  className="shrink-0 text-xs font-medium text-rose-600 bg-rose-500/10 rounded-full px-2.5 py-1"
                >
                  성경 바꾸기
                </button>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: Math.min(100, Math.round((doneCh / book.chapters) * 100)) + "%" }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500 font-gothic">{doneCh} / {book.chapters}장</p>

              {/* 오늘의 묵상 */}
              {todayRec ? (
                <>
                  <button
                    onClick={() => openCard(todayRec)}
                    className="w-full mt-3 text-left rounded-xl border border-rose-300/60 bg-gradient-to-br from-transparent to-rose-300/25 px-4 py-3.5"
                  >
                    <p className="text-xs font-medium text-rose-600 font-gothic">오늘의 묵상</p>
                    <p className="mt-1 text-base font-bold text-gray-900 font-word break-words">{todayRec.content.title}</p>
                    <p className="text-xs text-gray-500 font-gothic mt-0.5 break-words">
                      {todayRec.content.titleKo} · {(getBook(todayRec.bookId) || { ko: todayRec.bookId }).ko} {todayRec.chapter}장
                    </p>
                  </button>
                  <p className="mt-2 text-xs text-gray-400 font-gothic text-center">
                    {completed
                      ? "🎉 " + book.ko + " 묵상을 모두 마쳤어요. 내일 다른 성경을 선택해보세요"
                      : "내일 " + book.ko + " " + nextCh + "장으로 이어집니다"}
                  </p>
                </>
              ) : completed ? (
                <div className="mt-3 rounded-xl bg-rose-500/5 border border-rose-200/60 px-4 py-4 text-center">
                  <p className="text-sm font-semibold text-gray-900">🎉 {book.ko} 묵상 완료!</p>
                  <p className="text-xs text-gray-500 font-gothic mt-1">{book.chapters}장을 모두 묵상했어요</p>
                  <button
                    onClick={openSelect}
                    className="mt-3 rounded-full px-5 py-2 text-xs font-medium bg-rose-500 text-white"
                  >
                    다른 성경 선택하기
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!!genPhase}
                  className="w-full mt-3 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium bg-rose-500 text-white disabled:opacity-60"
                >
                  {genPhase === "bible" ? (
                    <><Loader2 size={16} className="animate-spin" /> 본문을 불러오는 중...</>
                  ) : genPhase === "write" ? (
                    <><Loader2 size={16} className="animate-spin" /> 묵상 내용을 불러옵니다</>
                  ) : (
                    <><Sunrise size={16} /> 오늘의 묵상 · {book.ko} {nextCh}장</>
                  )}
                </button>
              )}
            </div>
          </>
        )}

        {/* 지난 묵상 */}
        {records.filter((r) => !todayRec || r.id !== todayRec.id).length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-white mb-2 px-1 font-gothic">지난 묵상</p>
            <ul className="space-y-2">
              {records
                .filter((r) => !todayRec || r.id !== todayRec.id)
                .map((r) => {
                  const rb = getBook(r.bookId);
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => openCard(r)}
                        className="w-full text-left bg-card border border-border/60 rounded-xl px-4 py-3 min-w-0"
                      >
                        <p className="text-sm font-semibold text-gray-900 break-words font-word">{r.content.title}</p>
                        <p className="text-xs text-gray-500 break-words mt-0.5 font-gothic">{r.content.titleKo}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-rose-600 bg-rose-500/10 rounded-full px-2 py-0.5">
                            {(rb || { ko: r.bookId }).ko} {r.chapter}장
                          </span>
                          <span className="text-[11px] text-gray-400 ml-auto">{fmtDate(r.createdAt)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Devotion;
