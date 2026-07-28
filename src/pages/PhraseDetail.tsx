import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Volume2, Loader2, RotateCcw, BookOpen } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { getPhraseDetail, PhraseDetail as PhraseDetailData } from "@/lib/phrase";
import { fetchChapterKo, getBook } from "@/lib/bible";
import { hasGeminiApiKey } from "@/lib/gemini";
import SettingsDialog from "@/components/SettingsDialog";

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

/* 인니어 단어는 사전형이 소문자입니다. 고유명사와 약어만 대문자를 살립니다. */
const PROPER_NOUNS = new Set([
  "allah", "tuhan", "yesus", "kristus", "roh", "kudus", "alkitab", "injil", "kristen",
  "indonesia", "jakarta", "bali", "jawa",
  "minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu",
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember",
]);

const lowerFirstWord = (word: string): string => {
  const t = word.trim();
  if (t === "") return word;
  // 약어(TB, PGI 등)는 그대로 둡니다.
  if (t.length > 1 && t === t.toUpperCase()) return t;
  const head = t.split(new RegExp("[\\s-]"))[0].toLowerCase();
  if (PROPER_NOUNS.has(head)) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
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
        <h1 className="flex-1 font-gothic text-base font-semibold uppercase tracking-[0.08em] truncate">Bahasa Hari Ini</h1>
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
              {item.id}
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
                    <p className="font-gothic text-[13.5px] leading-[1.8] text-foreground/85">{koVerse}</p>
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
                  <p className="font-gothic text-[13px] leading-[1.75] text-foreground/85">{data.meaning}</p>
                </div>
              </section>
            ) : null}

            {data.words.length > 0 ? (
              <section className="mt-5">
                <Label>단어</Label>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {data.words.map((w, i) => (
                    <div
                      key={w.word + i}
                      className={
                        "px-4 py-3.5 " + (i === data.words.length - 1 ? "" : "border-b border-border")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-word text-[16px] font-semibold text-foreground">{lowerFirstWord(w.word)}</p>
                        <button
                          onClick={() => speak(w.word, "id")}
                          className="shrink-0 text-muted-foreground active:text-primary"
                          title="발음 듣기"
                        >
                          <Volume2 size={15} />
                        </button>
                        <button
                          onClick={() =>
                            navigate("/dictionary?q=" + encodeURIComponent(w.word) + "&from=phrase")
                          }
                          className="ml-auto shrink-0 text-muted-foreground active:text-primary"
                          title="사전에서 보기"
                        >
                          <BookOpen size={15} />
                        </button>
                      </div>
                      <p className="mt-1 text-[13.5px] leading-snug text-foreground/85">{w.ko}</p>
                      {w.arti ? (
                        <p className="mt-1 font-word text-[12.5px] leading-snug text-muted-foreground">
                          {w.arti}
                        </p>
                      ) : null}
                    </div>
                  ))}
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
                  <p className="font-gothic text-[13px] leading-[1.75] text-foreground/85">{data.note}</p>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default PhraseDetail;
