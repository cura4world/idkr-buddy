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
import WordMiniSheet from "@/components/WordMiniSheet";
import { isBackCloseEntry } from "@/hooks/useBackClose";
import { hasGeminiApiKey } from "@/lib/gemini";
import { useSwipeFlip } from "@/lib/useSwipeFlip";
import PlayButton from "@/components/PlayButton";
import { ttsPlayer } from "@/lib/tts";
import { ReadingTracker } from "@/lib/readingTimer";
import PointFloat from "@/components/PointFloat";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";
import { cleanPhrase, useSelectedPhrase } from "@/lib/phraseSelect";
import PhraseFindBar from "@/components/PhraseFindBar";
import { PUB, PUB_CARD, PUB_BTN, PUB_BTN_STYLE, PUB_SOFT_BTN, PUB_SOFT_BTN_STYLE, PubNotice } from "@/components/PubKit";


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

// 카테고리 배지 색 (신문 섹션 느낌) — 2026-11-12 공개판 디자인: 원색 대신 홈 타일과 같은 차분한 짝
const catStyle = (cat: string): string => {
  if (cat.indexOf("핫") !== -1) return "text-[#8A3E52] bg-[#F4E8EC]";
  if (cat.indexOf("정치") !== -1) return "text-[#2B5F86] bg-[#E4EEF6]";
  if (cat.indexOf("경제") !== -1) return "text-[#4E6A2A] bg-[#EAF2DF]";
  if (cat.indexOf("사회") !== -1) return "text-[#2C6D63] bg-[#E3EEEC]";
  if (cat.indexOf("문화") !== -1) return "text-[#8C5A12] bg-[#FCEFD9]";
  if (cat.indexOf("스포츠") !== -1) return "text-[#5B4A8C] bg-[#ECE8F6]";
  if (cat.indexOf("과학") !== -1 || cat.indexOf("기술") !== -1) return "text-[#4D565B] bg-[#F1F4F5]";
  return "text-[#646C72] bg-[#F1F4F5]";
};

