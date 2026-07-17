import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Newspaper, Volume2, Loader2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { quickLookupWord } from "@/lib/story";
import { generateDailyNews, todayKey, indoDateLabel, NewsEdition } from "@/lib/news";
import { saveEdition, listEditions } from "@/lib/newsStore";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { hasGeminiApiKey } from "@/lib/gemini";

const MY_WORDBOOK_ID = "my-wordbook";

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

const fmtDate = (key: string) => key.replace(new RegExp("-", "g"), ".");

// 카테고리 배지 색 (신문 섹션 느낌)
const catStyle = (cat: string): string => {
  if (cat.indexOf("핫") !== -1) return "text-red-600 bg-red-500/10";
  if (cat.indexOf("정치") !== -1) return "text-indigo-600 bg-indigo-500/10";
  if (cat.indexOf("경제") !== -1) return "text-emerald-600 bg-emerald-500/10";
  if (cat.indexOf("사회") !== -1) return "text-sky-600 bg-sky-500/10";
  if (cat.indexOf("문화") !== -1) return "text-amber-600 bg-amber-500/10";
  if (cat.indexOf("스포츠") !== -1) return "text-violet-600 bg-violet-500/10";
  if (cat.indexOf("과학") !== -1 || cat.indexOf("기술") !== -1) return "text-cyan-600 bg-cyan-500/10";
  return "text-gray-600 bg-black/5";
};

