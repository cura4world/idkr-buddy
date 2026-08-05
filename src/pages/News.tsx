import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { ArrowLeft, Newspaper, Volume2, Loader2, Plus, Check, X, Maximize2, Minimize2, ChevronDown } from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { quickLookupWord } from "@/lib/story";
import { generateDailyNews, todayKey, indoDateLabel, NewsEdition } from "@/lib/news";
import { saveEdition, listEditions } from "@/lib/newsStore";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, LOOKUP_FAIL_TEXT } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import { hasGeminiApiKey } from "@/lib/gemini";
import { useSwipeFlip } from "@/lib/useSwipeFlip";
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

const fmtDate = (key: string) => key.replace(new RegExp("-", "g"), ".");

// 카테고리 배지 색 (신문 섹션 느낌)
const catStyle = (cat: string): string => {
  if (cat.indexOf("핫") !== -1) return "text-red-600 bg-red-500/10";
  if (cat.indexOf("정치") !== -1) return "text-indigo-600 bg-indigo-500/10";
  if (cat.indexOf("경제") !== -1) return "text-emerald-600 bg-emerald-500/10";
  if (cat.indexOf("사회") !== -1) return "text-sky-600 bg-sky-500/10";
  if (cat.indexOf("문화") !== -1) return "text-amber-600 bg-amber-500/10";
  if (cat.indexOf("스포츠") !== -1) return "text-violet-600 bg-violet-500/10";
  if (cat.indexOf("과학") !== -1 || cat.indexOf("기술") !== -1) return "text-cyan-600 bg-cyan-500/10";
  return "text-gray-600 bg-black/5";
};

