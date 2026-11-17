// src/pages/InsightCard.tsx
// 오늘의 카드 안쪽 화면 (/insight/card/<날짜>, 2026-11-17 결정 문서 ⑥, 시안 card-detail)
//   그림·제목 → 자세한 설명(6문장 안쪽) → 인도네시아어 한 마디 + 듣기 → 관련 단어(누르면 사전) → 지난 카드 → 오류 신고
// 글은 서버가 만들어 확인까지 마친 것을 받아 보여 주기만 합니다(lib/dailyCard.ts). 이 화면에서는 AI 를 부르지 않습니다
// (한 마디 듣기만 공용 음성 — 단어 발음과 같은 "say:" 키라 word-audio 로 셉니다).

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronRight, Loader2, Pause, Volume2 } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { ReadingTracker } from "@/lib/readingTimer";
import { ttsPlayer } from "@/lib/tts";
import AiReportButton from "@/components/AiReportButton";
import DailyCardImage from "@/components/DailyCardImage";
import {
  DailyCard, DailyCardListItem, cardDateLabel, isCardDate, kstToday, loadCard, loadCardList, loadTodayCard,
} from "@/lib/dailyCard";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-6 mb-2 font-gothic text-[0.8125rem] font-bold tracking-[0.02em] text-[#3B4245]">{children}</p>
);

