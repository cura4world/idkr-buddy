// src/pages/MyInfo.tsx
// 내 정보 (/me) — 공개판 하단 탭의 네 번째 화면. 시안 ME1(Special·관리자) · ME2(무료) · ME3(Plus).
//
//   프로필 → 회원(등급별) → 학습 기록(이번 달 공부 시간 + 날별 막대 + 지난달 하루 평균 점선)
//   → 훈장(불꽃·별) → 설정 목록
//
// 설정은 저장 방식을 새로 만들지 않고 기존 lib(fontScale·tts·medaliSync·account·billing)와
// 기존 창(SettingsDialog·MedaliSheet)을 그대로 씁니다.
// 공개판에는 서버가 아직 없는 줄(서버 자동 백업·회원키)을 보이지 않습니다(QA Q01) —
// 새 폰으로 옮기기는 백업 파일(저장·불러오기)로 합니다.
// 등급 판단은 usePlan() 하나로만 합니다. 이메일은 보이지 않습니다(결정 문서 11/10).
//
// 공부 시간은 앱을 켜 둔 시간(usageTimer → Medali 일일 로그의 usageMs)입니다. 날마다 이미 쌓이고 있습니다.
//
// 2026-11-24 (Arga 승인 "내 정보·훈장 묶음")
//   · 글꼴: 화면 안 한글·숫자를 모두 Pretendard(font-gothic). 위계는 굵기·크기·색으로만, 숫자는 700 + tabular-nums.
//   · 배치: 글자 100%·412px 에서 첫 화면에 훈장 카드 끝까지(프로필 40px 사진·회원 카드 한 줄 가격·공부 기록 숫자 70%·막대 절반).
//   · 훈장 칸 제목 옆 ⓘ → 작은 말풍선(MedaliHelpBubble, 문구는 lib/medaliHelp.ts).
//   · 두 사람 순위 줄을 빼고 "지난주보다 +N점 · 이번 달 별 +N개"(이 폰 기록만, 서버 없음).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { placeChartLabels, shortHM, type ChartLabelLayout } from "@/lib/studyChartLabels";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormSheet, { FORM_FIELD_CLASS, FORM_INPUT_CLASS, FormPrimaryButton } from "@/components/FormSheet";
import SettingsDialog, { REOPEN_SETTINGS_KEY } from "@/components/SettingsDialog";
import BackupRestoreDialog from "@/components/BackupRestoreDialog";
import { PlusFreeCard, PlusMemberCard } from "@/components/PlusCard";
import { ArchiveRestore, AudioLines, Type, UserRound } from "lucide-react";
import AppSheet, { ChoiceGroup, ChoiceRow, ConfirmSheet, SHEET, SheetButton } from "@/components/sheet/AppSheet";
import { useBackClose } from "@/hooks/useBackClose";
import { buildBackupFile, describeSummary, formatBytes, getBackupFileSavedAt, markBackupFileSaved } from "@/lib/transfer";
import MedaliSheet from "@/components/MedaliSheet";
import type { MedaliSheetTab } from "@/components/MedaliSheet";
import { MedaliWeekCompareText, useMedaliWeekCompare } from "@/components/MedaliWeekCompare";
import { MedaliHelpBubble, MedaliHelpButton, MedaliHelpKind } from "@/components/MedaliHelpBubble";
import { ProfileAvatar, profileName } from "@/components/BottomTabs";
import { usePlan, PAYWALL_PATH, Tier, TIER_LABEL, isPreviewBuild, isReviewAccount } from "@/lib/plan";
import { getSession, onSessionChange, signOut, deleteAccount, PublicSession } from "@/lib/account";
import { askLocalWipe } from "@/lib/localWipe";
import { billingAvailable, manageSubscription, recheckSubscription } from "@/lib/billing";
import { usePlusPricing } from "@/lib/playOffers";
import { canceledUntilText, NOTE_KEEP_CREATIONS } from "@/lib/plusCopy";
import { isStoreApp, storeAppVersion, hasNativeFileSave, saveFileNative, PRIVACY_URL, TERMS_URL, BUSINESS_INFO_URL } from "@/lib/platform";
import { getEdition, EDITION_LABEL } from "@/lib/access";
import { getMemberProfile } from "@/lib/member";
import { applyFontScale, getFontStep, getStepCount, setFontStep } from "@/lib/fontScale";
import { getTtsVoice, setTtsVoice, TTS_VOICES, TtsVoiceId, clearTtsCache } from "@/lib/tts";
import { clearPercakapanAudioCache } from "@/lib/percakapanAudio";
import { getMyMedaliId, setMyMedaliId, isValidMedaliId } from "@/lib/medaliSync";
import {
  medaliEngine, loadMedaliCache, listMyRawLogs, loadOthers, mergeDay, dateKey, DailyLog,
} from "@/lib/medali";

// ── 색 (시안 그대로) ─────────────────────────────────────────────
const INK = "#1D1F1E";
const MUTED = "#646C72";
const FAINT = "#9AA1A6";
const LINE = "#EEF1F3";
const TEAL = "#2C6D63";
const CARD_SHADOW = "0 1px 3px rgba(16,40,50,0.06)";

const rem = (px: number) => px / 16 + "rem";

// ── 작은 그림 (시안의 선 아이콘) ─────────────────────────────────
const Ico = ({ d, children }: { d?: string; children?: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : null}
    {children}
  </svg>
);

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B7BDC1" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const I_PEN = <Ico d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />;
const I_TYPE = <Ico d="M4 7V4h16v3M9 20h6M12 4v16" />;
const I_MIC = (
  <Ico>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
  </Ico>
);
const I_CLOUD = (
  <Ico>
    <path d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8A6 6 0 1 0 6 17.5" />
    <path d="M6 17.5h11.5" />
  </Ico>
);
const I_PHONE = (
  <Ico>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </Ico>
);
const I_TRASH = <Ico d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />;
const I_LOGOUT = <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />;
const I_INFO = (
  <Ico>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Ico>
);
const I_DOC = (
  <Ico>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Ico>
);
const I_KEY = (
  <Ico>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2" />
  </Ico>
);
const I_USERX = (
  <Ico>
    <circle cx="9" cy="8" r="4" />
    <path d="M3 21v-1a6 6 0 0 1 9.5-4.9M16 16l5 5M21 16l-5 5" />
  </Ico>
);

// ── 공통 조각 ────────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p
    className="font-gothic"
    style={{ margin: "6px 4px -2px", fontSize: rem(12), fontWeight: 700, letterSpacing: "0.02em", color: "#7A8287" }}
  >
    {children}
  </p>
);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="bg-white" style={Object.assign({ borderRadius: 20, boxShadow: CARD_SHADOW }, style || {})}>
    {children}
  </div>
);

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  last?: boolean;
  danger?: boolean;
  chevron?: boolean;
  right?: React.ReactNode;
  /** 오른쪽 값이 길면 "…"로 자르지 않고 두 줄까지 줄바꿈합니다(구독 관리의 "정기 결제 취소됨 · …까지 이용") */
  wrapValue?: boolean;
}

