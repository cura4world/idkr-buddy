import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Volume1, Loader2, RotateCcw, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { getPhraseDetail, PhraseDetail as PhraseDetailData } from "@/lib/phrase";
import { Phrase, PhraseKind, isPhraseSaved, toggleSavedPhrase } from "@/lib/peribahasa";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, LOOKUP_FAIL_TEXT } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import WordMiniSheet from "@/components/WordMiniSheet";
import { headwordInSentence } from "@/lib/dictionary";
import { fetchChapterKo, getBook } from "@/lib/bible";
import { hasGeminiApiKey } from "@/lib/gemini";
import SettingsDialog from "@/components/SettingsDialog";
import { medaliEngine } from "@/lib/medali";
import PointFloat from "@/components/PointFloat";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";
import { cleanPhrase, useSelectedPhrase } from "@/lib/phraseSelect";
import PhraseFindBar from "@/components/PhraseFindBar";
import AiReportButton from "@/components/AiReportButton";
import { publicAiErrorText } from "@/lib/aiErrors";

/* 폰 네이티브 TTS 우선, 없으면 브라우저 음성 합성으로 폴백 */
const speak = (text: string, lang: "id" | "ko") => {
  const w = window as any;
  if (w.AndroidTTS) {
    try {
      w.AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID");
      return;
    } catch (e) { /* 폴백으로 넘어갑니다 */ }
  }
  try {
    window.speechSynthesis?.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ko" ? "ko-KR" : "id-ID";
    u.rate = 0.95;
    window.speechSynthesis?.speak?.(u);
  } catch (e) { /* 지원하지 않는 기기는 조용히 넘어갑니다 */ }
};

// 시안 "오늘의 문장 안 1 · 민트" — 사전 결과(사전 안 4)와 같은 소제목·카드 모양을 씁니다.
const Label = ({ children }: { children: React.ReactNode }) => (
  <h3 className="m-0 font-gothic text-[0.8125rem] font-bold text-[#1F4F4A]">{children}</h3>
);

// 표제 카드 왼쪽 위 꼬리표 — 문장 종류에 따라 바뀝니다.
const KIND_TAG: Record<string, string> = {
  peribahasa: "속담",
  ungkapan: "관용구",
  alkitab: "성경 말씀",
  kosakataku: "내 단어장",
  kosakata: "단어장",
  percakapan: "회화",
};