const CARD_SHADOW = { boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

const InsightCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ date: string }>();
  const wanted = params.date && isCardDate(params.date) ? params.date : "";

  const [card, setCard] = useState<DailyCard | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  const [past, setPast] = useState<DailyCardListItem[]>([]);
  const [tts, setTts] = useState<{ state: string; key: string | null }>({ state: "idle", key: null });

  // 탐험 점수(보이지 않음) — 예전 생활 정보와 같은 방식: 2분 구경 = 1점
  const trackerRef = useRef<ReadingTracker | null>(null);
  useEffect(() => {
    const t = new ReadingTracker(() => {}, {
      category: "explore",
      secPerPoint: 120,
      pointsPerUnit: 1,
      bonus: 0,
      autoUnlock: true,
    });
    trackerRef.current = t;
    t.attach();
    t.setSide(true);
    return () => {
      t.dispose();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setState("loading");
    (wanted ? loadCard(wanted) : loadTodayCard()).then((c) => {
      if (!alive) return;
      setCard(c);
      setState(c ? "ok" : "none");
      if (c && trackerRef.current) trackerRef.current.setUnit("insight-card:" + c.d);
      try { window.scrollTo(0, 0); } catch (e) {}
    });
    return () => {
      alive = false;
    };
  }, [wanted]);

  useEffect(() => {
    if (!card) return;
    let alive = true;
    loadCardList().then((r) => {
      if (!alive) return;
      setPast(r.items.filter((e) => e.d !== card.d).slice(0, 3));
    });
    return () => {
      alive = false;
    };
  }, [card]);

  // 한 마디 듣기 상태
  useEffect(() => {
    const off = ttsPlayer.subscribe((s) => setTts({ state: s.state, key: s.key }));
    return () => {
      off();
      try {
        const s = ttsPlayer.getState();
        if (s.key && s.key.indexOf("say:") === 0) ttsPlayer.stop();
      } catch (e) {}
    };
  }, []);

  const phraseKey = card ? "say:" + card.phrase.id : "";
  const phraseState = tts.key === phraseKey ? tts.state : "idle";
  const playPhrase = () => {
    if (!card || !card.phrase.id) return;
    ttsPlayer.toggle(phraseKey, card.phrase.id).catch(() => {});
  };

  const openWord = (w: string) => {
    navigate("/dictionary?q=" + encodeURIComponent(w) + "&from=card");
  };

  const openCard = (d: string) => {
    navigate("/insight/card/" + d);
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-12">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/insight")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">KARTU HARI INI</h1>
      </header>

      {state === "loading" ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : null}

      {state === "none" ? (
        <div className="text-center py-20 px-8">
          <p className="font-gothic text-sm text-muted-foreground leading-relaxed">
            카드를 불러오지 못했습니다.
            <br />
            인터넷 연결을 확인한 뒤 다시 열어 보세요.
          </p>
        </div>
      ) : null}

      {state === "ok" && card ? (
        <>
          <div className="bg-[#F9F2E1] flex justify-center pt-4 pb-2">
            <DailyCardImage d={card.d} has={card.img} size={150} rounded={0} />
          </div>

          <div className="px-5 pt-4">
            <div className="flex items-center gap-2">
              {card.chip ? (
                <span className="inline-block font-gothic text-[0.71875rem] leading-none text-[#1E8A99] bg-[#E2F4F6] rounded-full px-2.5 py-[4px]">
                  {card.chip}
                </span>
              ) : null}
              <span className="font-gothic text-[0.75rem] text-[#8A9398]">
                {card.d === kstToday() ? "오늘의 카드" : cardDateLabel(card.d)}
              </span>
            </div>
            <h2 className="mt-2.5 mb-3 font-gothic text-[1.125rem] font-bold leading-snug text-foreground break-keep">{card.title}</h2>

            <div>
              {card.body.map((p, i) => (
                <p key={i} className="font-gothic text-[0.90625rem] leading-[1.75] text-[#3B4245] mb-2.5 break-keep">
                  {p}
                </p>
              ))}
            </div>

            {card.phrase.id ? (
              <div className="mt-4 bg-card rounded-2xl pl-4 pr-3.5 py-3.5 flex items-center gap-3" style={CARD_SHADOW}>
                <div className="flex-1 min-w-0">
                  <p className="font-word text-[0.96875rem] leading-snug text-[#1E6F7B]">{card.phrase.id}</p>
                  <p className="mt-0.5 font-gothic text-[0.78125rem] text-[#7A848A]">{card.phrase.ko}</p>
                </div>
                <button
                  type="button"
                  onClick={playPhrase}
                  className="w-[38px] h-[38px] rounded-full bg-[#E2F4F6] text-[#1E8A99] flex items-center justify-center shrink-0 active:opacity-80"
                  title="듣기"
                >
                  {phraseState === "loading" ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : phraseState === "playing" ? (
                    <Pause size={16} />
                  ) : (
                    <Volume2 size={17} />
                  )}
                </button>
              </div>
            ) : null}

            {card.words.length ? (
              <>
                <SectionTitle>관련 단어</SectionTitle>
                <div className="bg-card rounded-2xl overflow-hidden" style={CARD_SHADOW}>
                  {card.words.map((w, i) => (
                    <button
                      key={w.id + i}
                      type="button"
                      onClick={() => openWord(w.id)}
                      className={
                        "w-full flex items-center gap-3 pl-4 pr-3.5 py-3 text-left active:bg-muted/60 " +
                        (i < card.words.length - 1 ? "border-b border-[#EEF1F3]" : "")
                      }
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-word text-[0.9375rem] text-foreground">{w.id}</span>
                        <span className="block mt-px font-gothic text-[0.78125rem] text-[#7A848A]">{w.ko}</span>
                      </span>
                      <span className="flex items-center gap-1 font-gothic text-[0.75rem] text-[#1E8A99] shrink-0">
                        <BookOpen size={13} /> 사전
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {past.length ? (
              <>
                <SectionTitle>지난 카드</SectionTitle>
                <div className="flex gap-2.5">
                  {past.map((e) => (
                    <button
                      key={e.d}
                      type="button"
                      onClick={() => openCard(e.d)}
                      className="flex-1 min-w-0 bg-[#F9F2E1] rounded-[14px] px-2 pt-2 pb-2.5 flex flex-col items-center text-center active:opacity-90"
                      style={CARD_SHADOW}
                    >
                      <DailyCardImage d={e.d} has={e.img} size={60} rounded={10} />
                      <span className="mt-1.5 w-full truncate font-gothic text-[0.71875rem] text-[#4D575C]">{e.title}</span>
                      <span className="block font-gothic text-[0.65625rem] text-[#9AA2A7]">{cardDateLabel(e.d)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => navigate("/insight/cards")}
              className="mt-3 w-full flex items-center justify-center gap-0.5 font-gothic text-[0.8125rem] text-[#1E8A99] py-2"
            >
              지난 카드 모두 보기 <ChevronRight size={15} />
            </button>

            {/* AI 가 만든 글 신고 — 스토어 앱(공개판)에서만 보입니다 */}
            <div className="mt-4 flex justify-center">
              <AiReportButton
                feature="card"
                input={card.d + " " + card.title}
                output={[card.summary].concat(card.body).concat([card.phrase.id + " = " + card.phrase.ko]).join("\n")}
                label="내용이 이상합니다"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default InsightCard;
