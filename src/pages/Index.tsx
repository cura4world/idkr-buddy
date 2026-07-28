import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, restoreSharedCategories } from "@/lib/store";
import { getBook } from "@/lib/bible";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import SettingsDialog from "@/components/SettingsDialog";
import {
  RotateCcw,
  Settings,
  Search,
  Mic,
  Star,
  Library,
  Sunrise,
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

/* 오늘의 인도네시아어 — 널리 쓰이는 속담·관용구.
   날짜를 기준으로 하나씩 돌아가며 보여줍니다 (API 호출 없음). */
const PERIBAHASA: { id: string; ko: string }[] = [
  { id: "Sedikit-sedikit, lama-lama menjadi bukit.", ko: "조금씩 모으다 보면 언덕이 됩니다. 티끌 모아 태산." },
  { id: "Air tenang menghanyutkan.", ko: "잔잔한 물이 (배를) 떠내려 보냅니다. 조용한 사람이 더 깊습니다." },
  { id: "Tak ada gading yang tak retak.", ko: "금 가지 않은 상아는 없습니다. 완벽한 사람은 없습니다." },
  { id: "Malu bertanya, sesat di jalan.", ko: "묻기를 부끄러워하면 길에서 헤맵니다." },
  { id: "Berakit-rakit ke hulu, berenang-renang ke tepian.", ko: "먼저 고생하고 나중에 즐깁니다. 고생 끝에 낙이 옵니다." },
  { id: "Di mana bumi dipijak, di situ langit dijunjung.", ko: "밟고 선 땅에서는 그곳의 하늘을 받듭니다. 그 고장의 법을 따르세요." },
  { id: "Sambil menyelam minum air.", ko: "잠수하면서 물도 마십니다. 일석이조." },
  { id: "Bersatu kita teguh, bercerai kita runtuh.", ko: "뭉치면 굳건하고 흩어지면 무너집니다." },
  { id: "Habis gelap terbitlah terang.", ko: "어둠이 지나면 빛이 떠오릅니다." },
  { id: "Buah jatuh tidak jauh dari pohonnya.", ko: "열매는 나무에서 멀리 떨어지지 않습니다. 그 아버지에 그 아들." },
  { id: "Tong kosong nyaring bunyinya.", ko: "빈 통이 소리가 큽니다. 빈 수레가 요란합니다." },
  { id: "Nasi sudah menjadi bubur.", ko: "밥이 이미 죽이 되었습니다. 엎지른 물입니다." },
  { id: "Seperti katak dalam tempurung.", ko: "껍데기 속 개구리 같습니다. 우물 안 개구리." },
  { id: "Ringan sama dijinjing, berat sama dipikul.", ko: "가벼우면 같이 들고, 무거우면 같이 집니다." },
  { id: "Tak kenal maka tak sayang.", ko: "알지 못하면 사랑하지 못합니다." },
  { id: "Sepandai-pandai tupai melompat, sekali waktu jatuh juga.", ko: "다람쥐도 언젠가는 떨어집니다. 원숭이도 나무에서 떨어집니다." },
  { id: "Rajin pangkal pandai.", ko: "부지런함이 지혜의 뿌리입니다." },
  { id: "Hemat pangkal kaya.", ko: "절약이 넉넉함의 뿌리입니다." },
  { id: "Ada gula, ada semut.", ko: "설탕이 있는 곳에 개미가 있습니다. 이익이 있는 곳에 사람이 모입니다." },
  { id: "Bagai pinang dibelah dua.", ko: "빈랑을 둘로 쪼갠 것 같습니다. 붕어빵처럼 닮았습니다." },
  { id: "Diam itu emas.", ko: "침묵은 금입니다." },
  { id: "Guru yang baik belajar seumur hidup.", ko: "좋은 선생은 평생 배웁니다." },
  { id: "Pelan-pelan saja, yang penting sampai.", ko: "천천히 가도 괜찮아요. 도착하는 게 중요하니까요." },
  { id: "Sedia payung sebelum hujan.", ko: "비 오기 전에 우산을 준비합니다. 유비무환." },
];

type RowProps = {
  icon: LucideIcon;
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
    <Icon size={20} strokeWidth={1.6} className="text-muted-foreground shrink-0" />
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
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const dayIndex = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(now.getFullYear(), 0, 1).getTime()) / 86400000
  );
  const today = PERIBAHASA[((dayIndex % PERIBAHASA.length) + PERIBAHASA.length) % PERIBAHASA.length];

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

  const handleRestore = () => {
    const restored = restoreSharedCategories();
    if (restored) {
      refresh();
      toast("공용 단어장이 복구되었습니다.");
    } else {
      toast("복구할 단어장이 없습니다.");
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
            <button type="button" onClick={() => setAddCatOpen(true)} className={iconBtn} title="단어장 추가">
              <span className="text-2xl font-light leading-none">+</span>
            </button>
            <button type="button" onClick={handleRestore} className={iconBtn} title="공용 단어장 복구">
              <RotateCcw size={18} />
            </button>
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
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Bahasa Hari Ini · 오늘의 인도네시아어
            </p>
            <p className="mt-3 font-word text-[19px] font-medium leading-[1.5] text-foreground">
              {today.id}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-muted-foreground">{today.ko}</p>
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
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate("/study/" + MY_WORDBOOK_ID)}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-gothic font-medium text-foreground/80 active:bg-muted"
                  >
                    카드
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/quiz/" + MY_WORDBOOK_ID)}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-gothic font-medium text-foreground/80 active:bg-muted"
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
            <Row icon={Sunrise} title="오늘의 묵상" sub="Saat Teduh" onClick={() => navigate("/devotion")} />
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

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
    </div>
  );
};

export default Index;
