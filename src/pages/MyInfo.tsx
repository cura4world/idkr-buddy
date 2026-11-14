// src/pages/MyInfo.tsx
// 내 정보 (/me) — 공개판 하단 탭의 네 번째 화면. 시안 ME1(Special·관리자) · ME2(무료) · ME3(Plus).
//
//   프로필 → 회원(등급별) → 학습 기록(이번 달 공부 시간 + 날별 막대 + 지난달 하루 평균 점선)
//   → 훈장(불꽃·별) → 설정 목록
//
// 설정은 저장 방식을 새로 만들지 않고 기존 lib(fontScale·tts·medaliSync·account·billing)와
// 기존 창(SettingsDialog·MedaliSheet)을 그대로 씁니다.
// 공개판에는 서버가 아직 없는 줄(서버 자동 백업·회원키·친구 비교)을 보이지 않습니다(QA Q01) —
// 새 폰으로 옮기기는 백업 파일(저장·불러오기)로 합니다.
// 등급 판단은 usePlan() 하나로만 합니다. 이메일은 보이지 않습니다(결정 문서 11/10).
//
// 공부 시간은 앱을 켜 둔 시간(usageTimer → Medali 일일 로그의 usageMs)입니다. 날마다 이미 쌓이고 있습니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SettingsDialog, { REOPEN_SETTINGS_KEY } from "@/components/SettingsDialog";
import BackupRestoreDialog from "@/components/BackupRestoreDialog";
import { useBackClose } from "@/hooks/useBackClose";
import { buildBackupFile, describeSummary, formatBytes, getBackupFileSavedAt, markBackupFileSaved } from "@/lib/transfer";
import MedaliSheet from "@/components/MedaliSheet";
import PlusLockBox from "@/components/PlusLockBox";
import { ProfileAvatar, profileName } from "@/components/BottomTabs";
import { usePlan, PAYWALL_PATH, Tier, TIER_LABEL, isPreviewBuild, isReviewAccount } from "@/lib/plan";
import { getSession, onSessionChange, signOut, deleteAccount, PublicSession } from "@/lib/account";
import { billingAvailable, manageSubscription } from "@/lib/billing";
import { usePlusPricing } from "@/lib/playOffers";
import { isStoreApp, storeAppVersion, hasNativeFileSave, saveFileNative, PRIVACY_URL, TERMS_URL, BUSINESS_INFO_URL } from "@/lib/platform";
import { getEdition, EDITION_LABEL } from "@/lib/access";
import { getMemberProfile } from "@/lib/member";
import { getFontStep, getStepCount, stepFont } from "@/lib/fontScale";
import { getTtsVoice, setTtsVoice, TTS_VOICES, TtsVoiceId, clearTtsCache } from "@/lib/tts";
import { clearPercakapanAudioCache } from "@/lib/percakapanAudio";
import { getMyMedaliId, setMyMedaliId, isValidMedaliId, loadPeerCache, syncMedali } from "@/lib/medaliSync";
import { medaliEngine, loadMedaliCache, listMyRawLogs, loadOthers, mergeDay, dateKey, DailyLog } from "@/lib/medali";

// ── 색 (시안 그대로) ─────────────────────────────────────────────
const INK = "#1D1F1E";
const MUTED = "#646C72";
const FAINT = "#9AA1A6";
const LINE = "#EEF1F3";
const DEEP = "#104B60";
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
const I_DOC = (
  <Ico>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Ico>
);
const I_CARD = (
  <Ico>
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <path d="M2 10h20M6 15h4" />
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
    style={{ margin: "14px 4px 0", fontSize: rem(13), fontWeight: 700, letterSpacing: "0.02em", color: "#3B4245" }}
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
}

