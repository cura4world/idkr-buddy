// src/pages/MemberAdmin.tsx
// 회원키 관리 — 관리자판에서만 들어옵니다(설정 → 회원키 관리).
//   새 키 만들기(이름·역할·개인 단어장 폴더·Medali 아이디)
//   목록: 키 복사 · 보낼 안내문 복사 · 기기 풀어주기 · 끊기
// 권한은 서버가 다시 확인합니다(설교문 비밀키 또는 관리자 회원키).

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Copy, Plus, RotateCcw, Unlink, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { getEdition } from "@/lib/access";
import {
  AdminMember, listMembers, createMember, releaseMemberDevice, revokeMember,
} from "@/lib/memberAdmin";
import { MemberRole } from "@/lib/member";

const fmtDate = (ms: number) => {
  if (!ms) return "";
  try {
    const d = new Date(ms);
    return (d.getMonth() + 1) + "/" + d.getDate();
  } catch (e) {
    return "";
  }
};

const errText = (e: unknown) => {
  const m = e instanceof Error ? e.message : "";
  if (m === "UNAUTHORIZED") return "관리자 권한이 없습니다";
  if (m === "NO_CONFIG") return "이 기기에는 관리자 설정이 없습니다";
  if (m === "NOT_FOUND") return "이미 없는 회원키입니다";
  return "서버와 연결하지 못했습니다";
};

const inviteText = (m: AdminMember) =>
  "Kata kata 회원키입니다.\n" +
  m.key + "\n\n" +
  "앱 → 설정(톱니바퀴) → 회원키 칸에 넣고 '활성화'를 눌러 주세요.\n" +
  "이 키는 처음 넣은 기기 하나에서만 쓸 수 있습니다.";

const MemberAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = getEdition() === "admin";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  // 새 키 만들기
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [folder, setFolder] = useState("");
  const [medaliId, setMedaliId] = useState("");
  const [creating, setCreating] = useState(false);
  const [justMade, setJustMade] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setErrorMsg(null);
    listMembers()
      .then((list) => setMembers(list))
      .catch((e) => setErrorMsg(errText(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch (e) {
      toast("복사하지 못했습니다");
    }
  };

  const handleCreate = async () => {
    if (creating || !name.trim()) return;
    setCreating(true);
    try {
      const m = await createMember({
        name: name.trim(), role, folder: folder.trim(), medaliId: medaliId.trim(),
      });
      setMembers((prev) => prev.concat([m]));
      setJustMade(m.key);
      setName(""); setFolder(""); setMedaliId(""); setRole("member");
      toast(m.name + " 회원키를 만들었습니다");
    } catch (e) {
      toast(errText(e));
    } finally {
      setCreating(false);
    }
  };

  const handleRelease = async (m: AdminMember) => {
    setBusyKey(m.key);
    try {
      await releaseMemberDevice(m.key);
      setMembers((prev) => prev.map((x) => (x.key === m.key ? { ...x, bound: false, boundAt: 0 } : x)));
      toast(m.name + " — 기기를 풀었습니다. 새 기기에서 다시 넣을 수 있습니다");
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusyKey(null);
    }
  };

  const handleRevoke = async (m: AdminMember) => {
    if (confirmRevoke !== m.key) { setConfirmRevoke(m.key); return; }
    setBusyKey(m.key);
    try {
      await revokeMember(m.key);
      setMembers((prev) => prev.filter((x) => x.key !== m.key));
      toast(m.name + " 회원키를 끊었습니다");
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusyKey(null);
      setConfirmRevoke(null);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-clip bg-background pb-10">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-gothic text-base font-semibold">회원키 관리</h1>
        {isAdmin ? (
          <button
            type="button"
            onClick={load}
            className="ml-auto w-9 h-9 rounded-full flex items-center justify-center text-foreground/70 active:bg-muted"
            title="새로고침"
          >
            <RotateCcw size={16} />
          </button>
        ) : null}
      </header>

      {!isAdmin ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground font-gothic">관리자판에서만 쓸 수 있습니다</p>
      ) : (
        <div className="px-4">
          {/* 새 키 만들기 */}
          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="font-gothic text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Plus size={15} /> 새 회원키
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (예: 아내, 형님 태블릿)"
              className="mt-3 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background"
            />
            <div className="mt-2 flex gap-2">
              {(["member", "admin"] as MemberRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={"flex-1 h-9 rounded-lg border text-xs font-gothic " +
                    (role === r ? "border-sky-500 bg-sky-500 text-white" : "border-border text-foreground/80")}
                >
                  {r === "member" ? "회원판" : "관리자판"}
                </button>
              ))}
            </div>
            {role === "admin" ? (
              <p className="mt-1.5 text-xs text-red-500 font-gothic">관리자 키는 설교문과 이 관리 화면까지 열립니다. 형님 기기에만 쓰세요.</p>
            ) : null}
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="개인 단어장 폴더 (선택)"
              className="mt-2 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background"
            />
            <input
              value={medaliId}
              onChange={(e) => setMedaliId(e.target.value)}
              placeholder="Medali 아이디 (선택, 한글·영문·숫자 6자 이내)"
              className="mt-2 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="mt-3 w-full h-10 rounded-lg bg-sky-500 text-white text-sm font-gothic disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              만들기
            </button>
          </section>

          {/* 목록 */}
          <p className="mt-6 mb-2 font-gothic text-xs text-muted-foreground">발급한 회원키</p>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-10 justify-center">
              <Loader2 size={16} className="animate-spin" /> 불러오는 중...
            </div>
          ) : errorMsg ? (
            <p className="py-10 text-center text-sm text-gray-600 font-gothic">{errorMsg}</p>
          ) : members.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground font-gothic">아직 발급한 회원키가 없습니다</p>
          ) : (
            <div className="space-y-2.5">
              {members.map((m) => {
                const busy = busyKey === m.key;
                return (
                  <div
                    key={m.key}
                    className={"rounded-2xl border bg-card p-3.5 " + (justMade === m.key ? "border-sky-400" : "border-border")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-gothic text-sm font-semibold text-gray-900">{m.name}</span>
                      <span className={"text-[0.6875rem] px-2 py-0.5 rounded-full font-gothic " +
                        (m.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700")}>
                        {m.role === "admin" ? "관리자판" : "회원판"}
                      </span>
                      <span className={"ml-auto text-[0.6875rem] font-gothic " + (m.bound ? "text-emerald-600" : "text-muted-foreground")}>
                        {m.bound ? "기기 연결됨 " + fmtDate(m.boundAt) : "아직 안 씀"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(m.key, "회원키를 복사했습니다")}
                      className="mt-1.5 font-mono text-sm tracking-wide text-foreground/90 flex items-center gap-1.5 active:opacity-60"
                    >
                      {m.key} <Copy size={13} className="text-muted-foreground" />
                    </button>
                    {m.folder || m.medaliId ? (
                      <p className="mt-1 text-xs text-muted-foreground font-gothic">
                        {m.folder ? "단어장 폴더 " + m.folder : ""}
                        {m.folder && m.medaliId ? " · " : ""}
                        {m.medaliId ? "Medali " + m.medaliId : ""}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => copy(inviteText(m), "보낼 안내문을 복사했습니다")}
                        className="h-8 px-3 rounded-full border border-border text-xs font-gothic flex items-center gap-1 active:bg-muted"
                      >
                        <Copy size={12} /> 안내문 복사
                      </button>
                      {m.bound ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRelease(m)}
                          className="h-8 px-3 rounded-full border border-border text-xs font-gothic flex items-center gap-1 active:bg-muted disabled:opacity-40"
                        >
                          <Unlink size={12} /> 기기 풀어주기
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRevoke(m)}
                        className={"h-8 px-3 rounded-full border text-xs font-gothic flex items-center gap-1 disabled:opacity-40 " +
                          (confirmRevoke === m.key ? "border-red-300 text-red-600 bg-red-50" : "border-border text-foreground/80 active:bg-muted")}
                      >
                        <Trash2 size={12} /> {confirmRevoke === m.key ? "한 번 더 누르면 끊습니다" : "끊기"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground font-gothic">
            기기 풀어주기: 폰을 바꿨거나 앱 데이터를 지운 사람이 새 기기에서 같은 키를 다시 넣을 수 있게 합니다.
            끊기: 키가 없어지고, 그 기기는 다음에 앱을 켤 때 받은 성경·교재·회화집이 지워집니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default MemberAdmin;