// 꼬리표 모양 (이야기 카드와 같은 22px 알약)
const CHIP = "h-[22px] px-[9px] rounded-full inline-flex items-center font-gothic text-[0.65625rem] font-semibold whitespace-nowrap shrink-0 ";
// 듣기 버튼은 이야기 카드와 같은 연청록 알약 (PlayButton 은 고치지 않고 className 으로만 덮음)
const PLAY_PILL = "!h-[34px] !px-[13px] !py-0 !text-[0.78125rem] !font-semibold !bg-[#E2F1EC] !text-[#2C6D63] font-gothic";

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
          // 기사 칸은 히스토리에 이미 남아 있습니다 — 새로 쌓지 않습니다.
          articleStateRef.current = true;
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
      toast("Gemini API 키가 필요합니다. 설정에서 입력해 주세요");
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
      if (code === "RATE_LIMIT") toast("요청이 많습니다. 잠시 뒤 다시 시도하세요");
      else if (code === "NO_API_KEY" || code === "INVALID_API_KEY") toast("API 키를 설정에서 확인해 주세요");
      else toast("뉴스 실패: " + (code ? code.slice(0, 120) : "알 수 없는 오류"));
    } finally {
      setGenerating(false);
    }
  };

  // 본문에서 고른 표현 찾기
  const { phrase: selPhrase, take: takeSelPhrase } = useSelectedPhrase();

  const openPhrasePopup = () => {
    const s = takeSelPhrase();
    if (!s.phrase) return;
    openWordPopup(s.phrase, s.sentence);
  };

  // 단어 탭 → 미니 팝업 (3단 캐시: 카드 메모리 → IndexedDB → API)
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
    // 돌아올 자리를 표로 한 장 적어 둡니다 (어느 날짜의 몇 번째 기사 + 스크롤 + 면)
    if (selected && articleIdx !== null) {
      writeReturnTicket("news", selected.date + ":" + articleIdx, currentScrollY(), flipped);
    }
    // 기사 칸은 히스토리에 그대로 둡니다 (이야기 화면과 같은 이유).
    // 단어 시트(WordMiniSheet)가 쌓은 칸 위에서 떠나면 그 칸을 갈아 끼웁니다 — 돌아왔을 때 뒤로가기가 헛돌지 않게
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=news", { replace: isBackCloseEntry() });
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
      <span key={keyPrefix + ti} data-idw="1">
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-[#E2F1EC]"
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
          className="mt-3 font-word text-[1.0625rem] leading-[1.85]"
          style={{ color: PUB.txt }}
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
        className="mt-3 font-gothic text-[0.90625rem] leading-[1.8] break-words"
        style={{ color: PUB.txt }}
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
          <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
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

        {/* 2026-11-12 공개판 디자인: 이야기 카드와 같은 흰 카드, 화면 전체에서 옆으로 밀면 뒤집힘 */}
        <div {...swipeHandlers} className="px-4 pt-4 pb-6" style={{ minHeight: "calc(100dvh - 61px - var(--kata-tabbar-h, 0px))" }}>
          <div style={{ ...PUB_CARD, borderRadius: 20, padding: "18px 18px 22px" }}>
              {!flipped ? (
                <>
                  {/* 앞면: 인니어 기사 */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={CHIP + catStyle(article.category)}>
                      {article.category}
                    </span>
                    <span className={CHIP + "text-[#646C72] bg-[#F1F4F5]"}>
                      {fmtDate(selected.date)}
                    </span>
                    <span className="flex-1" />
                    <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <PlayButton
                        cacheKey={"news-" + selected.date + "-" + articleIdx}
                        text={[article.title, article.lead, article.body].filter(Boolean).join("\n\n")}
                        label="듣기"
                        className={PLAY_PILL}
                      />
                    </span>
                  </div>
                  <div className="mt-3.5 mb-2 min-w-0">
                    <h2 className="font-word text-[1.375rem] font-semibold leading-[1.35] break-words min-w-0" style={{ color: PUB.deep }}>
                      {renderTokens(article.title, "title-")}
                    </h2>
                  </div>
                  {article.lead && (
                    <p className="mb-2 font-word text-[0.96875rem] leading-[1.75] border-l-2 border-[#BFD8D2] pl-3" style={{ color: "#4D565B" }}>
                      {renderTokens(article.lead, "lead-")}
                    </p>
                  )}
                  {renderIndonesian(article.body)}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 번역 */}
                  <h2 className="text-[1.03125rem] font-semibold break-words mb-1" style={{ color: PUB.txt }}>{article.titleKo}</h2>
                  {renderKorean(article.korean)}
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

      {/* 2026-11-12 공개판 디자인(docs/release/10-faith-stories.md S68): 신문 머리는 그대로, 흰 카드·청록 버튼·차분한 꼬리표 */}
      <div className="px-4 py-4">
        {/* 마스트헤드 */}
        <div className="px-4 pt-5 pb-4 text-center" style={{ ...PUB_CARD, borderRadius: 20 }}>
          <p className="text-[0.625rem] font-gothic uppercase tracking-[0.3em]" style={{ color: PUB.mute }}>
            Kata kata &middot; Edisi Belajar
          </p>
          <h2 className="font-word text-2xl font-bold tracking-wide mt-1" style={{ color: PUB.deep }}>
            BERITA HARI INI
          </h2>
          <div className="mx-4 mt-2 border-t border-b border-[#DDE3E6] py-1">
            <p className="text-xs font-gothic" style={{ color: PUB.sub }}>
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
                className={PUB_BTN + " mt-3.5"}
                style={{ ...PUB_BTN_STYLE, opacity: generating ? 0.75 : 1 }}
              >
                {generating ? (
                  <><Loader2 size={18} className="animate-spin" /> 오늘의 뉴스를 인쇄하는 중...</>
                ) : (
                  <><Newspaper size={18} strokeWidth={1.9} /> 오늘의 뉴스 가져오기</>
                )}
              </button>
            </>
          )}
          {todayEdition && !isTodayShown && (
            <button
              onClick={() => { setSelected(todayEdition); window.scrollTo({ top: 0 }); }}
              className={PUB_SOFT_BTN + " mt-3"}
              style={PUB_SOFT_BTN_STYLE}
            >
              오늘 신문 보기
            </button>
          )}
        </div>

        {/* 신문 지면 */}
        {selected && headline && (
          <div className="mt-2.5 px-4 py-4" style={PUB_CARD}>
            {/* 헤드라인 기사 */}
            <button
              onClick={() => openArticle(selected, 0)}
              className="w-full text-left min-w-0"
            >
              <span className={CHIP + catStyle(headline.category)}>
                {headline.category}
              </span>
              <h3 className="mt-2 font-word text-[1.25rem] font-semibold leading-snug break-words" style={{ color: PUB.deep }}>
                {headline.title}
              </h3>
              {headline.lead && (
                <p className="mt-1.5 font-word text-[0.875rem] leading-relaxed break-words" style={{ color: "#4D565B" }}>
                  {headline.lead}
                </p>
              )}
              <p className="mt-1.5 font-gothic text-[0.75rem] break-words" style={{ color: PUB.sub }}>{headline.titleKo}</p>
            </button>

            {/* 나머지 기사 목록 */}
            {rest.length > 0 && (
              <ul className="mt-3 border-t border-[#EEF1F3]">
                {rest.map((a, i) => (
                  <li key={i} className={i < rest.length - 1 ? "border-b border-[#EEF1F3]" : ""}>
                    <button
                      onClick={() => openArticle(selected, i + 1)}
                      className="w-full text-left py-3 min-w-0"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={CHIP + "mt-0.5 " + catStyle(a.category)}>
                          {a.category}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-word text-[0.9375rem] font-semibold leading-snug break-words" style={{ color: PUB.txt }}>
                            {a.title}
                          </p>
                          <p className="mt-0.5 font-gothic text-[0.75rem] break-words" style={{ color: PUB.sub }}>{a.titleKo}</p>
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
            <p className="mx-1 mb-2 font-gothic text-[0.8125rem] font-bold tracking-[0.02em]" style={{ color: PUB.section }}>지난 신문</p>
            <ul className="space-y-2">
              {editions.map((e) => (
                <li key={e.date}>
                  <button
                    onClick={() => { setSelected(e); window.scrollTo({ top: 0 }); }}
                    className="w-full text-left px-4 py-3 min-w-0 active:opacity-80"
                    style={{
                      ...PUB_CARD,
                      boxShadow:
                        selected && selected.date === e.date
                          ? "0 0 0 1.5px #BFD8D2, 0 1px 3px rgba(16,40,50,0.06)"
                          : PUB_CARD.boxShadow,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={CHIP + "text-[#646C72] bg-[#F1F4F5]"}>
                        {fmtDate(e.date)}
                      </span>
                      <p className="flex-1 min-w-0 text-[0.84375rem] truncate font-gothic" style={{ color: PUB.txt }}>
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
          <div className="mt-2.5">
            <PubNotice>
              <Newspaper size={26} className="mx-auto mb-2 opacity-60" />
              첫 신문을 만들어 보세요
            </PubNotice>
          </div>
        )}
      </div>
    </div>
  );
};

export default News;
