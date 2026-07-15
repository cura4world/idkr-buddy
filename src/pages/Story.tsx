import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Volume2, Loader2, Plus, Check, BookOpen, X } from "lucide-react";
import { toast } from "sonner";
import { generateStory, quickLookupWord, StoryDifficulty } from "@/lib/story";
import { saveStory, listStories, StoryRecord } from "@/lib/storyStore";
import { addWord } from "@/lib/store";
import { hasGeminiApiKey } from "@/lib/gemini";

const MY_WORDBOOK_ID = "my-wordbook";
const DIFF_KEY = "story-difficulty";
const DIFFS: StoryDifficulty[] = ["하", "중", "상"];

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

const Story = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [difficulty, setDifficulty] = useState<StoryDifficulty>(() => {
    const v = localStorage.getItem(DIFF_KEY);
    return v === "하" || v === "중" || v === "상" ? v : "중";
  });
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState<StoryRecord | null>(null);
  const [flipped, setFlipped] = useState(false);

  // 단어 미니 팝업
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState(""); // 단어장 저장용 (표시 안 함)
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);

  useEffect(() => {
    listStories().then((all) => {
      setStories(all);
      // 사전에서 "이야기로" 버튼으로 돌아온 경우, 보던 이야기 카드를 다시 연다
      try {
        const rid = sessionStorage.getItem("story-return-id");
        if (rid) {
          sessionStorage.removeItem("story-return-id");
          const found = all.find((s) => s.id === rid);
          if (found) { setCurrent(found); setFlipped(false); }
        }
      } catch (e) {}
    });
  }, []);

  const pickDifficulty = (d: StoryDifficulty) => {
    setDifficulty(d);
    try { localStorage.setItem(DIFF_KEY, d); } catch {}
  };

  const handleGenerate = async () => {
    if (generating) return;
    if (!hasGeminiApiKey()) {
      toast("Gemini API 키가 필요합니다. 설정에서 입력해주세요");
      return;
    }
    setGenerating(true);
    try {
      const recent = stories.slice(0, 10).map((s) => s.titleKo || s.title);
      const data = await generateStory(difficulty, recent);
      const rec = await saveStory(data);
      setStories((prev) => [rec, ...prev]);
      setCurrent(rec);
      setFlipped(false);
    } catch (e: any) {
      const code = e?.message || "";
      if (code === "RATE_LIMIT") toast("요청이 많습니다. 잠시 후 다시 시도해주세요");
      else if (code === "NO_API_KEY" || code === "INVALID_API_KEY") toast("API 키를 설정에서 확인해주세요");
      else toast("이야기 생성에 실패했습니다. 다시 시도해주세요");
    } finally {
      setGenerating(false);
    }
  };

  // 단어 탭 → 미니 팝업 (문맥 문장과 함께 조회)
  const openWordPopup = (rawToken: string, sentence: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    setPopupMeaning("");
    setPopupInfo("");
    setPopupSentenceKo("");
    setPopupSaved(false);
    setPopupLoading(true);
    quickLookupWord(word, sentence)
      .then((r) => {
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
    try { if (current) sessionStorage.setItem("story-return-id", current.id); } catch (e) {}
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=story");
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning) return;
    addWord({
      word: popupWord,
      meaning: popupMeaning,
      example: popupSentence,
      exampleMeaning: popupSentenceKo,
      categoryId: MY_WORDBOOK_ID,
    });
    setPopupSaved(true);
    toast("내 단어장에 저장되었습니다");
  };

  // 인니어 본문을 문단→문장→단어로 쪼개 탭 가능하게 렌더링
  const renderIndonesian = (text: string) => {
    const paragraphs = text.split(new RegExp("\\n{2,}")).filter((p) => p.trim());
    return paragraphs.map((para, pi) => {
      const sentences = para.split(new RegExp("(?<=[.!?])\\s+")).filter(Boolean);
      return (
        <p key={pi} className="mb-4 text-base leading-relaxed font-word text-gray-900">
          {sentences.map((sent, si) => (
            <span key={si}>
              {sent.split(" ").map((tok, ti) => (
                <span key={ti}>
                  <span
                    onClick={(e) => { e.stopPropagation(); openWordPopup(tok, sent); }}
                    className="cursor-pointer rounded active:bg-primary/20"
                  >
                    {tok}
                  </span>{" "}
                </span>
              ))}
            </span>
          ))}
        </p>
      );
    });
  };

  const renderKorean = (text: string) =>
    text.split(new RegExp("\\n{2,}")).filter((p) => p.trim()).map((para, i) => (
      <p key={i} className="mb-4 text-sm leading-relaxed text-gray-800 font-body">{para}</p>
    ));

  // ---------- 카드 뷰 ----------
  if (current) {
    return (
      <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
        <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { setCurrent(null); setFlipped(false); setPopupWord(null); }}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="목록으로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold truncate">{current.titleKo || current.title}</h1>
        </header>

        <div className="px-4 py-4">
          <div
            className="bg-card border border-border/60 rounded-xl pl-5 pr-2 py-5 min-h-[72vh] content-bump select-none flex gap-2"
          >
            <div className="flex-1 min-w-0">
            {!flipped ? (
              <>
                {/* 앞면: 인니어 본문 */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">{current.category}</span>
                  <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">난이도 {current.difficulty}</span>
                </div>
                <div className="mb-3 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">{current.title}</h2>
                </div>
                {renderIndonesian(current.indonesian)}
              </>
            ) : (
              <>
                {/* 뒷면: 한국어 번역 + 단어 학습 */}
                <h2 className="text-lg font-bold text-gray-900 break-words mb-3">{current.titleKo}</h2>
                {renderKorean(current.korean)}
                {current.hardWords.length > 0 && (
                  <>
                    <div className="border-t border-gray-200 my-4" />
                    <ul className="space-y-1.5 text-sm text-gray-800 font-gothic">
                      {current.hardWords.map((h, i) => (
                        <li key={i} className="flex gap-2 min-w-0 items-center">
                          <span className="text-gray-400">•</span>
                          <span className="min-w-0 break-words">
                            <span className="font-semibold text-gray-900">{h.word}</span>{" "}
                            <span className="text-xs">{h.meaning}</span>
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); speak(h.word, "id"); }}
                            className="shrink-0 text-primary/70 hover:text-primary"
                            title="발음 듣기"
                          >
                            <Volume2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
            </div>
            {/* 뒤집기 바 */}
            <button
              onClick={(e) => { e.stopPropagation(); setFlipped((f) => !f); }}
              className="shrink-0 w-2 self-stretch rounded-full bg-primary/15 active:bg-primary/40"
              aria-label="카드 뒤집기"
              title="카드 뒤집기"
            />
          </div>
          <p className="text-center text-white/50 text-xs mt-3">
            {flipped ? "오른쪽 바를 누르면 원문이 보입니다" : "오른쪽 바를 누르면 해석, 단어를 탭하면 뜻이 나옵니다"}
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
      </div>
    );
  }

  // ---------- 리스트 뷰 ----------
  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold truncate">인도네시아 이야기</h1>
      </header>

      <div className="px-4 py-4">
        {/* 난이도 + 만들기 */}
        <div className="bg-card border border-border/60 rounded-xl px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 shrink-0">난이도</span>
            <div className="flex gap-1.5">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  onClick={() => pickDifficulty(d)}
                  className={`rounded-full px-3.5 py-1 text-sm font-medium ${
                    difficulty === d ? "bg-primary text-white" : "bg-black/5 text-gray-600"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-3 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium bg-primary text-white disabled:opacity-60"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> 이야기를 짓고 있어요...</>
            ) : (
              <><Sparkles size={16} /> 이야기 만들기</>
            )}
          </button>
        </div>

        {/* 지난 이야기 */}
        {stories.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs text-white mb-2 px-1 font-gothic">지난 이야기</p>
            <ul className="space-y-2">
              {stories.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setCurrent(s); setFlipped(false); }}
                    className="w-full text-left bg-card border border-border/60 rounded-xl px-4 py-3 min-w-0"
                  >
                    <p className="text-sm font-semibold text-gray-900 break-words font-word">{s.title}</p>
                    <p className="text-xs text-gray-500 break-words mt-0.5 font-gothic">{s.titleKo}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">{s.category}</span>
                      <span className="text-[11px] font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">난이도 {s.difficulty}</span>
                      <span className="text-[11px] text-gray-400 ml-auto">{fmtDate(s.createdAt)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 text-white/60">
            <BookOpen size={30} className="mx-auto mb-3 opacity-60" />
            <p className="text-sm">첫 이야기를 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Story;
