// src/components/MedaliSheet.tsx
// 훈장 창 — 보기가 두 가지입니다(2026-11-24 Arga 승인 "훈장 창 정리").
//   view="summary" 요약 창: 공개판 홈 명찰·게임방 명찰. 불꽃·별 칸 두 개 + 월~일 작은 막대 + 지난주 비교 한 줄. 탭·설명·단추 없음,
//                  360px·글자 100% 에서 창 안 스크롤 없이 다 보이게.
//   view="detail"  자세히 창: 내 정보 훈장 칸(관리자판·회원판은 내 정보로 갈 길이 없어 명찰도 이것). 알약 탭 "불꽃 / 별",
//                  단계 줄·진행 막대 → 불꽃(요일 막대·오늘 쌓인 점수·색 사다리) / 별(최근 별이 된 단어·별의 단계 6줄·다시 확인할 단어).
//                  설명 문단은 넣지 않습니다 — 설명은 내 정보 ⓘ 말풍선(lib/medaliHelp.ts)에만.
// 계산(점수·단계·요일 막대·다음 단계)은 이 파일 위쪽 한 곳에서 하고 두 보기가 같이 씁니다. 보기만 하는 창이라 점수가 오르는 일은 없습니다.
// 글꼴은 모두 Pretendard(font-gothic). 단계 이름(Perunggu 등)도 라벨이라 Pretendard, 외운 인니어 단어만 font-word.
//
// 히스토리(폰 뒤로가기)는 이 컴포넌트가 다루지 않습니다 — 여는 쪽(Index·Permainan·MyInfo)이 합니다(WordbookPickerSheet와 같은 규칙).

import { useEffect, useState } from "react";
import { Flame, Medal, Star } from "lucide-react";
import AppSheet from "@/components/sheet/AppSheet";
import { MedaliWeekCompareText, useMedaliWeekCompare } from "@/components/MedaliWeekCompare";
import {
  medaliEngine,
  listWeekLogs,
  listWordRecords,
  effectiveStatus,
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
import { MEDALI_HELP, MEDALI_LADDER } from "@/lib/medaliHelp";

// 아이콘 외곽선 — 명찰 캡슐과 같은 값 (어두운 색 단계에서도 형태가 보이도록)
const STROKE = "rgba(255,255,255,0.55)";

// 글자 색 (내 정보와 같은 값)
const INK = "#1D1F1E";
const MUTED = "#646C72";
const FAINT = "#9AA1A6";
const LINE = "#E3E8EB";
const TEAL = "#2C6D63";
const FULL = "#C0532A"; // 상한을 채운 줄(주홍) — 흰 바탕 대비 4.65:1

// 불꽃·별 칸 색 — 내 정보 훈장 칸과 같은 값(바탕·제목·제목 옆 그림). 진행 막대 채움도 그림 색(icon)으로 통일(2026-11-24).
// 제목은 칸 바탕 대비 4.5:1 이상으로 한 단계 진하게(2026-11-24): 불꽃 #A35A36 4.64:1(예전 #B5643C 3.89:1), 별 #886935 4.69:1(예전 #94723A 4.08:1)
const CELL = {
  api: { bg: "#FBF1EC", title: "#A35A36", icon: "#E8875A", sub: "#8A6A5A" },
  bintang: { bg: "#FBF5E6", title: "#886935", icon: "#E0B04A", sub: "#8A7A55" },
};

const COLOR_NAME: Record<MedaliColor, string> = {
  tanah: "Tanah",
  perunggu: "Perunggu",
  perak: "Perak",
  emas: "Emas",
  platina: "Platina",
  permata: "Permata",
};

const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III" };

// 2026-11-24 부터 주일도 점수가 쌓이므로 일요일 막대까지 7개입니다
const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// 막대 위 표기: 60분 미만은 "45분", 그 이상은 막대 폭에 맞게 소수 한 자리 시간 "4.9시간"(올림 없이 버림 — 4시간 58분 = 4.9시간).
// 2026-11-24 까지는 "45"·"4:58"(시:분)이라 아래 설명 "(분)"과 맞지 않았다.
function usageLabel(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m <= 0) return "";
  if (m < 60) return m + "분";
  return (Math.floor(m / 6) / 10).toFixed(1) + "시간";
}

