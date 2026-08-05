import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { ArrowLeft, Sunrise, Volume2, Loader2, Plus, Check, X, ChevronDown, ChevronUp, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { getBookByKo, fetchQtTbVerses, BibleVerse } from "@/lib/bible";
import { fetchTodayQt, QtToday, QtVerse } from "@/lib/qtToday";
import { generateQtDevotion } from "@/lib/devotion";
import { saveDevotion, listDevotions, qtIdFor, DevotionRecord } from "@/lib/devotionStore";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, LOOKUP_FAIL_TEXT } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import { hasClaudeApiKey } from "@/lib/claude";
import { useSwipeFlip } from "@/lib/useSwipeFlip";
import SettingsDialog from "@/components/SettingsDialog";
import PlayButton from "@/components/PlayButton";
import { ttsPlayer } from "@/lib/tts";
import { ReadingTracker } from "@/lib/readingTimer";
import PointFloat from "@/components/PointFloat";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";


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

// 카드 헤더용 날짜 라벨: 앞면(인니어) "QT 260727" / 뒷면(한국어) "7월 27일 QT"
const pad2 = (n: number) => (n < 10 ? "0" + n : String(n));
const qtDateLabel = (dateStr: string, ko: boolean) => {
  const parts = dateStr.split("-");
  const m = Number(parts[1]) || 1;
  const d = Number(parts[2]) || 1;
  if (ko) return m + "월 " + d + "일 QT";
  const yy = String(parts[0] || "").slice(-2);
  return "QT " + yy + pad2(m) + pad2(d);
};

const tbRangeLabel = (rec: DevotionRecord) =>
  rec.crossChapter
    ? rec.bookIdName + " " + rec.chapter + ":" + rec.verseStart + "-" + rec.endChapter + ":" + rec.verseEnd
    : rec.bookIdName + " " + rec.chapter + ":" + rec.verseStart + "-" + rec.verseEnd;

