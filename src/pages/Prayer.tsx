import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, Loader2, Plus, Minus, Check, X, Bookmark, Trash2, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  PRAYER_CATEGORIES,
  getPrayerCategory,
  generatePrayer,
  revisePrayer,
  pickPrayerQuote,
  PrayerLength,
  MeetingPhase,
} from "@/lib/prayer";
import { PrayerRecord, savePrayer, listPrayers, deletePrayer, newPrayerRecord } from "@/lib/prayerStore";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { hasClaudeApiKey } from "@/lib/claude";
import SettingsDialog from "@/components/SettingsDialog";

const MY_WORDBOOK_ID = "my-wordbook";
const LENGTH_KEY_PREFIX = "prayer-length-"; // 카테고리별 마지막 길이 기억

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

// 인도네시아어 기도문 글자 크기 단계 (기본: text-sm)
const ID_FONT_SIZES = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl"];
const ID_FONT_KEY = "prayer-id-font-step";

// 주기도문 (고정 카드 — 저장/삭제/재생성 없음)
const LORDS_PRAYER: PrayerRecord = {
  id: "lords-prayer",
  createdAt: 0,
  categoryId: "lords",
  situationId: "lords",
  situationLabel: "주기도문",
  length: "short",
  title: "주기도문 · Doa Bapa Kami",
  indonesian:
    "Bapa kami yang di sorga, dikuduskanlah nama-Mu, datanglah Kerajaan-Mu, jadilah kehendak-Mu di bumi seperti di sorga.\n\n" +
    "Berikanlah kami pada hari ini makanan kami yang secukupnya.\n\n" +
    "Dan ampunilah kami akan kesalahan kami, seperti kami juga mengampuni orang yang bersalah kepada kami.\n\n" +
    "Dan janganlah membawa kami ke dalam pencobaan, tetapi lepaskanlah kami dari pada yang jahat.\n\n" +
    "Karena Engkaulah yang empunya Kerajaan dan kuasa dan kemuliaan sampai selama-lamanya. Amin.",
  korean:
    "하늘에 계신 우리 아버지, 아버지의 이름을 거룩하게 하시며, 아버지의 나라가 오게 하시며, 아버지의 뜻이 하늘에서와 같이 땅에서도 이루어지게 하소서.\n\n" +
    "오늘 우리에게 일용할 양식을 주시고,\n\n" +
    "우리가 우리에게 잘못한 사람을 용서하여 준 것같이 우리 죄를 용서하여 주시고,\n\n" +
    "우리를 시험에 빠지지 않게 하시고 악에서 구하소서.\n\n" +
    "나라와 권능과 영광이 영원히 아버지의 것입니다. 아멘.",
};

const LENGTH_LABELS: { id: PrayerLength; label: string }[] = [
  { id: "short", label: "짧게" },
  { id: "medium", label: "보통" },
  { id: "long", label: "길게" },
];