const News = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { widthClass, canWide, wide, toggle } = useWideMode();
  const [editions, setEditions] = useState<NewsEdition[]>([]);
  const [selected, setSelected] = useState<NewsEdition | null>(null);
  const [generating, setGenerating] = useState(false);
  const [articleIdx, setArticleIdx] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  const tk = todayKey();
  const todayEdition = editions.find((e) => e.date === tk) || null;
  const article =
    selected && articleIdx !== null ? selected.articles[articleIdx] || null : null;

  // ---------- 읽기 점수 (보이지 않는 타이머) ----------
  // 기사 1건이 단위입니다. 신문(목록) 화면은 인니어 본문이 아니므로 쌓지 않습니다.
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

  const unitKey = selected && articleIdx !== null ? selected.date + ":" + articleIdx : "";

  useEffect(() => {
    const t = trackerRef.current;
    if (!t) return;
    t.setUnit(unitKey);
  }, [unitKey]);

  useEffect(() => {
    const t = trackerRef.current;
    if (!t) return;
    t.setSide(!!unitKey && !flipped);
    if (unitKey && flipped) t.koreanOpened();
  }, [flipped, unitKey]);

  // 앞/뒤 문단 DOM 참조 (뒤집을 때 읽던 문단으로 스크롤 맞추기 — Story와 동일 패턴)
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

  // 단어 미니 팝업 (Story와 동일 UX)
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

  // 기사 화면을 열었는지 (히스토리를 한 칸 쌓았는지)
  const articleStateRef = useRef(false);

  const openArticle = (edition: NewsEdition, idx: number) => {
    ttsPlayer.stop();
    wordCache.current.clear();
    setSelected(edition);
    setArticleIdx(idx);
    setFlipped(false);
    paraRefs.current = {};
    pendingPara.current = null;
    window.scrollTo({ top: 0 });
    if (!articleStateRef.current) {
      articleStateRef.current = true;
      try { window.history.pushState({ newsArticle: true }, ""); } catch (e) {}
    }
  };

  const resetToFront = () => {
    ttsPlayer.stop();
    setArticleIdx(null);
    setFlipped(false);
    paraRefs.current = {};
    pendingPara.current = null;
    setPopupWord(null);
    wordCache.current.clear();
  };

  const closeArticle = () => {
    if (articleStateRef.current) {
      window.history.back(); // popstate 핸들러가 resetToFront 처리
    } else {
      resetToFront();
    }
  };

  // 폰의 뒤로가기: 기사 화면이면 신문 첫면으로만 이동
  useEffect(() => {
    const onPop = () => {
      // 시트가 팝업 위에 떠 있으면 시트만 닫습니다 (팝업은 그대로).
      if (pickerOpenRef.current) {
        pickerOpenRef.current = false;
        pickerPushedRef.current = false;
        setPickerOpen(false);
        return;
      }
      if (articleStateRef.current) {
        articleStateRef.current = false;
        resetToFront();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 돌아올 자리로 되돌리기 ----------
  // 사전에 다녀오면 이 화면은 새로 마운트되어 신문 첫면으로 돌아갑니다.
  // 표가 있으면 보던 기사를 다시 열고, 면과 스크롤까지 되돌립니다.
  const pendingReturnRef = useRef<{ y: number; flipped: boolean } | null>(null);
  const cancelRestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listEditions().then((all) => {
      setEditions(all);
      // 사전에 다녀온 경우, 보던 기사를 다시 연다
      const t = takeReturnTicket("news");
      if (t) {
        const parts = t.key.split(":");
        const date = parts[0];
        const idx = Number(parts[1]);
        const ed = all.find((e) => e.date === date);
        if (ed && !isNaN(idx) && ed.articles[idx]) {
          pendingReturnRef.current = { y: t.y, flipped: t.flipped };
          openArticle(ed, idx);
          return;
        }
      }
      const today = all.find((e) => e.date === todayKey());
      if (today) setSelected(today);
      else if (all.length > 0) setSelected(all[0]);
    });
    return () => {
      if (cancelRestoreRef.current) cancelRestoreRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기사가 그려진 뒤에 면을 맞추고, 그 다음 자리를 되돌립니다.
  // (openArticle 이 맨 위로 올리므로 되돌리기는 반드시 그 뒤에 와야 합니다)
  useEffect(() => {
    const p = pendingReturnRef.current;
    if (!p || articleIdx === null) return;
    if (p.flipped && !flipped) {
      setFlipped(true);
      return;
    }
    pendingReturnRef.current = null;
    cancelRestoreRef.current = restoreScrollTo(p.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleIdx, flipped]);

  // 오늘의 뉴스 가져오기 — 오늘 에디션이 이미 있으면 절대 호출하지 않음 (하루 1회 과금)
  const handleFetchToday = async () => {
    if (generating) return;
    if (todayEdition) {
      setSelected(todayEdition);
      return;
    }
    if (!hasGeminiApiKey()) {
      toast("Gemini API 키가 필요합니다. 설정에서 입력해주세요");
      return;
    }
    setGenerating(true);
    try {
      const edition = await generateDailyNews();
      await saveEdition(edition);
      setEditions((prev) => [edition, ...prev.filter((e) => e.date !== edition.date)]);
      setSelected(edition);
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      const code = e?.message || "";
      if (code === "RATE_LIMIT") toast("요청이 많습니다. 잠시 후 다시 시도해주세요");
      else if (code === "NO_API_KEY" || code === "INVALID_API_KEY") toast("API 키를 설정에서 확인해주세요");
      else toast("뉴스 실패: " + (code ? code.slice(0, 120) : "알 수 없는 오류"));
    } finally {
      setGenerating(false);
    }
  };

  // 단어 탭 → 미니 팝업 (3단 캐시: 카드 메모리 → IndexedDB → API)
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
    // 돌아올 자리를 표로 한 장 적어 둡니다 (어느 날짜의 몇 번째 기사 + 스크롤 + 면)
    if (selected && articleIdx !== null) {
      writeReturnTicket("news", selected.date + ":" + articleIdx, currentScrollY(), flipped);
    }
    navigate(
      "/dictionary?q=" + encodeURIComponent(popupWord) + "&from=news",
      { replace: articleStateRef.current }
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

  // 인니어 텍스트를 단어 단위로 쪼개 탭 가능하게 렌더링
  const renderTokens = (text: string, keyPrefix: string) =>
    text.split(" ").map((tok, ti) => (
      <span key={keyPrefix + ti}>
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-primary/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

  const renderIndonesian = (text: string) => {
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

  const renderKorean = (text: string) =>
    text.split(new RegExp("\\n{2,}")).filter((p) => p.trim()).map((para, i) => (
      <p
        key={i}
        ref={(el) => { paraRefs.current["ko-" + i] = el; }}
        className="mb-4 text-xs leading-relaxed text-gray-800 font-gothic"
      >
        {para}
      </p>
    ));

  // ---------- 기사 뷰 ----------
  if (article && selected) {
    return (
      <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
        <PointFloat value={floatVal} seq={floatSeq} />
        <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={closeArticle}
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="신문으로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 truncate font-word text-[1.0625rem] font-semibold tracking-[0.06em]">
            BERITA HARI INI
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
                  {/* 앞면: 인니어 기사 */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 ${catStyle(article.category)}`}>
                      {article.category}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5 shrink-0">
                      {fmtDate(selected.date)}
                    </span>
                    <span className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                      <PlayButton
                        cacheKey={"news-" + selected.date + "-" + articleIdx}
                        text={[article.title, article.lead, article.body].filter(Boolean).join("\n\n")}
                        label="듣기"
                      />
                    </span>
                  </div>
                  <div className="mb-2 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">
                      {renderTokens(article.title, "title-")}
                    </h2>
                  </div>
                  {article.lead && (
                    <p className="mb-4 text-sm leading-relaxed font-word text-gray-600 border-l-2 border-primary/40 pl-3">
                      {renderTokens(article.lead, "lead-")}
                    </p>
                  )}
                  {renderIndonesian(article.body)}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 번역 */}
                  <h2 className="text-sm font-bold text-gray-900 break-words mb-3">{article.titleKo}</h2>
                  {renderKorean(article.korean)}
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

  // ---------- 신문 첫면 ----------
  const headline = selected ? selected.articles[0] : null;
  const rest = selected ? selected.articles.slice(1) : [];
  const isTodayShown = selected !== null && selected.date === tk;

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
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">BERITA HARI INI</h1>
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
        {/* 마스트헤드 */}
        <div className="bg-card border border-border/60 rounded-xl px-4 pt-5 pb-4 text-center">
          <p className="text-[0.625rem] font-gothic uppercase tracking-[0.3em] text-gray-400">
            Kata kata &middot; Edisi Belajar
          </p>
          <h2 className="font-word text-2xl font-bold tracking-wide text-gray-900 mt-1">
            BERITA HARI INI
          </h2>
          <div className="mx-4 mt-2 border-t border-b border-gray-300 py-1">
            <p className="text-xs text-gray-600 font-gothic">
              {selected ? selected.dateLabel : indoDateLabel()}
              {selected && !isTodayShown ? " (지난 신문)" : ""}
            </p>
          </div>

          {/* 오늘 신문이 아직 없을 때만 가져오기 버튼 (하루 1회 과금) */}
          {!todayEdition && (
            <>
              <button
                onClick={handleFetchToday}
                disabled={generating}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium bg-primary text-white disabled:opacity-60"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> 오늘의 뉴스를 인쇄중입니다...</>
                ) : (
                  <><Newspaper size={16} /> 오늘의 뉴스 가져오기</>
                )}
              </button>
            </>
          )}
          {todayEdition && !isTodayShown && (
            <button
              onClick={() => { setSelected(todayEdition); window.scrollTo({ top: 0 }); }}
              className="mt-3 rounded-full px-4 py-1.5 text-xs font-medium bg-primary/10 text-primary"
            >
              오늘 신문 보기
            </button>
          )}
        </div>

        {/* 신문 지면 */}
        {selected && headline && (
          <div className="mt-3 bg-card border border-border/60 rounded-xl px-4 py-4">
            {/* 헤드라인 기사 */}
            <button
              onClick={() => openArticle(selected, 0)}
              className="w-full text-left min-w-0"
            >
              <span className={`inline-block text-[0.6875rem] font-medium rounded-full px-2 py-0.5 ${catStyle(headline.category)}`}>
                {headline.category}
              </span>
              <h3 className="mt-1.5 text-xl font-bold leading-snug text-gray-900 break-words font-word">
                {headline.title}
              </h3>
              {headline.lead && (
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 break-words font-word">
                  {headline.lead}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 break-words font-gothic">{headline.titleKo}</p>
            </button>

            {/* 나머지 기사 목록 */}
            {rest.length > 0 && (
              <ul className="mt-3 border-t border-gray-200">
                {rest.map((a, i) => (
                  <li key={i} className={i < rest.length - 1 ? "border-b border-gray-100" : ""}>
                    <button
                      onClick={() => openArticle(selected, i + 1)}
                      className="w-full text-left py-3 min-w-0"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`shrink-0 mt-0.5 text-[0.6875rem] font-medium rounded-full px-2 py-0.5 ${catStyle(a.category)}`}>
                          {a.category}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.9375rem] font-semibold leading-snug text-gray-900 break-words font-word">
                            {a.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 break-words font-gothic">{a.titleKo}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 지난 신문 */}
        {editions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-2 px-1 font-gothic">지난 신문</p>
            <ul className="space-y-2">
              {editions.map((e) => (
                <li key={e.date}>
                  <button
                    onClick={() => { setSelected(e); window.scrollTo({ top: 0 }); }}
                    className={`w-full text-left bg-card border rounded-xl px-4 py-3 min-w-0 ${
                      selected && selected.date === e.date ? "border-primary/50" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">
                        {fmtDate(e.date)}
                      </span>
                      <p className="flex-1 min-w-0 text-sm text-gray-800 truncate font-gothic">
                        {e.articles[0] ? e.articles[0].titleKo || e.articles[0].title : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {editions.length === 0 && !generating && (
          <div className="text-center py-10 text-muted-foreground">
            <Newspaper size={30} className="mx-auto mb-3 opacity-60" />
            <p className="text-sm">첫 신문을 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default News;
