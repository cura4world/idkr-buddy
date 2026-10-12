import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { getClaudeApiKey, setClaudeApiKey } from "@/lib/claude";
import { exportPersonalWordsToCSV, getPrivateFolderName, setPrivateFolderName } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CSVImportDialog from "@/components/CSVImportDialog";
import BackupRestoreDialog from "@/components/BackupRestoreDialog";
import {
  TransferInfo, getTransferInfo, sendToNewPhone, receiveFromOldPhone, cancelTransfer,
  buildBackupFile, describeSummary, formatBytes,
  BackupInfo, BackupShrinkError, getBackupInfo, backupNow, restoreFromServerBackup,
  isAutoBackupBlocked, describeBackupMeta, isInApp,
} from "@/lib/transfer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Download, Upload, Trash2, Minus, Plus, Type, Volume2, KeyRound, Smartphone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { clearLookupWords, countLookupWords } from "@/lib/wordStore";
import { clearCachedResults, countCachedResults } from "@/lib/dictStore";
import { getFontStep, getStepCount, stepFont } from "@/lib/fontScale";
import { getTtsVoice, setTtsVoice, TTS_VOICES, TtsVoiceId, clearTtsCache } from "@/lib/tts";
import { getSermonBase, setSermonBase, getSermonKey, setSermonKey } from "@/lib/sermon";
import { getPercakapanBase, setPercakapanBase, getPercakapanKey, setPercakapanKey, hasPercakapanConfig, pushBackup } from "@/lib/percakapan";
import { getMyMedaliId, setMyMedaliId, optOutMedali, isValidMedaliId, fetchRegisteredIds, syncMedali } from "@/lib/medaliSync";
import {
  parseKoBible, saveKoBible, clearKoBible, koMetaSync, guessLabel, guessVersion,
  pushKoToServer, pullKoFromServer, getBibleBase, setBibleBase, getBibleKey, setBibleKey,
  KoMeta, BibleVersion, BIBLE_VERSIONS,
} from "@/lib/bibleKo";
import { clearKoMemoryCache } from "@/lib/bible";
import { pushMaterial, clearCachedMaterial } from "@/lib/materials";
import { useRef } from "react";
import { getEdition, Edition, EDITION_LABEL, activateAndSync, syncMemberContent, leaveMembership } from "@/lib/access";
import { getMemberProfile, MemberProfile } from "@/lib/member";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 회원키 입력 자동 서식 — "KK-" 고정 접두어, 대문자 변환, 4글자마다 하이픈 자동.
// 하이픈을 백스페이스로 지우면 앞 글자까지 지워 하이픈에 걸려 멈추지 않게 하고,
// 카톡에서 받은 키를 통째로 붙여넣어도(소문자·공백·하이픈 섞임) 알아서 정리합니다.
function formatMemberInput(raw: string, prev: string): string {
  const up = (raw || "").toUpperCase();
  const deleting = up.length < prev.length;
  // 고정 접두어 "KK-" 를 지우려 하면 그대로 둡니다
  if (deleting && "KK-".indexOf(up) === 0) return "KK-";
  const prevU = (prev || "").toUpperCase();
  let rest: string;
  if (up.indexOf("KK-") === 0) {
    rest = up.slice(3);
  } else if (!deleting && prevU.indexOf("KK-") === 0) {
    // 커서가 "KK-" 안쪽이나 앞에 있어서 글자가 접두어 사이에 끼어든 경우 —
    // 이전 값과 비교해 새로 들어온 글자만 골라 본문 끝에 붙입니다.
    let a = 0;
    while (a < prevU.length && a < up.length && prevU.charAt(a) === up.charAt(a)) a++;
    let b = 0;
    while (b < prevU.length - a && b < up.length - a &&
      prevU.charAt(prevU.length - 1 - b) === up.charAt(up.length - 1 - b)) b++;
    rest = prevU.slice(3) + up.slice(a, up.length - b);
  } else {
    rest = up;
  }
  let body = rest.replace(new RegExp("[^A-Z0-9]", "g"), "");
  if (body.length > 12 && body.indexOf("KK") === 0) body = body.slice(2);
  if (deleting && prev.charAt(prev.length - 1) === "-" && up === prev.slice(0, -1).toUpperCase()) {
    body = body.slice(0, -1);
  }
  body = body.slice(0, 12);
  const groups = [body.slice(0, 4), body.slice(4, 8), body.slice(8, 12)].filter((g) => g.length > 0);
  let out = "KK-" + groups.join("-");
  if (!deleting && (body.length === 4 || body.length === 8)) out += "-";
  return out;
}