const Row = ({ icon, label, value, onClick, last, danger, chevron = true, right, wrapValue }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 text-left active:bg-black/[0.03] transition-colors"
    style={{ minHeight: 46, padding: "0 12px 0 16px", borderBottom: last ? "0" : "1px solid " + LINE }}
  >
    <span className="flex shrink-0" style={{ color: danger ? "#B5524A" : MUTED }}>{icon}</span>
    <span className="flex-1 min-w-0 truncate" style={{ fontSize: rem(14.5), fontWeight: 500, color: danger ? "#B5524A" : INK }}>
      {label}
    </span>
    {value ? (
      <span
        className={"font-gothic shrink-0 " + (wrapValue ? "text-right break-keep" : "truncate")}
        style={{ maxWidth: "55%", fontSize: rem(12), color: MUTED, lineHeight: wrapValue ? 1.35 : undefined, padding: wrapValue ? "6px 0" : undefined }}
      >
        {value}
      </span>
    ) : null}
    {right}
    {chevron && !right ? <Chevron /> : null}
  </button>
);

const Toggle = ({ on }: { on: boolean }) => (
  <span
    aria-hidden="true"
    className="relative shrink-0"
    style={{ width: 44, height: 26, borderRadius: 13, background: on ? TEAL : "#D5DADD" }}
  >
    <span
      className="absolute"
      style={{
        top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 10,
        background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.15)", transition: "left 150ms",
      }}
    />
  </span>
);

// ── 학습 기록 계산 ───────────────────────────────────────────────
interface MonthView {
  year: number;
  month: number;       // 0~11
  days: number;        // 그 달의 날 수
  todayIdx: number;    // 이번 달이면 오늘(0부터), 지난달이면 -1
  dayMs: number[];     // 날마다 쓴 시간(ms)
  totalMs: number;     // 지금까지(이번 달) 또는 한 달 전체(지난달)
  avgMs: number;       // 하루 평균 (지난 날 수로 나눔)
  refAvgMs: number;    // 비교 달의 하루 평균 (점선)
  diffMs: number;      // 비교 달의 같은 기간보다 늘어난 시간 (음수면 줄어듦)
}

function daysIn(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function buildMonth(byDate: Map<string, number>, back: number): MonthView {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const days = daysIn(year, month);
  const todayIdx = back === 0 ? now.getDate() - 1 : -1;
  const dayMs: number[] = [];
  for (let i = 0; i < days; i++) dayMs.push(byDate.get(dateKey(new Date(year, month, i + 1))) || 0);
  const elapsed = back === 0 ? todayIdx + 1 : days;
  let totalMs = 0;
  for (let i = 0; i < elapsed; i++) totalMs += dayMs[i];

  const prev = new Date(year, month - 1, 1);
  const pDays = daysIn(prev.getFullYear(), prev.getMonth());
  let pTotal = 0;
  let pSame = 0;
  for (let i = 0; i < pDays; i++) {
    const v = byDate.get(dateKey(new Date(prev.getFullYear(), prev.getMonth(), i + 1))) || 0;
    pTotal += v;
    if (i < elapsed) pSame += v;
  }
  return {
    year, month, days, todayIdx, dayMs, totalMs,
    avgMs: elapsed > 0 ? totalMs / elapsed : 0,
    refAvgMs: pDays > 0 ? pTotal / pDays : 0,
    diffMs: totalMs - pSame,
  };
}

function splitHM(ms: number): { h: number; m: number } {
  const min = Math.floor(Math.max(0, ms) / 60000);
  return { h: Math.floor(min / 60), m: min % 60 };
}

function hmText(ms: number): string {
  const { h, m } = splitHM(Math.abs(ms));
  if (h > 0 && m > 0) return h + "시간 " + m + "분";
  if (h > 0) return h + "시간";
  return m + "분";
}

function dotDate(t: number): string {
  const d = new Date(t);
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate());
}

/** 구독 날짜 — 구독 화면(Plus.tsx)과 같은 모양 "2026년 11월 20일" (출시 전 점검 A-55) */
function koDate(t: number): string {
  const d = new Date(t);
  return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
}

// ── 공부 시간 막대 그래프 ─────────────────────────────────────────
// 2026-11-25 지시서 A: 칸·그래프 높이는 그대로(32px). 막대 색 세 단계(오늘 #2C6D63 · 어제 #467D73 · 그 전 #9CC5BB),
// 어제·오늘 숫자(흰 테두리 글자, 자리는 lib/studyChartLabels.ts 의 순수 함수가 실제 글자 폭으로 계산),
// 지난달 하루 평균 점선 #9AA1A6 을 막대 위에, 설명 줄 끝에 평균 값. "지난달" 보기는 점선 색·평균 값만(숫자·색 단계 없음).
const CHART_H = 32;
const BAR_GAP = 3;
const BAR_TODAY = TEAL;
const BAR_YESTERDAY = "#467D73";
const BAR_PAST = "#9CC5BB";
const REF_LINE = "#9AA1A6";
// 상자 없이 흰 테두리만 — 막대·점선과 겹쳐도 읽히게
const WHITE_OUTLINE =
  "-1px -1px 0 #FFFFFF, 1px -1px 0 #FFFFFF, -1px 1px 0 #FFFFFF, 1px 1px 0 #FFFFFF, 0 -1.5px 0 #FFFFFF, 0 1.5px 0 #FFFFFF, -1.5px 0 0 #FFFFFF, 1.5px 0 0 #FFFFFF, 0 0 3px #FFFFFF";

/** 막대 높이(%) — 몇 분만 쓴 날·앞으로의 날은 3% */
function barPct(ms: number, barMax: number, future: boolean): number {
  return future || ms <= 0 ? 3 : Math.max(3, Math.round((ms / barMax) * 100));
}

