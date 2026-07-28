import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory } from "@/lib/store";
import { getBook } from "@/lib/bible";
import {
  PHRASE_KINDS,
  PhraseKind,
  Phrase,
  loadKinds,
  saveKinds,
  loadSavedPhrase,
  savePhraseForToday,
  pickPhrase,
} from "@/lib/peribahasa";
import SettingsDialog from "@/components/SettingsDialog";
import {
  RotateCcw,
  SlidersHorizontal,
  Check,
  Settings,
  Search,
  Mic,
  Volume2,
  Star,
  Library,
  BookOpen,
  Heart,
  Newspaper,
  ScrollText,
  Compass,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const MY_WORDBOOK_ID = "my-wordbook";
const BIBLE_LAST_POS_KEY = "bible-last-pos";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* 해뜨는 모양 (lucide Sunrise에는 위쪽 화살표가 있어 직접 그립니다) */
const SunriseIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true"
  >
    <path d="M12 2v3M4.9 6.9l2.1 2.1M2 14h3M19 14h3M17 9l2.1-2.1" />
    <path d="M8 14a4 4 0 0 1 8 0" />
    <path d="M3 18h18M5 21h14" />
  </svg>
);

/* 폰 네이티브 TTS 우선, 없으면 브라우저 음성 합성으로 폴백 */
const speak = (text: string) => {
  const w = window as any;
  if (w.AndroidTTS) {
    try { w.AndroidTTS.speak(text, "id-ID"); return; } catch (e) { /* 폴백 */ }
  }
  try {
    window.speechSynthesis?.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 0.95;
    window.speechSynthesis?.speak?.(u);
  } catch (e) { /* 지원하지 않는 기기는 조용히 넘어갑니다 */ }
};

type IconComp = LucideIcon | ((p: { size?: number; className?: string }) => React.ReactElement);

type RowProps = {
  icon: IconComp;
  title: string;
  sub: string;
  meta?: string;
  onClick: () => void;
  last?: boolean;
};

const Row = ({ icon: Icon, title, sub, meta, onClick, last }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={
      "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " +
      (last ? "" : "border-b border-border")
    }
  >
    <Icon size={20} className="text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[15px] leading-tight text-foreground truncate">{title}</p>
      <p className="mt-0.5 font-word text-[11.5px] text-muted-foreground truncate">{sub}</p>
    </div>
    {meta ? (
      <span className="shrink-0 max-w-[46%] truncate pl-2.5 font-word text-[12.5px] text-muted-foreground">
        {meta}
      </span>
    ) : null}
    <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2.5 px-1 text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
    {children}
  </p>
);

