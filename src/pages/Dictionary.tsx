import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Volume2, ImageIcon, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  lookupWord,
  generateWordImage,
  detectInputKind,
  analyzeIdSentence,
  lookupKoWord,
  translateKoSentence,
  DictResult,
  IdSentenceResult,
  KoWordResult,
  KoSentenceResult,
  InputKind,
} from "@/lib/dictionary";
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

// 별점 (채움: 포인트색, 빈칸: 연회색)
const Stars = ({ n }: { n: number }) => {
  const full = Math.max(0, Math.min(5, n));
  return (
    <span>
      <span className="text-accent">{"★".repeat(full)}</span>
      <span className="text-gray-300">{"☆".repeat(5 - full)}</span>
    </span>
  );
};

const Divider = () => <div className="border-t border-gray-200 my-5" />;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-gray-900 mb-2.5">{children}</h3>
);

const Dictionary = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<InputKind | null>(null);
  const [result, setResult] = useState<DictResult | null>(null);
  const [idSentence, setIdSentence] = useState<IdSentenceResult | null>(null);
  const [koWord, setKoWord] = useState<KoWordResult | null>(null);
  const [koSentence, setKoSentence] = useState<KoSentenceResult | null>(null);
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
    setQuery("");
    const detected = detectInputKind(w);
    setLoading(true);
    setError("");
    setResult(null);
    setIdSentence(null);
    setKoWord(null);
    setKoSentence(null);
    setImgUrl("");
    setImgError("");
    setSaved(false);
    setKind(detected);
    try {
      if (detected === "id_word") {
        const r = await lookupWord(w);
        setResult(r);
        loadImage(r.word, r.meaning); // 이미지는 인니어 단어일 때만
      } else if (detected === "id_sentence") {
        setIdSentence(await analyzeIdSentence(w));
      } else if (detected === "ko_word") {
        setKoWord(await lookupKoWord(w));
      } else {
        setKoSentence(await translateKoSentence(w));
      }
    } catch (e: any) {
      setError(errorMessage(e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const imgReqId = useRef(0);

  const imgErrorMessage = (code: string): string => {
    if (code === "RATE_LIMIT") return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
    if (code === "NO_IMAGE") return "모델이 이미지를 만들지 못했어요.";
    if (code === "IMAGE_FAILED_-1") return "네트워크 오류로 이미지를 불러오지 못했어요.";
    if (code.indexOf("IMAGE_FAILED_") === 0) return "이미지 생성에 실패했습니다 (오류 " + code.replace("IMAGE_FAILED_", "") + ")";
    return "이미지 생성에 실패했습니다.";
  };

  // 검색 직후 자동 호출. 실패 시 "다시 만들기" 버튼에서도 사용.
  const loadImage = async (word: string, meaning: string) => {
    const reqId = ++imgReqId.current;
    setImgLoading(true);
    setImgUrl("");
    setImgError("");
    try {
      const url = await generateWordImage(word, meaning);
      if (imgReqId.current === reqId) setImgUrl(url);
    } catch (e: any) {
      if (imgReqId.current === reqId) setImgError(imgErrorMessage(e?.message || ""));
    } finally {
      if (imgReqId.current === reqId) setImgLoading(false);
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
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold truncate">인도네시아어 사전</h1>
      </header>

      <div className="px-4 py-4">
        {/* 검색창 */}
        <div className="flex items-center gap-2 mb-4 min-w-0">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="단어·문장 (인니어/한국어)"
              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
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
          <div className="flex flex-col items-center justify-center py-16 text-white/70">
            <Loader2 size={28} className="animate-spin mb-3" />
            <p className="text-sm">사전을 찾고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="text-center py-12 text-white/80">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 초기 안내 */}
        {!loading && !error && !result && !idSentence && !koWord && !koSentence && (
          <div className="text-center py-16 text-white/60">
            <Search size={32} className="mx-auto mb-3 opacity-60" />
            <p className="text-sm">인니어·한국어 단어나 문장을 검색해보세요</p>
          </div>
        )}

        {/* (2) 인도네시아어 문장 결과 */}
        {!loading && idSentence && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 break-words min-w-0">{idSentence.original}</h2>
              <button
                onClick={() => speak(idSentence.original, "id")}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="문장 듣기"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1 break-words">{idSentence.translation}</p>

            {idSentence.chunks.length > 0 && (
              <>
                <Divider />
                <SectionTitle>끊어읽기</SectionTitle>
                <p className="text-sm text-gray-800 break-words leading-relaxed">
                  {idSentence.chunks.map((c) => c.id).join(" / ")}
                </p>
              </>
            )}

            {idSentence.hardWords.length > 0 && (
              <>
                <Divider />
                <SectionTitle>단어 학습</SectionTitle>
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {idSentence.hardWords.map((h, i) => (
                    <li key={i} className="flex gap-2 min-w-0">
                      <span className="text-gray-400">•</span>
                      <span className="min-w-0 break-words"><span className="font-semibold text-gray-900">{h.word}</span> — {h.meaning}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* (3) 한국어 단어 결과 → 인니어 단어들 (빈도순) */}
        {!loading && koWord && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5">
            {koWord.candidates.map((c, i) => (
              <div key={i} className={i === 0 ? "min-w-0" : "min-w-0 mt-4 pt-4 border-t border-gray-200"}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-gray-900 font-bold">{i + 1}</span>
                  <p className="text-base font-bold text-primary break-words min-w-0">{c.id}</p>
                  <button
                    onClick={() => speak(c.id, "id")}
                    className="shrink-0 text-primary/70 hover:text-primary"
                    title="발음 듣기"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-1 break-words pl-5">{c.meaning}</p>
                {(c.nuance || c.situation) && (
                  <p className="text-sm text-gray-500 mt-0.5 break-words pl-5">{[c.nuance, c.situation].filter(Boolean).join(", ")}</p>
                )}
                {c.example && (
                  <div className="mt-1.5 pl-5">
                    <div className="flex items-start gap-2 min-w-0">
                      <p className="text-sm text-gray-800 flex-1 min-w-0 break-words">{c.example}</p>
                      <button
                        onClick={() => speak(c.example, "id")}
                        className="shrink-0 text-primary/70 hover:text-primary"
                        title="예문 듣기"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    {c.exampleKo && <p className="text-sm text-gray-500 break-words">{c.exampleKo}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* (4) 한국어 문장 결과 → 인니어 (문어체/구어체) */}
        {!loading && koSentence && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5">
            <h2 className="text-sm font-medium text-gray-500 break-words">{koSentence.query}</h2>
            {[{ label: "구어체", v: koSentence.casual }, { label: "문어체", v: koSentence.formal }].map((row, i) => (
              row.v.id ? (
                <div key={i} className={i === 0 ? "mt-3" : "mt-3 pt-3 border-t border-gray-200"}>
                  <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1.5">{row.label}</span>
                  <div className="flex items-start gap-2 min-w-0">
                    <p className="text-base font-semibold text-gray-900 break-words min-w-0 flex-1">{row.v.id}</p>
                    <button
                      onClick={() => speak(row.v.id, "id")}
                      className="shrink-0 text-primary/70 hover:text-primary mt-0.5"
                      title="문장 듣기"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              ) : null
            ))}

            {koSentence.hardWords.length > 0 && (
              <>
                <Divider />
                <SectionTitle>학습 단어</SectionTitle>
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {koSentence.hardWords.map((h, i) => (
                    <li key={i} className="flex gap-2 min-w-0">
                      <span className="text-gray-400">•</span>
                      <span className="min-w-0 break-words"><span className="font-semibold text-gray-900">{h.word}</span> — {h.meaning}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* (1) 인도네시아어 단어 결과 */}
        {!loading && result && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5">
            {/* 표제어 + 기본뜻 */}
            <div className="flex items-start justify-between gap-2 mb-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 break-words min-w-0">{result.word}</h2>
              <button
                onClick={() => speak(result.word, "id")}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="발음 듣기"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <p className="text-base font-medium text-gray-900 break-words">{result.meaning}</p>
            {result.meaningDetail && (
              <p className="text-sm text-gray-500 mt-1 break-words">→ {result.meaningDetail}</p>
            )}

            {/* 단어 이미지 (자동 생성) */}
            <div className="mt-4">
              {imgLoading && (
                <div className="w-full flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg py-8 text-gray-400">
                  <Loader2 size={22} className="animate-spin mb-2" />
                  <span className="text-xs">이미지를 그리고 있어요...</span>
                </div>
              )}
              {!imgLoading && imgUrl && (
                <img src={imgUrl} alt={result.word} className="w-full rounded-lg border border-gray-200" />
              )}
              {!imgLoading && !imgUrl && imgError && (
                <button
                  onClick={() => loadImage(result.word, result.meaning)}
                  className="w-full flex flex-col items-center justify-center gap-1 border border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:bg-black/5"
                >
                  <span className="text-xs text-gray-400">{imgError}</span>
                  <span className="flex items-center gap-1.5 text-sm"><ImageIcon size={15} /> 이미지 다시 만들기</span>
                </button>
              )}
            </div>

            {/* 예문 */}
            {result.examples.length > 0 && (
              <>
                <Divider />
                <SectionTitle>예문</SectionTitle>
                <ol className="space-y-3">
                  {result.examples.map((ex, i) => (
                    <li key={i} className="flex gap-2 min-w-0">
                      <span className="text-gray-400 text-sm shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                          <p className="text-sm text-gray-900 flex-1 min-w-0 break-words">{ex.id}</p>
                          <button
                            onClick={() => speak(ex.id, "id")}
                            className="shrink-0 text-primary/70 hover:text-primary"
                            title="예문 듣기"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 break-words">{ex.ko}</p>
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
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {result.root && <li className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words"><span className="font-medium text-gray-900">어근:</span> {result.root}</span></li>}
                  {result.affix && <li className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words"><span className="font-medium text-gray-900">접사:</span> {result.affix}</span></li>}
                  {result.register && <li className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words"><span className="font-medium text-gray-900">문어체/구어체:</span> {result.register}</span></li>}
                </ul>
              </>
            )}

            {/* 단어 관련 배경 */}
            {result.etymology.length > 0 && (
              <>
                <Divider />
                <SectionTitle>단어 관련 배경</SectionTitle>
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {result.etymology.map((e, i) => (
                    <li key={i} className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words">{e}</span></li>
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
                    <li key={i} className="min-w-0">
                      <p className="text-sm text-gray-800 break-words"><span className="font-semibold text-gray-900">{f.form}</span> — {f.meaning}</p>
                      {f.example && (
                        <div className="mt-0.5 pl-1">
                          <p className="text-sm text-gray-800 break-words">예문: {f.example}</p>
                          <p className="text-sm text-gray-500 break-words">{f.exampleKo}</p>
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
                    <li key={i} className="min-w-0">
                      <p className="text-sm text-gray-800 break-words"><span className="font-semibold text-gray-900">{f.form}</span> — {f.meaning}</p>
                      {f.example && (
                        <div className="mt-0.5 pl-1">
                          <p className="text-sm text-gray-800 break-words">예문: {f.example}</p>
                          <p className="text-sm text-gray-500 break-words">{f.exampleKo}</p>
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
                    <li key={i} className="min-w-0">
                      <p className="text-sm text-gray-800 break-words"><span className="font-semibold text-gray-900">{o.word}</span> — {o.meaning}</p>
                      {o.example && (
                        <div className="mt-0.5 pl-1">
                          <p className="text-sm text-gray-800 break-words">예문: {o.example}</p>
                          <p className="text-sm text-gray-500 break-words">{o.exampleKo}</p>
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
                <ul className="space-y-2.5">
                  {result.similar.map((s, i) => (
                    <li key={i} className="rounded-lg bg-black/5 px-3 py-2.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-gray-900 break-words min-w-0">{s.word}</p>
                        <button
                          onClick={() => speak(s.word, "id")}
                          className="shrink-0 text-primary/70 hover:text-primary"
                          title="발음 듣기"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 break-words mt-0.5">{s.nuance}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* 사용빈도 / 난이도 */}
            <Divider />
            <div className="space-y-1 text-sm text-gray-900">
              <p><span className="font-semibold">실제 회화 사용빈도</span> <Stars n={result.frequency} /></p>
              <p><span className="font-semibold">난이도</span> <Stars n={result.difficulty} /></p>
            </div>

            {/* 같이 외우면 좋은 표현 */}
            {result.wordFamily && (
              <>
                <Divider />
                <SectionTitle>같이 외우면 좋은 표현</SectionTitle>
                <p className="text-sm text-gray-800 flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words">{result.wordFamily}</span></p>
              </>
            )}

            {/* 내 단어장에 보내기 */}
            <div className="mt-6">
              <button
                onClick={handleSaveToWordbook}
                disabled={saved}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-colors ${
                  saved
                    ? "bg-gray-100 text-gray-400"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {saved ? <><Check size={16} /> 저장됨</> : <><Plus size={16} /> 내 단어장에 보내기</>}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                단어·뜻·예문이 내 단어장에 저장됩니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;
