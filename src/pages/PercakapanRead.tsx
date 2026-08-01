// src/pages/PercakapanRead.tsx
// 회화 한 편 읽기 (/percakapan/:id).
// 인도네시아어와 한국어를 뒤집지 않고 한 줄씩 위아래로 같이 보여줍니다 (플립 없음).
// 전체 듣기는 남/여 두 목소리로, 줄 오른쪽 스피커는 그 문장 하나만 읽습니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Pause, Loader2, Volume2, Plus, Check, X, Maximize2, Minimize2 } from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { findScene } from "@/lib/percakapan";
import type { PercakapanScene, PercakapanSpeaker } from "@/lib/percakapan";
import { percakapanAudioPlayer } from "@/lib/percakapanAudio";
import type { PcAudioSnapshot } from "@/lib/percakapanAudio";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";

const MY_WORDBOOK_ID = "my-wordbook";

// 화자 배지 색. A / B / C 를 한눈에 구분하기 위한 것입니다.
const BADGE: Record<string, string> = {
  A: "bg-primary/15 text-primary",
  B: "bg-sky-500/15 text-sky-600",
  C: "bg-amber-500/15 text-amber-600",
};

const badgeClass = (s: PercakapanSpeaker): string => BADGE[s] || BADGE.A;

const PercakapanRead = () => {
  const navigate = useNavigate();
  const { widthClass, canWide, wide, toggle } = useWideMode();
  const location = useLocation();
  const params = useParams();
  const id = params.id || "";

  const [scene, setScene] = useState<PercakapanScene | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      navigate("/percakapan", { replace: true });
      return;
    }
    findScene(id)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          navigate("/percakapan", { replace: true });
          return;
        }
        setScene(s);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        navigate("/percakapan", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

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
  const [lastErr, setLastErr] = useState(0);
  useEffect(() => {
    if (!snap.errorAt || snap.errorAt === lastErr) return;
    setLastErr(snap.errorAt);
    toast.error("음성을 불러오지 못했습니다");
  }, [snap.errorAt, lastErr]);

  // 단어 탭 → 미니 팝업
  // 조회 순서: 화면 메모리 캐시 → 폰 저장소(IndexedDB) → Gemini API
  const openWordPopup = async (rawToken: string, sentence: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    // 이미 내 단어장에 있는 단어면 처음부터 "저장됨"으로 표시
    setPopupSaved(hasWordInCategory(MY_WORDBOOK_ID, word));

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

  // 회화집은 주소(/percakapan/:id)만으로 돌아오므로 복귀 id 를 따로 저장하지 않습니다.
  // setState 없이 navigate 만 부릅니다.
  const openInDictionary = () => {
    if (!popupWord) return;
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=percakapan");
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

  // 인니어 한 줄을 단어 단위로 쪼개 탭 가능하게 렌더링
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

  const mineAll = !!scene && snap.sceneId === scene.id && snap.lineIndex === null;
  const allLabel = mineAll
    ? snap.state === "loading"
      ? "준비 중..."
      : snap.state === "playing"
      ? "일시정지"
      : snap.state === "paused"
      ? "이어 듣기"
      : "전체 듣기"
    : "전체 듣기";

  const rolesLine = scene
    ? "A " +
      scene.roles.A +
      " · B " +
      scene.roles.B +
      (scene.roles.C ? " · C " + scene.roles.C : "")
    : "";

  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background pb-9"}>
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
            <h1 className="truncate text-base font-semibold leading-tight">
              {scene ? scene.title : "회화집"}
            </h1>
            <p className="mt-0.5 truncate font-word text-[0.71875rem] text-muted-foreground">
              {scene ? scene.titleId : ""}
            </p>
          </div>
          {scene ? (
            <button
              type="button"
              onClick={() => percakapanAudioPlayer.playAll(scene)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[0.78125rem] font-gothic text-foreground/80 active:bg-muted"
            >
              {mineAll && snap.state === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : mineAll && snap.state === "playing" ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
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
        {rolesLine ? (
          <p className="mt-1.5 pl-[2.25rem] truncate font-gothic text-[0.71875rem] text-muted-foreground">
            {rolesLine}
          </p>
        ) : null}
      </header>

      <div className="px-4 py-4">
        {loading || !scene ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {scene.lines.map((l, i) => {
              const active = snap.sceneId === scene.id && snap.lineIndex === i;
              return (
                <div
                  key={i}
                  className={
                    "flex items-start gap-2.5 px-4 py-3 " +
                    (i === scene.lines.length - 1 ? "" : "border-b border-border ") +
                    (active ? "bg-muted/50" : "")
                  }
                >
                  <span
                    className={
                      "mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[0.65625rem] font-gothic font-semibold " +
                      badgeClass(l.s)
                    }
                  >
                    {l.s}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-word text-[0.96875rem] leading-snug text-foreground">
                      {renderTokens(l.id, i + "-")}
                    </p>
                    <p className="mt-0.5 font-gothic text-[0.78125rem] leading-snug text-muted-foreground">
                      {l.ko}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => percakapanAudioPlayer.playLine(scene, i)}
                    className="shrink-0 -mr-1 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                    title="이 문장 듣기"
                    aria-label="이 문장 듣기"
                  >
                    {active && snap.state === "loading" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Volume2 size={15} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
};

export default PercakapanRead;
