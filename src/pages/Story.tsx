import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { ArrowLeft, Volume2, Loader2, BookOpen, Lock, Lightbulb, Maximize2, Minimize2 } from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { generateStory, quickLookupWord, StoryDifficulty } from "@/lib/story";
import { normalizeHeadword } from "@/lib/dictionary";
import { saveStory, listStories, StoryRecord } from "@/lib/storyStore";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, LOOKUP_FAIL_TEXT } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import WordMiniSheet from "@/components/WordMiniSheet";
import LevelCircles from "@/components/LevelCircles";
import PlusLockBox from "@/components/PlusLockBox";
import { hasGeminiApiKey } from "@/lib/gemini";
import { useSwipeFlip } from "@/lib/useSwipeFlip";
import PlayButton from "@/components/PlayButton";
import { ttsPlayer } from "@/lib/tts";
import { ReadingTracker } from "@/lib/readingTimer";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";
import PointFloat from "@/components/PointFloat";
import { cleanPhrase, useSelectedPhrase } from "@/lib/phraseSelect";
import PhraseFindBar from "@/components/PhraseFindBar";
import AiReportButton from "@/components/AiReportButton";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { aiErrorToast } from "@/lib/aiErrors";
import { isBackCloseEntry } from "@/hooks/useBackClose";

const DIFF_KEY = "story-difficulty";
// 서버가 "오늘 한도를 다 썼다"고 알려 준 날 (한국 시간 기준 "YYYY-MM-DD")
const QUOTA_DAY_KEY = "story-quota-day";

// 단어 시트 표제어 판단 (QA Q13): 대문자로 시작하는 단어, 쌍점으로 끝난 앞 단어, 따옴표로 여는 단어(대사 첫머리)
const CAPITALIZED = new RegExp("^[A-Z][a-z]");
const COLON_END = new RegExp(":$");
const QUOTE_START = new RegExp("^[\"“‘'(]");

// 시안(ST1~ST5) 색
const C = {
  txt: "#1D1F1E",
  sub: "#646C72",
  mute: "#9AA1A6",
  deep: "#104B60",
  teal: "#2C6D63",
  amberBg: "#FCEFD9",
  amberFg: "#8C5A12",
  greyBg: "#F1F4F5",
};
const CARD_STYLE = { background: "#FFFFFF", borderRadius: 20, boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

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

/** 한국 시간 기준 날짜 ("하루"는 한국 시간 자정 기준 — 결정 문서) */
const kstDay = (t: number) => new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);

/** 목록 날짜: 오늘 / 어제 / 11월 7일 (해가 다르면 2025년 11월 7일) */
const fmtDate = (t: number) => {
  const d = new Date(t);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  const md = d.getMonth() + 1 + "월 " + d.getDate() + "일";
  return d.getFullYear() === now.getFullYear() ? md : d.getFullYear() + "년 " + md;
};

/** 카테고리 칩: "인도네시아 문화" → "문화" */
const shortCat = (c: string) => (c || "").replace("인도네시아 ", "").trim() || c;

const Chip = ({ children, tone }: { children: ReactNode; tone: "amber" | "grey" }) => (
  <span
    className="h-[22px] px-[9px] rounded-full flex items-center font-gothic text-[0.65625rem] font-semibold whitespace-nowrap min-w-0 truncate"
    style={tone === "amber" ? { background: C.amberBg, color: C.amberFg } : { background: C.greyBg, color: C.sub }}
  >
    {children}
  </span>
);

// 펼친 책 그림 (시안 BOOK_ART — 진한 색, 반짝이 없음)
const BookArt = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M5 13c6-3 13-3 19 2v24c-6-5-13-5-19-2z" fill="#E9B46A" />
    <path d="M43 13c-6-3-13-3-19 2v24c6-5 13-5 19-2z" fill="#F2C987" />
    <path d="M24 15v24" stroke="#9C6424" strokeWidth="1.8" />
    <path
      d="M9 19c4-1.6 8-1.4 11 .6M9 24c4-1.6 8-1.4 11 .6M28 19.6c3-2 7-2.2 11-.6M28 24.6c3-2 7-2.2 11-.6"
      stroke="#9C6424"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
      opacity="0.75"
    />
  </svg>
);

