import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Volume2, Loader2, RotateCcw, Search } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { getPeribahasa } from "@/lib/peribahasa";
import { getPhraseDetail, PhraseDetail as PhraseDetailData } from "@/lib/phrase";
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

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
    {children}
  </p>
);

const PhraseDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const index = Number(params.idx);
  const item = getPeribahasa(Number.isFinite(index) ? index : 0);

  const [data, setData] = useState<PhraseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const d = await getPhraseDetail(item.id, item.ko, force);
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
    if (!hasGeminiApiKey()) {
      setLoading(false);
      setError("API_KEY");
      return;
    }
    load(false);
  }, [load]);

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
        <h1 className="flex-1 text-lg font-semibold truncate">오늘의 인도네시아어</h1>
      </header>

      <div className="px-4 pt-5">
        {/* 문장 */}
        <div className="rounded-2xl border border-border bg-card px-4 py-5">
          <div className="flex items-start gap-2">
            <p className="flex-1 font-word text-[21px] font-medium leading-[1.45] text-foreground">
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
          <p className="mt-2.5 text-[13.5px] leading-[1.65] text-muted-foreground">{item.ko}</p>
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
            {data.literal ? (
              <section className="mt-6">
                <Label>직역</Label>
                <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
                  <p className="text-[14px] leading-[1.7] text-foreground/85">{data.literal}</p>
                </div>
              </section>
            ) : null}

            {data.meaning ? (
              <section className="mt-5">
                <Label>어떤 뜻인가요</Label>
                <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
                  <p className="text-[14px] leading-[1.75] text-foreground/85">{data.meaning}</p>
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
                        <p className="font-word text-[16px] font-semibold text-foreground">{w.word}</p>
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
                          <Search size={15} />
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
                        <p className="mb-2 text-[11.5px] font-gothic text-muted-foreground">
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
                  <p className="text-[14px] leading-[1.75] text-foreground/85">{data.note}</p>
                </div>
              </section>
            ) : null}

            <button
              onClick={() => load(true)}
              className="mx-auto mt-7 flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[12.5px] font-gothic text-muted-foreground active:bg-muted"
            >
              <RotateCcw size={13} /> 설명 다시 만들기
            </button>
          </>
        ) : null}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default PhraseDetail;