const News = () => {
  const navigate = useNavigate();
  const [editions, setEditions] = useState<NewsEdition[]>([]);
  const [selected, setSelected] = useState<NewsEdition | null>(null);
  const [generating, setGenerating] = useState(false);
  const [articleIdx, setArticleIdx] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  const tk = todayKey();
  const todayEdition = editions.find((e) => e.date === tk) || null;
  const article =
    selected && articleIdx !== null ? selected.articles[articleIdx] || null : null;

  // 앞/뒤 문단 DOM 참조 (뒤집을 때 읽던 문단으로 스크롤 맞추기 — Story와 동일 패턴)
  const paraRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const pendingPara = useRef<number | null>(null);

  const currentParaIndex = (side: "id" | "ko") => {
    const marker = 140;
    let best = 0;
    let bestDist = Infinity;
    Object.keys(paraRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      const el = paraRefs.current[k];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const dist = Math.abs(top - marker);
      if (top <= marker + 40 && dist < bestDist) {
        bestDist = dist;
        best = Number(k.split("-")[1]) || 0;
      }
    });
    return best;
  };

  const handleFlip = () => {
    const side = flipped ? "ko" : "id";
    pendingPara.current = currentParaIndex(side);
    setFlipped((f) => !f);
  };

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

  // 단어 미니 팝업 (Story와 동일 UX)
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  // 기사 화면을 열었는지 (히스토리를 한 칸 쌓았는지)
  const articleStateRef = useRef(false);

  const openArticle = (edition: NewsEdition, idx: number) => {
    wordCache.current.clear();
    setSelected(edition);
    setArticleIdx(idx);
    setFlipped(false);
    paraRefs.current = {};
    pendingPara.current = null;
    window.scrollTo({ top: 0 });
    if (!articleStateRef.current) {
      articleStateRef.current = true;
      try { window.history.pushState({ newsArticle: true }, ""); } catch (e) {}
    }
  };

  const resetToFront = () => {
    setArticleIdx(null);
    setFlipped(false);
    paraRefs.current = {};
    pendingPara.current = null;
    setPopupWord(null);
    wordCache.current.clear();
  };

  const closeArticle = () => {
    if (articleStateRef.current) {
      window.history.back(); // popstate 핸들러가 resetToFront 처리
    } else {
      resetToFront();
    }
  };

  // 폰의 뒤로가기: 기사 화면이면 신문 첫면으로만 이동
  useEffect(() => {
    const onPop = () => {
      if (articleStateRef.current) {
        articleStateRef.current = false;
        resetToFront();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listEditions().then((all) => {
      setEditions(all);
      // 사전에서 "뉴스로" 버튼으로 돌아온 경우, 보던 기사를 다시 연다
      try {
        const raw = sessionStorage.getItem("news-return");
        if (raw) {
          sessionStorage.removeItem("news-return");
          const r = JSON.parse(raw);
          const found = all.find((e) => e.date === r.date);
          if (found && typeof r.idx === "number" && found.articles[r.idx]) {
            openArticle(found, r.idx);
            return;
          }
        }
      } catch (e) {}
      const today = all.find((e) => e.date === todayKey());
      if (today) setSelected(today);
      else if (all.length > 0) setSelected(all[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 오늘의 뉴스 가져오기 — 오늘 에디션이 이미 있으면 절대 호출하지 않음 (하루 1회 과금)
  const handleFetchToday = async () => {
    if (generating) return;
    if (todayEdition) {
      setSelected(todayEdition);
      return;
    }
    if (!hasGeminiApiKey()) {
      toast("Gemini API 키가 필요합니다. 설정에서 입력해주세요");
      return;
    }
    setGenerating(true);
    try {
      const edition = await generateDailyNews();
      await saveEdition(edition);
      setEditions((prev) => [edition, ...prev.filter((e) => e.date !== edition.date)]);
      setSelected(edition);
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      const code = e?.message || "";
      if (code === "RATE_LIMIT") toast("요청이 많습니다. 잠시 후 다시 시도해주세요");
      else if (code === "NO_API_KEY" || code === "INVALID_API_KEY") toast("API 키를 설정에서 확인해주세요");
      else toast("뉴스 실패: " + (code ? code.slice(0, 120) : "알 수 없는 오류"));
    } finally {
      setGenerating(false);
    }
  };

  // 단어 탭 → 미니 팝업 (3단 캐시: 카드 메모리 → IndexedDB → API)
  const openWordPopup = async (rawToken: string, sentence: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
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

    quickLookupWord(word, sentence)
      .then((r) => {
        wordCache.current.set(key, r);
        saveLookupWord(word, r.meaning, r.info);
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
    try {
      if (selected && articleIdx !== null) {
        sessionStorage.setItem(
          "news-return",
          JSON.stringify({ date: selected.date, idx: articleIdx })
        );
      }
    } catch (e) {}
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=news");
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

  // 인니어 텍스트를 단어 단위로 쪼개 탭 가능하게 렌더링
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

  const renderIndonesian = (text: string) => {
    const paragraphs = text.split(new RegExp("\\n{2,}")).filter((p) => p.trim());
    return paragraphs.map((para, pi) => {
      const sentences = para.split(new RegExp("(?<=[.!?])\\s+")).filter(Boolean);
      return (
        <p
          key={pi}
          ref={(el) => { paraRefs.current["id-" + pi] = el; }}
          className="mb-4 text-base leading-relaxed font-word text-gray-900"
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
        className="mb-4 text-xs leading-relaxed text-gray-800 font-body"
      >
        {para}
      </p>
    ));

  // ---------- 기사 뷰 ----------
  if (article && selected) {
    return (
      <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
        <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
          <button
            onClick={closeArticle}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="신문으로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 text-base font-semibold leading-snug line-clamp-2 break-words">
            {article.titleKo || article.title}
          </h1>
        </header>

        <div className="px-4 py-4">
          <div className="bg-card border border-border/60 rounded-xl pl-5 pr-2 py-5 min-h-[72vh] content-bump select-none flex gap-2">
            <div className="flex-1 min-w-0">
              {!flipped ? (
                <>
                  {/* 앞면: 인니어 기사 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${catStyle(article.category)}`}>
                      {article.category}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">
                      {fmtDate(selected.date)}
                    </span>
                  </div>
                  <div className="mb-2 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">
                      {renderTokens(article.title, "title-")}
                    </h2>
                  </div>
                  {article.lead && (
                    <p className="mb-4 text-sm leading-relaxed font-word text-gray-600 border-l-2 border-primary/40 pl-3">
                      {renderTokens(article.lead, "lead-")}
                    </p>
                  )}
                  {renderIndonesian(article.body)}
                </>
              ) : (
                <>
                  {/* 뒷면: 한국어 번역 */}
                  <h2 className="text-base font-bold text-gray-900 break-words mb-3">{article.titleKo}</h2>
                  {renderKorean(article.korean)}
                </>
              )}
            </div>
            {/* 뒤집기 바 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleFlip(); }}
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

  // ---------- 신문 첫면 ----------
  const headline = selected ? selected.articles[0] : null;
  const rest = selected ? selected.articles.slice(1) : [];
  const isTodayShown = selected !== null && selected.date === tk;

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
        <h1 className="flex-1 text-lg font-semibold truncate">인도네시아 뉴스</h1>
      </header>

      <div className="px-4 py-4">
        {/* 마스트헤드 */}
        <div className="bg-card border border-border/60 rounded-xl px-4 pt-5 pb-4 text-center">
          <p className="text-[10px] font-gothic uppercase tracking-[0.3em] text-gray-400">
            Kata kata &middot; Edisi Belajar
          </p>
          <h2 className="font-word text-2xl font-bold tracking-wide text-gray-900 mt-1">
            BERITA HARI INI
          </h2>
          <div className="mx-4 mt-2 border-t border-b border-gray-300 py-1">
            <p className="text-xs text-gray-600 font-gothic">
              {selected ? selected.dateLabel : indoDateLabel()}
              {selected && !isTodayShown ? " (지난 신문)" : ""}
            </p>
          </div>

          {/* 오늘 신문이 아직 없을 때만 가져오기 버튼 (하루 1회 과금) */}
          {!todayEdition && (
            <>
              <button
                onClick={handleFetchToday}
                disabled={generating}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium bg-primary text-white disabled:opacity-60"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> 오늘 신문을 만들고 있어요...</>
                ) : (
                  <><Newspaper size={16} /> 오늘의 뉴스 가져오기</>
                )}
              </button>
              <p className="mt-2 text-[11px] text-gray-400 font-gothic">
                실제 오늘 뉴스를 검색해 학습용 기사로 다시 씁니다 (20~30초)
              </p>
            </>
          )}
          {todayEdition && !isTodayShown && (
            <button
              onClick={() => { setSelected(todayEdition); window.scrollTo({ top: 0 }); }}
              className="mt-3 rounded-full px-4 py-1.5 text-xs font-medium bg-primary/10 text-primary"
            >
              오늘 신문 보기
            </button>
          )}
        </div>

        {/* 신문 지면 */}
        {selected && headline && (
          <div className="mt-3 bg-card border border-border/60 rounded-xl px-4 py-4">
            {/* 헤드라인 기사 */}
            <button
              onClick={() => openArticle(selected, 0)}
              className="w-full text-left min-w-0"
            >
              <span className={`inline-block text-[11px] font-medium rounded-full px-2 py-0.5 ${catStyle(headline.category)}`}>
                {headline.category}
              </span>
              <h3 className="mt-1.5 text-xl font-bold leading-snug text-gray-900 break-words font-word">
                {headline.title}
              </h3>
              {headline.lead && (
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 break-words font-word">
                  {headline.lead}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 break-words font-gothic">{headline.titleKo}</p>
            </button>

            {/* 나머지 기사 목록 */}
            {rest.length > 0 && (
              <ul className="mt-3 border-t border-gray-200">
                {rest.map((a, i) => (
                  <li key={i} className={i < rest.length - 1 ? "border-b border-gray-100" : ""}>
                    <button
                      onClick={() => openArticle(selected, i + 1)}
                      className="w-full text-left py-3 min-w-0"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`shrink-0 mt-0.5 text-[11px] font-medium rounded-full px-2 py-0.5 ${catStyle(a.category)}`}>
                          {a.category}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold leading-snug text-gray-900 break-words font-word">
                            {a.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 break-words font-gothic">{a.titleKo}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 지난 신문 */}
        {editions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-white mb-2 px-1 font-gothic">지난 신문</p>
            <ul className="space-y-2">
              {editions.map((e) => (
                <li key={e.date}>
                  <button
                    onClick={() => { setSelected(e); window.scrollTo({ top: 0 }); }}
                    className={`w-full text-left bg-card border rounded-xl px-4 py-3 min-w-0 ${
                      selected && selected.date === e.date ? "border-primary/50" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-xs font-medium text-gray-500 bg-black/5 rounded-full px-2 py-0.5">
                        {fmtDate(e.date)}
                      </span>
                      <p className="flex-1 min-w-0 text-sm text-gray-800 truncate font-gothic">
                        {e.articles[0] ? e.articles[0].titleKo || e.articles[0].title : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {editions.length === 0 && !generating && (
          <div className="text-center py-10 text-white/60">
            <Newspaper size={30} className="mx-auto mb-3 opacity-60" />
            <p className="text-sm">첫 신문을 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default News;
