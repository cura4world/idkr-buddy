// src/pages/PercakapanRead.tsx
// 회화 한 편 읽기 (/percakapan/:id).
// 인도네시아어와 한국어를 뒤집지 않고 한 줄씩 위아래로 같이 보여줍니다 (플립 없음).
// 전체 듣기는 남/여 두 목소리로, 줄 오른쪽 스피커는 그 문장 하나만 읽습니다.
// 시안: PC3-Read (청록 스피커, 전체 듣기 중에는 지금 읽는 줄을 연한 바탕 + 왼쪽 청록 막대로 표시).
// 공개판 무료: 기본 회화집은 Plus 기능이라 구독 화면으로 보냅니다. 직접 만든 회화집은 계속 읽힙니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Pause, Loader2, Volume1, Maximize2, Minimize2 } from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { findScene } from "@/lib/percakapan";
import type { PercakapanScene, PercakapanSpeaker } from "@/lib/percakapan";
import { percakapanAudioPlayer } from "@/lib/percakapanAudio";
import type { PcAudioSnapshot } from "@/lib/percakapanAudio";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, lookupFailText } from "@/lib/store";
import { lastQuotaNotice } from "@/lib/aiProxy";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import WordMiniSheet from "@/components/WordMiniSheet";
import { medaliEngine } from "@/lib/medali";
import PointFloat from "@/components/PointFloat";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";
import { cleanPhrase, useSelectedPhrase } from "@/lib/phraseSelect";
import { headwordInSentence } from "@/lib/dictionary";

// 단어 팝업의 발음 듣기 — 다른 화면과 같은 방식(AndroidTTS 우선, 없으면 speechSynthesis).
// 공개판에서는 AndroidTTS 자리에 storeTtsShim 이 있어 낱말은 폰 내장 음성으로 읽습니다.
const speakWord = (text: string) => {
  const t = String(text || "").trim();
  if (!t) return;
  const w = window as any;
  if (w.AndroidTTS) {
    try { w.AndroidTTS.speak(t, "id-ID"); } catch (e) {}
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "id-ID";
    u.rate = 0.9;
    speechSynthesis?.cancel?.();
    setTimeout(() => { try { speechSynthesis?.speak?.(u); } catch (e) {} }, 150);
  } catch (e) {}
};
import PhraseFindBar from "@/components/PhraseFindBar";
import AiReportButton from "@/components/AiReportButton";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { isBackCloseEntry } from "@/hooks/useBackClose";