// 막대를 탭했을 때 한 줄에 쓰는 풀 표기.
function usageText(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m <= 0) return "";
  if (m < 60) return m + "분";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? h + "시간 " + rest + "분" : h + "시간";
}

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
    help: "인도네시아어 면에서 읽은 시간이 1분에 2점이고, 한국어 면을 열면 확정됩니다.",
  },
  { key: "game", label: "게임", cats: ["game"], help: "게임 한 판을 끝내면 3점입니다." },
  { key: "quiz", label: "퀴즈", cats: ["quiz"], help: "단어장 퀴즈를 끝까지 풀면 5점입니다." },
  { key: "percakapan", label: "회화집", cats: ["percakapan"], help: "대화 한 편의 전체 듣기를 끝까지 들으면 3점입니다." },
  { key: "phrase", label: "오늘의 문장", cats: ["phrase"], help: "오늘의 문장을 열어 보면 2점입니다." },
  {
    key: "words",
    label: "사전·단어",
    cats: ["dict", "popup", "save"],
    help: "처음 보는 단어를 찾거나 눌러보거나 담으면 1점씩입니다.",
  },
  { key: "explore", label: "지도·이해", cats: ["explore"], help: "지도·인도네시아 이해를 2분 구경하면 1점입니다." },
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

// 칸 제목 옆 그림 — 내 정보 훈장 칸과 같은 모양
const CellFlame = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden="true" className="shrink-0">
    <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" />
  </svg>
);
const CellStar = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden="true" className="shrink-0">
    <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z" />
  </svg>
);

/** 얇은 진행 막대 */
const ProgressBar = ({ widthPct, color, track = "rgba(0,0,0,0.07)", height = 4 }: { widthPct: number; color: string; track?: string; height?: number }) => (
  <div className="w-full overflow-hidden" style={{ height, borderRadius: height, background: track }} aria-hidden="true">
    <div style={{ height, borderRadius: height, width: widthPct + "%", background: color }} />
  </div>
);