// 설정 창에서 다른 화면으로 나갈 때 남기는 표시(sessionStorage, 값 = 남긴 시각).
// 메인(Index)이 다시 그려질 때 이 표시가 있으면 설정 창을 다시 엽니다 — 뒤로 가기로
// 돌아왔을 때 메인이 아니라 설정 창으로 돌아오게 하려는 것입니다. 설정 창이 열리면 지웁니다.
export const REOPEN_SETTINGS_KEY = "kata-reopen-settings";
// 다시 열릴 때 그 자리로 스크롤할 칸의 id
const MEMBER_SECTION_ID = "settings-member-section";

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  // 새 폰으로 옮기기 (회원키) — 서버 보관함 상태. null = 아직 모름(또는 연결 안 됨)
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferMsg, setTransferMsg] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  // 서버 자동 백업 (회원키) — null = 아직 모름(또는 연결 안 됨)
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [srvBusy, setSrvBusy] = useState(false);
  const [srvMsg, setSrvMsg] = useState("");
  const [srvBlocked, setSrvBlocked] = useState(false);
  const [srvForceConfirm, setSrvForceConfirm] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [confirmClearTts, setConfirmClearTts] = useState(false);
  // 성경 파일 불러오기 — 여러 파일을 한 번에 고르면 이름으로 역본을 알아서 판별합니다.
  const koFilesRef = useRef<HTMLInputElement | null>(null);
  const [koMeta, setKoMetaState] = useState<Record<BibleVersion, KoMeta | null>>({ gr: null, wm: null, niv: null });
  const [koBusyVersion, setKoBusyVersion] = useState<BibleVersion | "all" | null>(null);
  const [koProgress, setKoProgress] = useState("");
  const koBusy = koBusyVersion !== null;
  // 일대일 교재 PDF — 성경 서버 주소·키를 그대로 씁니다
  const otoFileRef = useRef<HTMLInputElement | null>(null);
  const [otoBusy, setOtoBusy] = useState(false);
  // 성경 서버는 설교문과 열쇠를 나눠 씁니다 (아내 폰에 설교문이 보이지 않도록)
  const [bibleBase, setBibleBaseState] = useState("");
  const [bibleKey, setBibleKeyState] = useState("");
  const [privateFolder, setPrivateFolder] = useState("");
  const [fontStep, setFontStepState] = useState(3);
  const [voice, setVoice] = useState<TtsVoiceId>("male");
  // lib 의 setSermonBase / setSermonKey 와 이름이 겹치지 않도록 setter 에 _ 를 붙입니다.
  const [sermonBase, setSermonBaseState] = useState("");
  const [sermonKey, setSermonKeyState] = useState("");
  const [percakapanBase, setPercakapanBaseState] = useState("");
  const [percakapanKey, setPercakapanKeyState] = useState("");
  // 회화집 백업: 서버에 백업이 있는데 이 기기가 비었을 때 한 번 더 확인받습니다
  const [pcConfirmErase, setPcConfirmErase] = useState(0);
  const [pcBusy, setPcBusy] = useState(false);
  // Medali 아이디 — 내 기기끼리 점수를 합치려면 세 기기가 같은 아이디를 써야 합니다.
  const [medaliId, setMedaliIdState] = useState("");
  const [medaliTaken, setMedaliTaken] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setApiKey(getGeminiApiKey());
      setClaudeKey(getClaudeApiKey());
      setPrivateFolder(getPrivateFolderName());
      setFontStepState(getFontStep());
      setVoice(getTtsVoice());
      setSermonBaseState(getSermonBase());
      setSermonKeyState(getSermonKey());
      setPercakapanBaseState(getPercakapanBase());
      setPercakapanKeyState(getPercakapanKey());
      setPcConfirmErase(0);
      setKoMetaState({ gr: koMetaSync("gr"), wm: koMetaSync("wm"), niv: koMetaSync("niv") });
      setKoBusyVersion(null);
      setBibleBaseState(getBibleBase());
      setBibleKeyState(getBibleKey());
      const cur = getMyMedaliId();
      setMedaliIdState(cur === "-" ? "" : cur);
      fetchRegisteredIds()
        .then((ids) => setMedaliTaken(ids))
        .catch(() => {});
      setEdition(getEdition());
      setMemberProfileState(getMemberProfile());
      setMemberInput("");
      setMemberMsg("");
      setMemberLeaveConfirm(false);
      setTransferInfo(null);
      setTransferConfirm(false);
      setTransferMsg("");
      setTransferBusy(false);
      setBackupInfo(null);
      setSrvBusy(false);
      setSrvMsg("");
      setSrvBlocked(isAutoBackupBlocked());
      setSrvForceConfirm(false);
      if (getMemberProfile()) {
        getTransferInfo()
          .then((info) => setTransferInfo(info))
          .catch(() => {});
        getBackupInfo()
          .then((info) => setBackupInfo(info))
          .catch(() => {});
      }
      // 회원키 관리에서 뒤로 돌아온 것이면 표시를 지우고 회원키 칸으로 스크롤합니다
      let returning = false;
      try {
        returning = !!sessionStorage.getItem(REOPEN_SETTINGS_KEY);
        sessionStorage.removeItem(REOPEN_SETTINGS_KEY);
      } catch (e) {}
      if (returning) {
        setTimeout(() => {
          const el = document.getElementById(MEMBER_SECTION_ID);
          if (el) {
            try { el.scrollIntoView({ block: "start" }); } catch (e) { el.scrollIntoView(); }
          }
        }, 250);
      }
    }
  }, [open]);

  // ---------- 회원키 ----------
  // 관리자판이 아니면 아래의 서버·키·파일 칸을 모두 가리고, 회원키 하나로 끝냅니다.
  const [edition, setEdition] = useState<Edition>("public");
  const [memberProfile, setMemberProfileState] = useState<MemberProfile | null>(null);
  const [memberInput, setMemberInput] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberMsg, setMemberMsg] = useState("");
  const [memberLeaveConfirm, setMemberLeaveConfirm] = useState(false);
  // 회원키 칸의 커서는 항상 맨 끝(입력 자리)에 둡니다 — "KK-" 부분을 눌러도 앞에 서지 않게.
  const memberInputRef = useRef<HTMLInputElement | null>(null);
  const memberCaretToEnd = () => {
    const el = memberInputRef.current;
    if (!el || document.activeElement !== el) return;
    const n = el.value.length;
    try {
      if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n);
    } catch (e) {}
  };
  useEffect(() => {
    memberCaretToEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberInput]);

  // 키보드가 올라오면 설정 창이 그만큼 줄어드는데, 창 안 스크롤은 그대로라 회원키 칸이
  // 창 아래 가장자리에 걸려 잘립니다. 키보드가 다 올라온 뒤(약 0.35초) 칸을 창 가운데로
  // 스크롤하고, 키보드 높이가 바뀔 때(추천 단어 줄 등)도 다시 맞춥니다.
  const memberScrollIntoView = () => {
    const el = memberInputRef.current;
    if (!el || document.activeElement !== el) return;
    try {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e) {
      el.scrollIntoView();
    }
  };
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => { memberScrollIntoView(); };
    vv.addEventListener("resize", onResize);
    return () => { vv.removeEventListener("resize", onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isAdminUI = edition === "admin";

  const handleMemberActivate = async () => {
    if (memberBusy) return;
    setMemberBusy(true);
    setMemberMsg("확인 중...");
    try {
      const r = await activateAndSync(memberInput, (m) => setMemberMsg("받는 중 · " + m));
      const parts: string[] = [];
      if (r.bibles.length > 0) parts.push("성경 " + r.bibles.join("·"));
      if (r.scenes > 0) parts.push("회화집 " + r.scenes + "개");
      toast((r.profile.name || "회원") + "님, 활성화되었습니다" + (parts.length > 0 ? " — " + parts.join(", ") + " 받음" : ""));
      // 옛 폰이 "새 폰으로 보내기"를 해 두었으면 받으라고 알려 줍니다(받기는 설정 창에서)
      let waiting = false;
      try {
        const info = await getTransferInfo();
        waiting = !!(info && info.exists && !info.fromSelf);
      } catch (e) {}
      if (waiting) toast("이전 폰에서 보낸 데이터가 있습니다. 설정을 다시 열고 '이전 폰 데이터 받기'를 눌러 주세요", { duration: 8000 });
      // 보낸 데이터는 없지만 서버 백업이 있으면(폰 분실·고장 뒤 새 폰) 되돌리기를 알려 줍니다
      let hasBackup = false;
      if (!waiting) {
        try {
          const b = await getBackupInfo();
          hasBackup = !!(b && b.exists);
        } catch (e) {}
        if (hasBackup) toast("서버 백업이 있습니다. 설정을 다시 열고 '서버 백업에서 되돌리기'를 눌러 주세요", { duration: 8000 });
      }
      // 판·개인 단어장이 바뀌므로 앱을 새로 그립니다
      setTimeout(() => { window.location.reload(); }, waiting || hasBackup ? 3500 : 1500);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "BAD_FORMAT") setMemberMsg("회원키 형식이 맞지 않습니다 (KK-XXXX-XXXX-XXXX)");
      else if (m === "UNKNOWN") setMemberMsg("없는 회원키입니다. 다시 확인해 주세요");
      else if (m === "DEVICE_TAKEN") setMemberMsg("이미 다른 기기에서 쓰고 있는 회원키입니다. 옛 폰의 설정에서 '새 폰으로 보내기'를 먼저 누르거나, 관리자에게 기기 풀어주기를 요청해 주세요");
      else setMemberMsg("서버와 연결하지 못했습니다. 인터넷을 확인해 주세요");
      setMemberBusy(false);
    }
  };

  const handleMemberResync = async () => {
    if (memberBusy) return;
    setMemberBusy(true);
    try {
      const r = await syncMemberContent((m) => setMemberMsg("받는 중 · " + m));
      setMemberMsg("");
      toast(r.bibles.length > 0 ? "성경 " + r.bibles.join("·") + (r.scenes > 0 ? ", 회화집 " + r.scenes + "개" : "") + " 받았습니다" : "받을 내용이 없거나 연결하지 못했습니다");
      setKoMetaState({ gr: koMetaSync("gr"), wm: koMetaSync("wm"), niv: koMetaSync("niv") });
    } finally {
      setMemberBusy(false);
    }
  };

  const handleMemberLeave = async () => {
    if (!memberLeaveConfirm) { setMemberLeaveConfirm(true); return; }
    setMemberBusy(true);
    await leaveMembership();
    toast("이 기기에서 회원키를 뺐습니다");
    setTimeout(() => { window.location.reload(); }, 1000);
  };

  // 설교문과 같은 Worker 지만 열쇠는 따로입니다 (BIBLE_KEY). 여기서는 토스트 없이
  // 조용히 준비 여부만 돌려줍니다 — 여러 파일을 한 번에 처리할 때 경고가 파일마다
  // 반복해서 뜨는 것을 막기 위해서입니다.
  const koServerReadySilent = () => {
    const b = (bibleBase || "").trim();
    const k = (bibleKey || "").trim();
    if (!b || !k) return null;
    setBibleBase(b);
    setBibleKey(k);
    return { base: b.replace(new RegExp("/+$"), ""), key: k };
  };

  const koServerReady = () => {
    const cfg = koServerReadySilent();
    if (!cfg) toast("성경 서버 주소와 키를 먼저 넣어 주세요");
    return cfg;
  };

  const koErrorText = (e: unknown) => {
    const m = e instanceof Error ? e.message : "";
    if (m === "UNAUTHORIZED") return "키가 맞지 않습니다";
    if (m === "NO_LOCAL") return "이 기기에 불러온 성경이 없습니다";
    if (m === "EMPTY") return "서버에 올려둔 성경이 없습니다";
    if (m === "NO_CONFIG") return "서버 주소와 키를 먼저 넣어 주세요";
    return "서버와 연결하지 못했습니다";
  };

  // 파일을 한 개든 여러 개든 한 번에 고르면, 파일 이름으로 역본을 알아서 판별해
  // 이 기기에 담고, 곧바로 서버에도 올립니다(주소·키가 들어 있을 때). 두 단계를
  // 하나로 합친 것이라 "불러오기"와 "올리기"를 따로 누를 필요가 없습니다.
  const handleKoFilesAuto = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setKoBusyVersion("all");
    const cfg = koServerReadySilent();
    const loaded: string[] = [];
    const pushed: string[] = [];
    const pushFailed: string[] = [];

    for (const file of files) {
      const version = guessVersion(file.name);
      try {
        const raw = await file.text();
        const { chapters, stats } = parseKoBible(raw);
        if (stats.verses === 0) {
          toast(file.name + ": 성경 본문을 찾지 못했습니다");
          continue;
        }
        const guessed = guessLabel(file.name);
        const slotLabel = BIBLE_VERSIONS.find((v) => v.id === version)?.label || "한국어 성경";
        const label = guessed !== "한국어 성경" ? guessed : slotLabel;
        const meta = await saveKoBible(chapters, label, stats, version);
        clearKoMemoryCache(version);
        setKoMetaState((prev) => ({ ...prev, [version]: meta }));
        loaded.push(meta.label);

        if (cfg) {
          try {
            await pushKoToServer(cfg.base, cfg.key, version, (done, total) => {
              setKoProgress(meta.label + " " + done + "/" + total);
            });
            pushed.push(meta.label);
          } catch (e) {
            pushFailed.push(meta.label + ": " + koErrorText(e));
          }
        }
      } catch (e) {
        toast(file.name + ": 파일을 읽지 못했습니다");
      }
    }

    setKoBusyVersion(null);
    setKoProgress("");
    if (koFilesRef.current) koFilesRef.current.value = "";

    if (!cfg && loaded.length > 0) {
      toast(loaded.join(" · ") + " 이 기기에 불러왔습니다. 성경 서버 주소·키를 넣으면 다음부터 자동으로 올라갑니다");
      return;
    }
    if (pushed.length > 0) toast(pushed.join(" · ") + " 불러와서 서버에 올렸습니다");
    if (pushFailed.length > 0) toast("서버에 못 올림 — " + pushFailed.join(" · "));
  };

  // 서버에 있는 역본을 전부(있는 만큼) 받습니다. 한쪽만 올라가 있어도 됩니다.
  const handleKoPullAll = async () => {
    const cfg = koServerReady();
    if (!cfg) return;
    setKoBusyVersion("all");
    const got: string[] = [];
    const missing: string[] = [];
    let hadRealError = false;
    for (let i = 0; i < BIBLE_VERSIONS.length; i++) {
      const v = BIBLE_VERSIONS[i];
      try {
        const meta = await pullKoFromServer(cfg.base, cfg.key, v.id, (done, total) => {
          setKoProgress(v.label + " " + done + "/" + total);
        });
        clearKoMemoryCache(v.id);
        setKoMetaState((prev) => ({ ...prev, [v.id]: meta }));
        got.push(meta.label);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "EMPTY") { missing.push(v.label); continue; }
        hadRealError = true;
        toast(v.label + ": " + koErrorText(e));
      }
    }
    setKoBusyVersion(null);
    setKoProgress("");
    if (got.length > 0) {
      const extra = missing.length > 0 ? " (" + missing.join("·") + "은 서버에 없음)" : "";
      toast(got.join(" · ") + " 받았습니다" + extra);
    } else if (!hadRealError) {
      toast("서버에 올려둔 성경이 아직 없습니다");
    }
  };

  const handleKoClear = async (version: BibleVersion) => {
    await clearKoBible(version);
    clearKoMemoryCache(version);
    setKoMetaState((prev) => ({ ...prev, [version]: null }));
    const slotLabel = BIBLE_VERSIONS.find((v) => v.id === version)?.label || "";
    toast(slotLabel + "을 비웠습니다");
  };

  // 일대일 교재를 성경 서버에 올립니다(같은 주소·키). PC 등 원본 파일이 있는
  // 기기에서 한 번만 하면 됩니다 — 폰에서는 일대일 화면을 열 때 자동으로 받아 옵니다.
  const handleOtoFile = async (file: File | null) => {
    if (!file) return;
    if ((bibleBase || "").trim() === "" || (bibleKey || "").trim() === "") {
      toast("성경 서버 주소와 키를 먼저 넣어 주세요");
      return;
    }
    setOtoBusy(true);
    try {
      const bytes = await pushMaterial("onetoone", file);
      toast("일대일 교재를 서버에 올렸습니다 (" + Math.round(bytes / 1024) + "KB)");
    } catch (e) {
      toast(koErrorText(e));
    } finally {
      setOtoBusy(false);
      if (otoFileRef.current) otoFileRef.current.value = "";
    }
  };

  const handleOtoClearCache = async () => {
    await clearCachedMaterial("onetoone");
    toast("이 기기에 담아 둔 일대일 교재를 지웠습니다 (다음에 열면 다시 받습니다)");
  };

  const changeFont = (delta: number) => {
    setFontStepState(stepFont(delta));
  };

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    setClaudeApiKey(claudeKey);
    setSermonBase(sermonBase);
    setSermonKey(sermonKey);
    setPercakapanBase(percakapanBase);
    setPercakapanKey(percakapanKey);
    toast("API 키 설정이 저장되었습니다");
    onOpenChange(false);
  };

  // 아이디를 넣으면 그 자리에서 한 번 맞춰 봅니다 (다른 기기 점수를 바로 받아옵니다)
  const handleApplyMedaliId = () => {
    const v = (medaliId || "").trim();
    if (!isValidMedaliId(v)) {
      toast("한글·영문·숫자 6자 이내로 적어주세요");
      return;
    }
    setMyMedaliId(v);
    setMedaliIdState(v);
    toast(v + " 아이디로 점수를 함께 셉니다");
    syncMedali(true).catch(() => {});
  };

  const handleOptOutMedali = () => {
    optOutMedali();
    setMedaliIdState("");
    toast("이 기기에서는 점수를 세지 않습니다");
  };

  const handleClearDictData = async () => {
    const wordN = await countLookupWords();
    const resN = await countCachedResults();
    if (wordN === 0 && resN === 0) {
      toast("저장된 단어·검색 결과가 없습니다");
      return;
    }
    await clearLookupWords();
    await clearCachedResults();
    const parts: string[] = [];
    if (wordN > 0) parts.push("단어 " + wordN + "개");
    if (resN > 0) parts.push("검색 결과 " + resN + "건");
    toast(parts.join(", ") + "를 비웠습니다");
  };

  const handleClearTts = async () => {
    await clearTtsCache();
    toast("저장된 읽기 음성을 비웠습니다");
  };

  // 회화집 백업 올리기.
  // 서버에 백업이 있는데 이 기기에는 회화집이 없으면 서버가 409로 막습니다.
  // 그때는 개수를 보여주고 한 번 더 누르면 빈 상태로 덮어씁니다.
  const handlePushPercakapan = async (force?: boolean) => {
    if (pcBusy) return;
    setPcBusy(true);
    try {
      const r = await pushBackup(force);
      setPcConfirmErase(0);
      toast.success("회화집 " + r.scenes + "개를 백업했습니다");
    } catch (e: any) {
      const code = (e && e.message) || "";
      if (code === "WOULD_ERASE") {
        setPcConfirmErase(Number(e.existing) || 0);
      } else if (code === "UNAUTHORIZED") {
        toast.error("비밀키가 맞지 않습니다");
      } else if (code === "NO_CONFIG") {
        toast.error("회화집 서버 주소와 비밀키를 넣어 주세요");
      } else {
        toast.error("백업하지 못했습니다");
      }
    } finally {
      setPcBusy(false);
    }
  };

  // 개인 단어장 폴더 적용: 저장 후 새로고침해 즉시 동기화
  const handleApplyPrivateFolder = () => {
    setPrivateFolderName(privateFolder);
    toast(privateFolder.trim() ? "개인 단어장을 적용합니다" : "개인 단어장 설정을 해제했습니다");
    setTimeout(() => {
      try { window.location.reload(); } catch (e) {}
    }, 700);
  };

  // 백업: 직접 넣은 단어만 클립보드로 (기본 단어 3천여 개는 빼서 한도에 걸리지 않게)
  const handleExportCopy = async () => {
    const { csv, count } = exportPersonalWordsToCSV();
    if (count === 0) {
      toast("직접 넣은 단어가 없습니다. 기본 단어장은 새 기기에서도 저절로 생깁니다");
      return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      toast("직접 넣은 단어 " + count + "개를 복사했습니다 (" + formatBytes(new TextEncoder().encode(csv).length) + ") — 메모나 메신저에 붙여넣어 보관하세요", { duration: 6000 });
    } catch (e) {
      toast("복사하지 못했습니다. '파일 저장'을 써 주세요");
    }
  };

  // 백업: 파일 저장 — 단어장·형광펜·기도문·설정까지 담은 백업 파일(.json)
  // 앱(APK)은 blob: 주소를 저장하지 못하고 data: 주소만 다운로드 폴더에 씁니다.
  const handleExportDownload = async () => {
    if (backupBusy) return;
    // 앱(APK)은 지금 파일을 다운로드 폴더에 쓰지 못합니다(저장소 제한).
    // 실패시키지 않고 대신 쓸 수 있는 길을 알려 줍니다. APK 수정은 공개판 때 함께 합니다.
    if (isInApp()) {
      if (memberProfile) {
        toast("앱에서는 파일 저장 대신 서버 자동 백업이 됩니다" +
          (backupInfo && backupInfo.exists ? " (마지막 백업: " + shortDate(backupInfo.savedAt) + ")" : "") +
          ". 바로 올리려면 위의 '지금 백업'을 눌러 주세요", { duration: 7000 });
      } else {
        toast("앱에서는 아직 파일 저장이 되지 않습니다. '복사'로 단어를 보관해 주세요", { duration: 7000 });
      }
      return;
    }
    setBackupBusy(true);
    try {
      const f = await buildBackupFile();
      const a = document.createElement("a");
      a.href = f.href;
      a.download = f.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast("백업 파일(" + formatBytes(f.bytes) + ")을 다운로드 폴더에 저장합니다 — " + describeSummary(f.summary), { duration: 7000 });
    } catch (e) {
      toast("백업 파일을 만들지 못했습니다");
    } finally {
      setBackupBusy(false);
    }
  };

  // 새 폰으로 보내기 — 첫 번째 누름은 안내, 두 번째 누름에 보냅니다
  const handleSendToNewPhone = async () => {
    if (transferBusy) return;
    if (!transferConfirm) { setTransferConfirm(true); return; }
    setTransferBusy(true);
    setTransferMsg("보내는 중...");
    try {
      const r = await sendToNewPhone();
      setTransferConfirm(false);
      setTransferMsg("보냈습니다 — " + describeSummary(r.summary) + " (" + formatBytes(r.bytes) + ")");
      setTransferInfo({ exists: true, savedAt: Date.now(), bytes: r.bytes, until: r.until, fromSelf: true });
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "TOO_BIG") setTransferMsg("보낼 데이터가 20MB를 넘습니다. '파일 저장'으로 옮겨 주세요");
      else if (m === "REVOKED") setTransferMsg("이 기기의 회원키가 더 이상 유효하지 않습니다. 관리자에게 문의해 주세요");
      else setTransferMsg("보내지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요");
    } finally {
      setTransferBusy(false);
    }
  };

  const handleReceiveFromOldPhone = async () => {
    if (transferBusy) return;
    setTransferBusy(true);
    setTransferMsg("받는 중...");
    try {
      const s = await receiveFromOldPhone();
      setTransferMsg("");
      toast("이전 폰 데이터를 옮겼습니다 — " + describeSummary(s), { duration: 6000 });
      setTimeout(() => { window.location.reload(); }, 1800);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "NOT_FOUND") {
        setTransferMsg("받을 데이터가 없습니다. 이미 받았거나 7일이 지났습니다");
        setTransferInfo({ exists: false, savedAt: 0, bytes: 0, until: 0, fromSelf: false });
      } else if (m === "BAD_DATA" || m === "NO_GZIP") setTransferMsg("받은 데이터를 읽지 못했습니다. 이전 폰에서 다시 보내 주세요");
      else setTransferMsg("받지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요");
      setTransferBusy(false);
    }
  };

  const handleCancelTransfer = async () => {
    if (transferBusy) return;
    setTransferBusy(true);
    try {
      await cancelTransfer();
      setTransferInfo({ exists: false, savedAt: 0, bytes: 0, until: 0, fromSelf: false });
      setTransferMsg("보내기를 취소했습니다. 서버에서 지웠습니다");
    } catch (e) {
      setTransferMsg("취소하지 못했습니다. 인터넷을 확인해 주세요");
    } finally {
      setTransferBusy(false);
    }
  };

  // 지금 백업 — 서버 것보다 크게 줄었으면 한 번 더 눌러야 덮어씁니다
  const handleBackupNow = async () => {
    if (srvBusy) return;
    setSrvBusy(true);
    setSrvMsg("백업하는 중...");
    try {
      const r = await backupNow(srvForceConfirm);
      setSrvForceConfirm(false);
      setSrvBlocked(false);
      setSrvMsg("백업했습니다 — " + describeSummary(r.summary) + " (" + formatBytes(r.bytes) + ")");
      const fresh = await getBackupInfo();
      if (fresh) setBackupInfo(fresh);
    } catch (e) {
      if (e instanceof BackupShrinkError) {
        setSrvForceConfirm(true);
        setSrvMsg("서버 백업(" + (e.savedAt ? shortDate(e.savedAt) + " · " : "") + describeBackupMeta(e.existing) +
          ")이 이 폰보다 훨씬 많습니다. 새 폰이라면 먼저 '서버 백업에서 되돌리기'를 하세요. 그래도 이 폰 상태로 덮어쓰려면 '지금 백업'을 한 번 더 누르세요");
      } else {
        const m = e instanceof Error ? e.message : "";
        if (m === "TOO_BIG") setSrvMsg("백업이 20MB를 넘습니다");
        else if (m === "REVOKED") setSrvMsg("이 기기의 회원키가 더 이상 유효하지 않습니다");
        else setSrvMsg("백업하지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요");
      }
    } finally {
      setSrvBusy(false);
    }
  };

  const handleRestoreServer = async (prev: boolean) => {
    if (srvBusy) return;
    setSrvBusy(true);
    setSrvMsg("되돌리는 중...");
    try {
      const s = await restoreFromServerBackup(prev);
      setSrvMsg("");
      toast("서버 백업을 되돌렸습니다 — 새로 들어간 단어 " + s.words + "개" + (s.categories > 0 ? ", 단어장 " + s.categories + "개" : ""), { duration: 6000 });
      setTimeout(() => { window.location.reload(); }, 1800);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "NOT_FOUND") setSrvMsg("서버에 백업이 없습니다");
      else if (m === "BAD_DATA" || m === "NO_GZIP") setSrvMsg("백업을 읽지 못했습니다");
      else setSrvMsg("되돌리지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요");
      setSrvBusy(false);
    }
  };

  const shortDate = (t: number) => {
    const d = new Date(t);
    return (d.getMonth() + 1) + "월 " + d.getDate() + "일";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto bg-card max-h-[85dvh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-body text-gray-900">설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-body text-sm text-gray-900 flex items-center gap-1.5">
              <Type className="w-4 h-4" /> 글자 크기
            </Label>
            <div className="mt-2 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => changeFont(-1)}
                disabled={fontStep <= 0}
                aria-label="글자 작게"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex items-center justify-center gap-1">
                {Array.from({ length: getStepCount() }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === fontStep ? "w-5 bg-primary" : "w-1.5 bg-gray-300"}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => changeFont(1)}
                disabled={fontStep >= getStepCount() - 1}
                aria-label="글자 크게"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-gothic">
              앱 전체 글자 크기를 조절합니다. 이 기기에만 적용됩니다.
            </p>
          </div>
          <div>
            <Label className="font-body text-sm text-gray-900 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> 문장 읽기 음성
            </Label>
            <div className="mt-2 flex gap-2">
              {TTS_VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setVoice(v.id); setTtsVoice(v.id); }}
                  className={`flex-1 rounded-lg py-2 text-xs font-body border ${
                    voice === v.id
                      ? "bg-primary text-white border-primary"
                      : "bg-transparent text-gray-700 border-border"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-gothic">
              묵상·이야기·뉴스·기도의 "전체 듣기"에 쓰이는 목소리입니다. 이 기기에만 적용됩니다.
            </p>
          </div>
          {/* 회원키 — 모든 판에 보입니다 */}
          <div id={MEMBER_SECTION_ID} className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">회원키</Label>
            {memberProfile ? (
              <>
                <p className="mt-1 text-xs font-gothic text-sky-600">
                  {memberProfile.name ? memberProfile.name + " · " : ""}{EDITION_LABEL[edition]} · {memberProfile.key}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
                  disabled={memberBusy}
                  onClick={handleMemberResync}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  성경·회화집 다시 받기
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={"w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs" + (memberLeaveConfirm ? " text-red-600 border-red-300" : "")}
                  disabled={memberBusy}
                  onClick={handleMemberLeave}
                >
                  {memberLeaveConfirm ? "한 번 더 누르면 빼고, 받은 성경·교재도 지웁니다" : "이 기기에서 회원키 빼기"}
                </Button>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground font-gothic">
                  받은 회원키를 한 번만 넣으면 성경·교재·회화집이 모두 활성화됩니다.
                  회원키는 처음 넣은 기기 하나에서만 쓸 수 있습니다.
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    ref={memberInputRef}
                    value={memberInput}
                    onFocus={() => {
                      if (!memberInput) setMemberInput("KK-");
                      setTimeout(memberCaretToEnd, 0);
                      setTimeout(memberScrollIntoView, 350);
                    }}
                    onClick={() => { setTimeout(memberCaretToEnd, 0); }}
                    onSelect={memberCaretToEnd}
                    onBlur={() => { if (memberInput === "KK-") setMemberInput(""); }}
                    onChange={(e) => setMemberInput(formatMemberInput(e.target.value, memberInput))}
                    placeholder="KK-XXXX-XXXX-XXXX"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="text-sm font-mono tracking-wide"
                  />
                  <Button type="button" className="text-xs shrink-0" disabled={memberBusy || memberInput.length !== 17} onClick={handleMemberActivate}>
                    활성화
                  </Button>
                </div>
              </>
            )}
            {memberMsg ? <p className="mt-1.5 text-xs font-gothic text-muted-foreground">{memberMsg}</p> : null}
            {isAdminUI ? (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
                onClick={() => {
                  try { sessionStorage.setItem(REOPEN_SETTINGS_KEY, String(Date.now())); } catch (e) {}
                  onOpenChange(false);
                  navigate("/members");
                }}
              >
                <KeyRound className="w-4 h-4 mr-1.5" />
                회원키 관리 (발급·기기 풀어주기·끊기)
              </Button>
            ) : null}
          </div>
          {/* 서버 자동 백업 — 회원키가 있는 기기에만 보입니다 */}
          {memberProfile ? (
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">서버 자동 백업</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-gothic">
              직접 만든 단어장·단어, 형광펜, 기도문, 설정을 일주일에 한 번, 와이파이에 연결돼 있을 때 서버에 자동으로 백업합니다.
              폰을 잃어버리거나 고장 나면 새 폰에 회원키를 넣고 여기서 되돌리면 됩니다.
            </p>
            <p className="mt-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-gray-900 font-gothic">
              {backupInfo === null
                ? "백업 상태를 확인하는 중..."
                : backupInfo.exists
                  ? "마지막 백업: " + shortDate(backupInfo.savedAt) + " · " + describeBackupMeta(backupInfo.meta)
                  : "아직 서버 백업이 없습니다. 와이파이에서 앱을 켜면 자동으로 만들어집니다"}
            </p>
            {srvBlocked && backupInfo && backupInfo.exists ? (
              <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-gray-900 font-gothic">
                서버 백업이 이 폰보다 많아서 자동 백업을 멈췄습니다. 새 폰이라면 아래 '서버 백업에서 되돌리기'를 눌러 주세요.
              </p>
            ) : null}
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                className={"flex-1 whitespace-normal h-auto py-2.5 leading-snug text-xs" + (srvForceConfirm ? " border-red-300 text-red-600" : "")}
                disabled={srvBusy}
                onClick={handleBackupNow}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                {srvForceConfirm ? "그래도 덮어쓰기" : "지금 백업"}
              </Button>
              {backupInfo && backupInfo.exists ? (
                <Button
                  type="button"
                  variant={srvBlocked ? "default" : "outline"}
                  className="flex-1 whitespace-normal h-auto py-2.5 leading-snug text-xs"
                  disabled={srvBusy}
                  onClick={() => handleRestoreServer(false)}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  서버 백업에서 되돌리기
                </Button>
              ) : null}
            </div>
            {backupInfo && backupInfo.exists && backupInfo.prevSavedAt ? (
              <button
                type="button"
                className="mt-1.5 text-xs text-muted-foreground underline font-gothic"
                disabled={srvBusy}
                onClick={() => handleRestoreServer(true)}
              >
                한 단계 전 백업({shortDate(backupInfo.prevSavedAt)})에서 되돌리기
              </button>
            ) : null}
            {srvMsg ? <p className="mt-1.5 text-xs leading-relaxed font-gothic text-muted-foreground">{srvMsg}</p> : null}
          </div>
          ) : null}
          {/* 새 폰으로 옮기기 — 회원키가 있는 기기에만 보입니다 */}
          {memberProfile ? (
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">새 폰으로 옮기기</Label>
            {transferInfo && transferInfo.exists && !transferInfo.fromSelf ? (
              <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2.5">
                <p className="text-xs leading-relaxed text-gray-900 font-gothic">
                  이전 폰에서 보낸 데이터가 있습니다 ({shortDate(transferInfo.savedAt)} · {formatBytes(transferInfo.bytes)}).
                  받으면 이 폰에 합쳐지고 서버에서는 지워집니다.
                </p>
                <Button
                  type="button"
                  className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
                  disabled={transferBusy}
                  onClick={handleReceiveFromOldPhone}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  이전 폰 데이터 받기
                </Button>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-gothic">
                  직접 만든 단어장·단어, 성경 형광펜, 기도문, 화면 설정을 서버에 잠시 올려 둡니다.
                  새 폰에 같은 회원키를 넣고 '이전 폰 데이터 받기'를 누르면 옮겨지고, 받는 즉시 서버에서 지워집니다.
                  아무도 받지 않아도 7일 뒤 지워집니다.
                </p>
                {transferInfo && transferInfo.exists && transferInfo.fromSelf ? (
                  <p className="mt-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-gray-900 font-gothic">
                    보낸 데이터가 새 폰을 기다리고 있습니다 ({formatBytes(transferInfo.bytes)} · {transferInfo.until ? shortDate(transferInfo.until) + "까지" : "7일간"}).
                    새 폰에 이 회원키를 넣으면 회원키가 새 폰으로 넘어갑니다.
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className={"w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs" + (transferConfirm ? " border-sky-400 text-sky-700" : "")}
                  disabled={transferBusy}
                  onClick={handleSendToNewPhone}
                >
                  <Smartphone className="w-4 h-4 mr-1.5" />
                  {transferConfirm
                    ? "한 번 더 누르면 보냅니다"
                    : transferInfo && transferInfo.exists && transferInfo.fromSelf ? "지금 상태로 다시 보내기" : "새 폰으로 보내기"}
                </Button>
                {transferConfirm ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-sky-700 font-gothic">
                    보낸 뒤 새 폰에 이 회원키를 넣으면, 이 폰의 회원 기능(성경·교재·회화집)은 꺼집니다.
                    직접 만든 단어는 이 폰에도 그대로 남습니다.
                  </p>
                ) : null}
                {transferInfo && transferInfo.exists && transferInfo.fromSelf ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
                    disabled={transferBusy}
                    onClick={handleCancelTransfer}
                  >
                    보내기 취소 (서버에서 지우기)
                  </Button>
                ) : null}
              </>
            )}
            {transferMsg ? <p className="mt-1.5 text-xs leading-relaxed font-gothic text-muted-foreground">{transferMsg}</p> : null}
          </div>
          ) : null}
          {isAdminUI ? (
          <>
          <div>
            <Label className="font-body text-sm text-gray-900">설교문 서버</Label>
            <Input
              type="text"
              autoComplete="off"
              value={sermonBase}
              onChange={(e) => setSermonBaseState(e.target.value)}
              placeholder="https://kata-sermon.○○○.workers.dev"
              className="mt-1 text-sm"
            />
            <Input
              type="password"
              autoComplete="off"
              value={sermonKey}
              onChange={(e) => setSermonKeyState(e.target.value)}
              placeholder="비밀키"
              className="mt-2 text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground font-gothic">
              PC에서 올린 설교문을 이 폰으로 가져오는 데 씁니다. 주소와 비밀키는 이 기기에만 저장됩니다.
            </p>
          </div>
          <div>
            <Label className="font-body text-sm text-gray-900">회화집 서버</Label>
            <Input
              type="text"
              autoComplete="off"
              value={percakapanBase}
              onChange={(e) => setPercakapanBaseState(e.target.value)}
              placeholder="https://kata-percakapan.○○○.workers.dev"
              className="mt-1 text-sm"
            />
            <Input
              type="password"
              autoComplete="off"
              value={percakapanKey}
              onChange={(e) => setPercakapanKeyState(e.target.value)}
              placeholder="비밀키"
              className="mt-2 text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground font-gothic">
              개인 회화집을 백업하고, 앱을 다시 설치했을 때 되돌리는 데 씁니다. 주소와 비밀키는 이 기기에만 저장됩니다.
            </p>
          </div>
          <div>
            <Label className="font-body text-sm text-gray-900">Gemini API 키</Label>
            <Input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="mt-1 text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground font-gothic">
              단어 추가 시 뜻과 예문을 자동으로 채우는 데 사용됩니다. 키는 이 기기에만 저장되며, Google AI Studio에서 무료로 발급받을 수 있습니다. 비워두고 저장하면 키가 삭제됩니다.
            </p>
          </div>
          <div>
            <Label className="font-body text-sm text-gray-900">Claude API 키</Label>
            <Input
              type="password"
              autoComplete="off"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="mt-1 text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground font-gothic">
              인도네시아어 묵상 생성에 사용됩니다. console.anthropic.com에서 발급받을 수 있습니다. 비워두고 저장하면 키가 삭제됩니다.
            </p>
          </div>
          <Button onClick={handleSave} className="w-full">
            저장
          </Button>
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">Medali 아이디</Label>
            <p className="mt-1 text-xs text-muted-foreground font-gothic">
              같은 아이디를 쓰는 내 기기들의 점수가 하나로 합쳐집니다. 폰·태블릿에 <b>똑같이</b> 적어주세요.
              대소문자까지 같아야 하니, 아래 이름을 눌러 고르는 편이 안전합니다.
            </p>
            {medaliTaken.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {medaliTaken.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMedaliIdState(t)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-gothic border transition-colors " +
                      (t === medaliId
                        ? "bg-primary text-white border-primary"
                        : "bg-muted text-foreground border-border")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Input
                value={medaliId}
                onChange={(e) => setMedaliIdState(e.target.value)}
                placeholder="아이디"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                className="flex-1 text-sm"
              />
              <Button type="button" variant="outline" className="text-xs" onClick={handleApplyMedaliId}>
                적용
              </Button>
            </div>
            <button
              type="button"
              onClick={handleOptOutMedali}
              className="mt-2 font-gothic text-[0.7rem] text-muted-foreground underline underline-offset-2"
            >
              이 기기에서는 점수를 세지 않기
            </button>
          </div>
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">개인 단어장 (선택)</Label>
            <p className="mt-1 text-xs text-muted-foreground font-gothic">
              GitHub의 data/private/폴더이름 단어장을 이 기기에서만 추가로 불러옵니다. 비워두고 적용하면 해제됩니다.
            </p>
            <div className="flex gap-2 mt-2">
              <Input
                value={privateFolder}
                onChange={(e) => setPrivateFolder(e.target.value)}
                placeholder="폴더 이름"
                autoComplete="off"
                className="flex-1 text-sm"
              />
              <Button type="button" variant="outline" className="text-xs" onClick={handleApplyPrivateFolder}>
                적용
              </Button>
            </div>
          </div>
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">성경 파일</Label>
            <p className="mt-1 text-xs text-muted-foreground font-gothic">
              개역개정·우리말성경·NIV 파일을 한 번에 여러 개 골라 넣으면 이름으로 역본을
              알아서 판별해 이 기기에 담고, 아래 주소·키가 있으면 서버에도 곧바로 올립니다.
              다른 기기에서는 "성경받기"만 누르면 됩니다.
            </p>
            <div className="mt-2 space-y-2">
              <Input
                value={bibleBase}
                onChange={(e) => setBibleBaseState(e.target.value)}
                placeholder="성경 서버 주소 (https://...)"
                autoComplete="off"
                className="text-sm"
              />
              <Input
                value={bibleKey}
                onChange={(e) => setBibleKeyState(e.target.value)}
                placeholder="성경 서버 키"
                autoComplete="off"
                className="text-sm"
              />
            </div>

            <div className="mt-2.5 space-y-1">
              {BIBLE_VERSIONS.map((v) => {
                const meta = koMeta[v.id];
                return (
                  <div key={v.id} className="flex items-center justify-between text-xs font-gothic">
                    <span className="text-gray-700">
                      {v.label}
                      {meta ? (
                        <span className="text-sky-600"> · {meta.books}권 {meta.verses}절</span>
                      ) : (
                        <span className="text-muted-foreground"> · 없음</span>
                      )}
                    </span>
                    {meta ? (
                      <button
                        type="button"
                        disabled={koBusy}
                        onClick={() => handleKoClear(v.id)}
                        className="text-muted-foreground active:text-red-500"
                      >
                        비우기
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <input
              ref={koFilesRef}
              type="file"
              accept=".txt,text/plain"
              multiple
              className="hidden"
              onChange={(e) => handleKoFilesAuto(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2.5 whitespace-normal h-auto py-2.5 leading-snug text-xs"
              disabled={koBusy}
              onClick={() => koFilesRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {koBusy ? "처리 중..." : "성경 파일 불러오기 (여러 개 한 번에 가능)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
              disabled={koBusy}
              onClick={handleKoPullAll}
            >
              <Download className="w-4 h-4 mr-1.5" />
              성경받기
            </Button>
            {koBusy && koProgress ? (
              <p className="mt-1.5 text-xs font-gothic text-muted-foreground">{koProgress}</p>
            ) : null}
          </div>
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">일대일 교재</Label>
            <p className="mt-1 text-xs text-muted-foreground font-gothic">
              PDF 파일 그대로 올립니다. 성경 서버 주소·키를 그대로 씁니다(위 칸에 이미
              들어 있으면 따로 입력할 것 없습니다). 원본 파일이 있는 이 기기에서
              한 번만 올리면, 다른 기기는 일대일 화면을 열 때 자동으로 받아 옵니다.
            </p>
            <input
              ref={otoFileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleOtoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
              disabled={otoBusy}
              onClick={() => otoFileRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {otoBusy ? "올리는 중..." : "일대일 PDF 올리기"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
              disabled={otoBusy}
              onClick={handleOtoClearCache}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              이 기기에 담아 둔 것 비우기
            </Button>
          </div>
          </>
          ) : null}
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">데이터 백업</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-gothic">
              앱에 들어 있는 기본 단어장은 빼고, 직접 만든 것만 담습니다.
              '파일 저장'은 단어장·형광펜·기도문·설정까지 백업 파일로 저장합니다(브라우저에서. 앱에서는 회원키가 있으면 서버 자동 백업이 대신합니다).
              '복사'는 직접 넣은 단어만 글로 복사합니다.
            </p>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" className="flex-1 text-xs" onClick={handleExportCopy}>
                <Copy className="w-4 h-4 mr-1.5" />
                복사
              </Button>
              <Button type="button" variant="outline" className="flex-1 text-xs" disabled={backupBusy} onClick={handleExportDownload}>
                <Download className="w-4 h-4 mr-1.5" />
                파일 저장
              </Button>
            </div>
            <Button type="button" variant="outline" className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs" onClick={() => setRestoreOpen(true)}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              백업 되돌리기 (파일 또는 붙여넣기)
            </Button>
            {isAdminUI ? (
            <>
            <Button type="button" variant="outline" className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              CSV 가져오기 (단어 추가)
            </Button>
            <Button type="button" variant="outline" className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs" onClick={() => setConfirmClearData(true)}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              저장된 단어·검색 결과 비우기
            </Button>
            <Button type="button" variant="outline" className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs" onClick={() => setConfirmClearTts(true)}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              저장된 읽기 음성 비우기
            </Button>
            {hasPercakapanConfig() ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
                  disabled={pcBusy}
                  onClick={() => handlePushPercakapan(pcConfirmErase > 0)}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  회화집 서버에 백업
                </Button>
                {pcConfirmErase > 0 ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-red-500 font-gothic">
                    서버에 {pcConfirmErase}개가 있는데 지금 기기에는 없습니다. 빈 상태로 덮어쓸까요?
                    한 번 더 누르면 덮어씁니다.
                  </p>
                ) : null}
              </>
            ) : null}
            </>
            ) : null}
          </div>
          <div className="border-t border-gray-200 pt-3">
            <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </div>
        </div>
        <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => {}} />
        <BackupRestoreDialog open={restoreOpen} onOpenChange={setRestoreOpen} />

        <AlertDialog open={confirmClearData} onOpenChange={setConfirmClearData}>
          <AlertDialogContent className="bg-card w-[calc(100vw-3rem)] max-w-xs gap-3 p-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-body text-base text-gray-900">
                저장된 단어·검색 결과를 비울까요?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-gothic text-xs leading-relaxed">
                사전에서 찾아둔 단어 풀이와 검색 결과가 지워집니다.
                다음에 같은 단어를 찾으면 새로 불러옵니다.
                단어장에 저장한 단어는 지워지지 않습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-body">취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearDictData} className="font-body bg-red-600 hover:bg-red-700 text-white">비우기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmClearTts} onOpenChange={setConfirmClearTts}>
          <AlertDialogContent className="bg-card w-[calc(100vw-3rem)] max-w-xs gap-3 p-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-body text-base text-gray-900">
                저장된 읽기 음성을 비울까요?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-gothic text-xs leading-relaxed">
                미리 받아둔 음성 파일이 지워집니다.
                다음에 “전체 듣기”를 누르면 새로 받아옵니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-body">취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearTts} className="font-body bg-red-600 hover:bg-red-700 text-white">비우기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
