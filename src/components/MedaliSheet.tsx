// src/components/MedaliSheet.tsx
// 훈장 팝업. 명찰 캡슐을 누르면 아래에서 올라옵니다.
// 사용자가 점수를 보는 유일한 창입니다 — 읽기·사전·담기처럼 조용히 쌓인 점수가 여기서 처음 보입니다.
// 보기만 하는 화면이라 여기서 점수가 오르는 일은 없습니다.
//
// 히스토리(폰 뒤로가기)는 이 컴포넌트가 다루지 않습니다 (WordbookPickerSheet와 같은 규칙).

import { useEffect, useState } from "react";
import { Flame, Star, X } from "lucide-react";
import {
  medaliEngine,
  listWeekLogs,
  listWordRecords,
  apiColorFor,
  MEDALI_COLORS,
  API_CUTOFFS,
  BINTANG_CUTOFFS,
  DAILY_CAPS,
  dateKey,
  mondayOf,
  loadMedaliCache,
} from "@/lib/medali";
import type { MedaliColor, DailyLog, WordRecord, ApiCategory } from "@/lib/medali";

// 아이콘 외곽선 — 명찰 캡슐과 같은 값 (어두운 색 단계에서도 형태가 보이도록)
const STROKE = "rgba(255,255,255,0.55)";

const COLOR_NAME: Record<MedaliColor, string> = {
  tanah: "Tanah",
  perunggu: "Perunggu",
  perak: "Perak",
  emas: "Emas",
  platina: "Platina",
  permata: "Permata",
};

const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III" };

const EXIT_MS = 260;   // 내려가는 연출 길이 (아래 transition duration과 같아야 합니다)

const DAY_LABELS = ["월", "화", "수", "목", "금", "토"];

const SOURCE_LABEL: Record<string, string> = {
  wordbook: "단어장",
  lookup: "찾아본",
  seed: "기본",
};

// 오늘 내역 7줄. dict·popup·save는 "사전·단어" 한 줄로 합칩니다.
interface TodayRow {
  key: string;
  label: string;
  cats: ApiCategory[];
  help: string;
}

const TODAY_ROWS: TodayRow[] = [
  {
    key: "reading",
    label: "읽기",
    cats: ["reading"],
    help: "인니어 면에서 읽은 시간이 1분에 2점, 한국어 면을 열면 확정돼요.",
  },
  { key: "game", label: "게임", cats: ["game"], help: "짝맞추기·스피드 O/X 한 판을 끝내면 3점이에요." },
  { key: "quiz", label: "퀴즈", cats: ["quiz"], help: "단어장 퀴즈를 끝까지 풀면 5점이에요." },
  { key: "percakapan", label: "회화", cats: ["percakapan"], help: "회화 전체 듣기를 끝까지 들으면 3점이에요." },
  { key: "phrase", label: "오늘의 문장", cats: ["phrase"], help: "Bahasa Hari Ini 문장을 열어 보면 2점이에요." },
  {
    key: "words",
    label: "사전·단어",
    cats: ["dict", "popup", "save"],
    help: "처음 보는 단어를 찾거나 눌러보거나 담으면 1점씩이에요.",
  },
  { key: "explore", label: "탐험", cats: ["explore"], help: "지도·인도네시아 이해를 2분 구경하면 1점이에요." },
];

const capOf = (cats: ApiCategory[]): number => cats.reduce((sum, c) => sum + (DAILY_CAPS[c] || 0), 0);

const pointsOf = (log: DailyLog | null, cats: ApiCategory[]): number => {
  if (!log || !log.points) return 0;
  return cats.reduce((sum, c) => sum + (log.points[c] || 0), 0);
};

