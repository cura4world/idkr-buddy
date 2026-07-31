import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Volume2, Loader2, RotateCcw, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { getPhraseDetail, PhraseDetail as PhraseDetailData } from "@/lib/phrase";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { fetchChapterKo, getBook } from "@/lib/bible";
import { hasGeminiApiKey } from "@/lib/gemini";
import SettingsDialog from "@/components/SettingsDialog";

const MY_WORDBOOK_ID = "my-wordbook";

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

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
    {children}
  </p>
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

  const load = useCallback(async (force = false, koHint?: string) => {
    setLoading(true);
    setError("");
    try {
      const d = await getPhraseDetail(item.id, koHint !== undefined ? koHint : item.ko, force);
      setData(d);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg === "NO_API_KEY" || msg === "INVALID_API_KEY") setError("API_KEY");
      else if (msg === "RATE_LIMIT") setError("잠시 뒤에 다시 시도해 주세요");
      else setError("설명을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [item.id, item.ko]);

  useEffect(() => {
    if (!item.id) {
      setLoading(false);
      setError("문장을 찾을 수 없어요");
      return;
    }
    if (!hasGeminiApiKey()) {
      setLoading(false);
      setError("API_KEY");
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

  // 조회 순서: 화면 캐시 → 폰 저장소(IndexedDB) → Gemini API
  const openWordPopup = async (rawToken: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
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

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning) return;
    const { added } = addWordIfAbsent({
      word: popupWord,
      meaning: popupMeaning,
      example: item.id,
      exampleMeaning: popupSentenceKo || item.ko,
      categoryId: MY_WORDBOOK_ID,
    });
    setPopupSaved(true);
    toast(added ? "내 단어장에 저장되었습니다" : "이미 내 단어장에 있는 단어입니다");
  };

  // 표제 문장을 단어 단위로 쪼개 탭 가능하게 렌더링
  const renderTokens = (text: string) =>
    text.split(" ").map((tok, ti) => (
      <span key={"t" + ti}>
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok); }}
          className="cursor-pointer rounded active:bg-primary/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-10">
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

      <div className="px-4 pt-5">
        {/* 문장 */}
        <div className="rounded-2xl border border-border bg-card px-4 py-5">
          <div className="flex items-start gap-2">
            <p
              className={
                "flex-1 font-word font-medium text-foreground " +
                (isAyat ? "text-[17px] leading-[1.65]" : "text-[19px] leading-[1.5]")
              }
            >
              {renderTokens(item.id)}
            </p>
            <button
              onClick={() => speak(item.id, "id")}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-primary active:bg-muted"
              title="발음 듣기"
            >
              <Volume2 size={18} />
            </button>
          </div>
          {item.ko ? (
            <p className="mt-2.5 text-[13.5px] leading-[1.65] text-muted-foreground">{item.ko}</p>
          ) : null}
          {refLabel ? (
            <p className="mt-3 font-word text-[13.5px] text-muted-foreground">{refLabel}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <Loader2 size={22} className="mx-auto mb-2.5 animate-spin text-primary" />
            <p className="text-sm font-gothic text-muted-foreground">설명을 만드는 중이에요...</p>
          </div>
        ) : error === "API_KEY" ? (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="mb-4 text-sm font-gothic text-foreground">설명을 보려면 Gemini API 키가 필요해요</p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white"
            >
              설정 열기
            </button>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="mb-4 text-sm font-gothic text-foreground">{error}</p>
            <button
              onClick={() => load(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white"
            >
              <RotateCcw size={14} /> 다시 시도
            </button>
          </div>
        ) : data ? (
          <>
            {isAyat ? (
              koVerse ? (
                <section className="mt-5">
                  <Label>어떤 뜻인가요</Label>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
                    <p className="font-gothic text-[13.5px] leading-[1.45] text-foreground/85">{koVerse}</p>
                    <p className="mt-2.5 text-[11.5px] font-gothic text-muted-foreground">
                      {koRefLabel ? koRefLabel + " · 새번역" : "새번역"}
                    </p>
                  </div>
                </section>
              ) : null
            ) : data.meaning ? (
              <section className="mt-5">
                <Label>어떤 뜻인가요</Label>
                <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
                  <p className="font-gothic text-[13px] leading-[1.45] text-foreground/85">{data.meaning}</p>
                </div>
              </section>
            ) : null}

            {data.examples.length > 0 ? (
              <section className="mt-5">
                <Label>이렇게 씁니다</Label>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {data.examples.map((ex, i) => (
                    <div
                      key={i}
                      className={
                        "px-4 py-4 " + (i === data.examples.length - 1 ? "" : "border-b border-border")
                      }
                    >
                      {ex.situasi ? (
                        <p className="mb-2 text-[11.5px] font-gothic font-semibold text-muted-foreground">
                          {ex.situasi}
                        </p>
                      ) : null}
                      <div className="flex items-start gap-2">
                        <p className="flex-1 font-word text-[15px] leading-[1.6] text-foreground">
                          {ex.id}
                        </p>
                        <button
                          onClick={() => speak(ex.id, "id")}
                          className="mt-0.5 shrink-0 text-muted-foreground active:text-primary"
                          title="발음 듣기"
                        >
                          <Volume2 size={15} />
                        </button>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-[1.6] text-muted-foreground">{ex.ko}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {data.note ? (
              <section className="mt-5">
                <Label>알아두기</Label>
                <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
                  <p className="font-gothic text-[13px] leading-[1.45] text-foreground/85">{data.note}</p>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
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
              <p className="text-lg font-bold text-foreground break-words min-w-0 font-word">{popupWord}</p>
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
                className="shrink-0 w-8 h-8 rounded-full bg-black/5 text-muted-foreground flex items-center justify-center"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>
            {popupLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground mt-2 text-sm">
                <Loader2 size={15} className="animate-spin" /> 뜻을 찾고 있어요...
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground mt-1.5 break-words font-gothic">{popupMeaning}</p>
                {popupInfo && (
                  <p className="text-xs text-muted-foreground mt-1 break-words font-gothic">{popupInfo}</p>
                )}
              </>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={savePopupWord}
                disabled={popupSaved || popupLoading || !popupMeaning}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-medium ${
                  popupSaved ? "bg-black/5 text-muted-foreground" : "bg-primary text-white disabled:opacity-50"
                }`}
              >
                {popupSaved ? <><Check size={13} /> 저장됨</> : <><Plus size={13} /> 내 단어장에 담기</>}
              </button>
              <button
                onClick={copyPopupWord}
                className="shrink-0 rounded-full py-2 px-3.5 text-xs font-medium bg-black/5 text-foreground/80"
              >
                복사
              </button>
              <button
                onClick={() => navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=phrase")}
                className="shrink-0 rounded-full py-2 px-3.5 text-xs font-medium bg-black/5 text-foreground/80"
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
};

export default PhraseDetail;