const Index = () => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kinds, setKinds] = useState<PhraseKind[]>(() => loadKinds());
  const [phrase, setPhrase] = useState<Phrase | null>(() => loadSavedPhrase());
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [kindSheetOpen, setKindSheetOpen] = useState(false);

  // 검색
  const [query, setQuery] = useState("");
  const [voiceLang, setVoiceLang] = useState<"ko" | "id">("ko");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const allCategories = getCategories();
  const hasMyWordbook = allCategories.some((c) => c.id === MY_WORDBOOK_ID);
  const myWordCount = getWordsByCategory(MY_WORDBOOK_ID).length;
  const folderCount = allCategories.filter((c) => c.id !== MY_WORDBOOK_ID).length;

  // 오늘 날짜(인니어 표기) + 오늘의 문장
  const now = new Date();
  const dateLabel = HARI[now.getDay()] + ", " + now.getDate() + " " + BULAN[now.getMonth()];

  // 오늘의 문장: 저장된 것이 있으면 그대로, 없으면 새로 뽑습니다.
  const refreshPhrase = useCallback((next: PhraseKind[]) => {
    let alive = true;
    setPhraseLoading(true);
    pickPhrase(next)
      .then((p) => {
        if (!alive) return;
        setPhrase(p);
        savePhraseForToday(p);
      })
      .catch(() => {})
      .finally(() => { if (alive) setPhraseLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (phrase) return;
    let alive = true;
    setPhraseLoading(true);
    pickPhrase(kinds)
      .then((p) => {
        if (!alive) return;
        setPhrase(p);
        savePhraseForToday(p);
      })
      .catch(() => {})
      .finally(() => { if (alive) setPhraseLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleKind = (key: PhraseKind) => {
    setKinds((prev) => {
      const on = prev.indexOf(key) >= 0;
      if (on && prev.length <= 1) return prev; // 최소 하나는 남깁니다
      const next = on ? prev.filter((k) => k !== key) : prev.concat([key]);
      saveKinds(next);
      refreshPhrase(next);
      return next;
    });
  };

  // 성경 마지막 읽은 위치
  const [biblePos, setBiblePos] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BIBLE_LAST_POS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p && typeof p.bookId === "string" && typeof p.chapter === "number") {
        const b = getBook(p.bookId);
        if (b) setBiblePos(b.idName + " " + p.chapter);
      }
    } catch (e) {}
  }, []);

  // 음성 인식 정리
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop?.(); } catch (e) {}
      try { window.speechSynthesis?.cancel?.(); } catch (e) {}
    };
  }, []);

  const goSearch = (term?: string) => {
    const t = (term !== undefined ? term : query).trim();
    if (!t) return;
    navigate("/dictionary?q=" + encodeURIComponent(t));
  };

  const speechSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startVoice = () => {
    if (!speechSupported) {
      toast("이 기기에서는 음성 검색을 지원하지 않아요");
      return;
    }
    if (listening) {
      try { recognitionRef.current?.stop?.(); } catch (e) {}
      setListening(false);
      return;
    }
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = voiceLang === "ko" ? "ko-KR" : "id-ID";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onresult = (ev: any) => {
        const text = ev?.results?.[0]?.[0]?.transcript?.trim();
        setListening(false);
        if (text) {
          setQuery(text);
          goSearch(text);
        }
      };
      rec.onerror = (ev: any) => {
        setListening(false);
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
          toast("마이크 권한이 필요해요. 설정에서 허용해주세요");
        }
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch (e) {
      setListening(false);
      toast("음성 검색을 시작하지 못했어요");
    }
  };

  const iconBtn =
    "w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 active:bg-white/20 transition-colors";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      {/* ── 상단 브랜드 블록 ── */}
      <div
        className="relative overflow-hidden px-5 pt-7 pb-6"
        style={{ backgroundColor: "hsl(var(--brand-deep))" }}
      >
        {/* 피니시 범선 (술라웨시 전통 목조선) */}
        <svg
          className="absolute -right-1.5 top-1.5 pointer-events-none"
          width="168"
          height="126"
          viewBox="0 0 140 110"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.26"
          aria-hidden="true"
        >
          <path d="M10 84 Q70 104 130 84" />
          <path d="M10 84 L130 84" />
          <path d="M52 84 L52 12" />
          <path d="M92 84 L92 26" />
          <path d="M50 16 L50 78 L18 78 Z" />
          <path d="M56 20 L56 78 L88 78 Z" />
          <path d="M96 30 L96 78 L126 78 Z" />
          <path d="M52 12 L52 6" />
        </svg>

        {/* 물결 */}
        <svg
          className="absolute left-0 right-0 bottom-0 w-full pointer-events-none"
          height="34"
          viewBox="0 0 400 34"
          preserveAspectRatio="none"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M-10 12 Q40 4 90 12 T190 12 T290 12 T390 12 T490 12" opacity="0.18" />
          <path d="M-10 22 Q50 14 110 22 T230 22 T350 22 T470 22" opacity="0.13" />
          <path d="M-10 31 Q60 24 130 31 T270 31 T410 31" opacity="0.09" />
        </svg>

        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-white/60">
              {dateLabel}
            </p>
            <h1 className="mt-1.5 font-word text-[27px] font-semibold leading-none tracking-tight text-white">
              Kata kata<span className="text-accent">.</span>
            </h1>
          </div>
          <div className="flex items-center shrink-0">
            <button type="button" onClick={() => setSettingsOpen(true)} className={iconBtn} title="설정">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div className="relative mt-4 flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 h-[46px] flex items-center gap-2 rounded-full bg-card px-4">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
              placeholder="단어·문장 (인니어/한국어)"
              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => setVoiceLang((v) => (v === "ko" ? "id" : "ko"))}
              className="shrink-0 rounded-full border border-primary/40 px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary"
              title="음성 인식 언어 전환"
            >
              {voiceLang === "ko" ? "한" : "IN"}
            </button>
            <button
              type="button"
              onClick={startVoice}
              className={"shrink-0 " + (listening ? "text-red-500" : "text-muted-foreground")}
              title="음성 검색"
            >
              <Mic size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => goSearch()}
            className="shrink-0 w-[46px] h-[46px] rounded-full bg-white/15 border border-white/30 text-white text-[12px] font-gothic font-medium active:bg-white/30"
          >
            검색
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* ── 오늘의 인도네시아어 ── */}
        <section className="mt-3.5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => { if (phrase) navigate("/phrase?s=" + encodeURIComponent(phrase.id) + "&ko=" + encodeURIComponent(phrase.ko)); }}
            onKeyDown={(e) => { if (e.key === "Enter" && phrase) navigate("/phrase?s=" + encodeURIComponent(phrase.id) + "&ko=" + encodeURIComponent(phrase.ko)); }}
            className="rounded-2xl border border-border bg-card px-4 py-4 active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-1">
              <p className="flex-1 min-w-0 truncate text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Bahasa Hari Ini
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); refreshPhrase(kinds); }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                title="다른 문장 보기"
                aria-label="다른 문장 보기"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setKindSheetOpen(true); }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                title="어떤 문장을 볼지 고르기"
                aria-label="어떤 문장을 볼지 고르기"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {phraseLoading && !phrase ? (
              <div className="mt-3.5 space-y-2">
                <div className="h-4 w-4/5 rounded bg-muted" />
                <div className="h-3 w-3/5 rounded bg-muted" />
              </div>
            ) : phrase ? (
              <>
                <div className="mt-2.5 flex items-start gap-2">
                  <p className="flex-1 font-word text-[19px] font-medium leading-[1.5] text-foreground">
                    {phrase.id}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); speak(phrase.id); }}
                    className="mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-primary active:bg-muted"
                    title="발음 듣기"
                    aria-label="발음 듣기"
                  >
                    <Volume2 size={17} />
                  </button>
                </div>
                {phrase.ko ? (
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-muted-foreground">{phrase.ko}</p>
                ) : null}
                {phrase.ref ? (
                  <p className="mt-1.5 font-word text-[11.5px] text-muted-foreground">{phrase.ref}</p>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        {/* ── 단어장 ── */}
        <section className="mt-6">
          <SectionLabel>단어장</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {hasMyWordbook ? (
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => navigate("/category/" + MY_WORDBOOK_ID)}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left"
                >
                  <Star size={20} strokeWidth={1.6} className="shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] leading-tight text-foreground truncate">내 단어장</p>
                    <p className="mt-0.5 font-word text-[11.5px] text-muted-foreground truncate">
                      Kosakataku · {myWordCount}단어
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/study/" + MY_WORDBOOK_ID)}
                    className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[11px] font-gothic font-medium text-foreground/80 active:bg-muted"
                  >
                    카드
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/quiz/" + MY_WORDBOOK_ID)}
                    className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[11px] font-gothic font-medium text-foreground/80 active:bg-muted"
                  >
                    퀴즈
                  </button>
                </div>
              </div>
            ) : null}
            <Row
              icon={Library}
              title="단어장 폴더"
              sub="Kosakata"
              meta={folderCount > 0 ? folderCount + "권" : undefined}
              onClick={() => navigate("/wordbooks")}
              last
            />
          </div>
        </section>

        {/* ── 말씀과 기도 ── */}
        <section className="mt-6">
          <SectionLabel>말씀과 기도</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row icon={SunriseIcon} title="오늘의 묵상" sub="Saat Teduh" onClick={() => navigate("/devotion")} />
            <Row
              icon={BookOpen}
              title="성경 읽기"
              sub="Alkitab"
              meta={biblePos || undefined}
              onClick={() => navigate("/bible")}
            />
            <Row icon={Heart} title="기도문" sub="Doa" onClick={() => navigate("/prayer")} last />
          </div>
        </section>

        {/* ── 인도네시아 ── */}
        <section className="mt-6">
          <SectionLabel>인도네시아</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row icon={Newspaper} title="뉴스" sub="Berita" onClick={() => navigate("/news")} />
            <Row icon={ScrollText} title="이야기" sub="Cerita" onClick={() => navigate("/story")} />
            <Row icon={Compass} title="인도네시아 이해" sub="Wawasan" onClick={() => navigate("/insight")} last />
          </div>
        </section>
      </div>

      {kindSheetOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setKindSheetOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
            <h2 className="px-4 text-base font-semibold text-foreground">어떤 문장을 보시겠어요?</h2>
            <p className="px-4 pb-3.5 pt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              여러 개를 고르면 그중 하나가 무작위로 나옵니다.
            </p>
            <div className="border-t border-border">
              {PHRASE_KINDS.map((info) => {
                const on = kinds.indexOf(info.key) >= 0;
                return (
                  <button
                    key={info.key}
                    type="button"
                    onClick={() => toggleKind(info.key)}
                    className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-muted/60"
                  >
                    <span
                      className={
                        "flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-md border-2 " +
                        (on ? "border-primary bg-primary text-white" : "border-border text-transparent")
                      }
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-tight text-foreground">{info.ko}</span>
                      <span className="mt-0.5 block font-word text-[11.5px] text-muted-foreground">
                        {info.id}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setKindSheetOpen(false)}
              className="mx-4 mt-4 h-12 w-[calc(100%-2rem)] rounded-[13px] bg-primary text-[15px] font-medium text-white"
            >
              완료
            </button>
          </div>
        </>
      ) : null}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
