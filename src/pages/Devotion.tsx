import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { ArrowLeft, Sunrise, Volume2, Loader2, Plus, Check, X, ChevronDown, ChevronUp, RotateCcw, Maximize2, Minimize2, BookOpen } from "lucide-react";
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
import WordMiniSheet from "@/components/WordMiniSheet";
import { isBackCloseEntry } from "@/hooks/useBackClose";
import { hasClaudeApiKey } from "@/lib/claude";
import { useSwipeFlip } from "@/lib/useSwipeFlip";
import SettingsDialog from "@/components/SettingsDialog";
import PlayButton from "@/components/PlayButton";
import { ttsPlayer } from "@/lib/tts";
import { ReadingTracker } from "@/lib/readingTimer";
import PointFloat from "@/components/PointFloat";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";
import { cleanPhrase, useSelectedPhrase } from "@/lib/phraseSelect";
import PhraseFindBar from "@/components/PhraseFindBar";
import { PUB, PUB_CARD, PUB_TILE, PUB_BTN, PUB_BTN_STYLE, PubChip, PubIntroCard, PubNote } from "@/components/PubKit";

// 2026-11-12 공개판 디자인(docs/release/10-faith-stories.md S64): 이야기 화면(ST1~ST5)과 같은 틀.
// 듣기 버튼은 이야기 카드와 같은 연청록 알약(PlayButton 은 고치지 않고 className 으로만 덮음)
const PLAY_PILL = "!h-[34px] !px-[13px] !py-0 !text-[0.78125rem] !font-semibold !bg-[#E2F1EC] !text-[#2C6D63] font-gothic";

