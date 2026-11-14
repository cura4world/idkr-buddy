import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { getCategories, getWordsByCategory, getSavedWordIds, toggleSavedWord, Word } from "@/lib/store";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { groupOf } from "@/lib/wordbookGroups";
import { goBackOr, wordbookFallback } from "@/lib/nav";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, Volume2, Play, Square, Bookmark, RefreshCw, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { displayMeaning } from "@/lib/wordbookGroups";
import { isStoreApp } from "@/lib/platform";
import { ttsPlayer } from "@/lib/tts";
import { hasNativeTts, isWordLike, speakNative, stopNative } from "@/lib/nativeTts";


// 아래 동그라미 버튼 (시안: 카드로 외우기 — 켜진 버튼만 연한 청록)
const BTN = "w-12 h-12 flex items-center justify-center rounded-full border transition-colors disabled:opacity-30";
const BTN_OFF = "bg-white text-[#1D1F1E] border-[#DDE3E6]";
const BTN_ON = "bg-[#E3EEEC] text-[#2C6D63] border-[#2C6D63]";
// 밀어 넘길 때 카드가 화면 밖으로 나가는 시간(ms). 들어오는 시간은 index.css 의 card-swipe-in-*.
const SWIPE_OUT_MS = 380;
const FACE = "absolute inset-0 backface-hidden rounded-[20px] bg-white border border-[#E6EAEC] shadow-[0_1px_4px_rgba(16,40,50,0.05)] flex flex-col items-center justify-center p-8 text-card-foreground";