const Prayer = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PrayerRecord[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 화면: 홈 / 위저드 / 기도문 보기
  const [view, setView] = useState<"home" | "wizard" | "prayer">("home");

  // 위저드 상태
  const [catId, setCatId] = useState<string | null>(null);
  const [situationId, setSituationId] = useState<string | null>(null);
  const [phase, setPhase] = useState<MeetingPhase | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [length, setLength] = useState<PrayerLength>("short");
  const [generating, setGenerating] = useState(false);
  const genToken = useRef(0);

  // 기도문 보기 상태
  const [current, setCurrent] = useState<PrayerRecord | null>(null);
  const [flipped, setFlipped] = useState(false); // 앞: 인니어 / 뒤: 한국어
  const [delConfirm, setDelConfirm] = useState(false);
  const [customText, setCustomText] = useState(""); // 상황 "기타" 직접 입력
  const [editingKo, setEditingKo] = useState(false); // 한국어 수정 모드
  const [koDraft, setKoDraft] = useState("");
  const [revising, setRevising] = useState(false);
  const [idFontStep, setIdFontStep] = useState<number>(() => {
    try {
      const v = parseInt(localStorage.getItem(ID_FONT_KEY) || "1", 10);
      if (v >= 0 && v < ID_FONT_SIZES.length) return v;
    } catch (e) {}
    return 1;
  });

  const changeIdFont = (delta: number) => {
    setIdFontStep((s) => {
      const n = Math.min(ID_FONT_SIZES.length - 1, Math.max(0, s + delta));
      try { localStorage.setItem(ID_FONT_KEY, String(n)); } catch (e) {}
      return n;
    });
  };

  // 단어 미니 팝업 (이야기·묵상과 동일한 3단 캐시 공유)
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
      try { window.history.pushState({ prayerSub: true }, ""); } catch (e) {}
    }
  };

  const resetSub = () => {
    genToken.current++;
    setView("home");
    setCatId(null);
    setSituationId(null);
    setPhase(null);
    setNameInput("");
    setNoteInput("");
    setGenerating(false);
    setCurrent(null);
    setFlipped(false);
    setDelConfirm(false);
    setCustomText("");
    setEditingKo(false);
    setKoDraft("");
    setRevising(false);
    setPopupWord(null);
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
    listPrayers().then(setRecords);
  }, []);

  // ---------- 화면 이동 ----------
  const openWizard = (cid: string) => {
    const cat = getPrayerCategory(cid);
    setCatId(cid);
    // 첫 상황을 기본 선택해 두면 바로 만들 수 있습니다 (원하면 다른 상황을 탭해서 변경)
    setSituationId(cat?.situations[0]?.id || null);
    setPhase(cat?.needsPhase ? "open" : null);
    setNameInput("");
    setNoteInput("");
    setCustomText("");
    let saved: PrayerLength = "short";
    try {
      const v = localStorage.getItem(LENGTH_KEY_PREFIX + cid);
      if (v === "short" || v === "medium" || v === "long") saved = v;
    } catch (e) {}
    setLength(saved);
    setView("wizard");
    pushSub();
  };

  const openPrayer = (rec: PrayerRecord) => {
    wordCache.current.clear();
    setPopupWord(null);
    setFlipped(false);
    setDelConfirm(false);
    setEditingKo(false);
    setCurrent(rec);
    setView("prayer");
    pushSub();
  };

  // ---------- 생성 ----------
  const doGenerate = async (opts: {
    categoryId: string;
    situationId: string;
    phase?: MeetingPhase | null;
    name?: string;
    note?: string;
    customText?: string;
    length: PrayerLength;
  }) => {
    if (generating) return;
    if (!hasClaudeApiKey()) {
      toast("Claude API 키가 필요합니다. 설정에서 입력해주세요");
      setSettingsOpen(true);
      return;
    }
    const cat = getPrayerCategory(opts.categoryId);
    const sit = cat?.situations.find((s) => s.id === opts.situationId);
    if (!cat || !sit) return;

    const token = ++genToken.current;
    setGenerating(true);
    try {
      const data = await generatePrayer(opts);
      if (genToken.current !== token) return; // 뒤로가기로 이탈함
      const baseLabel = opts.situationId === "custom" ? (opts.customText || "").trim() : sit.label;
      const situationLabel =
        baseLabel + (cat.needsPhase && opts.phase ? (opts.phase === "open" ? " 시작" : " 마침") : "") + " 기도";
      const rec = newPrayerRecord(data, {
        categoryId: opts.categoryId,
        situationId: opts.situationId,
        situationLabel,
        phase: opts.phase || null,
        name: opts.name || "",
        note: opts.note || "",
        customText: opts.customText || "",
        length: opts.length,
        pinned: false,
      });
      await savePrayer(rec);
      setRecords((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
      try { localStorage.setItem(LENGTH_KEY_PREFIX + opts.categoryId, opts.length); } catch (e) {}
      // 위저드 → 기도문 보기 (히스토리 한 칸 그대로 유지)
      wordCache.current.clear();
      setPopupWord(null);
      setFlipped(false);
      setDelConfirm(false);
      setEditingKo(false);
      setCurrent(rec);
      setView("prayer");
      if (!subOpenRef.current) pushSub();
    } catch (e: any) {
      if (genToken.current !== token) return;
      const code = (e && e.message) || "";
      if (code === "NO_API_KEY" || code === "INVALID_API_KEY") {
        toast("Claude API 키를 설정에서 확인해주세요");
        setSettingsOpen(true);
      } else if (code === "NO_CREDIT") {
        toast("Claude 크레딧이 부족합니다. console.anthropic.com에서 충전해주세요");
      } else if (code === "RATE_LIMIT" || code === "OVERLOADED") {
        toast("지금 요청이 많아요. 잠시 후 다시 시도해주세요");
      } else {
        toast("기도문 생성에 실패했어요. 다시 시도해주세요");
      }
    } finally {
      if (genToken.current === token) setGenerating(false);
    }
  };

  const submitWizard = () => {
    if (!catId || !situationId) return;
    const cat = getPrayerCategory(catId);
    if (cat?.needsPhase && !phase) return;
    if (situationId === "custom" && !customText.trim()) return;
    doGenerate({ categoryId: catId, situationId, phase, name: nameInput, note: noteInput, customText, length });
  };

  const regenerate = () => {
    if (!current) return;
    doGenerate({
      categoryId: current.categoryId,
      situationId: current.situationId,
      phase: current.phase || null,
      name: current.name || "",
      note: current.note || "",
      customText: current.customText || "",
      length: current.length,
    });
  };

  // 한국어 번역을 고치면 인도네시아어 기도문을 그에 맞게 수정
  const applyKoEdit = async () => {
    if (!current || revising) return;
    const edited = koDraft.trim();
    if (!edited) return;
    if (!hasClaudeApiKey()) {
      toast("Claude API 키가 필요합니다. 설정에서 입력해주세요");
      setSettingsOpen(true);
      return;
    }
    const token = ++genToken.current;
    setRevising(true);
    try {
      const newIndonesian = await revisePrayer(current.indonesian, edited);
      if (genToken.current !== token) return;
      const upd = { ...current, indonesian: newIndonesian, korean: edited };
      await savePrayer(upd);
      setCurrent(upd);
      setRecords(await listPrayers());
      setEditingKo(false);
      setFlipped(false); // 앞면으로 넘겨 고쳐진 기도문 확인
      toast("기도문을 수정했습니다");
    } catch (e: any) {
      if (genToken.current !== token) return;
      const code = (e && e.message) || "";
      if (code === "NO_API_KEY" || code === "INVALID_API_KEY") {
        toast("Claude API 키를 설정에서 확인해주세요");
        setSettingsOpen(true);
      } else if (code === "NO_CREDIT") {
        toast("Claude 크레딧이 부족합니다. console.anthropic.com에서 충전해주세요");
      } else if (code === "RATE_LIMIT" || code === "OVERLOADED") {
        toast("지금 요청이 많아요. 잠시 후 다시 시도해주세요");
      } else {
        toast("수정에 실패했어요. 다시 시도해주세요");
      }
    } finally {
      if (genToken.current === token) setRevising(false);
    }
  };

  // ---------- 핀 / 삭제 ----------
  const togglePin = async () => {
    if (!current) return;
    const upd = { ...current, pinned: !current.pinned };
    await savePrayer(upd);
    setCurrent(upd);
    setRecords(await listPrayers());
    toast(upd.pinned ? "핀으로 고정했습니다" : "핀을 해제했습니다");
  };

  const doDelete = async () => {
    if (!current) return;
    await deletePrayer(current.id);
    setRecords(await listPrayers());
    toast("삭제되었습니다");
    closeSub();
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
          className="cursor-pointer rounded active:bg-emerald-500/20"
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
        <p key={pi} className={"mb-4 leading-relaxed font-word text-gray-900 " + ID_FONT_SIZES[idFontStep]}>
          {sentences.map((sent, si) => (
            <span key={si}>{renderTokens(sent, pi + "-" + si + "-")}</span>
          ))}
        </p>
      );
    });
  };

  const renderKorean = (text: string) =>
    text.split(new RegExp("\\n{2,}")).filter((p) => p.trim()).map((para, i) => (
      <p key={i} className="mb-3 text-sm leading-relaxed text-gray-800 font-body">{para}</p>
    ));

  const chip = (selected: boolean) =>
    "rounded-full px-3.5 py-2 text-sm font-medium font-gothic border transition-colors " +
    (selected
      ? "bg-emerald-500 text-white border-emerald-500"
      : "bg-card text-gray-700 border-border/70 active:bg-emerald-500/10");

  // ================================================================
  // 기도문 보기
  // ================================================================
  if (view === "prayer" && current) {
    const quote = pickPrayerQuote(current.id);
    const isLords = current.id === "lords-prayer";
    return (
      <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-2">
          <button
            onClick={closeSub}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 text-base font-semibold leading-snug line-clamp-2 break-words">
            {current.title}
          </h1>
          {!isLords && (
            <button
              onClick={togglePin}
              className={`shrink-0 w-9 h-9 flex items-center justify-center ${
                current.pinned ? "text-amber-400" : "text-white/50 hover:text-white/70"
              }`}
              title={current.pinned ? "고정 해제" : "고정"}
            >
              <Bookmark size={18} fill={current.pinned ? "currentColor" : "none"} />
            </button>
          )}
        </header>

        <div className="px-4 py-4">
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 bg-card border border-border/60 rounded-xl px-5 py-5 min-h-[72vh] content-bump select-none">
              {/* 제목(상황) 한 줄, 다음 줄 우측: 날짜 + 글자크기(-,+) 또는 연필 */}
              <div className="mb-3">
                <span className="inline-block max-w-full truncate text-xs font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5">
                  {current.situationLabel}
                </span>
                <div className="flex items-center justify-end gap-2 mt-1.5">
                  {!isLords && (
                    <span className="text-xs text-gray-400 font-gothic">{fmtDate(current.createdAt)}</span>
                  )}
                  {!flipped ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); changeIdFont(-1); }}
                        disabled={idFontStep <= 0}
                        className="w-7 h-7 rounded-full bg-black/5 text-gray-500 flex items-center justify-center disabled:opacity-30"
                        title="글자 작게"
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); changeIdFont(1); }}
                        disabled={idFontStep >= ID_FONT_SIZES.length - 1}
                        className="w-7 h-7 rounded-full bg-black/5 text-gray-500 flex items-center justify-center disabled:opacity-30"
                        title="글자 크게"
                      >
                        <Plus size={13} />
                      </button>
                    </>
                  ) : (
                    !isLords && !editingKo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setKoDraft(current.korean); setEditingKo(true); }}
                        className="w-7 h-7 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                        title="한국어 수정"
                      >
                        <Pencil size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>

              {!flipped ? (
                <>
                  {/* 앞면: 인도네시아어 기도문 (단어 탭 가능) */}
                  {renderIndoBody(current.indonesian)}

                  {/* 앞면 하단 액션 (주기도문 제외) */}
                  {!isLords && (
                  <div className="flex items-center gap-2 pt-3">
                    <button
                      onClick={regenerate}
                      disabled={generating}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[11px] font-medium font-gothic bg-emerald-500/10 text-emerald-700 disabled:opacity-50"
                    >
                      {generating ? (
                        <><Loader2 size={12} className="animate-spin" /> 만드는 중...</>
                      ) : (
                        <><RefreshCw size={12} /> 같은 설정 다시 만들기</>
                      )}
                    </button>
                    {!delConfirm ? (
                      <button
                        onClick={() => setDelConfirm(true)}
                        className="shrink-0 w-9 h-9 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                        title="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button onClick={doDelete} className="rounded-full py-2 px-3 text-xs font-medium font-gothic bg-red-500 text-white">
                          삭제
                        </button>
                        <button onClick={() => setDelConfirm(false)} className="rounded-full py-2 px-3 text-xs font-medium font-gothic bg-black/5 text-gray-600">
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </>
              ) : !editingKo ? (
                <>
                  {/* 뒷면: 한국어 번역 */}
                  <div>{renderKorean(current.korean)}</div>

                  {/* 뒷면: 기도에 관한 말씀·명언 (주기도문 제외) */}
                  {!isLords && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-200/60 px-3 py-2.5 mt-4">
                      <p className="text-xs leading-relaxed text-gray-800 font-gothic">{quote.text}</p>
                      <p className="text-[11px] text-gray-500 font-gothic mt-1">— {quote.source}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 수정 모드 */}
                  <textarea
                    value={koDraft}
                    onChange={(e) => setKoDraft(e.target.value)}
                    disabled={revising}
                    rows={14}
                    className="w-full rounded-lg border border-emerald-300/70 bg-white px-3 py-2.5 text-xs text-gray-900 font-gothic leading-relaxed outline-none focus:border-emerald-500 disabled:opacity-60"
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={applyKoEdit}
                      disabled={revising || !koDraft.trim()}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-medium font-gothic bg-emerald-500 text-white disabled:opacity-50"
                    >
                      {revising ? (
                        <><Loader2 size={13} className="animate-spin" /> 기도문을 고치는 중...</>
                      ) : (
                        "수정한 대로 기도문 고치기"
                      )}
                    </button>
                    <button
                      onClick={() => { if (!revising) setEditingKo(false); }}
                      className="shrink-0 rounded-full py-2.5 px-4 text-xs font-medium font-gothic bg-black/5 text-gray-600"
                    >
                      취소
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 오른쪽 세로 바: 누르면 뒤집기 */}
            <button
              onClick={(e) => { e.stopPropagation(); if (editingKo || revising) return; setFlipped((f) => !f); }}
              className="shrink-0 w-2 self-stretch rounded-full bg-emerald-500/15 active:bg-emerald-500/40"
              title={flipped ? "원문 보기" : "번역 보기"}
            />
          </div>
          <p className="text-center text-white/50 text-xs mt-3">
            {flipped ? "오른쪽 바를 누르면 원문이 보입니다" : "오른쪽 바를 누르면 번역, 단어를 탭하면 뜻이 나옵니다"}
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

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    );
  }

  // ================================================================
  // 위저드
  // ================================================================
  if (view === "wizard" && catId) {
    const cat = getPrayerCategory(catId)!;
    const canSubmit =
      !!situationId &&
      (!cat.needsPhase || !!phase) &&
      (situationId !== "custom" || !!customText.trim()) &&
      !generating;
    return (
      <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-2">
          <button
            onClick={closeSub}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 text-base font-semibold">{cat.emoji} {cat.label}</h1>
        </header>

        <div className="px-4 py-4 pb-32">
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5">
            {/* 상황 선택 */}
            {cat.id === "etc" ? (
              <>
                <p className="text-sm font-bold text-gray-900 font-gothic mb-2.5">어떤 상황인가요?</p>
                <input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="예: 이사한 가정을 위한 기도"
                  className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs text-white font-gothic mb-5 outline-none focus:border-emerald-400 placeholder:text-xs placeholder:text-white/40"
                />
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900 font-gothic mb-2.5">
                  {cat.needsPhase ? "어떤 모임인가요?" : "어떤 자리인가요?"}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {cat.situations.map((s) => (
                    <button key={s.id} onClick={() => setSituationId(s.id)} className={chip(situationId === s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {situationId === "custom" && (
                  <input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="상황을 직접 적어주세요"
                    className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs text-white font-gothic -mt-2 mb-5 outline-none focus:border-emerald-400 placeholder:text-xs placeholder:text-white/40"
                  />
                )}
              </>
            )}

            {/* 모임: 시작/마침 */}
            {cat.needsPhase && (
              <>
                <p className="text-sm font-bold text-gray-900 font-gothic mb-2.5">시작 기도인가요, 마침 기도인가요?</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  <button onClick={() => setPhase("open")} className={chip(phase === "open")}>모임 시작</button>
                  <button onClick={() => setPhase("close")} className={chip(phase === "close")}>모임 마침</button>
                </div>
              </>
            )}

            {/* 이름 (선택) */}
            <p className="text-sm font-bold text-gray-900 font-gothic mb-1.5">이름 <span className="text-gray-400 font-normal">(선택)</span></p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="예: Johan (비워두면 이름 없이)"
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs text-white font-gothic mb-5 outline-none focus:border-emerald-400 placeholder:text-xs placeholder:text-white/40"
            />

            {/* 사정 한 줄 (선택) */}
            <p className="text-sm font-bold text-gray-900 font-gothic mb-1.5">상황 한 줄 <span className="text-gray-400 font-normal">(선택)</span></p>
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="예: 내일 수술 예정 / 비자 연장 심사 중"
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs text-white font-gothic mb-5 outline-none focus:border-emerald-400 placeholder:text-xs placeholder:text-white/40"
            />

            {/* 길이 */}
            <p className="text-sm font-bold text-gray-900 font-gothic mb-2.5">기도문 길이</p>
            <div className="flex flex-wrap gap-2">
              {LENGTH_LABELS.map((l) => (
                <button key={l.id} onClick={() => setLength(l.id)} className={chip(length === l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 고정 만들기 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            onClick={submitWizard}
            disabled={!canSubmit}
            className="w-full rounded-full py-3.5 text-sm font-bold font-gothic bg-emerald-500 text-white disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> 기도문을 만들고 있어요...</>
            ) : (
              "기도문 만들기"
            )}
          </button>
        </div>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    );
  }

  // ================================================================
  // 홈: 카테고리 + 저장된 기도문
  // ================================================================
  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="홈으로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 text-lg font-semibold">인도네시아어 기도</h1>
      </header>

      <div className="px-4 py-4">
        {/* 카테고리 2x2 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {PRAYER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => openWizard(c.id)}
              className="rounded-xl bg-card border border-emerald-300/40 bg-gradient-to-br from-transparent to-emerald-300/20 px-4 py-4 text-left card-lift active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">{c.emoji}</span>
              <p className="mt-1.5 text-sm font-bold text-gray-900">{c.label}</p>
              <p className="text-[11px] text-gray-500 font-gothic mt-0.5">
                {c.id === "etc" ? "상황 직접 입력" : c.situations.length + "가지 상황"}
              </p>
            </button>
          ))}

          {/* 주기도문 — 고정 카드 */}
          <button
            onClick={() => openPrayer(LORDS_PRAYER)}
            className="rounded-xl bg-card border border-emerald-300/40 bg-gradient-to-br from-transparent to-emerald-300/20 px-4 py-4 text-left card-lift active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">✝️</span>
            <p className="mt-1.5 text-sm font-bold text-gray-900">주기도문</p>
            <p className="text-[11px] text-gray-500 font-gothic mt-0.5">Doa Bapa Kami</p>
          </button>
        </div>

        {/* 저장된 기도문 */}
        <p className="text-sm font-bold text-white/90 mb-2 px-1 font-gothic">저장된 기도문</p>
        {records.length === 0 ? (
          <div className="bg-card/60 border border-border/40 rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-gray-500 font-gothic">
              아직 만든 기도문이 없어요.
              <br />
              위에서 상황을 골라 첫 기도문을 만들어보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => {
              const cat = getPrayerCategory(r.categoryId);
              return (
                <button
                  key={r.id}
                  onClick={() => openPrayer(r)}
                  className="w-full text-left bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center gap-3 active:bg-emerald-500/5"
                >
                  <span className="shrink-0 text-lg">{cat ? cat.emoji : "🙏"}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{r.title}</span>
                    <span className="block text-[11px] text-gray-500 font-gothic truncate">
                      {r.situationLabel}
                      {r.name ? " · " + r.name : ""} · {fmtDate(r.createdAt)}
                    </span>
                  </span>
                  {r.pinned && <Bookmark size={14} className="shrink-0 text-amber-400" fill="currentColor" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Prayer;