const StudyBars = ({ view, dayLabels, prevName }: { view: MonthView; dayLabels: boolean; prevName: string }) => {
  // 막대 높이의 기준 — 몇 분만 쓴 날이 막대를 꽉 채우지 않게 최소 30분으로 잡습니다
  const barMax = Math.max(30 * 60000, view.refAvgMs, ...view.dayMs);
  const refPct = view.refAvgMs > 0 ? Math.min(100, (view.refAvgMs / barMax) * 100) : 0;
  const ti = view.todayIdx;
  // 숫자는 막대와 같은 자료(view.dayMs)에서. 0분이면 숨김, 1일에는 어제 숫자 없음
  const yText = dayLabels && ti >= 1 ? shortHM(view.dayMs[ti - 1]) : "";
  const tText = dayLabels && ti >= 0 ? shortHM(view.dayMs[ti]) : "";
  const yPct = ti >= 1 ? barPct(view.dayMs[ti - 1], barMax, false) : 0;
  const tPct = ti >= 0 ? barPct(view.dayMs[ti], barMax, false) : 0;

  const chartRef = useRef<HTMLDivElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  const tRef = useRef<HTMLSpanElement>(null);
  const [layout, setLayout] = useState<ChartLabelLayout | null>(null);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const c = chartRef.current;
    if (!c || (!yText && !tText)) {
      setLayout(null);
      return;
    }
    const size = (el: HTMLElement | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    };
    const next = placeChartLabels({
      chartW: c.clientWidth,
      chartH: CHART_H,
      days: view.days,
      gap: BAR_GAP,
      todayIdx: ti,
      yesterdayBarH: (CHART_H * yPct) / 100,
      todayBarH: (CHART_H * tPct) / 100,
      yesterday: yText ? size(yRef.current) : null,
      today: tText ? size(tRef.current) : null,
    });
    setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [yText, tText, yPct, tPct, ti, view.days, tick]);

  // 폭이 바뀌거나(회전·넓게 보기) 글꼴이 늦게 실리면 다시 잽니다
  useEffect(() => {
    const c = chartRef.current;
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => setTick((n) => n + 1));
      if (c) ro.observe(c);
    } catch (e) {}
    try {
      const d = document as Document & { fonts?: { ready?: Promise<unknown> } };
      if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => setTick((n) => n + 1)).catch(() => {});
    } catch (e) {}
    return () => { if (ro) ro.disconnect(); };
  }, []);

  const labelStyle = (color: string, p: { x: number; y: number } | null | undefined): React.CSSProperties => ({
    position: "absolute",
    left: p ? p.x : 0,
    top: p ? p.y : 0,
    visibility: p ? "visible" : "hidden",
    zIndex: 2,
    whiteSpace: "nowrap",
    fontSize: rem(11),
    fontWeight: 700,
    lineHeight: 1.15,
    color,
    textShadow: WHITE_OUTLINE,
    pointerEvents: "none",
  });

  return (
    <>
      <div ref={chartRef} data-study-chart className="relative flex" style={{ marginTop: 8, height: CHART_H, gap: BAR_GAP }} aria-hidden="true">
        {view.dayMs.map((ms, i) => {
          const future = view.todayIdx >= 0 && i > view.todayIdx;
          const h = barPct(ms, barMax, future);
          // "지난달" 보기는 todayIdx = -1 이라 오늘·어제 색이 저절로 없음
          const bg = future ? LINE : i === ti ? BAR_TODAY : ti >= 1 && i === ti - 1 ? BAR_YESTERDAY : BAR_PAST;
          return (
            <span key={i} className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
              <span data-bar={i === ti ? "today" : i === ti - 1 ? "yesterday" : undefined} style={{ height: h + "%", borderRadius: 3, background: bg }} />
            </span>
          );
        })}
        {/* 지난달 하루 평균 점선 — 막대 위에 */}
        {refPct > 0 ? (
          <span className="absolute left-0 right-0" style={{ bottom: refPct + "%", borderTop: "1.5px dashed " + REF_LINE, zIndex: 1 }} />
        ) : null}
        {yText ? (
          <span ref={yRef} data-day-label="yesterday" style={labelStyle(BAR_YESTERDAY, layout && layout.yesterday)}>어제 {yText}</span>
        ) : null}
        {tText ? (
          <span ref={tRef} data-day-label="today" style={labelStyle(BAR_TODAY, layout && layout.today)}>오늘 {tText}</span>
        ) : null}
      </div>
      <div className="flex justify-between items-start font-gothic" style={{ marginTop: 4, gap: 8, fontSize: rem(10.5), color: FAINT }}>
        <span className="shrink-0">{view.month + 1}월 1일</span>
        <span data-ref-legend className="flex items-center justify-center break-keep text-center" style={{ gap: 4 }}>
          <span className="shrink-0" style={{ width: 12, borderTop: "1.5px dashed " + REF_LINE }} />
          <span>{prevName} 하루 평균{view.refAvgMs > 0 ? " " + hmText(view.refAvgMs) : ""}</span>
        </span>
        <span className="shrink-0">{view.days}일</span>
      </div>
    </>
  );
};

// ── 등급 배지 ────────────────────────────────────────────────────
function tierBadge(t: Tier): { text: string; bg: string; fg: string } {
  if (t === "free") return { text: "무료", bg: "#F1F4F5", fg: MUTED };
  if (t === "plus") return { text: "Plus", bg: "#E3EEEC", fg: TEAL };
  return { text: TIER_LABEL[t], bg: "#FFF6DC", fg: "#8A6A12" };
}

/** 구독 주기 — 서버가 요금제 이름을 알려 줄 때만 (모르면 빈 문자열) */
function planPeriod(s: PublicSession | null): string {
  if (!s || !s.plan) return "";
  const p = s.plan as unknown as { basePlanId?: string; period?: string };
  const v = String(p.basePlanId || p.period || "").toLowerCase();
  if (v.indexOf("year") >= 0 || v.indexOf("annual") >= 0 || v === "p1y") return "연간 구독";
  if (v.indexOf("month") >= 0 || v === "p1m") return "월간 구독";
  return "";
}

/** 회원키 끝 네 자리 (없으면 빈 문자열) */
function memberKeyTail(s: PublicSession | null): string {
  const prof = getMemberProfile();
  let raw = prof && prof.key ? prof.key : "";
  if (!raw && s && s.plan) {
    const p = s.plan as unknown as { keyTail?: string };
    raw = String(p.keyTail || "");
  }
  const clean = raw.replace(new RegExp("[^A-Za-z0-9]", "g"), "").toUpperCase();
  return clean.length >= 4 ? clean.slice(-4) : "";
}