export default function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const categories = getCategories();
  const category = categories.find((c) => c.id === id);
  const words = id ? getWordsByCategory(id) : [];
  const [isRandom, setIsRandom] = useState(false);
  const [reviewFilter, setReviewFilter] = useState(false);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  // 옆으로 밀기 애니메이션 (handleTouchMove/End)
  const [dragX, setDragX] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const [enterFrom, setEnterFrom] = useState<"left" | "right" | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipingRef = useRef(false);
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 자동재생 실행 번호 (runAutoPlay)
  const autoRunRef = useRef(0);
  // 방금 읽으려던 음성이 한도 초과로 만들어지지 않았는가 (speak 가 적고 runAutoPlay 가 읽습니다)
  const quotaHitRef = useRef(false);
  // 이 화면에서 스피커를 한 번이라도 눌렀는가 — 누른 적이 있을 때만 뒤집은 카드의 뒷면 음성을 미리 만듭니다
  // (듣지 않는 카드까지 만들면 공개판 음성 한도를 씀)
  const usedSpeakerRef = useRef(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedWordIds());
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isAutoRandom, setIsAutoRandom] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [autoCurrentWord, setAutoCurrentWord] = useState<Word | undefined>(undefined);
  const [frontLang, setFrontLang] = useState<"id" | "ko">("id");
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isLoopingRef = useRef(false);
  const isAutoPlayingRef = useRef(false);
  const autoRandomRef = useRef(false);
  const plan = usePlan();

  const shuffledWords = useMemo(() => {
    if (!isRandom) return words;
    return [...words].sort(() => Math.random() - 0.5);
  }, [isRandom, words.length]);

  const orderedWords = isRandom ? shuffledWords : words;
  // 노란 리본(다시 외울 단어) 필터가 켜져 있으면 표시된 단어만 학습
  const displayWords = reviewFilter ? orderedWords.filter((w) => savedIds.includes(w.id)) : orderedWords;
  const currentWord: Word | undefined = isAutoPlaying ? autoCurrentWord : displayWords[currentIndex];
  const isMarked = currentWord ? savedIds.includes(currentWord.id) : false;

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch (e) {}
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch (e) {}
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isAutoPlayingRef.current) {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // 카드 오른쪽 위 리본: 현재 단어를 '다시 외울 단어'로 표시/해제
  const handleToggleMark = () => {
    if (!currentWord) return;
    const nowMarked = toggleSavedWord(currentWord.id);
    setSavedIds(getSavedWordIds());
    toast(nowMarked ? "다시 외울 단어로 표시했습니다" : "표시를 해제했습니다");
  };

  // 아래 동그라미 리본 버튼: 표시된 단어만 보기 <-> 전체 보기
  const handleToggleFilter = () => {
    if (reviewFilter) {
      setReviewFilter(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      toast("전체 단어를 표시합니다");
      return;
    }
    const marked = words.filter((w) => savedIds.includes(w.id));
    if (marked.length === 0) {
      toast("표시된 단어가 없습니다");
      return;
    }
    setReviewFilter(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast("표시된 단어 " + marked.length + "개만 학습합니다");
  };

  // 읽기 — 다 읽은 뒤에 끝나는 Promise (자동재생이 이것을 기다렸다가 카드를 넘깁니다)
  // 공개판(스토어·미리보기 앱), 2026-11-11 사용자 요청:
  //   인도네시아어 낱말 = 폰 내장 음성(예전 관리자판 목소리, 바로 나옴) / 그 밖의 인도네시아어 = Gemini 여성
  //   한국어 뜻 = Gemini 남성(Charon). Gemini 는 실제로 다 들릴 때까지 기다립니다(예전엔 글자 수로 어림해
  //   한국어 음성이 늦게 오면 다 읽기 전에 카드가 넘어갔습니다).
  const speak = async (text: string, lang: "id" | "ko"): Promise<void> => {
    const clean = text.replace(new RegExp("~", "g"), "무엇무엇").replace(new RegExp("\\s*/\\s*", "g"), ", ");
    if (isStoreApp()) {
      if (lang === "id" && isWordLike(clean) && hasNativeTts()) {
        // 만드는 중이던 Gemini 음성(예: 뒷면 한국어)이 폰 음성 뒤에 늦게 나오지 않게 먼저 멈춥니다
        try { ttsPlayer.stop(); } catch (e) {}
        const ok = await speakNative(clean, "id-ID");
        if (ok) return;
      }
      try { stopNative(); } catch (e) {}
      const ok = await ttsPlayer.playOnce("say:" + clean, clean, lang === "ko" ? "male" : "female");
      // 한도 초과·Plus 필요로 음성을 만들지 못한 경우를 적어 둡니다 — 자동재생이 이것을 보고 멈춥니다(runAutoPlay).
      // 안내 토스트는 aiProxy 가 이미 띄웠습니다.
      if (!ok && ttsPlayer.lastPlayOnceError.indexOf("QUOTA") === 0) quotaHitRef.current = true;
      return;
    }
    return speakDevice(text, lang);
  };

  // Gemini 로 읽을 글이면 미리 만들어 둡니다(폰 음성으로 읽을 낱말·관리자판은 할 일 없음)
  const prefetchSpeak = (text: string, lang: "id" | "ko") => {
    if (!isStoreApp() || !text) return;
    const clean = text.replace(new RegExp("~", "g"), "무엇무엇").replace(new RegExp("\\s*/\\s*", "g"), ", ");
    if (lang === "id" && isWordLike(clean) && hasNativeTts()) return;
    ttsPlayer.prefetch("say:" + clean, clean, lang === "ko" ? "male" : "female").catch(() => {});
  };

  // 관리자판·회원판(폰 내장 음성 AndroidTTS 가 있는 앱)의 예전 읽기 — 그대로 둡니다
  // 음성 통로가 없거나(AndroidTTS·speechSynthesis 둘 다 없는 웹뷰) 부르다 던지면, 예전에는 Promise 가
  // 끝나지 않아 자동재생이 그 카드에서 멈췄습니다. 실패하면 바로 끝난 것으로 칩니다(출시 전 점검 C-25).
  const speakDevice = (text: string, lang: "id" | "ko") => {
    return new Promise<void>((resolve) => {
      try {
        const cleanText = text.replace(new RegExp("~", "g"), "무엇무엇").replace(new RegExp("\\s*/\\s*", "g"), ", ");
        if ((window as any).AndroidTTS) {
          (window as any).AndroidTTS.speak(cleanText, lang === "ko" ? "ko-KR" : "id-ID");
          setTimeout(() => resolve(), cleanText.length * 80 + 500);
          return;
        }
        if (typeof speechSynthesis === "undefined" || !speechSynthesis) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
        utterance.rate = 0.9;
        // 읽기 오류면 끝난 것으로 칩니다. 다만 멈춤(cancel)으로 끊긴 것은 예전처럼 그대로 둡니다.
        const onSpeakError = (ev: any) => {
          const code = ev && ev.error;
          if (code === "canceled" || code === "interrupted") return;
          resolve();
        };
        utterance.onend = () => resolve();
        utterance.onerror = onSpeakError;
        try { speechSynthesis?.cancel?.(); } catch(e) {}
        const warmup = new SpeechSynthesisUtterance(" ");
        warmup.volume = 0;
        warmup.lang = utterance.lang;
        warmup.onend = () => {
          setTimeout(() => { try { speechSynthesis?.speak?.(utterance); } catch(e) { resolve(); } }, 100);
        };
        warmup.onerror = onSpeakError;
        setTimeout(() => { try { speechSynthesis?.speak?.(warmup); } catch(e) { resolve(); } }, 150);
      } catch (e) {
        resolve();
      }
    });
  };

  const getSpeakTarget = (word: Word, flipped: boolean): { text: string; lang: "id" | "ko" } => {
    if (frontLang === "id") {
      return flipped ? { text: word.meaning, lang: "ko" } : { text: word.word, lang: "id" };
    } else {
      return flipped ? { text: word.word, lang: "id" } : { text: word.meaning, lang: "ko" };
    }
  };

  // 손으로 뒤집으면 뒷면 음성을 미리 만들어 둡니다(스피커를 누르면 바로 나오게)
  useEffect(() => {
    if (!isFlipped || isAutoPlaying || !currentWord || !usedSpeakerRef.current) return;
    const { text, lang } = getSpeakTarget(currentWord, true);
    prefetchSpeak(text, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, currentWord && currentWord.id]);

  useEffect(() => {
    if (isFlipped) { setIsBreathing(false); return; }
    const timer = setTimeout(() => setIsBreathing(true), 2000);
    return () => clearTimeout(timer);
  }, [currentIndex, isFlipped]);

  // 필터로 목록이 줄었을 때 인덱스가 범위를 벗어나면 보정
  useEffect(() => {
    if (isAutoPlaying) return;
    if (displayWords.length > 0 && currentIndex > displayWords.length - 1) {
      setCurrentIndex(displayWords.length - 1);
      setIsFlipped(false);
    }
  }, [displayWords.length, currentIndex, isAutoPlaying]);

  // 필터 중 표시 단어가 모두 해제되면 자동으로 전체 보기로 복귀
  useEffect(() => {
    if (reviewFilter && words.length > 0 && displayWords.length === 0) {
      setReviewFilter(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      toast("표시된 단어가 없어 전체 단어를 표시합니다");
    }
  }, [reviewFilter, displayWords.length, words.length]);

  // bySwipe: 손으로 밀어 넘긴 경우(들어오는 방향은 handleTouchEnd 가 정함). 버튼이면 예전처럼 살짝 들어옵니다.
  // leaving: 밀어 넘기는 카드가 아직 날아가는 중이면 버튼을 무시합니다(두 장이 한꺼번에 넘어가지 않게)
  const goNext = useCallback((bySwipe?: boolean) => {
    if (bySwipe !== true && leaving) return;
    if (currentIndex < displayWords.length - 1) {
      if (bySwipe !== true) setEnterFrom(null);
      setSlideDir(1); setIsFlipped(false); setIsBreathing(false); setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, displayWords.length, leaving]);

  const goPrev = useCallback((bySwipe?: boolean) => {
    if (bySwipe !== true && leaving) return;
    if (currentIndex > 0) {
      if (bySwipe !== true) setEnterFrom(null);
      setSlideDir(-1); setIsFlipped(false); setIsBreathing(false); setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex, leaving]);

  const cancelOperations = () => {
    isAutoPlayingRef.current = false;
    autoRunRef.current += 1;
    if (autoPlayRef.current) { clearTimeout(autoPlayRef.current); autoPlayRef.current = null; }
    try { speechSynthesis?.cancel?.(); } catch(e) {}
    try { (window as any).AndroidTTS?.stop?.(); } catch(e) {}
    releaseWakeLock();
  };

  // 뒤로가기: 직전 화면으로 한 단계만. 재생/타이머만 정리하고(상태 변경 없음) 이동합니다.
  const handleBack = () => {
    cancelOperations();
    goBackOr(navigate, location.key, wordbookFallback(id));
  };

  const stopAutoPlay = useCallback(() => {
    isAutoPlayingRef.current = false;
    autoRunRef.current += 1;
    setIsAutoPlaying(false); setIsAutoRandom(false); setIsScreenLocked(false);
    if (autoPlayRef.current) { clearTimeout(autoPlayRef.current); autoPlayRef.current = null; }
    try { speechSynthesis?.cancel?.(); } catch(e) {}
    try { (window as any).AndroidTTS?.stop?.(); } catch(e) {}
    setIsFlipped(false); setCurrentIndex(0); setAutoCurrentWord(undefined); setEnterFrom(null);
    releaseWakeLock();
  }, []);

  // run: 이 재생의 번호. 멈췄다가 곧바로 다시 재생하면, 음성을 기다리던 옛 재생은 번호가 달라 스스로 끝납니다
  // (playOnce 가 Gemini 음성을 만드는 몇 초 동안 두 재생이 겹쳐 카드가 튀던 것 방지).
  const runAutoPlay = useCallback(async (index: number, playWords: Word[], lang: "id" | "ko", run: number = autoRunRef.current) => {
    const alive = () => isAutoPlayingRef.current && run === autoRunRef.current;
    if (!alive()) return;
    if (index >= playWords.length) {
      if (isLoopingRef.current) {
        const nextWords = autoRandomRef.current ? [...playWords].sort(() => Math.random() - 0.5) : playWords;
        runAutoPlay(0, nextWords, lang, run); return;
      }
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false); setIsAutoRandom(false); setIsScreenLocked(false);
      setIsFlipped(false); setCurrentIndex(0); setAutoCurrentWord(undefined);
      releaseWakeLock();
      toast("자동플레이가 완료되었습니다 🎉");
      return;
    }
    setIsFlipped(false); setIsBreathing(false); setCurrentIndex(index);
    // 카드가 옆면(90도)을 지나는 순간 다음 단어로 교체: 뒤집는 모션은 유지하고 이전 단어 앞면은 보이지 않음
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(() => { setAutoCurrentWord(playWords[index]); resolve(); }, 300); });
    if (!alive()) return;
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(() => { resolve(); }, 350); });
    if (!alive()) return;
    // 앞면을 읽는 동안 뒷면 음성을 미리 만들어 둡니다(뒷면 한국어 음성이 늦게 와 끊기던 것)
    { const backLang0: "id" | "ko" = lang === "id" ? "ko" : "id"; prefetchSpeak(lang === "id" ? playWords[index].meaning : playWords[index].word, backLang0); }
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(async () => { const frontText = lang === "id" ? playWords[index].word : playWords[index].meaning; await speak(frontText, lang); resolve(); }, 1000); });
    if (!alive()) return;
    // 음성 한도를 넘었으면 자동재생을 멈춥니다. 계속 넘기면 카드마다 소리 없이 같은 한도 안내만 되풀이됩니다(출시 전 점검 C-17).
    if (quotaHitRef.current) { quotaHitRef.current = false; stopAutoPlay(); return; }
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(() => { setIsFlipped(true); resolve(); }, 1500); });
    if (!alive()) return;
    // 다음 카드 앞면도 미리
    { const nx = playWords[index + 1]; if (nx) prefetchSpeak(lang === "id" ? nx.word : nx.meaning, lang); }
    // 뒷면은 다 읽을 때까지 기다린 뒤에야 다음 카드로 넘어갑니다
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(async () => { const backLang: "id" | "ko" = lang === "id" ? "ko" : "id"; const backText = lang === "id" ? playWords[index].meaning : playWords[index].word; await speak(backText, backLang); resolve(); }, 700); });
    if (!alive()) return;
    if (quotaHitRef.current) { quotaHitRef.current = false; stopAutoPlay(); return; }
    autoPlayRef.current = setTimeout(() => { runAutoPlay(index + 1, playWords, lang, run); }, 1500);
  }, []);

  // 밀어 넘기던 카드를 그 자리에서 정리합니다 — 자동재생·섞기·언어 전환이 날아가는 중에 눌려도
  // 늦게 도는 넘김(goNext(true))이 새 순서의 카드를 하나 건너뛰지 않게, 지난 등장 방향도 지웁니다.
  const cancelSwipe = () => {
    if (swipeTimer.current) { clearTimeout(swipeTimer.current); swipeTimer.current = null; }
    setLeaving(0); setDragX(0); setEnterFrom(null);
  };

  const startAutoPlay = (random: boolean) => {
    cancelSwipe();
    if (isAutoPlaying) { stopAutoPlay(); return; }
    const sourceWords = reviewFilter ? words.filter((w) => savedIds.includes(w.id)) : words;
    if (sourceWords.length === 0) return;
    const playWords = random ? [...sourceWords].sort(() => Math.random() - 0.5) : [...sourceWords];
    autoRunRef.current += 1;
    quotaHitRef.current = false; // 재생 전에 스피커를 눌러 남은 표시는 지웁니다
    autoRandomRef.current = random; isAutoPlayingRef.current = true;
    setSlideDir(1); setIsAutoRandom(random); setIsAutoPlaying(true); setCurrentIndex(0); setIsFlipped(false);
    setAutoCurrentWord(playWords[0]); requestWakeLock(); runAutoPlay(0, playWords, frontLang);
  };

  const toggleLoop = () => {
    const next = !isLooping; isLoopingRef.current = next; setIsLooping(next);
    toast(next ? "반복 재생 켜짐 🔁" : "반복 재생 꺼짐");
  };

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      if (swipeTimer.current) clearTimeout(swipeTimer.current);
      try { (window as any).AndroidTTS?.stop?.(); } catch(e) {}
      try { speechSynthesis?.cancel?.(); } catch(e) {}
      releaseWakeLock();
    };
  }, []);

  // 옆으로 밀기 — 카드가 손가락을 따라 움직이다가, 놓으면 천천히 밀려 나가고 다음 카드가 들어옵니다
  // (2026-11-11 사용자 요청: "진짜 카드가 넘어가는 느낌"). 방향은 예전 그대로: 오른쪽으로 밀면 다음 카드.
  const handleTouchStart = (e: React.TouchEvent) => {
    if (leaving) return;
    setTouchStart(e.touches[0].clientX);
    touchStartY.current = e.touches[0].clientY;
    swipingRef.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || isAutoPlaying || leaving) return;
    const dx = e.touches[0].clientX - touchStart;
    const dy = e.touches[0].clientY - (touchStartY.current ?? e.touches[0].clientY);
    if (!swipingRef.current) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      swipingRef.current = true;
    }
    // 더 갈 카드가 없는 쪽으로는 조금만 따라오게 합니다
    const canGo = dx > 0 ? currentIndex < displayWords.length - 1 : currentIndex > 0;
    setDragX(canGo ? dx : dx * 0.25);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    setTouchStart(null);
    touchStartY.current = null;
    const wasSwiping = swipingRef.current;
    swipingRef.current = false;
    if (isAutoPlaying || leaving) { setDragX(0); return; }
    const dir: 1 | -1 = diff > 0 ? 1 : -1;
    const canGo = dir > 0 ? currentIndex < displayWords.length - 1 : currentIndex > 0;
    if (Math.abs(diff) > 60 && canGo) {
      setLeaving(dir);
      if (swipeTimer.current) clearTimeout(swipeTimer.current);
      swipeTimer.current = setTimeout(() => {
        swipeTimer.current = null;
        setEnterFrom(dir > 0 ? "left" : "right");
        setLeaving(0);
        setDragX(0);
        if (dir > 0) goNext(true); else goPrev(true);
      }, SWIPE_OUT_MS);
      return;
    }
    if (wasSwiping || dragX !== 0) setDragX(0); // 제자리로 돌아감
  };

  // 기본 단어장 잠금 (무료 → 구독 화면, 성경과 신앙 → 관리자·Special Member 만)
  if (category && category.isShared && !plan.plus) return <Navigate to={PAYWALL_PATH} replace />;
  if (category && category.isShared && !plan.staff && groupOf(category, categories) === "faith") {
    return <Navigate to="/wordbooks" replace />;
  }

  if (!category || words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-body px-4">
        <p className="text-muted-foreground">학습할 단어가 없습니다.</p>
        <button onClick={handleBack} className="mt-4 text-primary underline underline-offset-4">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {isScreenLocked && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "72px" }}>
            <button onClick={() => setIsScreenLocked(false)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 border border-white/40 text-white font-body text-sm">
              <Unlock size={18} /> 잠금 해제
            </button>
          </div>
        </div>
      )}
      <div className="h-14 shrink-0 flex items-center justify-between px-4">
        <button onClick={handleBack} className="w-10 h-10 -ml-2 flex items-center justify-center text-foreground" aria-label="\uB4A4\uB85C">
          <ArrowLeft size={20} />
        </button>
        <span className="font-word text-[0.90625rem] text-[#1D1F1E]">
          {currentIndex + 1} / {displayWords.length}
          {isAutoPlaying && <span className="ml-2 text-[#2C6D63] animate-pulse">{"\u25B6"}</span>}
        </span>
        {isAutoPlaying ? (
          <button onClick={() => setIsScreenLocked(true)} className="w-8 h-10 flex items-center justify-center text-foreground" aria-label="\uD654\uBA74 \uC7A0\uAE08"><Lock size={20} /></button>
        ) : (
          <span className="w-8" />
        )}
      </div>
      <div className="flex-1 flex items-center justify-center px-6 overflow-x-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
        <div
          key={isAutoPlaying ? "autoplay-card" : ((currentWord && currentWord.id) || "empty")}
          className={`perspective w-full max-w-sm aspect-[3/4] cursor-pointer ${
            isAutoPlaying ? "" : enterFrom === "left" ? "card-swipe-in-left" : enterFrom === "right" ? "card-swipe-in-right" : slideDir === 1 ? "card-enter-next" : "card-enter-prev"
          }`}
          style={
            leaving
              ? { transform: "translateX(" + leaving * 118 + "%) rotate(" + leaving * 10 + "deg)", opacity: 0, transition: "transform " + SWIPE_OUT_MS + "ms cubic-bezier(0.45, 0, 0.25, 1), opacity " + SWIPE_OUT_MS + "ms ease-in" }
              : dragX !== 0
                ? { transform: "translateX(" + dragX + "px) rotate(" + (dragX / 24).toFixed(2) + "deg)", transition: "none" }
                : { transition: "transform 0.28s ease-out" }
          }
          onClick={() => { if (!isAutoPlaying && !leaving && dragX === 0) setIsFlipped((f) => !f); }}
        >
          <div className={`relative w-full h-full preserve-3d flip-transition ${isFlipped ? "rotate-y-180" : ""}`}>
            <div className={`${FACE} transition-shadow duration-1000 ${isBreathing ? "animate-breathe" : ""}`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleMark(); }}
                aria-label="\uB2E4\uC2DC \uC678\uC6B8 \uB2E8\uC5B4"
                className={`absolute top-2.5 right-2.5 w-10 h-10 flex items-center justify-center transition-colors ${isMarked ? "text-[#D4A72C]" : "text-[#C2C7CB]"}`}
              >
                <Bookmark size={20} strokeWidth={1.8} fill={isMarked ? "currentColor" : "none"} />
              </button>
              {/* 긴 낱말(mempertanggungjawabkan 등)이 카드·화면 밖으로 나가 잘리지 않게, 자리가 모자라면 낱말 안에서 꺾습니다(U-02).
                  글자 크기는 줄이지 않습니다. overflow-wrap 은 임의값 클래스 대신 인라인 style 로 줍니다 */}
              <p className={`m-0 max-w-full break-words text-center ${frontLang === "id" ? "font-word text-[1.78125rem] font-semibold leading-snug text-[#104B60]" : "font-gothic text-[1.21875rem] font-bold leading-relaxed text-[#1D1F1E]"}`} style={{ overflowWrap: "anywhere" }}>
                {frontLang === "id" ? currentWord?.word : (currentWord ? displayMeaning(currentWord.meaning) : "")}
              </p>
              {frontLang === "id" && currentWord?.example && (
                <p className="mt-4 text-center font-word text-base leading-[1.6] text-[#6B6A63]">{currentWord.example}</p>
              )}
              {frontLang === "ko" && currentWord?.exampleMeaning && (
                <p className="mt-4 text-center font-gothic text-sm leading-relaxed text-[#6B6A63]">{currentWord.exampleMeaning}</p>
              )}
            </div>
            <div className={`${FACE} rotate-y-180`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleMark(); }}
                aria-label="\uB2E4\uC2DC \uC678\uC6B8 \uB2E8\uC5B4"
                className={`absolute top-2.5 right-2.5 w-10 h-10 flex items-center justify-center transition-colors ${isMarked ? "text-[#D4A72C]" : "text-[#C2C7CB]"}`}
              >
                <Bookmark size={20} strokeWidth={1.8} fill={isMarked ? "currentColor" : "none"} />
              </button>
              <p className={`mb-3 max-w-full break-words text-center ${frontLang === "id" ? "font-gothic text-[1.21875rem] font-bold text-[#1D1F1E]" : "font-word text-[1.78125rem] font-semibold leading-snug text-[#104B60]"}`} style={{ overflowWrap: "anywhere" }}>
                {frontLang === "id" ? (currentWord ? displayMeaning(currentWord.meaning) : "") : currentWord?.word}
              </p>
              {frontLang === "id" && currentWord?.exampleMeaning && (
                <p className="text-center font-gothic text-sm leading-relaxed text-[#6B6A63]">{currentWord.exampleMeaning}</p>
              )}
              {frontLang === "ko" && currentWord?.example && (
                <p className="text-center font-word text-base leading-[1.6] text-[#6B6A63]">{currentWord.example}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 pt-3.5 flex justify-center gap-3">
        <button onClick={() => { if (isAutoPlaying) return; cancelSwipe(); setFrontLang((l) => (l === "id" ? "ko" : "id")); setIsFlipped(false); setCurrentIndex(0); }}
          disabled={isAutoPlaying}
          className={`${BTN} ${frontLang === "ko" ? BTN_ON : BTN_OFF}`}>
          <span className="font-word text-sm font-semibold">{frontLang === "id" ? "IN" : "KO"}</span>
        </button>
        <button onClick={() => { cancelSwipe(); setIsRandom((r) => !r); setCurrentIndex(0); setIsFlipped(false); }} disabled={isAutoPlaying}
          className={`${BTN} ${isRandom ? BTN_ON : BTN_OFF}`}>
          <Shuffle size={20} />
        </button>
        <button onClick={() => { if (!currentWord) return; usedSpeakerRef.current = true; const { text, lang } = getSpeakTarget(currentWord, isFlipped); speak(text, lang); }}
          disabled={!currentWord || isAutoPlaying}
          className={`${BTN} ${BTN_OFF}`}>
          <Volume2 size={20} />
        </button>
        <button onClick={handleToggleFilter} disabled={isAutoPlaying}
          className={`${BTN} ${reviewFilter ? BTN_ON : BTN_OFF}`}>
          <Bookmark size={20} fill={reviewFilter ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="shrink-0 pt-3.5 pb-[30px] flex items-center justify-center gap-3">
        <button onClick={() => goPrev()} disabled={currentIndex === 0 || isAutoPlaying}
          className={`${BTN} ${BTN_OFF}`}>
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => startAutoPlay(false)}
          className={`${BTN} ${isAutoPlaying && !isAutoRandom ? BTN_ON : BTN_OFF}`}>
          {isAutoPlaying && !isAutoRandom ? <Square size={18} /> : <Play size={20} fill="currentColor" strokeWidth={0} />}
        </button>
        <button onClick={toggleLoop}
          className={`${BTN} ${isLooping ? BTN_ON : BTN_OFF}`}>
          <RefreshCw size={20} />
        </button>
        <button onClick={() => startAutoPlay(true)}
          className={`${BTN} ${isAutoPlaying && isAutoRandom ? BTN_ON : BTN_OFF}`}>
          {isAutoPlaying && isAutoRandom ? <Square size={18} /> : <Shuffle size={20} />}
        </button>
        <button onClick={() => goNext()} disabled={currentIndex === displayWords.length - 1 || isAutoPlaying}
          className={`${BTN} ${BTN_OFF}`}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