// 한국어 설명 속 인니어(로마자) 낱말만 Lora 로 보여 줍니다 (사전과 같은 방식).
function latinSpans(text: string, sizeClass?: string): React.ReactNode[] {
  const parts = (text || "").split(new RegExp("([A-Za-z\\u00C0-\\u024F][A-Za-z\\u00C0-\\u024F'\\-]*(?:\\s+[A-Za-z\\u00C0-\\u024F][A-Za-z\\u00C0-\\u024F'\\-]*)*)"));
  return parts.filter((x) => x !== "").map((part, i) =>
    new RegExp("^[A-Za-z\\u00C0-\\u024F]").test(part) ? (
      <span key={i} className={"font-word " + (sizeClass || "")}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// 낱말 앞뒤의 문장부호는 점선 밑줄에서 뺍니다 ("menghanyutkan." → 밑줄은 낱말까지만).
const TOKEN_EDGE = new RegExp("^([^A-Za-z0-9\\u00C0-\\u024F]*)(.*?)([^A-Za-z0-9\\u00C0-\\u024F]*)$");

const RowSpeaker = ({ onClick, className }: { onClick: () => void; className?: string }) => (
  <button
    onClick={onClick}
    className={"-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center text-[#1F4F4A] " + (className || "-mt-1")}
    title="발음 듣기"
    aria-label="발음 듣기"
  >
    <Volume1 size={16} strokeWidth={2} />
  </button>
);

const StateCard = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-[20px] bg-card px-5 py-10 text-center shadow-[0_1px_3px_rgba(16,40,50,0.06)]">{children}</div>
);

const PhraseDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const sentence = (searchParams.get("s") || "").trim();
  const sentenceKo = (searchParams.get("ko") || "").trim();
  const kind = (searchParams.get("k") || "").trim();
  const refLabel = (searchParams.get("ref") || "").trim();
  const refBookId = (searchParams.get("b") || "").trim();
  const refChapter = Number(searchParams.get("c"));
  const refVerse = Number(searchParams.get("v"));
  const isAyat = kind === "alkitab" && refBookId !== "" && refChapter > 0 && refVerse > 0;
  const item = { id: sentence, ko: sentenceKo };

  // 성경일 때 한국어 본문(새번역)을 보여줍니다.
  const [koVerse, setKoVerse] = useState("");
  const koRefLabel = (() => {
    if (!isAyat) return "";
    const b = getBook(refBookId);
    return b ? b.ko + " " + refChapter + ":" + refVerse : "";
  })();

  const [data, setData] = useState<PhraseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 마음에 든 문장 저장 (단어장 플래시카드의 리본과 같은 방식)
  const [saved, setSaved] = useState(() => isPhraseSaved(sentence));

  const toggleSave = () => {
    if (!sentence) return;
    const p: Phrase = {
      id: sentence,
      ko: sentenceKo,
      kind: (kind || "peribahasa") as PhraseKind,
    };
    if (refLabel) p.ref = refLabel;
    if (isAyat) {
      p.bookId = refBookId;
      p.chapter = refChapter;
      p.verse = refVerse;
    }
    const now = toggleSavedPhrase(p);
    setSaved(now);
    toast(now ? "저장했습니다" : "저장을 해제했습니다");
  };

  const saveRibbon = (
    <button
      type="button"
      onClick={toggleSave}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#2C6D63] transition-colors"
      title={saved ? "저장 해제" : "이 문장 저장"}
      aria-label={saved ? "저장 해제" : "이 문장 저장"}
      aria-pressed={saved}
    >
      <Bookmark size={17} strokeWidth={1.9} fill={saved ? "currentColor" : "none"} />
    </button>
  );

  // 표제 문장의 단어 탭 → 미니 팝업 (성경·이야기와 같은 방식)
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState(""); // 단어장 저장용 (표시 안 함)
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  // 이 화면에서 눌러본 단어는 다시 누르면 즉시 표시
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

  // 시트는 히스토리를 한 칸 쌓습니다 — 폰 뒤로가기를 누르면 시트만 닫히고 팝업은 남습니다.
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

  // 시트가 떠 있을 때의 뒤로가기만 가로챕니다. 안 떠 있으면 평소대로 이전 화면으로 갑니다.
  useEffect(() => {
    const onPop = () => {
      if (!wbPickerOpenRef.current) return;
      wbPickerOpenRef.current = false;
      wbPickerPushedRef.current = false;
      setWbPickerOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 대상이 바뀌면 그 단어장 기준으로 담김 여부를 다시 판정합니다.
  useEffect(() => {
    if (!popupWord || !saveTargetId) {
      setPopupSaved(false);
      return;
    }
    setPopupSaved(hasWordInCategory(saveTargetId, popupWord));
  }, [popupWord, saveTargetId]);

  // ---------- Bahasa Hari Ini 점수 ----------
  // 최초 로드 성공에만 +2. "다시 받기"(force)나 같은 문장 재방문은 제외합니다.
  const [floatVal, setFloatVal] = useState(0);
  const [floatSeq, setFloatSeq] = useState(0);
  const paidPhrasesRef = useRef(new Set<string>());

  const load = useCallback(async (force = false, koHint?: string) => {
    setLoading(true);
    setError("");
    try {
      const d = await getPhraseDetail(item.id, koHint !== undefined ? koHint : item.ko, force, kind);
      setData(d);
      if (!force && item.id && !paidPhrasesRef.current.has(item.id)) {
        paidPhrasesRef.current.add(item.id);
        medaliEngine
          .addPoints("phrase", 2)
          .then((got) => {
            if (got > 0) {
              setFloatVal(got);
              setFloatSeq((n) => n + 1);
            }
          })
          .catch(() => {});
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      // 공개판에는 키 설정이 없으므로 "설정 열기" 카드 대신 사용자용 문장을 씁니다(aiErrors).
      if (msg === "NO_API_KEY" || msg === "INVALID_API_KEY" || msg === "SESSION_EXPIRED" || msg === "NOT_AVAILABLE") {
        setError(publicAiErrorText(msg) || "API_KEY");
      }
      else if (msg === "RATE_LIMIT") setError("잠시 뒤에 다시 시도해 주세요");
      else if (msg.indexOf("QUOTA") === 0) setError("오늘 볼 수 있는 해설을 모두 보았습니다. 내일 다시 볼 수 있습니다");
      else setError("설명을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, [item.id, item.ko, kind]);

  useEffect(() => {
    if (!item.id) {
      setLoading(false);
      setError("문장을 찾을 수 없습니다");
      return;
    }
    if (!hasGeminiApiKey()) {
      setLoading(false);
      setError(publicAiErrorText("NO_API_KEY") || "API_KEY");
      return;
    }
    if (isAyat) {
      let alive = true;
      setLoading(true);
      fetchChapterKo(refBookId, refChapter)
        .then((verses) => {
          const found = verses.find((v) => v.verse === refVerse);
          const text = found && found.text ? found.text.trim() : "";
          if (!alive) return;
          setKoVerse(text);
          load(false, text);
        })
        .catch(() => { if (alive) load(false, ""); });
      return () => { alive = false; };
    }
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, item.id]);

  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel?.(); } catch (e) {}
    };
  }, []);

  // ---------- 돌아올 자리로 되돌리기 ----------
  // 어느 문장이었는지는 주소(?s=...)로 저절로 돌아오므로 스크롤만 챙깁니다.
  // 설명이 그려진 뒤 한 번만 실행합니다. 표가 없으면 아무것도 하지 않습니다.
  const restoreTriedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (restoreTriedRef.current) return;
    restoreTriedRef.current = true;
    const t = takeReturnTicket("phrase");
    if (!t || t.key !== sentence) return;
    return restoreScrollTo(t.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sentence]);

  // 본문에서 고른 표현 찾기
  const { phrase: selPhrase, take: takeSelPhrase } = useSelectedPhrase();

  const openPhrasePopup = () => {
    const s = takeSelPhrase();
    if (!s.phrase) return;
    openWordPopup(s.phrase, s.sentence);
  };

  // 조회 순서: 화면 캐시 → 폰 저장소(IndexedDB) → Gemini API
  const openWordPopup = async (rawToken: string, sentence?: string) => {
    // 글자를 고르는 중이면 팝업을 열지 않습니다
    const liveSel = window.getSelection();
    if (liveSel && !liveSel.isCollapsed) return;
    // 문장 첫머리라서 대문자인 낱말만 소문자로(Besar → besar). 문장 가운데의 이름 등은 그대로.
    const word = headwordInSentence(cleanPhrase(rawToken), sentence);
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
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

    quickLookupWord(word, item.id)
      .then((r) => {
        wordCache.current.set(key, r);
        saveLookupWord(word, r.meaning, r.info); // 폰에 영구 저장
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

  // 어느 문장이었는지는 주소(?s=...)로 저절로 돌아오므로 읽던 자리만 표로 적어 둡니다.
  // 단어 팝업이 히스토리를 쌓지 않는 화면이라 replace 는 주지 않습니다.
  const openInDictionary = () => {
    if (!popupWord) return;
    writeReturnTicket("phrase", sentence, currentScrollY(), false);
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=phrase");
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning || isFailedMeaning(popupMeaning) || !saveTargetId) return;
    const { added } = addWordIfAbsent({
      word: popupWord,
      meaning: popupMeaning,
      example: item.id,
      exampleMeaning: popupSentenceKo || item.ko,
      categoryId: saveTargetId,
    });
    setPopupSaved(true);
    toast(added ? `${saveTargetName}에 담았습니다` : `이미 ${saveTargetName}에 있는 단어입니다`);
  };

  // 표제 문장을 단어 단위로 쪼개 탭 가능하게 렌더링
  // 낱말에는 점선 밑줄을 긋습니다(시안: 누르면 뜻이 나온다는 표시). 앞뒤 문장부호는 밑줄 밖에 둡니다.
  const renderTokens = (text: string) =>
    text.split(" ").map((tok, ti) => {
      const m = TOKEN_EDGE.exec(tok);
      const pre = m ? m[1] : "";
      const core = m ? m[2] : tok;
      const post = m ? m[3] : "";
      return (
        <span key={"t" + ti} data-idw="1">
          <span
            onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
            className="cursor-pointer rounded active:bg-primary/20"
          >
            {pre}
            {core ? (
              <span className="pb-px" style={{ borderBottom: "1.5px dotted rgba(16,75,96,0.35)" }}>{core}</span>
            ) : null}
            {post}
          </span>{" "}
        </span>
      );
    });

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-10">
      <PointFloat value={floatVal} seq={floatSeq} />
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">Bahasa Hari Ini</h1>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-4">
        {/* 문장 (연민트 표제 카드 — 사전 결과의 표제어 카드와 같은 색) */}
        <section className="rounded-[20px] bg-[#E2F1EC] pb-5 pl-5 pr-4 pt-3.5">
          {/* 아이콘 줄: 왼쪽 꼬리표, 오른쪽 저장 · 스피커 */}
          <div className="flex items-center gap-1.5">
            {KIND_TAG[kind] ? (
              <span className="flex h-[22px] items-center rounded-[11px] bg-white px-[9px] font-gothic text-[0.71875rem] font-semibold text-[#9A4419]">
                {KIND_TAG[kind]}
              </span>
            ) : null}
            <span className="flex-1" />
            {saveRibbon}
            <button
              onClick={() => speak(item.id, "id")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2C6D63]"
              title="발음 듣기"
              aria-label="발음 듣기"
            >
              <Volume1 size={19} strokeWidth={2} />
            </button>
          </div>
          <p
            className={
              "m-0 mt-2.5 font-word font-semibold text-[#104B60] " +
              // 2026-11-11 사용자 요청으로 한 단계 작게 (22 → 20.5px, 성경 구절 19 → 17.5px)
              (isAyat ? "text-[1.09375rem] leading-[1.6]" : "text-[1.28125rem] leading-[1.5]")
            }
          >
            {renderTokens(item.id)}
          </p>
          {item.ko ? (
            <p className="m-0 mt-2 text-[0.9375rem] leading-[1.6] text-[#2E3E3A]">{item.ko}</p>
          ) : null}
          {refLabel ? (
            <p className="m-0 mt-2 font-word text-[0.84375rem] text-[#4B6560]">{refLabel}</p>
          ) : null}
        </section>

        {loading ? (
          <StateCard>
            <Loader2 size={22} className="mx-auto mb-2.5 animate-spin text-[#2C6D63]" />
            <p className="m-0 font-gothic text-[0.875rem] text-muted-foreground">설명을 만드는 중입니다</p>
          </StateCard>
        ) : error === "API_KEY" ? (
          <StateCard>
            <p className="m-0 mb-4 font-gothic text-[0.875rem] text-foreground">설명을 보려면 Gemini API 키가 필요합니다</p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full bg-[#2C6D63] px-5 py-2.5 font-gothic text-[0.875rem] font-semibold text-white"
            >
              설정 열기
            </button>
          </StateCard>
        ) : error ? (
          <StateCard>
            <p className="m-0 mb-4 font-gothic text-[0.875rem] leading-[1.6] text-foreground break-keep">{error}</p>
            <button
              onClick={() => load(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2C6D63] px-5 py-2.5 font-gothic text-[0.875rem] font-semibold text-white"
            >
              <RotateCcw size={14} /> 다시 시도
            </button>
          </StateCard>
        ) : data ? (() => {
          // 알아두기는 "어떤 뜻인가요"와 같은 말이면 숨깁니다(예전 캐시 대비). 비어 있어도 숨깁니다.
          const note = (data.note || "").trim();
          const showNote = note !== "" && note !== (data.meaning || "").trim();
          const showMeaning = isAyat ? !!koVerse : !!data.meaning;
          const showExamples = isAyat ? !!(data.analysis && data.analysis.length > 0) : data.examples.length > 0;
          if (!showMeaning && !showExamples && !showNote) return null;
          return (
            <div className="flex flex-col gap-[26px] rounded-[20px] bg-card px-5 pb-[22px] pt-5 shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
              {isAyat ? (
                koVerse ? (
                  <section className="flex flex-col gap-2.5">
                    <Label>이런 뜻입니다</Label>
                    <p className="m-0 font-gothic text-[0.84375rem] leading-[1.7] text-[#34332F]">{koVerse}</p>
                    <p className="m-0 font-gothic text-[0.71875rem] text-muted-foreground">
                      {koRefLabel ? koRefLabel + " · 새번역" : "새번역"}
                    </p>
                  </section>
                ) : null
              ) : data.meaning ? (
                <section className="flex flex-col gap-2.5">
                  <Label>이런 뜻입니다</Label>
                  <p className="m-0 font-gothic text-[0.84375rem] leading-[1.7] text-[#34332F]">{latinSpans(data.meaning)}</p>
                </section>
              ) : null}

              {isAyat ? (
                data.analysis && data.analysis.length > 0 ? (
                  <section className="flex flex-col gap-3.5">
                    <Label>문장분석</Label>
                    {data.analysis.map((a, i) => (
                      <div key={i} className="flex min-w-0 items-start gap-2.5">
                        <span className="w-3.5 shrink-0 font-word text-[0.9375rem] italic leading-[1.5] text-[#B59B6A]">{i + 1}</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                          <p className="m-0 break-words font-word text-[1rem] leading-[1.5]">{a.part}</p>
                          <p className="m-0 break-words text-[0.8125rem] leading-[1.55] text-[#5E5D57]">{a.ko}</p>
                          {a.note ? (
                            <p className="m-0 mt-0.5 break-words font-gothic text-[0.75rem] leading-[1.6] text-[#6B6A64]">{latinSpans(a.note)}</p>
                          ) : null}
                        </div>
                        <RowSpeaker onClick={() => speak(a.part, "id")} />
                      </div>
                    ))}
                  </section>
                ) : null
              ) : data.examples.length > 0 ? (
                <section className="flex flex-col gap-3.5">
                  <Label>이렇게 씁니다</Label>
                  {data.examples.map((ex, i) => (
                    <div key={i} className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="w-3.5 shrink-0 font-word text-[0.9375rem] italic leading-[1.45] text-[#B59B6A]"
                        style={{ paddingTop: ex.situasi ? 26 : 0 }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        {ex.situasi ? (
                          <span className="mb-1 self-start rounded-[10px] bg-[#F1EEE7] px-2 py-[3px] font-gothic text-[0.6875rem] font-semibold leading-[1.3] text-[#5E5541]">
                            {ex.situasi}
                          </span>
                        ) : null}
                        <p className="m-0 break-words font-word text-[1rem] leading-[1.5]">{ex.id}</p>
                        {ex.ko ? (
                          <p className="m-0 break-words text-[0.8125rem] leading-[1.55] text-[#5E5D57]">{ex.ko}</p>
                        ) : null}
                      </div>
                      <RowSpeaker onClick={() => speak(ex.id, "id")} className={ex.situasi ? "mt-[22px]" : "-mt-1"} />
                    </div>
                  ))}
                </section>
              ) : null}

              {showNote ? (
                <section className="flex flex-col gap-2.5">
                  <Label>알아두기</Label>
                  <div className="rounded-[14px] bg-[#F6F7F5] px-3.5 py-3 font-gothic text-[0.8125rem] leading-[1.7] text-[#34332F]">
                    {latinSpans(note, "text-[0.90625rem]")}
                  </div>
                </section>
              ) : null}
            </div>
          );
        })() : null}

        {/* AI 풀이 신고 — 스토어 앱(공개판)에서만 보입니다(Google Play AI 생성 콘텐츠 요건) */}
        {!loading && data ? (
          <div className="flex justify-center [&>div>button]:text-[#6B7479]">
            <AiReportButton
              feature="phrase"
              input={item.id}
              output={(data.meaning || "") + (data.note ? " / " + data.note : "")}
              className="flex flex-col items-center"
            />
          </div>
        ) : null}
      </div>

      {/* 단어 미니 팝업 */}
      <PhraseFindBar phrase={selPhrase} onFind={openPhrasePopup} hidden={!!popupWord} />
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
          widthClass="max-w-lg"
          onClose={() => setPopupWord(null)}
          onSave={savePopupWord}
          onPickTarget={openWbPicker}
          onDictionary={openInDictionary}
          onSpeak={() => speak(popupWord, "id")}
          onCopy={copyPopupWord}
        />
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

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default PhraseDetail;