const MyInfo = () => {
  const navigate = useNavigate();
  const { tier } = usePlan();
  const storeApp = isStoreApp();
  const preview = isPreviewBuild();
  const publicLike = storeApp || preview;
  const pricing = usePlusPricing(publicLike && tier === "free");
  const review = isReviewAccount();
  const [session, setSession] = useState<PublicSession | null>(getSession());
  useEffect(() => onSessionChange(setSession), []);
  // 해지 반영 안전망(2026-11-24): 내 정보를 열 때 유료 플랜이면 구매를 한 번 다시 확인합니다(Play 복원 → 서버 확인 → 등급).
  // Play 구독 관리에서 돌아온 신호를 놓쳐도(2026-11-24 9:42 S21) 여기서 "정기 결제 취소됨"이 맞게 나오게. 30초에 한 번까지.
  useEffect(() => {
    if (!storeApp || preview || !billingAvailable()) return;
    const s = getSession();
    if (s && s.plan && (s.plan.tier === "plus" || s.plan.tier === "trial")) recheckSubscription({ throttle: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memberProfile = getMemberProfile();
  const [nick, setNick] = useState(() => profileName(getSession()));
  useEffect(() => { setNick(profileName(session)); }, [session]);
  const displayName = nick || (memberProfile && memberProfile.name) || "Kata kata";

  // ── 설정 창 (기존 SettingsDialog) — 설정 창에서 다른 화면으로 갔다 돌아오면 다시 엽니다
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    try {
      const at = Number(sessionStorage.getItem(REOPEN_SETTINGS_KEY) || "0");
      if (at > 0 && Date.now() - at < 30 * 60 * 1000) setSettingsOpen(true);
      else if (at > 0) sessionStorage.removeItem(REOPEN_SETTINGS_KEY);
    } catch (e) {}
  }, []);

  // ── 훈장 ──
  const [medal, setMedal] = useState(() => {
    const c = loadMedaliCache();
    return { week: c.apiWeekPoints, stars: c.confirmedCount };
  });
  useEffect(() => {
    const off = medaliEngine.subscribe((s) => setMedal({ week: s.apiWeekPoints, stars: s.confirmedCount }));
    medaliEngine.refresh();
    return off;
  }, []);
  // 지난주의 나와 비교(2026-11-24) — 훈장 요약 창과 같은 함수·같은 글(components/MedaliWeekCompare). null = 아직 계산 전
  const weekCmp = useMedaliWeekCompare();

  // 훈장 칸 설명 말풍선 — 한 번에 하나. 뒤로가기는 아래 useBackClose(help)
  const [help, setHelp] = useState<MedaliHelpKind | null>(null);
  const helpBtnApi = useRef<HTMLButtonElement>(null);
  const helpBtnBintang = useRef<HTMLButtonElement>(null);
  const closeHelp = useCallback(() => setHelp(null), []);

  // 훈장 팝업 — 폰의 뒤로가기로 팝업만 닫히게 히스토리를 한 칸 쌓습니다(홈과 같은 방식)
  const [medaliOpen, setMedaliOpen] = useState(false);
  const medaliOpenRef = useRef(false);
  const medaliPushedRef = useRef(false);
  // 누른 칸의 탭으로 엽니다(2026-11-24): 불꽃 칸 → 불꽃 탭, 별 칸 → 별 탭
  const [medaliTab, setMedaliTab] = useState<MedaliSheetTab>("api");
  const openMedaliTab = (t: MedaliSheetTab) => {
    setMedaliTab(t);
    openMedali();
  };
  const openMedali = () => {
    if (medaliOpenRef.current) return;
    medaliOpenRef.current = true;
    setMedaliOpen(true);
    try {
      window.history.pushState({ medaliSheet: true }, "");
      medaliPushedRef.current = true;
    } catch (e) {
      medaliPushedRef.current = false;
    }
  };
  const closeMedali = () => {
    if (!medaliOpenRef.current) return;
    medaliOpenRef.current = false;
    setMedaliOpen(false);
    if (medaliPushedRef.current) {
      medaliPushedRef.current = false;
      try { window.history.back(); } catch (e) {}
    }
  };
  useEffect(() => {
    const onPop = () => {
      if (medaliOpenRef.current) {
        medaliOpenRef.current = false;
        medaliPushedRef.current = false;
        setMedaliOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── 학습 기록 ──
  const [byDate, setByDate] = useState<Map<string, number> | null>(null);
  const [monthBack, setMonthBack] = useState<0 | 1>(0);
  useEffect(() => {
    let alive = true;
    listMyRawLogs(100)
      .then((mine: DailyLog[]) => {
        const others = loadOthers();
        const dates = new Set<string>();
        const mineBy: Record<string, DailyLog> = {};
        for (const l of mine) {
          if (l && typeof l.date === "string") {
            mineBy[l.date] = l;
            dates.add(l.date);
          }
        }
        for (const d of Object.keys(others.byDate || {})) dates.add(d);
        const m = new Map<string, number>();
        dates.forEach((d) => {
          const merged = mergeDay(mineBy[d] || null, others, d);
          m.set(d, merged.usageMs || 0);
        });
        if (alive) setByDate(m);
      })
      .catch(() => { if (alive) setByDate(new Map()); });
    return () => { alive = false; };
  }, []);
  const view = buildMonth(byDate || new Map(), monthBack);

  // ── 설정 값 ──
  const [fontStep, setFontStepState] = useState(getFontStep());
  const [voice, setVoice] = useState<TtsVoiceId>(getTtsVoice());
  const [nickOpen, setNickOpen] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [fontOpen, setFontOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);
  // 마지막으로 백업 파일을 저장한 시각(없으면 0) — 공개판은 데이터가 이 폰에만 있어 백업 여부를 보여 줍니다(D-01)
  const [backupAt, setBackupAt] = useState<number>(() => getBackupFileSavedAt());
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [ttsConfirm, setTtsConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const fontPct = 85 + fontStep * 5;
  const voiceLabel = (TTS_VOICES.find((v) => v.id === voice) || TTS_VOICES[0]).label;
  const autoBackupOn = !!memberProfile; // 서버 자동 백업은 회원키 기기에서 주 1회 저절로 돕니다

  // 닉네임 창을 열 때의 값 — 고쳤으면(dirty) 끌기·바깥 누르기로 닫히지 않습니다(2026-11-24 옵션 창 통일)
  const nickInitialRef = useRef("");
  const openNick = () => {
    const cur = getMyMedaliId();
    const v = cur && cur !== "-" ? cur : nick;
    nickInitialRef.current = v;
    setNickInput(v);
    setNickOpen(true);
  };

  const saveNick = () => {
    const v = (nickInput || "").trim();
    if (!isValidMedaliId(v)) {
      toast("한글·영문·숫자 6자 이내로 적어 주세요");
      return;
    }
    setMyMedaliId(v);
    setNick(v);
    setNickOpen(false);
    toast("닉네임을 바꿨습니다: " + v);
    // 닉네임은 이 기기에만 저장합니다. 훈장 기기 합치기는 회원키로 하므로 닉네임과 무관합니다(2026-11-24).
  };

  // 글자 크기·읽기 음성 — 2026-11-24 옵션 창 통일: 창 안에서 고르는 것은 초안, "완료"를 눌러야 적용합니다.
  // X·바깥 누르기·뒤로가기는 바꾼 것을 버립니다(예전에는 누르는 즉시 저장). 글자 크기는 고르는 동안 화면에 미리 보여 주고,
  // 취소하면 원래 크기로 되돌립니다.
  const [fontDraft, setFontDraft] = useState(fontStep);
  const [voiceDraft, setVoiceDraft] = useState<TtsVoiceId>(voice);
  const openFont = () => { setFontDraft(fontStep); setFontOpen(true); };
  const changeFont = (d: number) => {
    const next = Math.max(0, Math.min(getStepCount() - 1, fontDraft + d));
    setFontDraft(next);
    applyFontScale(next); // 미리 보기(저장 안 함)
  };
  const applyFont = () => { setFontStepState(setFontStep(fontDraft)); setFontOpen(false); };
  const cancelFont = () => { applyFontScale(fontStep); setFontOpen(false); };
  const openVoice = () => { setVoiceDraft(voice); setVoiceOpen(true); };
  const applyVoice = () => { setVoice(voiceDraft); setTtsVoice(voiceDraft); setVoiceOpen(false); };

  const handleClearTts = async () => {
    await clearTtsCache();
    // 회화 음성은 따로 저장돼 있어 함께 비웁니다 — 예전에는 사용자가 비울 길이 없었습니다(출시 전 점검 C-11)
    await clearPercakapanAudioCache();
    toast("저장된 읽기 음성을 비웠습니다");
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    await signOut();
    // 로그아웃은 이 폰의 단어장·기록을 지우지 않습니다. 그 사실을 알립니다(출시 전 점검 D-10)
    toast("로그아웃했습니다. 이 폰의 단어장과 기록은 그대로 남습니다", { duration: 5000 });
    setBusy(false);
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await deleteAccount();
      toast(
        r.hadSubscription
          ? "계정을 삭제했습니다. 구독 결제는 Google Play에서 따로 해지해 주세요"
          : "계정을 삭제했습니다",
        { duration: 8000 },
      );
      // 삭제가 끝난 직후에만 "이 폰의 단어장과 학습 기록도 지울까요?"를 묻습니다(D-10). 로그아웃에서는 묻지 않습니다.
      askLocalWipe();
    } catch (e) {
      // 실패 이유별로 안내합니다 — 세션이 끝난 경우에는 인터넷이 아니라 다시 로그인이 필요합니다(출시 전 점검 C-12)
      const code = e instanceof Error ? e.message : "";
      toast(
        code === "SESSION_EXPIRED" || code === "NO_SESSION"
          ? "로그인이 풀려 계정을 삭제하지 못했습니다. 다시 로그인한 뒤 눌러 주세요"
          : code === "NETWORK_FAILED"
            ? "계정을 삭제하지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요"
            : "계정을 삭제하지 못했습니다. 잠시 뒤 다시 시도하세요",
        { duration: 6000 },
      );
      setBusy(false);
    }
  };

  const openManage = () => {
    if (!billingAvailable()) {
      toast("구독 관리는 Google Play에서 받은 앱에서 열립니다");
      return;
    }
    manageSubscription();
  };

  // 서버 자동 백업 — 관리자판·회원판에만 있습니다(공개판은 서버가 생길 때까지 줄 자체를 숨김).
  const onAutoBackup = () => {
    if (autoBackupOn) {
      setSettingsOpen(true);
      return;
    }
    toast("서버 자동 백업은 회원키를 넣은 기기에서 사용할 수 있습니다");
  };

  // 회원키 — 관리자판·회원판은 설정 창의 회원키 칸에서 넣고 관리합니다(공개판에는 이 줄이 없음).
  const onMemberKeyRow = () => {
    setSettingsOpen(true);
  };

  // 새 폰으로 옮기기 — 공개판은 백업 파일로 옮기고, 관리자판·회원판은 설정 창(회원키로 서버를 거쳐 옮기기)
  const onMoveRow = () => {
    if (publicLike) setMoveOpen(true);
    else setSettingsOpen(true);
  };

  const saveBackupFile = async () => {
    if (moveBusy) return;
    setMoveBusy(true);
    try {
      const f = await buildBackupFile();
      if (hasNativeFileSave()) {
        const ok = saveFileNative(f.fileName, "application/json", f.href.slice(f.href.indexOf(",") + 1));
        toast(ok
          ? "백업 파일(" + formatBytes(f.bytes) + ")을 다운로드 폴더에 저장했습니다 — " + describeSummary(f.summary)
          : "백업 파일을 저장하지 못했습니다", { duration: 7000 });
        if (ok) {
          markBackupFileSaved();
          setBackupAt(getBackupFileSavedAt());
        }
      } else {
        const a = document.createElement("a");
        a.href = f.href;
        a.download = f.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast("백업 파일(" + formatBytes(f.bytes) + ")을 다운로드 폴더에 저장합니다 — " + describeSummary(f.summary), { duration: 7000 });
        markBackupFileSaved();
        setBackupAt(getBackupFileSavedAt());
      }
    } catch (e) {
      toast("백업 파일을 만들지 못했습니다");
    } finally {
      setMoveBusy(false);
    }
  };

  // 폰의 뒤로가기는 열린 창만 닫습니다(내 정보 화면을 떠나지 않음). 설정 창은 SettingsDialog 가 스스로 합니다.
  useBackClose(nickOpen, () => setNickOpen(false));
  useBackClose(fontOpen, () => cancelFont());
  useBackClose(voiceOpen, () => setVoiceOpen(false));
  useBackClose(moveOpen, () => setMoveOpen(false));
  useBackClose(ttsConfirm, () => setTtsConfirm(false));
  useBackClose(deleteConfirm, () => setDeleteConfirm(false));
  useBackClose(help !== null, closeHelp);

  // ── 화면 ──
  const badge = tierBadge(tier);
  const subLine = session
    ? "Google 계정으로 로그인됨"
    : publicLike
      ? "로그인 전"
      : EDITION_LABEL[getEdition()];
  const until = session && session.plan && typeof session.plan.until === "number" ? session.plan.until : 0;
  const period = planPeriod(session);
  // 무료 회원 카드의 요금 줄 — Play 에서 받은 가격으로만 만듭니다(월 환산 = Play 연 가격 ÷ 12).
  // 2026-11-25: "월 3,900원 / 연간 구독 시 월 2,900원" 덩어리 둘 — 모자라면 " / " 자리에서만 줄을 넘김.
  // 아직 못 받았으면 금액 대신 소개 문구를 보입니다. 고정 원화 금액은 미리보기 빌드의 대체값뿐입니다.
  const plusChunks: string[] = pricing.state === "ready" && pricing.monthlyPrice
    ? ["월 " + pricing.monthlyPrice].concat(pricing.yearlyPerMonth
        ? ["연간 구독 시 월 " + pricing.yearlyPerMonth]
        : pricing.yearlyPrice ? ["연간 구독 시 연 " + pricing.yearlyPrice] : [])
    : ["단어장·게임·회화집·지도까지 모든 기능이 열립니다"];
  const tail = memberKeyTail(session);
  const hm = splitHM(view.totalMs);

  const prevName = monthBack === 0 ? "지난달" : "전달";
  const diffSame = Math.abs(view.diffMs) < 60000;
  const diffText = (view.diffMs > 0 ? "+" : "−") + hmText(view.diffMs);

  const version = storeAppVersion() || "2.0";

  return (
    <div
      className="w-full max-w-lg mx-auto bg-background overflow-x-clip font-gothic"
      style={{ minHeight: "calc(100dvh - var(--kata-tabbar-h, 0px))", color: INK }}
    >
      <header className="flex items-center px-4" style={{ height: 56, borderBottom: "1px solid #E3E8EB" }}>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">PROFIL SAYA</h1>
      </header>

      <div className="flex flex-col" style={{ padding: "12px 16px 24px", gap: 10 }}>
        {/* ── 프로필 ── */}
        <Card style={{ padding: "12px 14px" }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <ProfileAvatar size={40} fontPx={16} session={session} name={displayName} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center" style={{ gap: 8 }}>
                <span className="truncate" style={{ fontSize: rem(15.5), fontWeight: 700 }}>{displayName}</span>
                <span
                  className="shrink-0 flex items-center font-gothic"
                  style={{ height: 22, padding: "0 9px", borderRadius: 11, background: badge.bg, color: badge.fg, fontSize: rem(10.5), fontWeight: 700 }}
                >
                  {badge.text}
                </span>
              </span>
              <span className="block font-gothic" style={{ marginTop: 2, fontSize: rem(12), color: MUTED }}>{subLine}</span>
            </span>
          </div>
        </Card>

        {/* ── 회원 ── */}
        <SectionTitle>회원</SectionTitle>
        {tier === "free" ? (
          <>
            {/* 2026-11-25: 홈 맨 아래 Plus 카드와 같은 공용 카드(PlusCard). 카드 어디를 눌러도 구독 화면.
                단추는 안쪽 알약 하나("Plus 자세히 보기") — 카드 전체를 단추로 두면 화면 읽기가 카드 글 전체를 단추 이름으로 읽음 */}
            <PlusFreeCard sub={plusChunks} onOpen={() => navigate(PAYWALL_PATH)} />
            {/* 공개판 회원키 입력은 서버가 생기면 다시 넣습니다(QA Q01 — 그 전에는 링크를 보이지 않음) */}
          </>
        ) : tier === "plus" ? (
          // 2026-11-25: "회원 등급"·"구독 관리" 두 줄 목록 대신 홈 Plus 카드와 같은 공용 카드.
          // 카드 누르기 = 예전 "회원 등급" 줄(구독 화면), "구독 / 관리" 알약 = 예전 "구독 관리" 줄(openManage).
          // 심사용 계정은 둘째 줄 "심사용 계정"·알약 없음. 해지한 구독은 "정기 결제 취소됨 · …까지 이용"(B-09, I-8)
          <PlusMemberCard
            review={review}
            period={period === "연간 구독" ? "연간" : period === "월간 구독" ? "월간" : ""}
            nextText={until > Date.now()
              ? (session && session.plan.autoRenew === false ? canceledUntilText(koDate(until)) : "다음 결제 " + koDate(until))
              : ""}
            onOpen={() => navigate(PAYWALL_PATH)}
            onManage={openManage}
          />
        ) : null}
        {/* 해지로 가는 곳(구독 관리) 바로 아래 — Plus 가 끝난 뒤 만든 것은 어떻게 되는지 미리 알림(2026-11-24, 문구는 plusCopy.ts 한 곳).
            결제가 없는 심사용 계정에는 내지 않습니다 */}
        {tier === "plus" && !review ? (
          <p
            data-keep-creations
            className="font-gothic break-keep"
            style={{ margin: "-4px 6px 0", fontSize: rem(11.5), lineHeight: 1.55, color: "#7A8287" }}
          >
            {NOTE_KEEP_CREATIONS}
          </p>
        ) : null}
        {tier === "plus" || tier === "free" ? null : (
          <Card style={{ overflow: "hidden" }}>
            <Row
              icon={I_DOC}
              label="회원 등급"
              // 서버가 기한을 준 Special·관리자 등급은 그 날짜를 보입니다("기한 없음"이라고 하지 않음)
              value={TIER_LABEL[tier] + (until > Date.now() ? " · " + dotDate(until) + "까지" : " · 기한 없음")}
              onClick={() => toast(until > Date.now()
                ? TIER_LABEL[tier] + " 등급은 " + dotDate(until) + "까지 모든 기능을 사용할 수 있습니다"
                : TIER_LABEL[tier] + " 등급은 기한 없이 모든 기능을 사용할 수 있습니다")}
              last={publicLike}
            />
            {/* 회원키 관리는 관리자판·회원판의 설정 창에서만 됩니다. 공개판은 서버가 생길 때까지 줄을 숨깁니다. */}
            {publicLike ? null : (
              <Row
                icon={I_KEY}
                label="회원키"
                value={tail ? "등록됨 · " + tail : memberProfile ? "등록됨" : undefined}
                onClick={onMemberKeyRow}
                last
              />
            )}
          </Card>
        )}

        {/* ── 공부 기록 ── */}
        <SectionTitle>공부 기록</SectionTitle>
        <Card style={{ padding: "12px 14px 10px" }}>
          <div className="flex items-center justify-between">
            <span className="font-gothic" style={{ fontSize: rem(12), fontWeight: 600, color: MUTED }}>공부 시간</span>
            <span
              className="flex font-gothic"
              style={{ height: 28, borderRadius: 14, background: "#F1F4F5", padding: 3, boxSizing: "border-box", fontSize: rem(11), fontWeight: 600 }}
            >
              {([0, 1] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setMonthBack(b)}
                  aria-pressed={monthBack === b}
                  className="flex items-center"
                  style={{
                    padding: "0 11px",
                    borderRadius: 12,
                    background: monthBack === b ? "#FFFFFF" : "transparent",
                    boxShadow: monthBack === b ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    color: monthBack === b ? INK : MUTED,
                  }}
                >
                  {b === 0 ? "이번 달" : "지난달"}
                </button>
              ))}
            </span>
          </div>
          {/* 첫 줄: 작은 "이번 달" + 큰 "6시간 24분" + 작은 "하루 평균 16분", 둘째 줄: "지난달 같은 기간보다 …"
              (2026-11-23 Arga 19). 좁은 화면·큰 글자에서는 "하루 평균"이 넘치지 않고 다음 줄로 내려갑니다(flex-wrap). */}
          <p className="flex flex-wrap items-baseline" style={{ margin: "6px 0 0", columnGap: 6, rowGap: 0 }}>
            <span className="font-gothic" style={{ fontSize: rem(11.5), color: MUTED }}>{monthBack === 0 ? "이번 달" : "지난달"}</span>
            <span className="inline-flex items-baseline" style={{ gap: 6 }}>
              {hm.h > 0 ? (
                <>
                  <span className="tabular-nums" style={{ fontSize: rem(19.5), fontWeight: 700, color: TEAL }}>{hm.h}</span>
                  <span style={{ fontSize: rem(12.5), fontWeight: 500 }}>시간</span>
                </>
              ) : null}
              <span className="tabular-nums" style={{ fontSize: rem(19.5), fontWeight: 700, color: TEAL }}>{hm.m}</span>
              <span style={{ fontSize: rem(12.5), fontWeight: 500 }}>분</span>
            </span>
            <span className="font-gothic whitespace-nowrap" style={{ fontSize: rem(11.5), color: MUTED }}>하루 평균 {hmText(view.avgMs)}</span>
          </p>
          <p className="font-gothic" style={{ margin: "2px 0 0", fontSize: rem(11.5), color: MUTED }}>
            {diffSame ? (
              prevName + " 같은 기간과 같음"
            ) : (
              <>
                {prevName} 같은 기간보다{" "}
                <b style={{ color: view.diffMs > 0 ? TEAL : MUTED }}>{diffText}</b>
              </>
            )}
          </p>
          <StudyBars view={view} dayLabels={monthBack === 0} prevName={prevName} />
        </Card>

        {/* ── 훈장 ── 칸을 누르면 훈장 창, 제목 줄 오른쪽 ⓘ 는 설명 말풍선(칸 누르기와 겹치지 않게 칸 밖의 형제 단추) */}
        <SectionTitle>훈장</SectionTitle>
        <Card style={{ padding: 12 }}>
          <div className="relative grid grid-cols-2" style={{ gap: 8 }}>
            <div className="relative">
              <button
                type="button"
                onClick={() => openMedaliTab("api")}
                className="w-full text-left active:opacity-80"
                style={{ borderRadius: 14, background: "#FBF1EC", padding: "10px 10px 10px 12px" }}
              >
                <span className="flex items-center" style={{ gap: 5, minHeight: 20, paddingRight: 24, fontSize: rem(12), fontWeight: 700, color: "#A35A36" /* 칸 바탕 대비 4.64:1 (2026-11-24, 예전 #B5643C 3.89:1) */ }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8875A" aria-hidden="true" className="shrink-0">
                    <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" />
                  </svg>
                  이번 주 불꽃
                </span>
                <span className="block tabular-nums" style={{ marginTop: 2, fontSize: rem(21), fontWeight: 700, lineHeight: 1.3, color: INK }}>
                  {medal.week}
                  <span style={{ fontSize: rem(11.5), fontWeight: 500, color: MUTED }}> 점</span>
                </span>
                <span className="block" style={{ marginTop: 1, fontSize: rem(11), lineHeight: 1.45, color: "#8A6A5A", wordBreak: "keep-all" }}>
                  이번 주 열정 점수
                </span>
              </button>
              <span className="absolute" style={{ top: 4, right: 4 }}>
                <MedaliHelpButton
                  kind="api"
                  open={help === "api"}
                  onToggle={() => setHelp(help === "api" ? null : "api")}
                  bg="#F5DCCF"
                  fg="#9A4F2A"
                  buttonRef={helpBtnApi}
                />
              </span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => openMedaliTab("bintang")}
                className="w-full text-left active:opacity-80"
                style={{ borderRadius: 14, background: "#FBF5E6", padding: "10px 10px 10px 12px" }}
              >
                <span className="flex items-center" style={{ gap: 5, minHeight: 20, paddingRight: 24, fontSize: rem(12), fontWeight: 700, color: "#886935" /* 칸 바탕 대비 4.69:1 (2026-11-24, 예전 #94723A 4.08:1) */ }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#E0B04A" aria-hidden="true" className="shrink-0">
                    <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z" />
                  </svg>
                  모은 별
                </span>
                <span className="block tabular-nums" style={{ marginTop: 2, fontSize: rem(21), fontWeight: 700, lineHeight: 1.3, color: INK }}>
                  {medal.stars}
                  <span style={{ fontSize: rem(11.5), fontWeight: 500, color: MUTED }}> 단어</span>
                </span>
                <span className="block" style={{ marginTop: 1, fontSize: rem(11), lineHeight: 1.45, color: "#8A7A55", wordBreak: "keep-all" }}>
                  지금까지 외운 단어
                </span>
              </button>
              <span className="absolute" style={{ top: 4, right: 4 }}>
                <MedaliHelpButton
                  kind="bintang"
                  open={help === "bintang"}
                  onToggle={() => setHelp(help === "bintang" ? null : "bintang")}
                  bg="#F3E6C4"
                  fg="#7A5A1E"
                  buttonRef={helpBtnBintang}
                />
              </span>
            </div>
            {help ? (
              <MedaliHelpBubble
                kind={help}
                anchor={help === "api" ? helpBtnApi.current : helpBtnBintang.current}
                onClose={closeHelp}
              />
            ) : null}
          </div>
          {/* 지난주의 나와 비교 — 두 사람 순위 줄 자리(2026-11-24). 계산 전에는 비워 둡니다(높이는 유지) */}
          <p className="break-keep" style={{ margin: "10px 2px 0", minHeight: 18, fontSize: rem(12), lineHeight: 1.5, color: MUTED }}>
            <MedaliWeekCompareText week={medal.week} data={weekCmp} />
          </p>
        </Card>

        {/* ── 설정 ── */}
        <SectionTitle>설정</SectionTitle>
        <Card style={{ overflow: "hidden" }}>
          <Row icon={I_PEN} label="닉네임" value={nick || "—"} onClick={openNick} />
          <Row icon={I_TYPE} label="글자 크기" value={fontPct + "%"} onClick={openFont} />
          <Row icon={I_MIC} label="읽기 음성" value={voiceLabel} onClick={openVoice} />
          {/* 서버 자동 백업은 관리자판·회원판(회원키 서버)에만 있습니다. 공개판은 서버가 생길 때까지 숨깁니다(QA Q01). */}
          {publicLike ? null : (
            <Row icon={I_CLOUD} label="서버 자동 백업" onClick={onAutoBackup} right={<Toggle on={autoBackupOn} />} />
          )}
          {/* 공개판: 데이터가 이 폰에만 있으므로 "백업"을 앞세우고 마지막 백업 날짜를 보여 줍니다(D-01). 관리자판·회원판은 예전 그대로 */}
          <Row
            icon={I_PHONE}
            // 메뉴 이름을 짧게 "백업·복원"(2026-11-23 O-1 — 오른쪽 정보 글자 때문에 잘렸음). 관리자판 이름은 그대로
            label={publicLike ? "백업·복원" : "새 폰으로 옮기기"}
            value={publicLike ? (backupAt > 0 ? "마지막 백업 " + dotDate(backupAt) : "백업 아직 없음") : undefined}
            onClick={onMoveRow}
          />
          {/* 앱 정보(2026-11-18) — AI 사용 안내·사진 출처·약관을 한곳에 (AppInfo.tsx) */}
          <Row icon={I_INFO} label="앱 정보" onClick={() => navigate("/about")} last />
        </Card>
        <Card style={{ overflow: "hidden" }}>
          <Row icon={I_TRASH} label="저장된 읽기 음성 비우기" onClick={() => setTtsConfirm(true)} last={!session} />
          {session ? (
            <Row icon={I_LOGOUT} label="로그아웃" danger chevron={false} onClick={handleSignOut} last />
          ) : null}
        </Card>
        {session ? (
          <Card style={{ overflow: "hidden", marginTop: 6 }}>
            {/* 뜻이 분명하게 "계정 삭제(탈퇴)"(2026-11-23 N-2). 확인 창의 단추 이름은 "계정 삭제" 그대로 */}
            <Row icon={I_USERX} label="계정 삭제(탈퇴)" danger chevron={false} onClick={() => setDeleteConfirm(true)} last />
          </Card>
        ) : null}
        <p className="text-center font-gothic" style={{ margin: "6px 0 0", fontSize: rem(10.5), color: FAINT }}>
          Kata kata {version} · <a href={TERMS_URL} className="underline-offset-2">이용약관</a> ·{" "}
          <a href={PRIVACY_URL} className="underline-offset-2">개인정보처리방침</a> ·{" "}
          {/* 사업자 정보(전자상거래법 제10조) — 약관 페이지 끝의 "사업자 정보" 칸으로 연결 */}
          <a href={BUSINESS_INFO_URL} className="underline-offset-2">사업자 정보</a>
          {/* 사진 출처는 2026-11-18 부터 설정 > 앱 정보 안에 있습니다(AppInfo.tsx) */}
        </p>
      </div>

      {/* ── 닉네임 — 앱 공통 틀(입력). 뒤로가기는 위 useBackClose(nickOpen) ── */}
      <FormSheet
        open={nickOpen}
        onClose={() => setNickOpen(false)}
        title="닉네임"
        desc="내 정보 맨 위에 보이는 이름입니다. 한글·영문·숫자 6자 이내로 적어 주세요."
        icon={<UserRound size={20} strokeWidth={1.8} />}
        onSubmit={(e) => { e.preventDefault(); saveNick(); }}
        dirty={nickInput.trim() !== nickInitialRef.current.trim()}
        footer={<FormPrimaryButton type="submit">저장</FormPrimaryButton>}
      >
        <div className={FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
          <input
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value.slice(0, 12))}
            maxLength={12}
            aria-label="닉네임"
            className={FORM_INPUT_CLASS + " font-body"}
            style={{ color: SHEET.txt }}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </FormSheet>

      {/* ── 글자 크기 — 앱 공통 틀. 고르는 동안 미리 보기, 완료 = 저장, X·바깥·뒤로가기 = 원래 크기로 ── */}
      <AppSheet
        open={fontOpen}
        onClose={cancelFont}
        title={"글자 크기 · " + (85 + fontDraft * 5) + "%"}
        desc="앱 전체 글자 크기입니다. 이 기기에만 적용됩니다."
        icon={<Type size={20} strokeWidth={1.8} />}
        footer={<SheetButton onClick={applyFont}>완료</SheetButton>}
      >
        <div className="flex items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => changeFont(-1)}
            disabled={fontDraft <= 0}
            aria-label="글자 작게"
            className="w-11 h-11 rounded-full border-[1.5px] text-[1.03125rem] disabled:opacity-40"
            style={{ borderColor: SHEET.line, color: SHEET.label }}
          >
            −
          </button>
          <div className="flex-1 flex items-center justify-center gap-1">
            {Array.from({ length: getStepCount() }).map((_, i) => (
              <span
                key={i}
                className={"h-1.5 rounded-full transition-all " + (i === fontDraft ? "w-5" : "w-1.5 bg-gray-300")}
                style={i === fontDraft ? { background: TEAL } : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => changeFont(1)}
            disabled={fontDraft >= getStepCount() - 1}
            aria-label="글자 크게"
            className="w-11 h-11 rounded-full border-[1.5px] text-[1.03125rem] disabled:opacity-40"
            style={{ borderColor: SHEET.line, color: SHEET.label }}
          >
            +
          </button>
        </div>
      </AppSheet>

      {/* ── 읽기 음성 — 앱 공통 틀(고르기 하나). 완료 = 적용, X·바깥·뒤로가기 = 그대로 ── */}
      <AppSheet
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        title="읽기 음성"
        icon={<AudioLines size={20} strokeWidth={1.8} />}
        footer={<SheetButton onClick={applyVoice}>완료</SheetButton>}
      >
        <ChoiceGroup mode="single" label="읽기 음성">
          {TTS_VOICES.map((v) => (
            <ChoiceRow key={v.id} mode="single" selected={voiceDraft === v.id} onClick={() => setVoiceDraft(v.id)} title={v.label} />
          ))}
        </ChoiceGroup>
        <p className="m-0 mt-1 font-gothic text-[0.78125rem] leading-[1.6] break-keep" style={{ color: SHEET.sub }}>
          이야기처럼 글을 읽어 주는 목소리입니다. 회화집은 남녀 두 목소리로 읽습니다. 이 기기에만 적용됩니다.
        </p>
      </AppSheet>

      {/* ── 새 폰으로 옮기기 (공개판: 백업 파일) — 앱 공통 틀. 단추를 누르면 바로 실행(동작 그대로) ── */}
      <AppSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="백업·복원"
        icon={<ArchiveRestore size={20} strokeWidth={1.8} />}
        footer={
          <div className="flex flex-col gap-2">
            <SheetButton onClick={saveBackupFile} disabled={moveBusy} dim={moveBusy}>백업 파일 저장</SheetButton>
            <SheetButton variant="secondary" onClick={() => setRestoreOpen(true)} disabled={moveBusy}>백업 파일 불러오기</SheetButton>
          </div>
        }
      >
        <p className="m-0 font-gothic text-[0.84375rem] leading-[1.6] break-keep" style={{ color: SHEET.label }}>
          공부 기록은 이 폰에만 저장됩니다. 앱을 지우거나 폰을 바꾸면 사라지므로 백업 파일을 저장해 두세요.
          내 단어장·직접 넣은 단어·불러온 이야기·만든 대화·설정이 담깁니다. 새 폰에서 이 화면의
          "백업 파일 불러오기"로 그 파일을 고르면 지금 있는 것과 합쳐집니다.
        </p>
        <p className="m-0 font-gothic text-[0.8125rem] font-semibold" style={{ color: SHEET.txt }}>
          마지막 백업: {backupAt > 0 ? dotDate(backupAt) : "아직 없음"}
        </p>
      </AppSheet>
      {/* 백업 파일 불러오기 — 뒤로가기는 이 창만 닫습니다(설정 창과 같은 방식) */}
      <BackupRestoreDialog open={restoreOpen} onOpenChange={setRestoreOpen} />

      {/* ── 저장된 읽기 음성 비우기 — 앱 공통 틀의 확인 창. 뒤로가기는 위 useBackClose(ttsConfirm) ── */}
      <ConfirmSheet
        open={ttsConfirm}
        onCancel={() => setTtsConfirm(false)}
        onConfirm={() => { setTtsConfirm(false); handleClearTts(); }}
        title="저장된 읽기 음성을 비우시겠습니까?"
        message={
          // 등급에 맞게 알립니다 — 무료는 Plus 음성을 다시 받을 수 없고, Plus 는 한도를 다시 씁니다(출시 전 점검 D-13)
          !publicLike
            ? "이 폰에 받아 둔 음성 파일이 지워집니다. 다음에 들으면 새로 받아 옵니다."
            : tier === "free"
              ? "이 폰에 받아 둔 음성 파일이 지워집니다. Plus에서 받은 이야기·회화집 음성은 무료 등급에서 다시 받을 수 없습니다."
              : "이 폰에 받아 둔 음성 파일이 지워집니다. 다음 날 다시 들으면 듣기 횟수를 다시 씁니다."
        }
        confirmLabel="비우기"
        danger
      />

      {/* ── 계정 삭제 (Play 정책: 앱 안에서 직접 지울 수 있어야 함) — 앱 공통 틀의 확인 창. 뒤로가기는 위 useBackClose(deleteConfirm) ── */}
      <ConfirmSheet
        open={deleteConfirm}
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={() => { setDeleteConfirm(false); handleDelete(); }}
        title="계정을 삭제하시겠습니까?"
        message={
          <>
            서버의 계정·사용 기록·구독 연결이 삭제되고 되돌릴 수 없습니다. 이 폰의 단어장을 지울지는 삭제한 뒤에 묻습니다.
            단어장도 지울 생각이면 먼저 "백업 파일 저장"으로 백업해 두세요.
            구독 중이라면 결제는 Google Play에서 따로 해지해야 합니다.
          </>
        }
        confirmLabel="계정 삭제"
        danger
      />

      {/* 내 정보 훈장 칸 → 자세히 창(2026-11-24). 명찰(홈·게임방)은 요약 창 */}
      <MedaliSheet initialTab={medaliTab} open={medaliOpen} onOpenChange={(o) => { if (!o) closeMedali(); }} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default MyInfo;