// 해 뜨는 그림 (묵상 타일)
const SunriseArt = () => (
  <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M10 33a14 14 0 0 1 28 0z" fill="#F2C987" />
    <path d="M15 33a9 9 0 0 1 18 0z" fill="#E9B46A" />
    <path d="M24 9v6M11 15l4 4M37 15l-4 4M5 27h5M38 27h5" stroke="#9C6424" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 37h36" stroke="#9C6424" strokeWidth="2" strokeLinecap="round" />
  </svg>
);


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
        toast("지금 요청이 많습니다. 잠시 후 다시 시도하세요");
      } else {
        toast("묵상을 만들지 못했습니다. 다시 시도하세요");
      }
    } finally {
      setGenerating(false);
    }
  };

  // ---------- 단어 탭 → 미니 팝업 ----------
  // 본문에서 고른 표현 찾기
  const { phrase: selPhrase, take: takeSelPhrase } = useSelectedPhrase();

  const openPhrasePopup = () => {
    const s = takeSelPhrase();
    if (!s.phrase) return;
    openWordPopup(s.phrase, s.sentence);
  };

  const openWordPopup = async (rawToken: string, sentence: string) => {
    if (shouldIgnoreTap()) return;
    // 글자를 고르는 중이면 팝업을 열지 않습니다
    // (선택을 끝내며 나는 탭이 단어 팝업을 잘못 여는 것을 막습니다)
    const liveSel = window.getSelection();
    if (liveSel && !liveSel.isCollapsed) return;
    trackerRef.current?.touch();
    const word = cleanPhrase(rawToken);
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
      toast("복사하지 못했습니다");
    }
  };

  const openInDictionary = () => {
    if (!popupWord) return;
    // 돌아올 자리를 표로 한 장 적어 둡니다 (어느 묵상 + 스크롤 + 보고 있던 면)
    if (current) writeReturnTicket("devotion", current.id, currentScrollY(), flipped);
    // 카드 칸은 히스토리에 그대로 둡니다 (이야기 화면과 같은 이유).
    // 단어 시트(WordMiniSheet)가 쌓은 칸 위에서 떠나면 그 칸을 갈아 끼웁니다 — 돌아왔을 때 뒤로가기가 헛돌지 않게
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=devotion", { replace: isBackCloseEntry() });
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
      <span key={keyPrefix + ti} data-idw="1">
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-[#E2F1EC]"
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
          className={"font-word text-[1.0625rem] leading-[1.85] " + (pi === 0 ? "mt-3.5" : "mt-3")}
          style={{ color: PUB.txt }}
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
        className={"font-gothic text-[0.90625rem] leading-[1.8] break-words " + (i === 0 ? "mt-3" : "mt-2.5")}
        style={{ color: PUB.txt }}
      >
        {para}
      </p>
    ));

  const renderTbVerse = (v: BibleVerse) => (
    <p key={v.verse} className="mb-2 font-word text-[1rem] leading-[1.75]" style={{ color: PUB.txt }}>
      <span className="text-xs align-super mr-1 select-none" style={{ color: PUB.mute }}>{v.verse}</span>
      {renderTokens(v.text, "tb" + v.verse + "-")}
    </p>
  );

  const renderWoorimalVerse = (v: QtVerse) => (
    <p key={"w" + v.n} className="mb-2 font-gothic text-[0.84375rem] leading-[1.75]" style={{ color: PUB.txt }}>
      <span className="text-xs align-super mr-1 select-none" style={{ color: PUB.mute }}>{v.n}</span>
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

        {/* 화면 전체에서 옆으로 밀면 뒤집힙니다 (카드 아래 빈 곳 포함) — 이야기 카드와 같은 흰 카드 */}
        <div {...swipeHandlers} className="px-4 pt-4 pb-6" style={{ minHeight: "calc(100dvh - 61px - var(--kata-tabbar-h, 0px))" }}>
          <div style={{ ...PUB_CARD, borderRadius: 20, padding: "18px 18px 22px" }}>
              {!flipped ? (
                <>
                  {/* 앞면: 인니어 */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <PubChip tone="amber">Saat Teduh</PubChip>
                    <span className="flex-1" />
                    <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <PlayButton
                        cacheKey={current.id + "-helper-v2"}
                        text={[c.title, c.helper].filter(Boolean).join("\n\n")}
                        label="묵상 듣기"
                        className={PLAY_PILL}
                      />
                    </span>
                  </div>
                  <div className="mt-3.5 mb-3.5 min-w-0">
                    <h2 className="font-word text-[1.375rem] font-semibold leading-[1.35] break-words min-w-0" style={{ color: PUB.deep }}>
                      {renderTokens(c.title, "title-")}
                    </h2>
                  </div>

                  {/* TB 본문 — 토글 */}
                  <div className="rounded-[14px] px-3.5 py-3" style={{ background: "#F1F6F5" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !fullOpen;
                        setFullOpen(next);
                        if (next && !cardVerses && !cardLoading) loadTbVerses(current);
                      }}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className="flex-1 min-w-0 font-gothic text-[0.78125rem] font-semibold truncate" style={{ color: PUB.teal }}>
                        {tbRangeLabel(current)}
                      </span>
                      {fullOpen ? (
                        <ChevronUp size={15} className="shrink-0" style={{ color: PUB.teal }} />
                      ) : (
                        <ChevronDown size={15} className="shrink-0" style={{ color: PUB.teal }} />
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
                          <div className="text-xs font-gothic py-1" style={{ color: PUB.sub }}>
                            본문을 불러오지 못했습니다.{" "}
                            <button
                              onClick={(e) => { e.stopPropagation(); loadTbVerses(current); }}
                              className="font-medium underline"
                              style={{ color: PUB.teal }}
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
                      <p className="mt-4 mb-2 pl-3 border-l-2 border-[#BFD8D2] font-word text-[1rem] leading-[1.8] italic" style={{ color: PUB.txt }}>
                        <span className="not-italic font-semibold text-sm mr-1" style={{ color: PUB.teal }}>Doa</span>
                        {renderTokens(c.doa, "doa-")}
                      </p>
                      <div className="mb-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <PlayButton cacheKey={current.id + "-doa"} text={c.doa} label="기도 듣기" className={PLAY_PILL} />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 */}
                  <h2 className="text-[1.03125rem] font-semibold break-words mb-3.5" style={{ color: PUB.txt }}>{c.titleKo}</h2>

                  {/* 우리말성경 본문 — 토글 (레코드에 저장돼 있어 즉시 표시) */}
                  <div className="rounded-[14px] px-3.5 py-3" style={{ background: "#F1F6F5" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setKoOpen((f) => !f); }}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className="flex-1 min-w-0 font-gothic text-[0.78125rem] font-semibold truncate" style={{ color: PUB.teal }}>
                        {current.rangeText} (우리말성경)
                      </span>
                      {koOpen ? (
                        <ChevronUp size={15} className="shrink-0" style={{ color: PUB.teal }} />
                      ) : (
                        <ChevronDown size={15} className="shrink-0" style={{ color: PUB.teal }} />
                      )}
                    </button>

                    {koOpen && (
                      <div className="mt-2.5">
                        {current.versesWoorimal.length > 0 ? (
                          current.versesWoorimal.map(renderWoorimalVerse)
                        ) : (
                          <p className="text-xs font-gothic py-1" style={{ color: PUB.sub }}>
                            이 날은 우리말성경 본문을 가져오지 못했습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {renderKoParagraphs(c.helperKo)}
                  {c.doaKo && (
                    <p className="mt-4 pl-3 border-l-2 border-[#BFD8D2] font-gothic text-[0.875rem] leading-[1.8]" style={{ color: PUB.txt }}>
                      <span className="font-semibold mr-1" style={{ color: PUB.teal }}>기도</span>
                      {c.doaKo}
                    </p>
                  )}

                  {/* 본문 들여다보기 — 이야기 "이 글을 더 이해하려면" 상자와 같은 모양 */}
                  <div className="mt-[18px]">
                    <PubNote title={c.noteTitleKo} icon={<BookOpen size={15} strokeWidth={1.9} className="shrink-0" />}>
                      {c.noteKo}
                    </PubNote>
                  </div>
                </>
              )}
          </div>
          <p className="mt-3 text-center font-gothic text-[0.75rem]" style={{ color: PUB.mute }}>
            {flipped ? "옆으로 밀면 원문이 보입니다" : "옆으로 밀면 해석이 보입니다"}
          </p>
        </div>

        {/* 단어 미니 팝업 */}
        <PhraseFindBar phrase={selPhrase} onFind={openPhrasePopup} hidden={!!popupWord} widthClass={widthClass} />
        {/* 단어 팝업 — 2026-11-11 사용자 요청으로 이야기·회화집과 같은 공용 시트(WordMiniSheet)로 통일 */}
        {popupWord && (
          <WordMiniSheet
            word={popupWord}
            loading={popupLoading}
            meaning={popupMeaning}
            info={popupInfo}
            saved={popupSaved}
            saveDisabled={popupLoading || !popupMeaning || isFailedMeaning(popupMeaning)}
            saveTargetId={saveTargetId}
            saveTargetName={saveTargetName}
            widthClass={widthClass}
            onClose={() => setPopupWord(null)}
            onSave={savePopupWord}
            onPickTarget={openPicker}
            onDictionary={openInDictionary}
            onSpeak={() => speak(popupWord, "id")}
            onCopy={copyPopupWord}
          />
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

      {/* 2026-11-12 공개판 디자인: 이야기 ST1 처럼 "오늘의 묵상" 카드 + 지난 묵상 카드 목록 */}
      <div className="px-4 pt-4 pb-6 flex flex-col gap-2.5">
        <PubIntroCard
          art={<SunriseArt />}
          artBg={PUB_TILE.devotion.bg}
          title="오늘의 묵상"
          sub={
            qtLoading
              ? "오늘의 QT 본문을 불러오는 중입니다"
              : qtError || !todayQt
              ? "오늘의 QT 본문을 불러오지 못했습니다"
              : todayRec && !todayBroken
              ? tbRangeLabel(todayRec)
              : todayQt.rangeText + " · 두란노 오늘의 QT"
          }
        >
          {qtLoading ? (
            <button type="button" disabled className={PUB_BTN} style={{ ...PUB_BTN_STYLE, opacity: 0.75 }}>
              <Loader2 size={18} className="animate-spin" /> 불러오는 중...
            </button>
          ) : qtError || !todayQt ? (
            <button type="button" onClick={loadTodayQt} className={PUB_BTN} style={PUB_BTN_STYLE}>
              <RotateCcw size={17} strokeWidth={1.9} /> 다시 불러오기
            </button>
          ) : todayRec && !todayBroken ? (
            <>
              <button
                type="button"
                onClick={() => openCard(todayRec)}
                className="w-full text-left min-w-0 rounded-[14px] px-3.5 py-3 active:opacity-80"
                style={{ background: "#F7F9FA" }}
              >
                <p className="font-word text-[0.96875rem] font-semibold break-words" style={{ color: PUB.deep }}>
                  {todayRec.content.title}
                </p>
                <p className="mt-[3px] font-gothic text-[0.75rem] break-words" style={{ color: PUB.sub }}>
                  {todayRec.content.titleKo}
                </p>
              </button>
              <button type="button" onClick={() => openCard(todayRec)} className={PUB_BTN + " mt-3"} style={PUB_BTN_STYLE}>
                <BookOpen size={18} strokeWidth={1.9} /> 묵상 읽기
              </button>
            </>
          ) : (
            <>
              {todayBroken && (
                <p className="mb-2.5 text-center font-gothic text-[0.71875rem]" style={{ color: PUB.sub }}>
                  이전에 만든 묵상에 언어 오류가 있어 다시 만들 수 있습니다
                </p>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className={PUB_BTN}
                style={{ ...PUB_BTN_STYLE, opacity: generating ? 0.75 : 1 }}
              >
                {generating ? (
                  <><Loader2 size={18} className="animate-spin" /> 묵상 내용을 만드는 중...</>
                ) : (
                  <><Sunrise size={18} strokeWidth={1.9} /> 오늘의 묵상 만들기</>
                )}
              </button>
            </>
          )}
        </PubIntroCard>

        {/* 지난 묵상 */}
        {records.filter((r) => !todayRec || r.id !== todayRec.id).length > 0 && (
          <>
            <p className="mt-3.5 mx-1 font-gothic text-[0.8125rem] font-bold tracking-[0.02em]" style={{ color: PUB.section }}>
              지난 묵상
            </p>
            {records
              .filter((r) => !todayRec || r.id !== todayRec.id)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => openCard(r)}
                  className="w-full text-left min-w-0 active:opacity-80"
                  style={{ ...PUB_CARD, padding: "14px 16px" }}
                >
                  <p className="font-word text-[0.96875rem] font-semibold break-words" style={{ color: PUB.deep }}>{r.content.title}</p>
                  <p className="mt-[3px] font-gothic text-[0.75rem] break-words" style={{ color: PUB.sub }}>{r.content.titleKo}</p>
                  <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
                    <PubChip tone="amber">{r.rangeText}</PubChip>
                    <span className="ml-auto shrink-0 font-gothic text-[0.6875rem]" style={{ color: PUB.mute }}>{fmtQtDate(r.date)}</span>
                  </div>
                </button>
              ))}
          </>
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Devotion;