const Row = ({ icon, label, value, onClick, last, danger, chevron = true, right }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 text-left active:bg-black/[0.03] transition-colors"
    style={{ minHeight: 52, padding: "0 12px 0 16px", borderBottom: last ? "0" : "1px solid " + LINE }}
  >
    <span className="flex shrink-0" style={{ color: danger ? "#B5524A" : MUTED }}>{icon}</span>
    <span className="flex-1 min-w-0 truncate" style={{ fontSize: rem(14), color: danger ? "#B5524A" : INK }}>
      {label}
    </span>
    {value ? (
      <span className="font-gothic shrink-0 truncate" style={{ maxWidth: "55%", fontSize: rem(12), color: MUTED }}>
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

// ── 등급 배지 ────────────────────────────────────────────────────
function tierBadge(t: Tier): { text: string; bg: string; fg: string } {
  if (t === "free") return { text: "무료", bg: "#F1F4F5", fg: MUTED };
  if (t === "plus") return { text: "Plus", bg: "#E3EEEC", fg: TEAL };
  if (t === "trial") return { text: "Plus 체험", bg: "#E3EEEC", fg: TEAL };
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
  const peer = storeApp ? null : loadPeerCache();

  // 훈장 팝업 — 폰의 뒤로가기로 팝업만 닫히게 히스토리를 한 칸 쌓습니다(홈과 같은 방식)
  const [medaliOpen, setMedaliOpen] = useState(false);
  const medaliOpenRef = useRef(false);
  const medaliPushedRef = useRef(false);
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

  const openNick = () => {
    const cur = getMyMedaliId();
    setNickInput(cur && cur !== "-" ? cur : nick);
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
    toast("닉네임을 " + v + "(으)로 바꿨습니다");
    // 관리자판·회원판은 이 이름으로 기기끼리 점수를 맞춥니다(공개판은 회원키가 없어 요청하지 않음)
    syncMedali(true).catch(() => {});
  };

  const changeFont = (d: number) => setFontStepState(stepFont(d));

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
          ? "계정을 지웠습니다. 구독 결제는 Google Play 에서 따로 해지해 주세요"
          : "계정을 지웠습니다",
        { duration: 8000 },
      );
    } catch (e) {
      // 실패 이유별로 안내합니다 — 세션이 끝난 경우에는 인터넷이 아니라 다시 로그인이 필요합니다(출시 전 점검 C-12)
      const code = e instanceof Error ? e.message : "";
      toast(
        code === "SESSION_EXPIRED" || code === "NO_SESSION"
          ? "로그인이 끝나 지우지 못했습니다. 다시 로그인한 뒤 눌러 주세요"
          : code === "NETWORK_FAILED"
            ? "지우지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요"
            : "지우지 못했습니다. 잠시 뒤 다시 눌러 주세요",
        { duration: 6000 },
      );
      setBusy(false);
    }
  };

  const openManage = () => {
    if (!billingAvailable()) {
      toast("구독 관리는 Google Play 에서 받은 앱에서 열립니다");
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
  useBackClose(fontOpen, () => setFontOpen(false));
  useBackClose(voiceOpen, () => setVoiceOpen(false));
  useBackClose(moveOpen, () => setMoveOpen(false));
  useBackClose(ttsConfirm, () => setTtsConfirm(false));
  useBackClose(deleteConfirm, () => setDeleteConfirm(false));

  // ── 화면 ──
  const badge = tierBadge(tier);
  const subLine = session
    ? "Google 계정으로 로그인됨"
    : publicLike
      ? "로그인 전"
      : EDITION_LABEL[getEdition()];
  const until = session && session.plan && typeof session.plan.until === "number" ? session.plan.until : 0;
  const period = planPeriod(session);
  // 회원 구역 Plus 상자의 요금 두 줄 — Play 에서 받은 가격으로만 만듭니다(월 환산 = Play 연 가격 ÷ 12).
  // 아직 못 받았으면 금액 대신 소개 문구를 보입니다. 고정 원화 금액은 미리보기 빌드의 대체값뿐입니다.
  const plusLines: [string, string] = pricing.state === "ready" && pricing.monthlyPrice
    ? [
        "월 " + pricing.monthlyPrice + ",",
        pricing.yearlyPerMonth
          ? "연간 구독 시 월 " + pricing.yearlyPerMonth
          : pricing.yearlyPrice ? "연간 구독 시 연 " + pricing.yearlyPrice : "언제든 해지할 수 있습니다",
      ]
    : ["단어장·게임·회화·지도까지", "모든 기능이 열립니다"];
  const tail = memberKeyTail(session);
  const hm = splitHM(view.totalMs);

  // 막대 높이의 기준 — 몇 분만 쓴 날이 막대를 꽉 채우지 않게 최소 30분으로 잡습니다
  const barMax = Math.max(30 * 60000, view.refAvgMs, ...view.dayMs);
  const refPct = view.refAvgMs > 0 ? Math.min(100, (view.refAvgMs / barMax) * 100) : 0;
  const prevName = monthBack === 0 ? "지난달" : "전달";
  const diffSame = Math.abs(view.diffMs) < 60000;
  const diffText = (view.diffMs > 0 ? "+" : "−") + hmText(view.diffMs);

  const ranking: { name: string; me: boolean; pts: number; initial: string }[] = [
    { name: displayName, me: true, pts: medal.week, initial: displayName.charAt(0).toUpperCase() },
  ];
  if (peer && peer.id) {
    ranking.push({ name: peer.id, me: false, pts: peer.weekPoints || 0, initial: peer.id.charAt(0).toUpperCase() });
    ranking.sort((a, b) => b.pts - a.pts);
  }

  const version = storeAppVersion() || "2.0";

  return (
    <div
      className="w-full max-w-lg mx-auto bg-background overflow-x-clip"
      style={{ minHeight: "calc(100dvh - var(--kata-tabbar-h, 0px))", color: INK }}
    >
      <header className="flex items-center px-4" style={{ height: 56, borderBottom: "1px solid #E3E8EB" }}>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">PROFIL SAYA</h1>
      </header>

      <div className="flex flex-col" style={{ padding: "16px 16px 24px", gap: 10 }}>
        {/* ── 프로필 ── */}
        <Card style={{ padding: "18px 16px" }}>
          <div className="flex items-center" style={{ gap: 14 }}>
            <ProfileAvatar size={56} fontPx={22} session={session} name={displayName} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center" style={{ gap: 8 }}>
                <span className="truncate" style={{ fontSize: rem(16.5), fontWeight: 600 }}>{displayName}</span>
                <span
                  className="shrink-0 flex items-center font-gothic"
                  style={{ height: 22, padding: "0 9px", borderRadius: 11, background: badge.bg, color: badge.fg, fontSize: rem(10.5), fontWeight: 700 }}
                >
                  {badge.text}
                </span>
              </span>
              <span className="block font-gothic" style={{ marginTop: 4, fontSize: rem(11.5), color: MUTED }}>{subLine}</span>
            </span>
          </div>
        </Card>

        {/* ── 회원 ── */}
        <SectionTitle>회원</SectionTitle>
        {tier === "free" ? (
          <>
            <PlusLockBox
              title="Kata kata Plus"
              lines={plusLines}
              onClick={() => navigate(PAYWALL_PATH)}
              wholeBox
            />
            {/* 공개판 회원키 입력은 서버가 생기면 다시 넣습니다(QA Q01 — 그 전에는 링크를 보이지 않음) */}
          </>
        ) : tier === "plus" || tier === "trial" ? (
          <Card style={{ overflow: "hidden" }}>
            <Row
              icon={I_DOC}
              label="회원 등급"
              value={review ? "Plus · 심사용 계정" : tier === "trial" ? "Plus · 무료 체험 중" : "Plus" + (period ? " · " + period : "")}
              onClick={() => navigate(PAYWALL_PATH)}
              last={review}
            />
            {/* 심사용 계정은 구독이 아니라 관리할 결제가 없습니다. 해지한 구독은 "다음 결제" 대신 "…까지 이용"(B-09). */}
            {review ? null : (
              <Row
                icon={I_CARD}
                label="구독 관리"
                value={until > Date.now()
                  ? (session && session.plan.autoRenew === false
                      ? dotDate(until) + "까지 이용"
                      : (tier === "trial" ? "첫 결제 " : "다음 결제 ") + dotDate(until))
                  : undefined}
                onClick={openManage}
                last
              />
            )}
          </Card>
        ) : (
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

        {/* ── 학습 기록 ── */}
        <SectionTitle>학습 기록</SectionTitle>
        <Card style={{ padding: "16px 16px 14px" }}>
          <div className="flex items-center justify-between">
            <span className="font-gothic" style={{ fontSize: rem(12), fontWeight: 600, color: MUTED }}>공부 시간</span>
            <span
              className="flex font-gothic"
              style={{ height: 30, borderRadius: 15, background: "#F1F4F5", padding: 3, boxSizing: "border-box", fontSize: rem(11), fontWeight: 600 }}
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
          <p className="flex items-baseline" style={{ margin: "10px 0 0", gap: 6 }}>
            {hm.h > 0 ? (
              <>
                <span className="font-word" style={{ fontSize: rem(27.5), fontWeight: 600, color: DEEP }}>{hm.h}</span>
                <span style={{ fontSize: rem(13) }}>시간</span>
              </>
            ) : null}
            <span className="font-word" style={{ fontSize: rem(27.5), fontWeight: 600, color: DEEP }}>{hm.m}</span>
            <span style={{ fontSize: rem(13) }}>분</span>
          </p>
          <p className="font-gothic" style={{ margin: "2px 0 0", fontSize: rem(11.5), color: MUTED }}>
            하루 평균 {hmText(view.avgMs)} ·{" "}
            {diffSame ? (
              prevName + " 같은 기간과 같음"
            ) : (
              <>
                {prevName} 같은 기간보다{" "}
                <b style={{ color: view.diffMs > 0 ? TEAL : MUTED }}>{diffText}</b>
              </>
            )}
          </p>
          <div className="relative flex" style={{ marginTop: 10, height: 64, gap: 3 }} aria-hidden="true">
            {refPct > 0 ? (
              <span className="absolute left-0 right-0" style={{ bottom: refPct + "%", borderTop: "1.5px dashed #C9CFD3" }} />
            ) : null}
            {view.dayMs.map((ms, i) => {
              const future = view.todayIdx >= 0 && i > view.todayIdx;
              const today = i === view.todayIdx;
              const h = future || ms <= 0 ? 3 : Math.max(3, Math.round((ms / barMax) * 100));
              const bg = future ? LINE : today ? TEAL : "#9CC5BB";
              return (
                <span key={i} className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
                  <span style={{ height: h + "%", borderRadius: 3, background: bg }} />
                </span>
              );
            })}
          </div>
          <div className="flex justify-between font-gothic" style={{ marginTop: 6, fontSize: rem(10.5), color: FAINT }}>
            <span>{view.month + 1}월 1일</span>
            <span className="flex items-center" style={{ gap: 4 }}>
              <span style={{ width: 12, borderTop: "1.5px dashed #C9CFD3" }} />
              {prevName} 하루 평균
            </span>
            <span>{view.days}일</span>
          </div>
        </Card>

        {/* ── 훈장 ── */}
        <SectionTitle>훈장</SectionTitle>
        <Card style={{ padding: 16 }}>
          <div className="grid grid-cols-2" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={openMedali}
              className="text-left active:opacity-80"
              style={{ borderRadius: 14, background: "#FBF1EC", padding: "12px 10px 12px 12px" }}
            >
              <p className="flex items-center font-gothic" style={{ margin: 0, gap: 5, fontSize: rem(11), fontWeight: 600, color: "#B5643C" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8875A" aria-hidden="true">
                  <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" />
                </svg>
                이번 주 불꽃
              </p>
              <p className="font-word" style={{ margin: "4px 0 0", fontSize: rem(22), fontWeight: 600, color: INK }}>
                {medal.week}
                <span className="font-gothic" style={{ fontSize: rem(11), fontWeight: 500, color: MUTED }}> 점</span>
              </p>
              <p className="font-gothic" style={{ margin: "4px 0 0", fontSize: rem(10.5), lineHeight: 1.5, letterSpacing: "-0.02em", color: "#8A6A5A", wordBreak: "keep-all" }}>
                학습을 통해 쌓이는 이번 주 점수,<br />매주 월요일 갱신
              </p>
            </button>
            <button
              type="button"
              onClick={openMedali}
              className="text-left active:opacity-80"
              style={{ borderRadius: 14, background: "#FBF5E6", padding: "12px 10px 12px 12px" }}
            >
              <p className="flex items-center font-gothic" style={{ margin: 0, gap: 5, fontSize: rem(11), fontWeight: 600, color: "#94723A" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#E0B04A" aria-hidden="true">
                  <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z" />
                </svg>
                모은 별
              </p>
              <p className="font-word" style={{ margin: "4px 0 0", fontSize: rem(22), fontWeight: 600, color: INK }}>
                {medal.stars}
                <span className="font-gothic" style={{ fontSize: rem(11), fontWeight: 500, color: MUTED }}> 단어</span>
              </p>
              <p className="font-gothic" style={{ margin: "4px 0 0", fontSize: rem(10.5), lineHeight: 1.5, letterSpacing: "-0.02em", color: "#8A7A55", wordBreak: "keep-all" }}>
                여러 번 맞혀 확실히 외운<br />단어 수, 계속 누적
              </p>
            </button>
          </div>
          <div className="flex flex-col" style={{ marginTop: 12, borderTop: "1px solid " + LINE, paddingTop: 12, gap: 10 }}>
            {ranking.map((r) => (
              <div key={(r.me ? "me-" : "peer-") + r.name} className="flex items-center" style={{ gap: 10 }}>
                <span
                  className="shrink-0 flex items-center justify-center font-gothic"
                  style={{
                    width: 30, height: 30, borderRadius: 15, fontSize: rem(11), fontWeight: 700,
                    background: r.me ? "#E9E4F5" : "#E6F0EC", color: r.me ? "#5B4A8A" : "#3F7F6E",
                  }}
                >
                  {r.initial || "K"}
                </span>
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: rem(13.5) }}>
                  {r.name}
                  {r.me ? <span className="font-gothic" style={{ fontSize: rem(10.5), color: FAINT }}> 나</span> : null}
                </span>
                <span className="font-word" style={{ fontSize: rem(14), fontWeight: 600 }}>{r.pts}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 설정 ── */}
        <SectionTitle>설정</SectionTitle>
        <Card style={{ overflow: "hidden" }}>
          <Row icon={I_PEN} label="닉네임" value={nick || "—"} onClick={openNick} />
          <Row icon={I_TYPE} label="글자 크기" value={fontPct + "%"} onClick={() => setFontOpen(true)} />
          <Row icon={I_MIC} label="읽기 음성" value={voiceLabel} onClick={() => setVoiceOpen(true)} />
          {/* 서버 자동 백업은 관리자판·회원판(회원키 서버)에만 있습니다. 공개판은 서버가 생길 때까지 숨깁니다(QA Q01). */}
          {publicLike ? null : (
            <Row icon={I_CLOUD} label="서버 자동 백업" onClick={onAutoBackup} right={<Toggle on={autoBackupOn} />} />
          )}
          {/* 공개판: 데이터가 이 폰에만 있으므로 "백업"을 앞세우고 마지막 백업 날짜를 보여 줍니다(D-01). 관리자판·회원판은 예전 그대로 */}
          <Row
            icon={I_PHONE}
            label={publicLike ? "백업·새 폰으로 옮기기" : "새 폰으로 옮기기"}
            value={publicLike ? (backupAt > 0 ? "마지막 백업 " + dotDate(backupAt) : "백업 아직 없음") : undefined}
            onClick={onMoveRow}
            last
          />
        </Card>
        <Card style={{ overflow: "hidden" }}>
          <Row icon={I_TRASH} label="저장된 읽기 음성 비우기" onClick={() => setTtsConfirm(true)} last={!session} />
          {session ? (
            <Row icon={I_LOGOUT} label="로그아웃" danger chevron={false} onClick={handleSignOut} last />
          ) : null}
        </Card>
        {session ? (
          <Card style={{ overflow: "hidden", marginTop: 6 }}>
            <Row icon={I_USERX} label="계정 삭제" danger chevron={false} onClick={() => setDeleteConfirm(true)} last />
          </Card>
        ) : null}
        <p className="text-center font-gothic" style={{ margin: "6px 0 0", fontSize: rem(10.5), color: FAINT }}>
          Kata kata {version} · <a href={TERMS_URL} className="underline-offset-2">이용약관</a> ·{" "}
          <a href={PRIVACY_URL} className="underline-offset-2">개인정보처리방침</a> ·{" "}
          {/* 사업자 정보(전자상거래법 제10조) — 약관 페이지 끝의 "사업자 정보" 칸으로 연결 */}
          <a href={BUSINESS_INFO_URL} className="underline-offset-2">사업자 정보</a> ·{" "}
          {/* 사진 출처(S55) — 지도 사진의 작가·라이선스는 여기 한곳에 모읍니다. 경로는 PhotoCredits.tsx 의 PHOTO_CREDITS_PATH */}
          <button type="button" onClick={() => navigate("/about/photos")} className="underline-offset-2">
            사진 출처
          </button>
        </p>
      </div>

      {/* ── 닉네임 ── */}
      <Dialog open={nickOpen} onOpenChange={setNickOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-body text-gray-900">닉네임</DialogTitle>
          </DialogHeader>
          <p className="font-gothic text-[0.6875rem] leading-relaxed text-muted-foreground">
            훈장 점수 옆에 보이는 이름입니다. 한글·영문·숫자 6자 이내로 적어 주세요.
          </p>
          <input
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value.slice(0, 12))}
            onKeyDown={(e) => { if (e.key === "Enter") saveNick(); }}
            maxLength={12}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-[0.875rem] outline-none focus:border-primary"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button
            type="button"
            onClick={saveNick}
            className="h-11 w-full rounded-xl text-white font-gothic text-[0.8125rem] font-semibold"
            style={{ background: TEAL }}
          >
            저장
          </button>
        </DialogContent>
      </Dialog>

      {/* ── 글자 크기 ── */}
      <Dialog open={fontOpen} onOpenChange={setFontOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-body text-gray-900">글자 크기 · {fontPct}%</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={fontStep <= 0}
              aria-label="글자 작게"
              className="w-11 h-11 rounded-full border border-border text-[1.03125rem] disabled:opacity-40"
            >
              −
            </button>
            <div className="flex-1 flex items-center justify-center gap-1">
              {Array.from({ length: getStepCount() }).map((_, i) => (
                <span
                  key={i}
                  className={"h-1.5 rounded-full transition-all " + (i === fontStep ? "w-5" : "w-1.5 bg-gray-300")}
                  style={i === fontStep ? { background: TEAL } : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={fontStep >= getStepCount() - 1}
              aria-label="글자 크게"
              className="w-11 h-11 rounded-full border border-border text-[1.03125rem] disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="font-gothic text-[0.6875rem] leading-relaxed text-muted-foreground">
            앱 전체 글자 크기입니다. 이 기기에만 적용됩니다.
          </p>
        </DialogContent>
      </Dialog>

      {/* ── 읽기 음성 ── */}
      <Dialog open={voiceOpen} onOpenChange={setVoiceOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-body text-gray-900">읽기 음성</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            {TTS_VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setVoice(v.id); setTtsVoice(v.id); }}
                className="flex-1 h-11 rounded-xl border font-gothic text-[0.8125rem] font-semibold"
                style={voice === v.id
                  ? { background: TEAL, borderColor: TEAL, color: "#FFFFFF" }
                  : { background: "#FFFFFF", borderColor: "#DDE3E6", color: INK }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="font-gothic text-[0.6875rem] leading-relaxed text-muted-foreground">
            이야기·회화의 "전체 듣기"에 쓰이는 목소리입니다. 이 기기에만 적용됩니다.
          </p>
        </DialogContent>
      </Dialog>

      {/* ── 새 폰으로 옮기기 (공개판: 백업 파일) ── */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-body text-gray-900">백업·새 폰으로 옮기기</DialogTitle>
          </DialogHeader>
          <p className="font-gothic text-[0.6875rem] leading-relaxed text-muted-foreground">
            학습 기록은 이 폰에만 저장됩니다. 앱을 지우거나 폰을 바꾸면 사라지므로 백업 파일을 저장해 두세요.
            내 단어장·직접 넣은 단어·불러온 이야기·만든 회화집·설정이 담깁니다. 새 폰에서 이 화면의
            "백업 파일 불러오기"로 그 파일을 고르면 지금 있는 것과 합쳐집니다.
          </p>
          <p className="font-gothic text-[0.6875rem] font-semibold" style={{ color: INK }}>
            마지막 백업: {backupAt > 0 ? dotDate(backupAt) : "아직 없음"}
          </p>
          <button
            type="button"
            onClick={saveBackupFile}
            disabled={moveBusy}
            className="h-11 w-full rounded-xl text-white font-gothic text-[0.8125rem] font-semibold disabled:opacity-60"
            style={{ background: TEAL }}
          >
            백업 파일 저장
          </button>
          <button
            type="button"
            onClick={() => setRestoreOpen(true)}
            disabled={moveBusy}
            className="h-11 w-full rounded-xl border font-gothic text-[0.8125rem] font-semibold disabled:opacity-60"
            style={{ background: "#FFFFFF", borderColor: "#DDE3E6", color: INK }}
          >
            백업 파일 불러오기
          </button>
          {/* 창 안에 두어야 겹친 창으로 열리고, 뒤로가기가 위의 창만 닫습니다(설정 창과 같은 방식) */}
          <BackupRestoreDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
        </DialogContent>
      </Dialog>

      {/* ── 저장된 읽기 음성 비우기 ── */}
      <AlertDialog open={ttsConfirm} onOpenChange={setTtsConfirm}>
        <AlertDialogContent className="bg-card w-[calc(100vw-3rem)] max-w-xs gap-3 p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body text-[0.9375rem] text-gray-900">저장된 읽기 음성을 비우시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="font-gothic text-[0.6875rem] leading-relaxed">
              {/* 등급에 맞게 알립니다 — 무료는 Plus 음성을 다시 받을 수 없고, Plus 는 한도를 다시 씁니다(출시 전 점검 D-13) */}
              {!publicLike
                ? "이 폰에 받아 둔 음성 파일이 지워집니다. 다음에 들으면 새로 받아 옵니다."
                : tier === "free"
                  ? "이 폰에 받아 둔 음성 파일이 지워집니다. Plus 에서 받은 이야기·회화 음성은 무료 등급에서 다시 받을 수 없습니다."
                  : "이 폰에 받아 둔 음성 파일이 지워집니다. 다시 들으면 새로 받아 오며, 그만큼 듣기 횟수를 다시 씁니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearTts} className="font-body bg-red-600 hover:bg-red-700 text-white">비우기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 계정 삭제 (Play 정책: 앱 안에서 직접 지울 수 있어야 함) ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="bg-card w-[calc(100vw-3rem)] max-w-xs gap-3 p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body text-[0.9375rem] text-gray-900">계정을 지우시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="font-gothic text-[0.6875rem] leading-relaxed">
              서버의 계정·사용 기록·구독 연결이 지워지고 되돌릴 수 없습니다. 이 폰의 단어장은 그대로 남습니다.
              구독 중이라면 결제는 Google Play 에서 따로 해지해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="font-body bg-red-600 hover:bg-red-700 text-white">계정 삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MedaliSheet open={medaliOpen} onOpenChange={(o) => { if (!o) closeMedali(); }} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default MyInfo;