// 다음 Api 색과 거기까지 남은 점수
function nextApiStep(points: number): { color: MedaliColor; need: number; from: number } | null {
  // API_CUTOFFS는 높은 색부터 정렬돼 있습니다
  let next: { color: MedaliColor; min: number } | null = null;
  for (const c of API_CUTOFFS) {
    if (points < c.min) next = c;
  }
  if (!next) return null;
  let from = 0;
  for (const c of API_CUTOFFS) {
    if (points >= c.min && c.min > from) from = c.min;
  }
  return { color: next.color, need: next.min - points, from };
}

// 다음 Bintang 세부 단계와 거기까지 남은 개수
function nextBintangStep(count: number): { color: MedaliColor; tier: 1 | 2 | 3; need: number; from: number } | null {
  let next: { color: MedaliColor; tier: 1 | 2 | 3; min: number } | null = null;
  for (const c of BINTANG_CUTOFFS) {
    if (count < c.min) next = c;
  }
  if (!next) return null;
  let from = 0;
  for (const c of BINTANG_CUTOFFS) {
    if (count >= c.min && c.min > from) from = c.min;
  }
  return { color: next.color, tier: next.tier, need: next.min - count, from };
}

const pct = (value: number, from: number, to: number): number => {
  if (to <= from) return 100;
  const p = ((value - from) / (to - from)) * 100;
  return Math.max(4, Math.min(100, p));
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MedaliSheet({ open, onOpenChange }: Props) {
  const [snap, setSnap] = useState(() => {
    const c = loadMedaliCache();
    return {
      apiColor: c.apiColor,
      apiWeekPoints: 0,
      streak: 0,
      bintangColor: c.bintangColor,
      bintangTier: c.bintangTier,
      confirmedCount: 0,
    };
  });
  const [tab, setTab] = useState<"api" | "bintang">("api");
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);   // 막대를 탭하면 그날 점수 한 줄
  const [openRow, setOpenRow] = useState<string | null>(null);   // 내역 행 도움말
  const [shown, setShown] = useState(open);        // 렌더를 유지할지 (퇴장 연출 동안 true)
  const [entered, setEntered] = useState(false);   // 올라온 상태인지

  useEffect(() => {
    return medaliEngine.subscribe((s) => setSnap(s));
  }, []);

  // 열릴 때마다 처음 상태로 (항상 Api 탭) + 최신 값으로 다시 계산
  useEffect(() => {
    if (!open) return;
    setTab("api");
    setOpenDay(null);
    setOpenRow(null);
    medaliEngine.refresh();
    listWeekLogs().then(setLogs).catch(() => setLogs([]));
    listWordRecords().then(setWords).catch(() => setWords([]));
  }, [open]);

  // 올라오고 내려가는 연출. 닫힐 때도 애니메이션이 끝난 뒤에 사라지도록
  // open 이 false 가 돼도 EXIT_MS 동안은 렌더를 유지합니다.
  useEffect(() => {
    if (open) {
      setShown(true);
      // 첫 프레임에 "아래에 있는 상태"가 그려져야 올라오는 게 보입니다 (rAF 2번)
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        if (inner) cancelAnimationFrame(inner);
      };
    }
    setEntered(false);
    const t = window.setTimeout(() => setShown(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!shown) return null;

  // 내려가는 중에는 닫기를 다시 부르지 않습니다
  const requestClose = () => {
    if (!entered) return;
    onOpenChange(false);
  };

  const apiHex = MEDALI_COLORS[snap.apiColor];
  const bintangHex = MEDALI_COLORS[snap.bintangColor];

  // ── 요일 막대 (월~토). 색은 "그날 밤 기준 누적 주간 점수"의 도달 색입니다.
  const monday = mondayOf(new Date());
  const todayKey = dateKey(new Date());
  const byDate = new Map<string, DailyLog>();
  for (const l of logs) byDate.set(l.date, l);

  let running = 0;
  const bars = DAY_LABELS.map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = dateKey(d);
    const total = (byDate.get(key) || { total: 0 }).total || 0;
    running += total;
    return {
      label,
      key,
      total,
      color: total > 0 ? MEDALI_COLORS[apiColorFor(running)] : "",
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
  const barMax = Math.max(30, ...bars.map((b) => b.total));

  const todayLog = byDate.get(todayKey) || null;
  const apiNext = nextApiStep(snap.apiWeekPoints);
  const bintangNext = nextBintangStep(snap.confirmedCount);

  const confirmedWords = words
    .filter((w) => w && w.status === "confirmed")
    .sort((a, b) => (b.confirmedAt || 0) - (a.confirmedAt || 0))
    .slice(0, 5);
  const recheckCount = words.filter((w) => w && w.status === "recheck").length;

  return (
    <>
      <div
        className={
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 " +
          (entered ? "opacity-100" : "opacity-0")
        }
        onClick={requestClose}
      />
      <div
        className={
          "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 " +
          "transition-transform ease-out duration-[260ms] " +
          (entered ? "translate-y-0" : "translate-y-full")
        }
      >
        <div className="relative">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
          {/* 닫기는 히스토리를 직접 만지지 않고 여는 쪽(Index)에 맡깁니다 — 뒤로가기와 같은 경로 */}
          <button
            type="button"
            onClick={requestClose}
            className="absolute right-3 -top-0.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>

        {/* 탭 — 고르지 않은 쪽 아이콘도 지금 훈장 색으로 칠해 둡니다 */}
        <div className="flex border-b border-border px-4">
          <button
            type="button"
            onClick={() => setTab("api")}
            className={
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[0.8125rem] font-gothic " +
              (tab === "api"
                ? "border-b-2 border-primary font-semibold text-foreground"
                : "border-b-2 border-transparent text-muted-foreground")
            }
          >
            <Flame size={16} color={apiHex} fill={apiHex} strokeWidth={1.5} />
            Api
          </button>
          <button
            type="button"
            onClick={() => setTab("bintang")}
            className={
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[0.8125rem] font-gothic " +
              (tab === "bintang"
                ? "border-b-2 border-primary font-semibold text-foreground"
                : "border-b-2 border-transparent text-muted-foreground")
            }
          >
            <Star size={16} color={bintangHex} fill={bintangHex} strokeWidth={1.5} />
            Bintang
          </button>
        </div>

        {/* 탭을 바꿔도 시트 높이가 출렁이지 않게 고정합니다 (내용이 넘치면 안에서 스크롤) */}
        <div className="h-[72dvh] overflow-y-auto px-4">
          {tab === "api" ? (
            <div className="pt-5">
              {/* 지금 색 */}
              <div className="flex items-center gap-3">
                <Flame size={44} color={STROKE} fill={apiHex} strokeWidth={1.5} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-word text-[1.25rem] leading-tight text-foreground">
                    {COLOR_NAME[snap.apiColor]}
                  </p>
                  <p className="mt-0.5 text-[0.78125rem] text-muted-foreground">
                    이번 주 {snap.apiWeekPoints}점 · 연속 {snap.streak}일
                  </p>
                </div>
              </div>

              {/* 다음 색까지 */}
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: apiNext
                        ? pct(snap.apiWeekPoints, apiNext.from, snap.apiWeekPoints + apiNext.need) + "%"
                        : "100%",
                      backgroundColor: apiNext ? MEDALI_COLORS[apiNext.color] : apiHex,
                    }}
                  />
                </div>
                <p className="mt-1 text-right text-[0.6875rem] text-muted-foreground">
                  {apiNext ? COLOR_NAME[apiNext.color] + "까지 " + apiNext.need + "점" : "최고 단계"}
                </p>
              </div>

              {/* 요일 막대 (월~토) */}
              <div className="mt-5">
                <div className="flex h-20 items-end gap-2">
                  {bars.map((b, i) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setOpenDay(openDay === i ? null : i)}
                      className="flex flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span
                        className={"w-full rounded-md " + (b.total > 0 ? "" : "bg-border")}
                        style={{
                          height: Math.max(4, Math.round((b.total / barMax) * 60)) + "px",
                          backgroundColor: b.total > 0 ? b.color : undefined,
                          opacity: b.isFuture ? 0.4 : 1,
                        }}
                      />
                      <span
                        className={
                          "text-[0.6875rem] font-gothic " +
                          (b.isToday ? "font-semibold text-foreground" : "text-muted-foreground")
                        }
                      >
                        {b.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 h-4 text-center text-[0.6875rem] text-muted-foreground">
                  {openDay !== null ? bars[openDay].label + " · " + bars[openDay].total + "점" : ""}
                </p>
              </div>

              {/* 오늘 내역 */}
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  오늘
                </p>
                {TODAY_ROWS.map((row) => {
                  const got = pointsOf(todayLog, row.cats);
                  const cap = capOf(row.cats);
                  const full = got >= cap;
                  return (
                    <div key={row.key}>
                      <button
                        type="button"
                        onClick={() => setOpenRow(openRow === row.key ? null : row.key)}
                        className="flex w-full items-center gap-2 py-2 text-left"
                      >
                        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">
                          {row.label}
                        </span>
                        {full ? (
                          <span
                            className="shrink-0 text-[0.6875rem] font-gothic"
                            style={{ color: MEDALI_COLORS.perunggu }}
                          >
                            상한
                          </span>
                        ) : null}
                        <span
                          className="shrink-0 font-word text-[0.8125rem] tabular-nums"
                          style={{ color: full ? MEDALI_COLORS.perunggu : undefined }}
                        >
                          {got} / {cap}
                        </span>
                      </button>
                      {openRow === row.key ? (
                        <p className="pb-2 text-[0.71875rem] leading-relaxed text-muted-foreground">
                          {row.help}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 pb-1 text-center text-[0.6875rem] leading-relaxed text-muted-foreground">
                Api는 월요일에 다시 시작해요. 주일은 쉬어요.
              </p>
            </div>
          ) : (
            <div className="pt-5">
              {/* 지금 단계 */}
              <div className="flex items-center gap-3">
                <Star size={44} color={STROKE} fill={bintangHex} strokeWidth={1.5} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-word text-[1.25rem] leading-tight text-foreground">
                    {COLOR_NAME[snap.bintangColor]} {ROMAN[snap.bintangTier]}
                  </p>
                  <p className="mt-0.5 text-[0.78125rem] text-muted-foreground">
                    확정 단어 {snap.confirmedCount}개
                  </p>
                </div>
              </div>

              {/* 다음 단계까지 */}
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: bintangNext
                        ? pct(snap.confirmedCount, bintangNext.from, snap.confirmedCount + bintangNext.need) + "%"
                        : "100%",
                      backgroundColor: bintangNext ? MEDALI_COLORS[bintangNext.color] : bintangHex,
                    }}
                  />
                </div>
                <p className="mt-1 text-right text-[0.6875rem] text-muted-foreground">
                  {bintangNext ? "다음까지 " + bintangNext.need + "개" : "최고 단계"}
                </p>
              </div>

              {/* 최근 별이 된 단어 */}
              <div className="mt-5 border-t border-border pt-3">
                <p className="mb-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  최근 별이 된 단어
                </p>
                {confirmedWords.length === 0 ? (
                  <p className="py-2 text-[0.78125rem] leading-relaxed text-muted-foreground">
                    아직 없어요 — 게임에서 만들어져요
                  </p>
                ) : (
                  confirmedWords.map((w) => (
                    <div key={w.word} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1 truncate font-word text-[0.875rem] text-foreground">
                        {w.word}
                      </span>
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-gothic text-[0.6875rem] text-muted-foreground">
                        {SOURCE_LABEL[w.source] || "기타"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {recheckCount > 0 ? (
                <p className="mt-3 pb-1 text-center text-[0.6875rem] leading-relaxed text-muted-foreground">
                  재검증 대기 {recheckCount}개 — 게임에서 다시 만나요
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