const TEAL = "#2C6D63";
const CARD_STYLE = { background: "#FFFFFF", borderRadius: 18, boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

// 화자 배지 색 (시안 PC3). A / B / C 를 한눈에 구분하기 위한 것입니다.
const BADGE: Record<string, { bg: string; fg: string }> = {
  A: { bg: "#E2F1EC", fg: "#2C6D63" },
  B: { bg: "#FCEFD9", fg: "#8C5A12" },
  C: { bg: "#E4EEF6", fg: "#2B5F86" },
};

const badgeOf = (s: PercakapanSpeaker) => BADGE[s] || BADGE.A;

const voiceText = (g: string | undefined) => (g === "f" ? "여자 목소리" : "남자 목소리");

const PercakapanRead = () => {
  const navigate = useNavigate();
  const { widthClass, canWide, wide, toggle } = useWideMode();
  const location = useLocation();
  const params = useParams();
  const id = params.id || "";
  const plan = usePlan();

  const [scene, setScene] = useState<PercakapanScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [snap, setSnap] = useState<PcAudioSnapshot>(() =>
    percakapanAudioPlayer.getSnapshot()
  );

  // 단어 미니 팝업 (이야기 화면과 같은 방식)
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState(""); // 단어장 저장용 (표시 안 함)
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  // 이 회화집을 보는 동안 눌러본 단어는 즉시 표시 (화면을 나가면 리셋)
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

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      navigate("/percakapan", { replace: true });
      return;
    }
    // 없는 회화집이거나 이 등급에 안 보이는 회화집(교회와 신앙 — findScene 이 null)이면
    // "볼 수 없는 회화집" 화면을 그립니다. 이동은 그 화면의 버튼으로만 합니다
    // (setState 와 navigate 를 같이 부르지 않기 위해서입니다).
    findScene(id)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setNotFound(false);
        setScene(s);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, plan.tier]);

  // ---------- 등급 확인 ----------
  // 무료: 기본 회화집은 잠김 → 안내 + 구독 화면. (setState 없이 이동만 합니다)
  useEffect(() => {
    if (!scene) return;
    if (!plan.plus && !scene.custom) {
      toast("회화집은 Plus 회원 기능입니다");
      navigate(PAYWALL_PATH, { replace: true });
    }
  }, [scene, plan.plus, navigate]);

  // ---------- 돌아올 자리로 되돌리기 ----------
  // 어느 회화집이었는지는 주소(/percakapan/:id)로 저절로 돌아오므로 스크롤만 챙깁니다.
  // 본문이 그려진 뒤 한 번만 실행합니다. 표가 없으면 아무것도 하지 않습니다.
  const restoreTriedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (restoreTriedRef.current) return;
    restoreTriedRef.current = true;
    const t = takeReturnTicket("percakapan");
    if (!t || t.key !== id) return;
    return restoreScrollTo(t.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, id]);

  useEffect(() => {
    return percakapanAudioPlayer.subscribe((s) => setSnap(s));
  }, []);

  // 화면을 벗어나면 소리를 끕니다
  useEffect(() => {
    return () => {
      try {
        percakapanAudioPlayer.stop();
      } catch (e) {}
    };
  }, []);

  // 재생 오류 알림
  // 들어올 때 이미 있던 오류 시각에서 시작합니다 — 0 에서 시작하면 예전 화면에서 난 오류가
  // 이 화면에 들어올 때마다 누르지도 않았는데 다시 떴습니다(출시 전 점검 C-09).
  const [lastErr, setLastErr] = useState(() => percakapanAudioPlayer.getSnapshot().errorAt);
  useEffect(() => {
    if (!snap.errorAt || snap.errorAt === lastErr) return;
    setLastErr(snap.errorAt);
    toast.error("소리를 불러오지 못했습니다");
  }, [snap.errorAt, lastErr]);

  // ---------- 회화 완주 점수 ----------
  // "전체 듣기"가 끝까지 재생되면 onended → stop() 으로
  // (재생 중 && 이 회화 && 전체 재생) → idle 로 바뀝니다.
  // 오류로 끊긴 경우(errorAt 변화)는 완주로 보지 않습니다.
  const [floatVal, setFloatVal] = useState(0);
  const [floatSeq, setFloatSeq] = useState(0);
  const prevSnapRef = useRef<PcAudioSnapshot>(snap);
  const paidScenesRef = useRef(new Set<string>());

  useEffect(() => {
    const prev = prevSnapRef.current;
    prevSnapRef.current = snap;
    if (!scene) return;
    const wasFullPlaying =
      prev.state === "playing" && prev.sceneId === scene.id && prev.lineIndex === null;
    if (!wasFullPlaying) return;
    if (snap.state !== "idle") return;
    if (snap.errorAt !== prev.errorAt) return;
    if (paidScenesRef.current.has(scene.id)) return;   // 같은 회화는 1회만
    paidScenesRef.current.add(scene.id);
    medaliEngine
      .addPoints("percakapan", 3)
      .then((got) => {
        if (got > 0) {
          setFloatVal(got);
          setFloatSeq((n) => n + 1);
        }
      })
      .catch(() => {});
  }, [snap, scene]);

  const mineAll = !!scene && snap.sceneId === scene.id && snap.lineIndex === null;

  // 무료에게 잠긴 기본 회화인가. 위 useEffect 가 구독 화면으로 보내지만 그 전에 한 번은 그려지므로,
  // 그리는 쪽에서도 본문·듣기 단추·화자 안내를 내지 않습니다(출시 전 점검 E-09).
  const locked = !!scene && !plan.plus && !scene.custom;

  // ---------- 전체 듣기 중 지금 읽는 줄 짐작 ----------
  // 전체 듣기는 소리 파일 하나라 줄 경계를 모릅니다. 재생 위치(비율)를 줄마다의 글자 수
  // (+ 줄 사이 쉼 몫)로 나눠 지금 줄을 짐작합니다. 정확한 시각이 아니라 눈으로 따라가는 표시입니다.
  const [estLine, setEstLine] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!scene || !mineAll || (snap.state !== "playing" && snap.state !== "paused")) {
      setEstLine(null);
      return;
    }
    const weights = scene.lines.map((l) => l.id.length + 14);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const tick = () => {
      const p = percakapanAudioPlayer.progress();
      if (!p) return;
      const target = (p.time / p.duration) * total;
      let acc = 0;
      let idx = weights.length - 1;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (target < acc) {
          idx = i;
          break;
        }
      }
      setEstLine((prev) => (prev === idx ? prev : idx));
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [scene, mineAll, snap.state]);

  // 읽는 줄이 화면 밖으로 나가면 살짝 따라갑니다
  useEffect(() => {
    if (estLine === null) return;
    const el = rowRefs.current[estLine];
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight - 20) {
      try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch (e) {}
    }
  }, [estLine]);

  // 본문에서 고른 표현 찾기
  const { phrase: selPhrase, take: takeSelPhrase } = useSelectedPhrase();

  const openPhrasePopup = () => {
    const s = takeSelPhrase();
    if (!s.phrase) return;
    openWordPopup(s.phrase, s.sentence);
  };

  // 단어 탭 → 미니 팝업
  // 조회 순서: 화면 메모리 캐시 → 폰 저장소(IndexedDB) → Gemini API
  const openWordPopup = async (rawToken: string, sentence: string) => {
    // 글자를 고르는 중이면 팝업을 열지 않습니다
    const liveSel = window.getSelection();
    if (liveSel && !liveSel.isCollapsed) return;
    // 문장 첫머리라서 대문자인 낱말만 소문자로(Saya → saya). 문장 가운데의 사람 이름 등은 그대로.
    const word = headwordInSentence(cleanPhrase(rawToken), sentence);
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    // 이미 내 단어장에 있는 단어면 처음부터 "저장됨"으로 표시
    setPopupSaved(!!saveTargetId && hasWordInCategory(saveTargetId, word));

    // 1) 이 화면에서 이미 찾아본 단어
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

    // 2) 폰에 저장된 단어 (예전에 다른 글에서 찾아본 것)
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
      .catch((err) => {
        // 한도 초과면 "다시 눌러 주세요" 대신 한도 안내를 보입니다(다시 눌러도 같은 답)
        if (popupReqId.current === reqId) setPopupMeaning(lookupFailText(err, lastQuotaNotice()));
      })
      .finally(() => {
        if (popupReqId.current === reqId) setPopupLoading(false);
      });
  };

  // 회화집은 주소(/percakapan/:id)만으로 돌아오므로 어느 글이었는지는 표에 기대지 않습니다.
  // 읽던 자리(스크롤)만 표로 한 장 적어 둡니다. setState 없이 navigate 만 부릅니다.
  // 단어 팝업이 히스토리를 쌓지 않는 화면이라 replace 는 주지 않습니다.
  const openInDictionary = () => {
    if (!popupWord) return;
    writeReturnTicket("percakapan", id, currentScrollY(), false);
    // 단어 시트가 뒤로가기용으로 쌓은 칸은 사전 화면으로 바꿔 끼웁니다(사전에서 한 번 뒤로 = 이 회화).
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=percakapan", { replace: isBackCloseEntry() });
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

  // 인니어 한 줄을 단어 단위로 쪼개 탭 가능하게 렌더링
  const renderTokens = (text: string, keyPrefix: string) =>
    text.split(" ").map((tok, ti) => (
      <span key={keyPrefix + ti} data-idw="1">
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-primary/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

  const allLabel = mineAll
    ? snap.state === "loading"
      ? "준비 중..."
      : snap.state === "playing"
      ? "일시정지"
      : snap.state === "paused"
      ? "이어 듣기"
      : "전체 듣기"
    : "전체 듣기";

  const roleItems: { s: PercakapanSpeaker; text: string }[] = scene && !locked
    ? [
        { s: "A" as PercakapanSpeaker, text: scene.roles.A + " · " + voiceText(scene.voices ? scene.voices.A : "m") },
        { s: "B" as PercakapanSpeaker, text: scene.roles.B + " · " + voiceText(scene.voices ? scene.voices.B : "f") },
      ].concat(
        scene.roles.C
          ? [{ s: "C" as PercakapanSpeaker, text: scene.roles.C + " · " + voiceText(scene.voices ? scene.voices.A : "m") }]
          : []
      )
    : [];

  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background pb-9"}>
      <PointFloat value={floatVal} seq={floatSeq} />
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              goBackOr(navigate, location.key, scene ? "/percakapan/c/" + scene.cat : "/percakapan")
            }
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            {/* 긴 제목은 자르지 않고 두 줄까지 보입니다(U-04). 글자 크기는 그대로 */}
            <h1 className="line-clamp-2 break-words text-base font-semibold leading-tight">
              {scene ? scene.title : "회화집"}
            </h1>
            <p className="mt-px truncate font-word text-[0.75rem]" style={{ color: "#646C72" }}>
              {scene ? scene.titleId : ""}
            </p>
          </div>
          {scene && !locked ? (
            <button
              type="button"
              onClick={() => percakapanAudioPlayer.playAll(scene)}
              className="shrink-0 -mr-1 h-9 px-[13px] rounded-full inline-flex items-center gap-[5px] font-gothic text-[0.78125rem] font-semibold active:opacity-85"
              style={{ background: TEAL, color: "#FFFFFF" }}
            >
              {mineAll && snap.state === "loading" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : mineAll && snap.state === "playing" ? (
                <Pause size={13} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={13} fill="currentColor" strokeWidth={0} />
              )}
              {allLabel}
            </button>
          ) : null}
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
        </div>
      </header>

      {/* 화자 안내: A 손님 · 여자 목소리 | B 점원 · 남자 목소리 */}
      {roleItems.length > 0 ? (
        <div className="px-4 pt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-gothic text-[0.78125rem]" style={{ color: "#646C72" }}>
          {roleItems.map((r, i) => (
            <span key={r.s} className="flex items-center gap-2 min-w-0">
              {i > 0 ? <span style={{ color: "#D5DCDF" }}>|</span> : null}
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[0.65625rem] font-bold shrink-0"
                  style={{ background: badgeOf(r.s).bg, color: badgeOf(r.s).fg }}
                >
                  {r.s}
                </span>
                <span className="truncate">{r.text}</span>
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="px-4 pt-3 pb-6">
        {notFound ? (
          <div className="px-4 py-10 text-center" style={CARD_STYLE}>
            <p className="text-[0.9375rem]" style={{ color: "#1D1F1E" }}>볼 수 없는 대화입니다</p>
            <p className="mt-1 font-gothic text-[0.78125rem]" style={{ color: "#646C72" }}>
              지워졌거나 이 계정에서는 열리지 않는 대화입니다
            </p>
            <button
              type="button"
              onClick={() => navigate("/percakapan", { replace: true })}
              className="mt-4 h-10 px-4 rounded-full font-gothic text-[0.8125rem] font-semibold"
              style={{ background: "#E3EEEC", color: TEAL }}
            >
              회화집 목록으로
            </button>
          </div>
        ) : loading || !scene ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중...
          </div>
        ) : locked ? (
          // 잠긴 기본 회화: 본문을 그리지 않습니다. 곧 구독 화면으로 넘어갑니다(위 useEffect).
          <div className="py-16" />
        ) : (
          <>
            <div className="overflow-hidden" style={CARD_STYLE}>
              {scene.lines.map((l, i) => {
                const lineMine = snap.sceneId === scene.id && snap.lineIndex === i;
                const active = lineMine || (mineAll && estLine === i);
                const b = badgeOf(l.s);
                return (
                  <div
                    key={i}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    className="relative flex items-start gap-3"
                    style={{
                      padding: "14px 10px 14px 16px",
                      background: active ? "#F4F8F7" : undefined,
                      borderBottom: i === scene.lines.length - 1 ? "0" : "1px solid #EEF1F3",
                    }}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 w-[3px] rounded-sm"
                        style={{ top: 10, bottom: 10, background: TEAL }}
                      />
                    ) : null}
                    <span
                      className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-gothic text-[0.71875rem] font-bold"
                      style={{ background: b.bg, color: b.fg }}
                    >
                      {l.s}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-word text-[1.03125rem] leading-[1.5] break-words"
                        style={{ color: active ? "#104B60" : "#1D1F1E" }}
                      >
                        {renderTokens(l.id, i + "-")}
                      </p>
                      <p className="mt-[3px] font-gothic text-[0.8125rem] leading-[1.5]" style={{ color: "#646C72" }}>
                        {l.ko}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => percakapanAudioPlayer.playLine(scene, i)}
                      className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center"
                      style={active ? { background: TEAL, color: "#FFFFFF" } : { color: TEAL }}
                      title="이 문장 듣기"
                      aria-label="이 문장 듣기"
                    >
                      {lineMine && snap.state === "loading" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Volume1 size={15} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {/* 직접 만든 회화(AI 가 만든 대화)에만 신고 단추 — 스토어 앱(공개판)에서만 보입니다(2026-11-14 P-05) */}
            {scene.custom ? (
              <div className="mt-3 flex justify-center">
                <AiReportButton
                  feature="percakapan"
                  input={scene.title}
                  output={scene.lines.map((l) => l.id + " / " + l.ko).join("\n")}
                  className="flex flex-col items-center"
                />
              </div>
            ) : null}
          </>
        )}
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
          onClose={() => setPopupWord(null)}
          onSave={savePopupWord}
          onPickTarget={openWbPicker}
          onDictionary={openInDictionary}
          onSpeak={() => speakWord(popupWord)}
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
    </div>
  );
};

export default PercakapanRead;