const Story = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { widthClass, canWide, wide, toggle } = useWideMode();
  const plan = usePlan();
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [difficulty, setDifficulty] = useState<StoryDifficulty>(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(DIFF_KEY); } catch (e) {}
    return v === "하" || v === "중" || v === "상" ? v : "중";
  });
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState<StoryRecord | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [quotaDay, setQuotaDay] = useState<string>(() => {
    try { return localStorage.getItem(QUOTA_DAY_KEY) || ""; } catch (e) { return ""; }
  });

  // ---------- 읽기 점수 (보이지 않는 타이머) ----------
  // 화면에는 아무 표시도 없고, 한국어 면을 처음 여는 순간에만 "+N"이 한 번 뜹니다.
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
    // 이야기 한 편이 단위. 목록으로 나가면 인니어 면이 아니므로 쌓지 않습니다.
    t.setUnit(current ? current.id : "");
  }, [current]);

  useEffect(() => {
    const t = trackerRef.current;
    if (!t) return;
    t.setSide(!!current && !flipped);
    if (current && flipped) t.koreanOpened();
  }, [flipped, current]);

  // ---------- 무료: 듣기 잠금 안내 말풍선 ----------
  const [lockTip, setLockTip] = useState(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // 앞/뒤 문단 DOM 참조 (뒤집을 때 읽던 문단으로 스크롤 맞추기)
  const paraRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const pendingPara = useRef<number | null>(null);

  // 화면 상단 기준으로 지금 보고 있는 문단 번호를 찾음
  const currentParaIndex = (side: "id" | "ko") => {
    const marker = 140; // 헤더 아래 기준선
    let best = 0;
    let bestDist = Infinity;
    Object.keys(paraRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      const el = paraRefs.current[k];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const dist = Math.abs(top - marker);
      // 기준선을 이미 지난 문단을 우선하되, 가장 가까운 것을 고름
      if (top <= marker + 40 && dist < bestDist) {
        bestDist = dist;
        best = Number(k.split("-")[1]) || 0;
      }
    });
    return best;
  };

  // 뒤집기: 지금 문단 번호를 기억해두고 반대편에서 같은 번호로 스크롤
  const handleFlip = () => {
    const side = flipped ? "ko" : "id";
    pendingPara.current = currentParaIndex(side);
    setLockTip(false);
    setFlipped((f) => !f);
  };

  const { swipeHandlers, shouldIgnoreTap } = useSwipeFlip(handleFlip);

  // 뒤집힌 뒤 기억해둔 문단 위치로 이동
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

  // 단어 미니 팝업
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupTok, setPopupTok] = useState(""); // 누른 단어 자리 (본문에서 표시)
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState(""); // 단어장 저장용 (표시 안 함)
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  // 카드 단위 단어 캐시: 같은 카드를 보는 동안 눌러본 단어는 즉시 표시 (카드를 나가면 리셋)
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  // ---- 담을 단어장 (사전에서 고른 대상을 함께 씁니다) ----
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

  // 카드 화면을 열었는지 (히스토리를 한 칸 쌓았는지)
  const cardStateRef = useRef(false);

  // 카드 열기: 히스토리를 쌓아 뒤로가기가 목록으로 오게 함
  const openCard = (rec: StoryRecord) => {
    ttsPlayer.stop();
    wordCache.current.clear();
    setCurrent(rec);
    setFlipped(false);
    setLockTip(false);
    paraRefs.current = {};
    pendingPara.current = null;
    if (!cardStateRef.current) {
      cardStateRef.current = true;
      try { window.history.pushState({ storyCard: true }, ""); } catch (e) {}
    }
  };

  // 카드 상태만 정리 (히스토리는 건드리지 않음)
  const resetToList = () => {
    ttsPlayer.stop();
    setCurrent(null);
    setFlipped(false);
    setLockTip(false);
    paraRefs.current = {};
    pendingPara.current = null;
    setPopupWord(null);
    wordCache.current.clear();
  };

  // 헤더 화살표: 뒤로가기와 동작을 일치시킴
  const closeCard = () => {
    if (cardStateRef.current) {
      window.history.back(); // popstate 핸들러가 resetToList 처리
    } else {
      resetToList();
    }
  };

  // 폰의 뒤로가기: 카드 화면이면 목록으로만 이동 (이야기를 벗어나지 않음)
  useEffect(() => {
    const onPop = () => {
      // 시트가 팝업 위에 떠 있으면 시트만 닫습니다 (카드·팝업은 그대로).
      if (pickerOpenRef.current) {
        pickerOpenRef.current = false;
        pickerPushedRef.current = false;
        setPickerOpen(false);
        return;
      }
      if (cardStateRef.current) {
        cardStateRef.current = false;
        resetToList();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 돌아올 자리로 되돌리기 ----------
  // 사전(또는 구독 화면)에 다녀오면 이 화면은 새로 마운트되어 목록으로 돌아갑니다.
  // 표가 있으면 보던 이야기 카드를 다시 열고, 면과 스크롤까지 되돌립니다.
  const pendingReturnRef = useRef<{ y: number; flipped: boolean } | null>(null);
  const cancelRestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listStories().then((all) => {
      setStories(all);
      const t = takeReturnTicket("story");
      if (!t) return;
      const found = all.find((s) => s.id === t.key);
      if (!found) return;
      pendingReturnRef.current = { y: t.y, flipped: t.flipped };
      // 카드 칸은 히스토리에 이미 남아 있습니다 (지금 그 칸 위에 서 있습니다).
      // 미리 켜 두어 openCard 가 칸을 새로 쌓지 않게 합니다.
      cardStateRef.current = true;
      openCard(found);
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

  const pickDifficulty = (d: StoryDifficulty) => {
    setDifficulty(d);
    try { localStorage.setItem(DIFF_KEY, d); } catch {}
  };

  // ---------- 오늘 더 불러올 수 있는가 ----------
  // 무료는 하루 1편(한국 시간 자정 기준). 서버가 한도를 세고, 화면은 이 기기의 기록과
  // 서버가 돌려준 한도 초과(QUOTA)를 보고 미리 막아 둡니다.
  const today = kstDay(Date.now());
  const madeToday = stories.some((s) => kstDay(s.createdAt) === today);
  const quotaToday = quotaDay === today;
  const freeUsed = !plan.plus && (madeToday || quotaToday);
  const blocked = freeUsed || quotaToday;

  const handleGenerate = async () => {
    if (generating || blocked) return;
    if (!hasGeminiApiKey()) {
      aiErrorToast("NO_API_KEY", "Gemini API 키가 필요합니다. 설정에서 입력하세요");
      return;
    }
    setGenerating(true);
    try {
      const recent = stories.slice(0, 10).map((s) => s.titleKo || s.title);
      const data = await generateStory(difficulty, recent);
      const rec = await saveStory(data);
      setStories((prev) => [rec, ...prev]);
      openCard(rec);
    } catch (e: any) {
      const code = e?.message || "";
      // 서버 한도 코드는 QUOTA_STORY 등(aiProxy·geminiText). Plus 필요는 aiProxy 의 "Plus 보기" 알림으로 끝.
      if (code === "QUOTA_PLUS_REQUIRED") { /* 겹쳐 띄우지 않음 */ }
      else if (code.indexOf("QUOTA") === 0) {
        // 서버가 오늘 한도를 다 썼다고 알려 왔습니다. 오늘은 버튼을 막고 버튼 아래에 안내를 둡니다.
        // (토스트는 aiProxy 가 이미 한 번 띄우므로 여기서는 더 띄우지 않습니다)
        try { localStorage.setItem(QUOTA_DAY_KEY, today); } catch (err) {}
        setQuotaDay(today);
      } else if (code === "RATE_LIMIT") toast("요청이 많습니다. 잠시 후 다시 시도하세요");
      else if (code === "NO_API_KEY" || code === "INVALID_API_KEY" || code === "SESSION_EXPIRED" || code === "NOT_AVAILABLE") {
        aiErrorToast(code, "API 키를 설정에서 확인하세요");
      }
      else toast("이야기를 불러오지 못했습니다. 다시 시도하세요");
    } finally {
      setGenerating(false);
    }
  };

  const goPaywall = () => {
    // 카드를 보던 중이면 돌아올 자리를 적어 둡니다 (setState 없이 이동만)
    if (current) writeReturnTicket("story", current.id, currentScrollY(), flipped);
    navigate(PAYWALL_PATH);
  };

  // 무료: 잠긴 "듣기" — 처음 누르면 안내 말풍선, 말풍선이 떠 있을 때 한 번 더 누르면 구독 화면
  const onLockedListen = () => {
    if (lockTip) {
      goPaywall();
      return;
    }
    setLockTip(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => setLockTip(false), 2800);
  };

  // 단어 탭 → 미니 팝업
  // 조회 순서: 카드 메모리 캐시 → 폰 저장소(IndexedDB) → Gemini API
  // 본문에서 고른 표현 찾기
  const { phrase: selPhrase, take: takeSelPhrase } = useSelectedPhrase();

  const openPhrasePopup = () => {
    const s = takeSelPhrase();
    if (!s.phrase) return;
    openWordPopup(s.phrase, s.sentence, "");
  };

  // keepCase: 본문 문장 가운데의 대문자 단어 — 고유명사로 보고 표기를 그대로 둡니다.
  const openWordPopup = async (rawToken: string, sentence: string, tokKey: string, keepCase = false) => {
    if (shouldIgnoreTap()) return;
    // 글자를 고르는 중이면 팝업을 열지 않습니다
    // (선택을 끝내며 나는 탭이 단어 팝업을 잘못 여는 것을 막습니다)
    const liveSel = window.getSelection();
    if (liveSel && !liveSel.isCollapsed) return;
    trackerRef.current?.touch();
    // 표제어는 사전과 같은 규칙으로 소문자 정리(제목·문장 첫머리의 Pasar → pasar). 시트 표시·담기 모두 이 값을 씁니다.
    const cleaned = cleanPhrase(rawToken);
    const word = keepCase ? cleaned : normalizeHeadword(cleaned);
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupTok(tokKey);
    setPopupSentence(sentence);
    // 이미 대상 단어장에 있는 단어면 처음부터 "저장됨"으로 표시
    setPopupSaved(!!saveTargetId && hasWordInCategory(saveTargetId, word));

    // 1) 이 카드에서 이미 찾아본 단어
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

    // 2) 폰에 저장된 단어 (예전에 다른 이야기에서 찾아본 것)
    const stored = await getLookupWord(word);
    if (stored && popupReqId.current === reqId) {
      const rec = { meaning: stored.meaning, info: stored.info, sentenceKo: "" };
      wordCache.current.set(key, rec);
      setPopupMeaning(rec.meaning);
      setPopupInfo(rec.info);
      setPopupLoading(false);
      return;
    }

    // 3) 새로 조회
    quickLookupWord(word, sentence)
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

  const closePopup = () => {
    setPopupWord(null);
    setPopupTok("");
  };

  const openInDictionary = () => {
    if (!popupWord) return;
    // 돌아올 자리를 표로 한 장 적어 둡니다 (어느 이야기 + 스크롤 + 보고 있던 면)
    if (current) writeReturnTicket("story", current.id, currentScrollY(), flipped);
    // 카드가 쌓아 둔 히스토리 칸은 그대로 둡니다.
    // 사전에서 뒤로가기를 누르면 그 칸으로 돌아오고, 한 번 더 누르면 목록으로 나갑니다.
    // (칸을 덮어썼다가 돌아와서 다시 쌓으면, 조작 없이 쌓은 칸이라 뒤로가기가 먹지 않습니다)
    // 단어 시트가 뒤로가기용으로 쌓은 칸만은 사전 화면으로 바꿔 끼웁니다(되돌아올 때 빈 칸이 하나 더 생기지 않게).
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=story", { replace: isBackCloseEntry() });
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

  // 인니어 텍스트를 단어 단위로 쪼개 탭 가능하게 렌더링 (제목/본문 공용)
  // 단어마다 옅은 점선 밑줄, 지금 뜻을 보고 있는 단어는 귤색 바탕 (시안 ST3)
  const renderTokens = (text: string, keyPrefix: string) =>
    text.split(" ").map((tok, ti, toks) => {
      const k = keyPrefix + ti;
      const on = !!popupWord && popupTok === k;
      // 본문 문장 가운데(첫 단어가 아니고, 앞 단어가 따옴표·쌍점으로 끝나지 않음)의 대문자 단어는 고유명사로 봅니다.
      // 제목은 단어마다 대문자로 쓰므로 언제나 소문자 정리 대상입니다.
      const prevTok = ti > 0 ? toks[ti - 1] : "";
      const midSentence = keyPrefix !== "title-" && ti > 0 && !COLON_END.test(prevTok) && !QUOTE_START.test(tok);
      const keepCase = midSentence && CAPITALIZED.test(cleanPhrase(tok));
      return (
        <span key={k} data-idw="1">
          <span
            onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text, k, keepCase); }}
            className="cursor-pointer active:bg-primary/20"
            style={
              on
                ? { background: "#FCEFD9", borderRadius: 4, padding: "0 2px", borderBottom: "2px solid #E0A85A" }
                : { borderBottom: "1px dotted rgba(16,75,96,0.28)" }
            }
          >
            {tok}
          </span>{" "}
        </span>
      );
    });

  // 인니어 본문을 문단→문장→단어로 쪼개 탭 가능하게 렌더링
  const renderIndonesian = (text: string) => {
    const paragraphs = text.split(new RegExp("\\n{2,}")).filter((p) => p.trim());
    return paragraphs.map((para, pi) => {
      const sentences = para.split(new RegExp("(?<=[.!?])\\s+")).filter(Boolean);
      return (
        <p
          key={pi}
          ref={(el) => { paraRefs.current["id-" + pi] = el; }}
          className={"font-word text-[1.0625rem] leading-[1.85] " + (pi === 0 ? "mt-3.5" : "mt-3")}
          style={{ color: C.txt }}
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
        className={"font-gothic text-[0.90625rem] leading-[1.8] break-words " + (i === 0 ? "mt-3" : "mt-2.5")}
        style={{ color: C.txt }}
      >
        {para}
      </p>
    ));

  const header = (onBack: () => void, backTitle: string) => (
    <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
      <button
        onClick={onBack}
        className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
        title={backTitle}
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">CERITA INDONESIA</h1>
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
  );

  // ---------- 카드 뷰 ----------
  if (current) {
    return (
      <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
        <PointFloat value={floatVal} seq={floatSeq} />
        {header(closeCard, "목록으로")}

        {/* 화면 전체에서 옆으로 밀면 뒤집힙니다 (카드 아래 빈 곳 포함) */}
        <div {...swipeHandlers} className="px-4 pt-4 pb-6" style={{ minHeight: "calc(100dvh - 61px - var(--kata-tabbar-h, 0px))" }}>
          <div className="relative" style={CARD_STYLE}>
            {!flipped ? (
              <div style={{ padding: "18px 18px 22px" }}>
                {/* 앞면: 인니어 본문 */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Chip tone="amber">{shortCat(current.category)}</Chip>
                  <Chip tone="grey">난이도 {current.difficulty}</Chip>
                  <span className="flex-1" />
                  <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {plan.plus ? (
                      <PlayButton
                        cacheKey={"story-v2-" + current.id}
                        text={[current.title, current.indonesian].filter(Boolean).join("\n\n")}
                        label="듣기"
                        className="!h-[34px] !px-[13px] !py-0 !text-[0.78125rem] !font-semibold !bg-[#E2F1EC] !text-[#2C6D63] font-gothic"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={onLockedListen}
                        className="h-[34px] px-3 rounded-full flex items-center gap-1.5 font-gothic text-[0.78125rem] font-semibold"
                        style={{ background: C.greyBg, color: "#8F7E4E" }}
                        aria-label="듣기 (Plus 회원 기능)"
                      >
                        <Lock size={14} strokeWidth={2} />
                        듣기
                      </button>
                    )}
                  </span>
                </div>
                <h2
                  className="mt-3.5 font-word text-[1.375rem] font-semibold leading-[1.35] break-words min-w-0"
                  style={{ color: C.deep }}
                >
                  {renderTokens(current.title, "title-")}
                </h2>
                {renderIndonesian(current.indonesian)}
                {lockTip ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goPaywall(); }}
                    className="absolute z-10 right-[6px] top-[59px] px-3 py-2 rounded-xl font-gothic text-[0.78125rem] text-left"
                    style={{
                      background: "rgba(226,231,234,0.96)",
                      color: "#4D565B",
                      boxShadow: "0 2px 8px rgba(16,40,50,0.08)",
                    }}
                  >
                    소리 읽기는 Plus 회원 기능입니다
                  </button>
                ) : null}
              </div>
            ) : (
              <div style={{ padding: 18 }}>
                {/* 뒷면: 한국어 번역 + 배경 설명 */}
                {/* 번역면 제목·본문: 2026-11-11 사용자 요청으로 한 단계 작게, 본문은 아래 "이 글을 더 이해하려면"과 같은 고딕 */}
                <h2 className="text-[1.03125rem] font-semibold break-words" style={{ color: C.txt }}>{current.titleKo}</h2>
                {renderKorean(current.korean)}
                {current.background && current.background.length > 0 ? (
                  <div className="mt-[18px] rounded-[14px]" style={{ background: "#FBF5E6", padding: "14px 14px 12px" }}>
                    <p className="flex items-center gap-1.5 font-gothic text-[0.8125rem] font-bold" style={{ color: "#6E5612" }}>
                      <Lightbulb size={15} strokeWidth={1.9} className="shrink-0" />
                      이 글을 더 이해하려면
                    </p>
                    {current.background.map((b, i) => (
                      <p
                        key={i}
                        className={"font-gothic text-[0.8125rem] leading-[1.7] break-words " + (i === 0 ? "mt-2" : "mt-1.5")}
                        style={{ color: "#3B3A35" }}
                      >
                        {b.heading && <b>{b.heading} · </b>}
                        {b.body}
                      </p>
                    ))}
                  </div>
                ) : current.hardWords && current.hardWords.length > 0 ? (
                  <div className="mt-[18px] rounded-[14px]" style={{ background: "#FBF5E6", padding: "12px 14px" }}>
                    {/* 예전에 만든 이야기 (단어 정리) */}
                    <ul className="space-y-1.5 font-gothic text-[0.8125rem]" style={{ color: "#3B3A35" }}>
                      {current.hardWords.map((h, i) => (
                        <li key={i} className="flex gap-2 min-w-0 items-center">
                          <span className="min-w-0 break-words">
                            <b>{h.word}</b> {h.meaning}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); speak(h.word, "id"); }}
                            className="shrink-0"
                            style={{ color: C.teal }}
                            title="발음 듣기"
                          >
                            <Volume2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {/* AI 이야기 신고 — 스토어 앱(공개판)에서만 보입니다. 카드 뒤집기와 겹치지 않게 클릭을 막습니다 */}
                <div onClick={(e) => e.stopPropagation()}>
                  <AiReportButton
                    feature="story"
                    input={current.title}
                    output={current.indonesian}
                    className="mt-4 pt-1.5 border-t border-[#EEF1F3]"
                  />
                </div>
              </div>
            )}
          </div>
          <p className="mt-3 text-center font-gothic text-[0.75rem]" style={{ color: C.mute }}>
            {/* "단어를 누르면 뜻이 나옵니다" 안내는 2026-11-11 사용자 요청으로 모든 화면에서 뺐습니다 */}
            {flipped ? "옆으로 밀면 원문이 보입니다" : "옆으로 밀면 해석이 보입니다"}
          </p>
        </div>

        {/* 단어 미니 팝업 */}
        <PhraseFindBar phrase={selPhrase} onFind={openPhrasePopup} hidden={!!popupWord} widthClass={widthClass} />
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
            onClose={closePopup}
            onSave={savePopupWord}
            onPickTarget={openPicker}
            onDictionary={openInDictionary}
            onSpeak={() => speak(popupWord, "id")}
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

  // ---------- 리스트 뷰 ----------
  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      {header(() => goBackOr(navigate, location.key, "/"), "뒤로")}

      <div className="px-4 pt-4 pb-6 flex flex-col gap-2.5">
        {/* 오늘의 이야기: 난이도 + 불러오기 */}
        <div style={{ ...CARD_STYLE, padding: "18px 16px 16px" }}>
          <div className="flex items-center gap-3">
            <span
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "#FDF3E1" }}
            >
              <BookArt />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[0.96875rem] font-semibold" style={{ color: C.txt }}>오늘의 이야기</span>
              <span className="block mt-[3px] font-gothic text-[0.71875rem]" style={{ color: C.sub }}>
                난이도를 고르고 새 이야기를 불러옵니다
              </span>
            </span>
          </div>
          <div className="mt-[18px]">
            <LevelCircles value={difficulty} onChange={pickDifficulty} variant="story" disabled={generating} />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || blocked}
            className="mt-3.5 w-full h-[44px] rounded-2xl flex items-center justify-center gap-2 font-gothic text-[0.875rem] font-semibold"
            style={
              blocked
                ? { background: "#E9EDEF", color: C.mute }
                : { background: C.teal, color: "#FFFFFF", opacity: generating ? 0.75 : 1 }
            }
          >
            {generating ? (
              <><Loader2 size={18} className="animate-spin" /> 이야기를 불러오는 중...</>
            ) : (
              <><BookOpen size={18} strokeWidth={1.9} /> 이야기 불러오기</>
            )}
          </button>
          {blocked ? (
            <p className="mt-2.5 text-center font-gothic text-[0.71875rem]" style={{ color: C.sub }}>
              {freeUsed
                ? "오늘의 이야기를 불러왔습니다 · 내일 새 이야기가 열립니다"
                : "오늘 불러올 수 있는 이야기를 모두 불러왔습니다 · 내일 다시 열립니다"}
            </p>
          ) : null}
        </div>

        {/* 무료: 듣기·여러 편은 Plus (시안 ST2) */}
        {!plan.plus ? (
          <PlusLockBox
            title="인도네시아어 발음으로 이야기 듣기"
            lines={["Plus는 이야기를 음성으로 듣고,", "하루에 여러 편 불러오기가 가능합니다"]}
            onClick={goPaywall}
          />
        ) : null}

        {/* 지난 이야기 */}
        {stories.length > 0 ? (
          <>
            <p className="mt-3.5 mx-1 font-gothic text-[0.8125rem] font-bold tracking-[0.02em]" style={{ color: "#3B4245" }}>
              지난 이야기
            </p>
            {stories.map((s) => (
              <button
                key={s.id}
                onClick={() => openCard(s)}
                className="w-full text-left min-w-0 active:opacity-80"
                style={{ ...CARD_STYLE, padding: "14px 16px" }}
              >
                <p className="font-word text-[0.96875rem] font-semibold break-words" style={{ color: C.deep }}>{s.title}</p>
                <p className="mt-[3px] font-gothic text-[0.75rem] break-words" style={{ color: C.sub }}>{s.titleKo}</p>
                <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
                  <Chip tone="amber">{shortCat(s.category)}</Chip>
                  <Chip tone="grey">난이도 {s.difficulty}</Chip>
                  <span className="ml-auto shrink-0 font-gothic text-[0.6875rem]" style={{ color: C.mute }}>{fmtDate(s.createdAt)}</span>
                </div>
              </button>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Story;