/** 작은 회색 굵은 라벨(내 정보 섹션 제목과 같은 모양) */
const Label = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <p style={Object.assign({ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.02em", color: "#7A8287" }, style || {})}>
    {children}
  </p>
);

export type MedaliSheetView = "summary" | "detail";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 요약 창(명찰) / 자세히 창(내 정보). 기본은 자세히 창 */
  view?: MedaliSheetView;
}

export default function MedaliSheet({ open, onOpenChange, view = "detail" }: Props) {
  const [snap, setSnap] = useState(() => {
    const c = loadMedaliCache();
    return {
      apiColor: c.apiColor,
      apiWeekPoints: c.apiWeekPoints,
      streak: 0,
      bintangColor: c.bintangColor,
      bintangTier: c.bintangTier,
      confirmedCount: c.confirmedCount,
    };
  });
  const [tab, setTab] = useState<"api" | "bintang">("api");
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);   // 막대를 탭하면 그날 점수 한 줄
  const [openRow, setOpenRow] = useState<string | null>(null);   // 내역 행 도움말
  const weekCmp = useMedaliWeekCompare(open && view === "summary");

  useEffect(() => {
    return medaliEngine.subscribe((s) => setSnap(s));
  }, []);

  // 열릴 때마다 처음 상태로 (항상 불꽃 탭) + 최신 값으로 다시 계산
  useEffect(() => {
    if (!open) return;
    setTab("api");
    setOpenDay(null);
    setOpenRow(null);
    medaliEngine.refresh();
    listWeekLogs().then(setLogs).catch(() => setLogs([]));
    listWordRecords().then(setWords).catch(() => setWords([]));
  }, [open]);

  // 올라오고 내려가는 움직임과 뒤 화면 잠금은 앱 공통 틀(AppSheet)이 합니다(2026-11-24).
  const requestClose = () => {
    if (!open) return;
    onOpenChange(false);
  };

  // ── 계산 (두 보기 공용) ─────────────────────────────────────────
  const apiHex = MEDALI_COLORS[snap.apiColor];
  const bintangHex = MEDALI_COLORS[snap.bintangColor];

  // 요일 막대 (월~일). 색은 "그날 밤 기준 누적 주간 점수"의 도달 색입니다.
  const monday = mondayOf(new Date());
  const todayKey = dateKey(new Date());
  const byDate = new Map<string, DailyLog>();
  for (const l of logs) byDate.set(l.date, l);

  let running = 0;
  const bars = DAY_LABELS.map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = dateKey(d);
    const dayLog = byDate.get(key);
    const total = (dayLog || { total: 0 }).total || 0;
    const usageMs = (dayLog && dayLog.usageMs) || 0;
    running += total;
    return {
      label,
      key,
      total,
      usageMs,
      color: total > 0 ? MEDALI_COLORS[apiColorFor(running)] : "",
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
  const barMax = Math.max(30, ...bars.map((b) => b.total));

  const todayLog = byDate.get(todayKey) || null;
  const apiNext = nextApiStep(snap.apiWeekPoints);
  const bintangNext = nextBintangStep(snap.confirmedCount);
  const apiPct = apiNext ? pct(snap.apiWeekPoints, apiNext.from, snap.apiWeekPoints + apiNext.need) : 100;
  // 진행 막대 채움은 칸 그림 색 하나로(2026-11-24 — 예전에는 다음 단계 색, 마지막 단계면 지금 색이라 회색·암갈색이 섞였음)
  const apiBarColor = CELL.api.icon;
  const bintangPct = bintangNext ? pct(snap.confirmedCount, bintangNext.from, snap.confirmedCount + bintangNext.need) : 100;
  const bintangBarColor = CELL.bintang.icon;
  // 다음 단계 문구 — 요약·자세히 두 창이 같은 글(2026-11-24): "Perak까지 43점" / "Tanah I까지 6개", 마지막 단계는 "가장 높은 단계"
  const apiNextText = apiNext ? COLOR_NAME[apiNext.color] + "까지 " + apiNext.need + "점" : "가장 높은 단계";
  const bintangNextText = bintangNext
    ? COLOR_NAME[bintangNext.color] + " " + ROMAN[bintangNext.tier] + "까지 " + bintangNext.need + "개"
    : "가장 높은 단계";
  const apiStageName = COLOR_NAME[snap.apiColor];
  const bintangStageName = COLOR_NAME[snap.bintangColor] + " " + ROMAN[snap.bintangTier];

  // 확정 후 60일이 지난 단어는 저장값이 confirmed라도 재검증 대기로 셉니다
  const nowMs = Date.now();
  const confirmedWords = words
    .filter((w) => w && effectiveStatus(w, nowMs) === "confirmed")
    .sort((a, b) => (b.confirmedAt || 0) - (a.confirmedAt || 0))
    .slice(0, 5);
  const recheckCount = words.filter((w) => {
    if (!w) return false;
    const st = effectiveStatus(w, nowMs);
    return st === "recheck" || st === "monitoring";
  }).length;

  // ── 요약 창 ─────────────────────────────────────────────────────
  if (view === "summary") {
    return (
      <AppSheet
        open={open}
        onClose={requestClose}
        title="훈장"
        icon={<Medal size={20} strokeWidth={1.8} />}
        bodyPadding="4px 16px calc(16px + env(safe-area-inset-bottom))"
      >
        <div className="font-gothic" data-medali-view="summary" style={{ color: INK }}>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            {/* 불꽃 칸 */}
            <div style={{ borderRadius: 14, background: CELL.api.bg, padding: "10px 10px 10px 12px" }}>
              <p className="flex items-center" style={{ margin: 0, gap: 5, fontSize: "0.75rem", fontWeight: 700, color: CELL.api.title }}>
                <CellFlame color={CELL.api.icon} />
                이번 주 불꽃
              </p>
              <p className="tabular-nums" style={{ margin: "2px 0 0", fontSize: "1.3125rem", fontWeight: 700, lineHeight: 1.3 }}>
                {snap.apiWeekPoints}
                <span style={{ fontSize: "0.71875rem", fontWeight: 500, color: MUTED }}> 점</span>
              </p>
              <p className="flex items-center break-keep" style={{ margin: "2px 0 0", gap: 4, fontSize: "0.71875rem", fontWeight: 600, lineHeight: 1.4, color: CELL.api.sub }}>
                <Flame size={14} color={STROKE} fill={apiHex} strokeWidth={1.5} className="shrink-0" />
                <span>{apiStageName} · 연속 {snap.streak}일</span>
              </p>
              <div style={{ marginTop: 7 }}>
                <ProgressBar widthPct={apiPct} color={apiBarColor} />
              </div>
              <p className="tabular-nums" style={{ margin: "4px 0 0", fontSize: "0.6875rem", color: MUTED }}>
                {apiNextText}
              </p>
            </div>
            {/* 별 칸 */}
            <div style={{ borderRadius: 14, background: CELL.bintang.bg, padding: "10px 10px 10px 12px" }}>
              <p className="flex items-center" style={{ margin: 0, gap: 5, fontSize: "0.75rem", fontWeight: 700, color: CELL.bintang.title }}>
                <CellStar color={CELL.bintang.icon} />
                모은 별
              </p>
              <p className="tabular-nums" style={{ margin: "2px 0 0", fontSize: "1.3125rem", fontWeight: 700, lineHeight: 1.3 }}>
                {snap.confirmedCount}
                <span style={{ fontSize: "0.71875rem", fontWeight: 500, color: MUTED }}> 단어</span>
              </p>
              <p className="flex items-center break-keep" style={{ margin: "2px 0 0", gap: 4, fontSize: "0.71875rem", fontWeight: 600, lineHeight: 1.4, color: CELL.bintang.sub }}>
                <Star size={14} color={STROKE} fill={bintangHex} strokeWidth={1.5} className="shrink-0" />
                <span>{bintangStageName}</span>
              </p>
              <div style={{ marginTop: 7 }}>
                <ProgressBar widthPct={bintangPct} color={bintangBarColor} />
              </div>
              <p className="tabular-nums" style={{ margin: "4px 0 0", fontSize: "0.6875rem", color: MUTED }}>
                {bintangNextText}
              </p>
            </div>
          </div>

          {/* 월~일 작은 막대 — 점수 높이만, 숫자 없음, 오늘 요일 굵게 */}
          <div className="flex items-end" style={{ marginTop: 14, height: 34, gap: 6 }} aria-hidden="true">
            {bars.map((b) => (
              <span key={b.key} className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
                <span
                  style={{
                    height: b.total > 0 ? Math.max(4, Math.round((b.total / barMax) * 34)) : 3,
                    borderRadius: 3,
                    background: b.total > 0 ? b.color : "#E6EAEC",
                    opacity: b.isFuture ? 0.5 : 1,
                  }}
                />
              </span>
            ))}
          </div>
          <div className="flex" style={{ marginTop: 4, gap: 6 }} aria-hidden="true">
            {bars.map((b) => (
              <span
                key={b.key}
                className="flex-1 text-center"
                style={{ fontSize: "0.6875rem", fontWeight: b.isToday ? 700 : 400, color: b.isToday ? INK : FAINT }}
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* 지난주의 나와 비교 — 내 정보와 같은 함수·같은 기간 기준 */}
          <p className="break-keep" style={{ margin: "12px 2px 0", minHeight: 18, fontSize: "0.75rem", lineHeight: 1.5, color: MUTED }}>
            <MedaliWeekCompareText week={snap.apiWeekPoints} data={weekCmp} />
          </p>
        </div>
      </AppSheet>
    );
  }

  // ── 자세히 창 ───────────────────────────────────────────────────
  const tabBtn = (k: "api" | "bintang", text: string) => {
    const on = tab === k;
    return (
      <button
        type="button"
        onClick={() => setTab(k)}
        aria-pressed={on}
        className="flex-1 flex items-center justify-center font-gothic"
        style={{
          gap: 5,
          borderRadius: 13,
          background: on ? "#FFFFFF" : "transparent",
          boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          color: on ? (k === "api" ? CELL.api.title : CELL.bintang.title) : MUTED,
          fontSize: "0.8125rem",
          fontWeight: on ? 700 : 600,
        }}
      >
        {k === "api"
          ? <Flame size={14} color={STROKE} fill={apiHex} strokeWidth={1.5} className="shrink-0" />
          : <Star size={14} color={STROKE} fill={bintangHex} strokeWidth={1.5} className="shrink-0" />}
        {text}
      </button>
    );
  };

  // 단계 줄 — [단계 색 아이콘] 단계 이름 · 숫자, 진행 막대, 다음 단계까지
  const stageBlock = (kind: "api" | "bintang") => {
    const isApi = kind === "api";
    const Icon = isApi ? Flame : Star;
    return (
      <div style={{ paddingTop: 14 }}>
        <p className="flex items-center flex-wrap" style={{ margin: 0, columnGap: 6, rowGap: 2 }}>
          <Icon size={22} color={STROKE} fill={isApi ? apiHex : bintangHex} strokeWidth={1.5} className="shrink-0" />
          <span style={{ fontSize: "1rem", fontWeight: 700 }}>{isApi ? apiStageName : bintangStageName}</span>
          <span className="tabular-nums" style={{ fontSize: "0.8125rem", color: MUTED }}>
            {isApi ? "· " + snap.apiWeekPoints + "점 · 연속 " + snap.streak + "일" : "· " + snap.confirmedCount + "단어"}
          </span>
        </p>
        <div style={{ marginTop: 10 }}>
          <ProgressBar widthPct={isApi ? apiPct : bintangPct} color={isApi ? apiBarColor : bintangBarColor} track="#EEF1F3" height={6} />
        </div>
        <p className="tabular-nums text-right" style={{ margin: "5px 0 0", fontSize: "0.71875rem", color: MUTED }}>
          {isApi ? apiNextText : bintangNextText}
        </p>
      </div>
    );
  };

  return (
    <AppSheet
      open={open}
      onClose={requestClose}
      title="훈장"
      icon={<Medal size={20} strokeWidth={1.8} />}
      bodyPadding="0 16px calc(16px + env(safe-area-inset-bottom))"
      bodyStyle={{ height: "72dvh", touchAction: "pan-y" }}
      subHeader={
        /* 탭 — 내 정보 공부 시간 "이번 달/지난달" 과 같은 알약 모양 */
        <div className="px-4" style={{ paddingTop: 2, paddingBottom: 10, borderBottom: "1px solid " + LINE }}>
          <div className="flex" style={{ height: 32, borderRadius: 16, background: "#F1F4F5", padding: 3, boxSizing: "border-box" }}>
            {tabBtn("api", "불꽃")}
            {tabBtn("bintang", "별")}
          </div>
        </div>
      }
    >
      <div className="font-gothic" data-medali-view="detail" style={{ color: INK }}>
        {tab === "api" ? (
          <div>
            {stageBlock("api")}

            {/* 요일 막대 (월~일) — 위 숫자는 그날 접속 시간 */}
            <div style={{ marginTop: 16 }}>
              <div className="flex h-20 items-end gap-2">
                {bars.map((b, i) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setOpenDay(openDay === i ? null : i)}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span
                      className="text-[0.5625rem] leading-none whitespace-nowrap tabular-nums"
                      style={{
                        color: b.total > 0 ? b.color : undefined,
                        opacity: b.isFuture ? 0.4 : 1,
                      }}
                    >
                      {usageLabel(b.usageMs)}
                    </span>
                    <span
                      className={"w-full rounded-md " + (b.total > 0 ? "" : "bg-border")}
                      style={{
                        height: Math.max(4, Math.round((b.total / barMax) * 60)) + "px",
                        backgroundColor: b.total > 0 ? b.color : undefined,
                        opacity: b.isFuture ? 0.4 : 1,
                      }}
                    />
                    <span
                      className="text-[0.6875rem]"
                      style={{ fontWeight: b.isToday ? 700 : 400, color: b.isToday ? INK : MUTED }}
                    >
                      {b.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center" style={{ margin: "6px 0 0", fontSize: "0.625rem", color: MUTED }}>
                숫자는 그날 앱에 접속한 시간
              </p>
              <p className="text-center tabular-nums" style={{ margin: "4px 0 0", height: 16, fontSize: "0.6875rem", color: MUTED }}>
                {openDay !== null
                  ? bars[openDay].label +
                    " · " +
                    bars[openDay].total +
                    "점" +
                    (usageText(bars[openDay].usageMs) ? " · " + usageText(bars[openDay].usageMs) : "")
                  : ""}
              </p>
            </div>

            {/* 오늘 쌓인 점수 — 테두리 상자 안 줄 목록 */}
            <Label style={{ marginTop: 10 }}>오늘 쌓인 점수</Label>
            <div style={{ marginTop: 6, border: "1px solid " + LINE, borderRadius: 14, overflow: "hidden" }}>
              {TODAY_ROWS.map((row, idx) => {
                const got = pointsOf(todayLog, row.cats);
                const cap = capOf(row.cats);
                const full = got >= cap;
                return (
                  <div key={row.key} style={{ borderTop: idx === 0 ? "0" : "1px solid #EEF1F3" }}>
                    <button
                      type="button"
                      onClick={() => setOpenRow(openRow === row.key ? null : row.key)}
                      aria-expanded={openRow === row.key}
                      className="flex w-full items-center text-left"
                      style={{ gap: 8, minHeight: 42, padding: "0 14px" }}
                    >
                      <span className="min-w-0 flex-1 truncate" style={{ fontSize: "0.84375rem", fontWeight: 500 }}>
                        {row.label}
                      </span>
                      <span
                        className="shrink-0 tabular-nums"
                        style={{ fontSize: "0.8125rem", fontWeight: full ? 700 : 500, color: full ? FULL : MUTED }}
                      >
                        {got} / {cap}{full ? " 채움" : ""}
                      </span>
                    </button>
                    {openRow === row.key ? (
                      <p style={{ margin: 0, padding: "0 14px 10px", fontSize: "0.75rem", lineHeight: 1.55, color: MUTED }}>
                        {row.help}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* 색 사다리 — 단계 이름과 그 색이 되는 이번 주 점수 */}
            <Label style={{ marginTop: 16 }}>불꽃 색</Label>
            <div className="flex flex-wrap items-center" style={{ marginTop: 8, columnGap: 12, rowGap: 6 }}>
              {MEDALI_LADDER.map((c) => {
                const cut = API_CUTOFFS.find((x) => x.color === c.color);
                const now = snap.apiColor === c.color;
                return (
                  <span key={c.color} className="inline-flex items-center whitespace-nowrap" style={{ gap: 4 }}>
                    <Flame size={14} color={STROKE} fill={MEDALI_COLORS[c.color]} strokeWidth={1.5} className="shrink-0" />
                    <span style={{ fontSize: "0.75rem", fontWeight: now ? 700 : 500, color: now ? INK : MUTED }}>{c.name}</span>
                    <span className="tabular-nums" style={{ fontSize: "0.71875rem", color: FAINT }}>{cut ? cut.min : 0}</span>
                  </span>
                );
              })}
            </div>
            <p style={{ margin: "8px 0 4px", fontSize: "0.71875rem", color: MUTED }}>{MEDALI_HELP.api.ladderNote}</p>
          </div>
        ) : (
          <div>
            {stageBlock("bintang")}

            {/* 최근 별이 된 단어 */}
            <Label style={{ marginTop: 12 }}>최근 별이 된 단어</Label>
            <div style={{ marginTop: 4 }}>
              {confirmedWords.length === 0 ? (
                <p style={{ margin: 0, padding: "8px 0", fontSize: "0.78125rem", lineHeight: 1.55, color: MUTED }}>
                  아직 없습니다 — 게임에서 맞힌 단어가 별이 됩니다
                </p>
              ) : (
                confirmedWords.map((w) => (
                  <div key={w.word} className="flex items-center" style={{ gap: 8, padding: "7px 0" }}>
                    <span className="min-w-0 flex-1 truncate font-word" style={{ fontSize: "0.9375rem" }}>
                      {w.word}
                    </span>
                    <span className="shrink-0" style={{ border: "1px solid " + LINE, borderRadius: 999, padding: "1px 8px", fontSize: "0.6875rem", color: MUTED }}>
                      {SOURCE_LABEL[w.source] || "기타"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 별의 단계 — 색마다 한 줄(6줄). 오른쪽은 III·II·I 가 되는 외운 단어 수, 지금 단계 줄만 강조 */}
            <Label style={{ marginTop: 14 }}>별의 단계</Label>
            <p style={{ margin: "2px 0 0", fontSize: "0.6875rem", color: FAINT }}>숫자는 그 단계가 되는 외운 단어 수</p>
            <div data-medali-stage-list style={{ marginTop: 6 }}>
              {MEDALI_LADDER.map((c) => {
                const tiers = BINTANG_CUTOFFS.filter((x) => x.color === c.color).slice().sort((a, b) => b.tier - a.tier); // III → I
                const now = snap.bintangColor === c.color;
                return (
                  <div
                    key={c.color}
                    data-medali-stage-row
                    className="flex items-center"
                    style={{ gap: 8, minHeight: 38, padding: "0 10px", borderRadius: 10, background: now ? "#F3F0E6" : "transparent" }}
                  >
                    <Star size={15} color={STROKE} fill={MEDALI_COLORS[c.color]} strokeWidth={1.5} className="shrink-0" />
                    <span className="shrink-0" style={{ width: 62, fontSize: "0.8125rem", fontWeight: now ? 700 : 500 }}>
                      {COLOR_NAME[c.color]}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-wrap justify-end tabular-nums" style={{ columnGap: 8, rowGap: 0, fontSize: "0.71875rem", color: MUTED }}>
                      {tiers.map((t) => {
                        const cur = now && snap.bintangTier === t.tier;
                        return (
                          <span
                            key={t.tier}
                            className="whitespace-nowrap"
                            style={cur ? { fontWeight: 700, color: TEAL } : undefined}
                          >
                            {ROMAN[t.tier]} {t.min}
                          </span>
                        );
                      })}
                    </span>
                    {now ? (
                      <span className="shrink-0" style={{ fontSize: "0.6875rem", fontWeight: 700, color: TEAL }}>지금</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {recheckCount > 0 ? (
              <p className="text-center" style={{ margin: "12px 0 4px", fontSize: "0.71875rem", lineHeight: 1.55, color: MUTED }}>
                다시 확인할 단어 {recheckCount}개 — 게임에서 다시 나옵니다
              </p>
            ) : null}
          </div>
        )}
      </div>
    </AppSheet>
  );
}
