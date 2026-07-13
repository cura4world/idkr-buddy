import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Volume2, ImageIcon, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lookupWord, generateWordImage, DictResult } from "@/lib/dictionary";
import { hasGeminiApiKey } from "@/lib/gemini";
import { addWord } from "@/lib/store";

const MY_WORDBOOK_ID = "my-wordbook";

// TTS: AndroidTTS 우선, 없으면 speechSynthesis 폴백 (프로젝트 공통 패턴)
const speak = (text: string, lang: "id" | "ko") => {
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

const Stars = ({ n }: { n: number }) => {
  const full = Math.max(0, Math.min(5, n));
  return <span className="text-accent">{"★".repeat(full)}<span className="text-muted-foreground">{"☆".repeat(5 - full)}</span></span>;
};

const Divider = () => <div className="border-t border-border/60 my-5" />;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-foreground mb-2.5">{children}</h3>
);

const Dictionary = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DictResult | null>(null);
  const [error, setError] = useState("");

  const [imgUrl, setImgUrl] = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");

  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const errorMessage = (code: string): string => {
    if (code === "NO_API_KEY") return "Gemini API 키가 필요합니다. 설정에서 키를 입력해주세요.";
    if (code === "INVALID_API_KEY") return "API 키가 올바르지 않습니다. 설정에서 다시 확인해주세요.";
    if (code === "RATE_LIMIT") return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
    if (code === "EMPTY_WORD") return "단어를 입력해주세요.";
    return "검색에 실패했습니다. 잠시 후 다시 시도해주세요.";
  };

  const handleSearch = async () => {
    const w = query.trim();
    if (!w) return;
    if (!hasGeminiApiKey()) {
      setError("Gemini API 키가 필요합니다. 설정에서 키를 입력해주세요.");
      setResult(null);
      return;
    }
    inputRef.current?.blur();
    setLoading(true);
    setError("");
    setResult(null);
    setImgUrl("");
    setImgError("");
    setSaved(false);
    try {
      const r = await lookupWord(w);
      setResult(r);
    } catch (e: any) {
      setError(errorMessage(e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGenImage = async () => {
    if (!result) return;
    setImgLoading(true);
    setImgError("");
    try {
      const url = await generateWordImage(result.word, result.meaning);
      setImgUrl(url);
    } catch (e: any) {
      const code = e?.message || "";
      setImgError(code === "RATE_LIMIT" ? "요청이 많습니다. 잠시 후 다시 시도해주세요." : "이미지 생성에 실패했습니다.");
    } finally {
      setImgLoading(false);
    }
  };

  // 4열 정보만 개인 단어장에 저장 (이미지는 저장하지 않음)
  const handleSaveToWordbook = () => {
    if (!result || saved) return;
    const firstExample = result.examples[0];
    addWord({
      word: result.word,
      meaning: result.meaning,
      example: firstExample?.id || "",
      exampleMeaning: firstExample?.ko || "",
      categoryId: MY_WORDBOOK_ID,
    });
    setSaved(true);
    toast("내 단어장에 저장되었습니다");
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">AI 사전</h1>
      </header>

      <div className="px-4 py-4">
        {/* 검색창 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="인도네시아어 단어를 검색하세요"
              className="flex-1 bg-transparent outline-none text-base"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="shrink-0 bg-primary text-white rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "검색"}
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={28} className="animate-spin mb-3" />
            <p className="text-sm">사전을 찾고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 초기 안내 */}
        {!loading && !error && !result && (
          <div className="text-center py-16 text-muted-foreground">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">궁금한 인도네시아어 단어를 검색해보세요</p>
          </div>
        )}

        {/* 결과 */}
        {!loading && result && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5">
            {/* 표제어 + 기본뜻 */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-xl font-bold text-foreground">{result.word} 기본뜻</h2>
              <button
                onClick={() => speak(result.word, "id")}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="발음 듣기"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <p className="text-base font-medium text-foreground">{result.meaning}</p>
            {result.meaningDetail && (
              <p className="text-sm text-muted-foreground mt-1">→ {result.meaningDetail}</p>
            )}

            {/* 이미지로 단어 이해하기 */}
            <div className="mt-4">
              {!imgUrl && !imgLoading && (
                <button
                  onClick={handleGenImage}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-3 text-sm text-muted-foreground hover:bg-secondary/40"
                >
                  <ImageIcon size={16} /> 이미지로 이해하기
                </button>
              )}
              {imgLoading && (
                <div className="w-full flex flex-col items-center justify-center border border-dashed border-border rounded-lg py-8 text-muted-foreground">
                  <Loader2 size={22} className="animate-spin mb-2" />
                  <span className="text-xs">이미지를 그리고 있어요...</span>
                </div>
              )}
              {imgUrl && (
                <img src={imgUrl} alt={result.word} className="w-full rounded-lg border border-border/60" />
              )}
              {imgError && <p className="text-xs text-muted-foreground mt-2 text-center">{imgError}</p>}
            </div>

            {/* 예문 */}
            {result.examples.length > 0 && (
              <>
                <Divider />
                <SectionTitle>예문</SectionTitle>
                <ol className="space-y-3">
                  {result.examples.map((ex, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground text-sm shrink-0">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <p className="text-sm text-foreground flex-1">{ex.id}</p>
                          <button
                            onClick={() => speak(ex.id, "id")}
                            className="shrink-0 text-primary/70 hover:text-primary"
                            title="예문 듣기"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground">{ex.ko}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* 단어 분석 */}
            {(result.root || result.affix || result.register) && (
              <>
                <Divider />
                <SectionTitle>단어 분석</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                  {result.root && <li className="flex gap-2"><span className="text-muted-foreground">•</span><span><span className="font-medium">어근:</span> {result.root}</span></li>}
                  {result.affix && <li className="flex gap-2"><span className="text-muted-foreground">•</span><span><span className="font-medium">접사:</span> {result.affix}</span></li>}
                  {result.register && <li className="flex gap-2"><span className="text-muted-foreground">•</span><span><span className="font-medium">문어체/구어체:</span> {result.register}</span></li>}
                </ul>
              </>
            )}

            {/* 단어 관련 배경 */}
            {result.etymology.length > 0 && (
              <>
                <Divider />
                <SectionTitle>단어 관련 배경</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                  {result.etymology.map((e, i) => (
                    <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{e}</span></li>
                  ))}
                </ul>
              </>
            )}

            {/* 능동형 */}
            {result.activeForms.length > 0 && (
              <>
                <Divider />
                <SectionTitle>능동형</SectionTitle>
                <ul className="space-y-3">
                  {result.activeForms.map((f, i) => (
                    <li key={i}>
                      <p className="text-sm"><span className="font-semibold text-foreground">{f.form}</span> — {f.meaning}</p>
                      {f.example && (
                        <div className="mt-0.5 pl-1">
                          <p className="text-sm text-foreground">예문: {f.example}</p>
                          <p className="text-sm text-muted-foreground">{f.exampleKo}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* 수동형 */}
            {result.passiveForms.length > 0 && (
              <>
                <Divider />
                <SectionTitle>수동형</SectionTitle>
                <ul className="space-y-3">
                  {result.passiveForms.map((f, i) => (
                    <li key={i}>
                      <p className="text-sm"><span className="font-semibold text-foreground">{f.form}</span> — {f.meaning}</p>
                      {f.example && (
                        <div className="mt-0.5 pl-1">
                          <p className="text-sm text-foreground">예문: {f.example}</p>
                          <p className="text-sm text-muted-foreground">{f.exampleKo}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* 반대 단어 */}
            {result.opposites.length > 0 && (
              <>
                <Divider />
                <SectionTitle>반대 단어</SectionTitle>
                <ul className="space-y-3">
                  {result.opposites.map((o, i) => (
                    <li key={i}>
                      <p className="text-sm"><span className="font-semibold text-foreground">{o.word}</span> — {o.meaning}</p>
                      {o.example && (
                        <div className="mt-0.5 pl-1">
                          <p className="text-sm text-foreground">예문: {o.example}</p>
                          <p className="text-sm text-muted-foreground">{o.exampleKo}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* 비슷한 단어 */}
            {result.similar.length > 0 && (
              <>
                <Divider />
                <SectionTitle>비슷한 단어</SectionTitle>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-[100px_1fr] bg-secondary/40 text-xs font-medium text-muted-foreground">
                    <div className="px-3 py-2">단어</div>
                    <div className="px-3 py-2">뉘앙스</div>
                  </div>
                  {result.similar.map((s, i) => (
                    <div key={i} className="grid grid-cols-[100px_1fr] text-sm border-t border-border/60">
                      <div className="px-3 py-2 font-medium">{s.word}</div>
                      <div className="px-3 py-2 text-muted-foreground">{s.nuance}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 사용빈도 / 난이도 */}
            <Divider />
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">실제 회화 사용빈도</span> <Stars n={result.frequency} /></p>
              <p><span className="font-semibold">난이도</span> <Stars n={result.difficulty} /></p>
            </div>

            {/* 같이 외우면 좋은 표현 */}
            {result.wordFamily && (
              <>
                <Divider />
                <SectionTitle>같이 외우면 좋은 표현</SectionTitle>
                <p className="text-sm flex gap-2"><span className="text-muted-foreground">•</span><span>{result.wordFamily}</span></p>
              </>
            )}

            {/* 내 단어장에 보내기 */}
            <div className="mt-6">
              <button
                onClick={handleSaveToWordbook}
                disabled={saved}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-colors ${
                  saved
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {saved ? <><Check size={16} /> 저장됨</> : <><Plus size={16} /> 내 단어장에 보내기</>}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                단어·뜻·예문이 내 단어장에 저장됩니다 (이미지는 볼 때 다시 생성돼요)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;