const Devotion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { widthClass, canWide, wide, toggle } = useWideMode();

  const [todayQt, setTodayQt] = useState<QtToday | null>(null);
  const [qtLoading, setQtLoading] = useState(true);
  const [qtError, setQtError] = useState(false);

  const [records, setRecords] = useState<DevotionRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [current, setCurrent] = useState<DevotionRecord | null>(null);
  const [flipped, setFlipped] = useState(false);

  // ---------- 읽기 점수 (보이지 않는 타이머) ----------
  // 화면에는 아무 표시도 없고, 한국어 면을 처음 여는 순간에만 "+N"이 한 번 뜽니다.
  // TB 성경 토글 같은 내부 토글은 관계없고, 오직 flipped만 봅니다.
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
    t.setUnit(current ? current.id : "");
  }, [current]);

  useEffect(() => {
    const t = trackerRef.current;
    if (!t) return;
    t.setSide(!!current && !flipped);
    if (current && flipped) t.koreanOpened();
  }, [flipped, current]);

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

  const { swipeHandlers, shouldIgnoreTap } = useSwipeFlip(handleFlip);

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

  // ---- 담을 단어장 (사전에서 고른 대상을 앱 전체가 함께 씁니다) ----
  const [saveTargets, setSaveTargets] = useState(loadSaveTargets);
  const [saveTargetId, setSaveTargetId] = useState(() => loadSaveTargetId(loadSaveTargets()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerOpenRef = useRef(false);
  const pickerPushedRef = useRef(false);
  const saveTargetName = (saveTargets.find((c) => c.id === saveTargetId) || { name: "" }).name;

  const chooseSaveTarget = (id: string) => {
    setSaveTargetId(id);
    saveSaveTargetId(id);
  };

  // 시트는 히스토리를 한 칸 더 쌓습니다 — 뒤로가기를 누르면 시트만 닫히고 팝업은 남습니다.
  const openPicker = () => {
    if (pickerOpenRef.current) return;
    setSaveTargets(loadSaveTargets());
    setPickerOpen(true);
    pickerOpenRef.current = true;
    try {
      window.history.pushState({ wordbookPicker: true }, "");
      pickerPushedRef.current = true;
    } catch (e) {
      pickerPushedRef.current = false;
    }
  };

  const closePicker = () => {
    if (!pickerOpenRef.current) return;
    if (pickerPushedRef.current) {
      pickerPushedRef.current = false;
      // pickerOpenRef 는 여기서 내리지 않습니다 — popstate 핸들러가 이것을 보고 닫습니다.
      try { window.history.back(); return; } catch (e) {}
    }
    pickerOpenRef.current = false;
    setPickerOpen(false);
  };

  // 대상이 바뀌면 그 단어장 기준으로 담김 여부를 다시 판정합니다.
  useEffect(() => {
    if (!popupWord || !saveTargetId) {
      setPopupSaved(false);
      return;
    }
    setPopupSaved(hasWordInCategory(saveTargetId, popupWord));
  }, [popupWord, saveTargetId]);

  const subOpenRef = useRef(false);
  // 히스토리를 실제로 쌓았는지 (사전으로 나갈 때 그 칸을 덮어쓸지 판단하는 데 씁니다)
  const subPushedRef = useRef(false);

  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try {
        window.history.pushState({ devotionSub: true }, "");
        subPushedRef.current = true;
      } catch (e) {
        subPushedRef.current = false;
      }
    }
  };

  const resetSub = () => {
    ttsPlayer.stop();
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
      // 시트가 팝업 위에 떠 있으면 시트만 닫습니다 (팝업은 그대로).
      if (pickerOpenRef.current) {
        pickerOpenRef.current = false;
        pickerPushedRef.current = false;
        setPickerOpen(false);
        return;
      }
      if (subOpenRef.current) {
        subOpenRef.current = false;
        subPushedRef.current = false;
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

  // ---------- 돌아올 자리로 되돌리기 ----------
  // 사전에 다녀오면 이 화면은 새로 마운트되어 목록으로 돌아갑니다.
  // 표가 있으면 보던 묵상 카드를 다시 열고, 면과 스크롤까지 되돌립니다.
  const pendingReturnRef = useRef<{ y: number; flipped: boolean } | null>(null);
  const cancelRestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadTodayQt();
    listDevotions().then((all) => {
      setRecords(all);
      const t = takeReturnTicket("devotion");
      if (t) {
        const found = all.find((r) => r.id === t.key);
        if (found) {
          pendingReturnRef.current = { y: t.y, flipped: t.flipped };
          // 카드 칸은 히스토리에 이미 남아 있습니다 — pushSub 이 새로 쌓지 않도록 미리 켜 둡니다.
          subOpenRef.current = true;
          subPushedRef.current = true;
          openCard(found);
        }
      }
    });
    return () => {
      if (cancelRestoreRef.current) cancelRestoreRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카드가 그려진 뒤에 면을 맞추고, 그 다음 자리를 되돌립니다.
  useEffect(() => {
    const p = pendingReturnRef.current;
    if (!p || !current) return;
    if (p.flipped && !flipped) {
      setFlipped(true);
      return;
    }
    pendingReturnRef.current = null;
    cancelRestoreRef.current = restoreScrollTo(p.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, flipped]);

  const todayRec = todayQt ? records.find((r) => r.id === qtIdFor(todayQt.date)) : undefined;

  // 생성 사고 복구: 인니어 필드에 한글이 섞인 기록은 "생성 전"으로 취급해 다시 만들 수 있게 함
  // (handleGenerate가 같은 id로 덮어쓰므로 재생성 시 오염된 기록이 교체됨)
  const recHasKorean = (r: DevotionRecord | undefined) => {
    if (!r) return false;
    const h = (t: string) => new RegExp("[\\uAC00-\\uD7AF]").test(t || "");
    return h(r.content.title) || h(r.content.helper) || h(r.content.doa) || h(r.content.note);
  };
  const todayBroken = recHasKorean(todayRec);

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
    ttsPlayer.stop();
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
    if (shouldIgnoreTap()) return;
    trackerRef.current?.touch();
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    setPopupSaved(!!saveTargetId && hasWordInCategory(saveTargetId, word));

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
    // 돌아올 자리를 표로 한 장 적어 둡니다 (어느 묵상 + 스크롤 + 보고 있던 면)
    if (current) writeReturnTicket("devotion", current.id, currentScrollY(), flipped);
    // 카드 칸은 히스토리에 그대로 둡니다 (이야기 화면과 같은 이유).
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=devotion");
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
        className="mb-4 text-xs leading-relaxed text-gray-800 font-gothic"
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
      <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
        <PointFloat value={floatVal} seq={floatSeq} />
        <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={closeSub}
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="목록으로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 text-base font-semibold leading-snug line-clamp-2 break-words">
            {qtDateLabel(current.date, flipped)}
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

        <div className="px-4 py-4">
          <div {...swipeHandlers}
            className="-mx-4 bg-card border-y border-border/60 px-4 py-5 min-h-[72vh] content-bump select-none">
              {!flipped ? (
                <>
                  {/* 앞면: 인니어 */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">Saat Teduh</span>
                    <span className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                      <PlayButton
                        cacheKey={current.id + "-helper-v2"}
                        text={[c.title, c.helper].filter(Boolean).join("\n\n")}
                        label="묵상 듣기"
                      />
                    </span>
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
                    <>
                      <p className="mt-2 mb-2 pl-3 border-l-2 border-rose-300 text-base leading-relaxed font-word text-gray-800 italic">
                        <span className="not-italic font-semibold text-rose-600 text-sm mr-1">Doa</span>
                        {renderTokens(c.doa, "doa-")}
                      </p>
                      <div className="mb-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <PlayButton cacheKey={current.id + "-doa"} text={c.doa} label="기도 듣기" />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 */}
                  <h2 className="text-sm font-bold text-gray-900 break-words mb-3">{c.titleKo}</h2>

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
          <p className="text-center text-muted-foreground text-xs mt-3">
            {flipped ? "옆으로 밀면 원문이 보입니다" : "옆으로 밀면 해석, 단어를 탭하면 뜻이 나옵니다"}
          </p>
        </div>

        {/* 단어 미니 팝업 */}
        {popupWord && (
          <div className="fixed inset-0 z-50" onClick={() => setPopupWord(null)}>
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
                  {/* 담긴 뒤에도 다른 단어장에는 담을 수 있어야 하므로 ⌄ 는 잠그지 않습니다 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openPicker(); }}
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
        {/* 담을 단어장 고르는 시트 — 팝업(z-50)보다 위에 오도록 한 단계 더 띄웁니다 */}
        <div className="relative z-[60]">
          <WordbookPickerSheet
            open={pickerOpen}
            onOpenChange={(o) => { if (!o) closePicker(); }}
            targetId={saveTargetId}
            onPick={chooseSaveTarget}
            onChanged={() => setSaveTargets(loadSaveTargets())}
          />
        </div>
      </div>
    );
  }

  // ---------- 홈 뷰 ----------
  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">SAAT TEDUH</h1>
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
        ) : todayRec && !todayBroken ? (
          <button
            onClick={() => openCard(todayRec)}
            className="w-full text-left rounded-xl border border-rose-300/60 bg-card bg-gradient-to-br from-transparent to-rose-300/35 px-4 py-3.5"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-rose-600 font-gothic">오늘의 묵상</p>
              <span className="text-[0.6875rem] font-medium text-rose-600 bg-rose-500/10 rounded-full px-2 py-0.5">
                {tbRangeLabel(todayRec)}
              </span>
            </div>
            <p className="mt-1 text-base font-bold text-gray-900 font-word break-words">{todayRec.content.title}</p>
            <p className="text-xs text-gray-500 font-gothic mt-0.5 break-words">{todayRec.content.titleKo}</p>
          </button>
        ) : (
          <>
          {todayBroken && (
            <p className="text-xs text-gray-500 font-gothic text-center mb-2.5">
              이전 생성에 언어 오류가 있어 오늘 묵상을 다시 만들 수 있어요
            </p>
          )}
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
          </>
        )}

        {/* 지난 묵상 */}
        {records.filter((r) => !todayRec || r.id !== todayRec.id).length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-2 px-1 font-gothic">지난 묵상</p>
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
                        <span className="text-[0.6875rem] font-medium text-rose-600 bg-rose-500/10 rounded-full px-2 py-0.5">
                          {r.rangeText}
                        </span>
                        <span className="text-[0.6875rem] text-gray-400 ml-auto">{fmtQtDate(r.date)}</span>
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
