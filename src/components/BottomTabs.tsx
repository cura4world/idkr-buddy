// src/components/BottomTabs.tsx
// 공개판(스토어 앱) 하단 탭 — 홈 · 내 단어장 · 게임 · 내 정보 (시안 H5·H6·ME1~3·G1·G2).
//
// 공개판의 거의 모든 화면에 보입니다(카드·퀴즈·게임 진행·지도처럼 화면 전체를 쓰는 곳만 숨김, 2026-11-11).
// 하위 화면에서는 그 화면이 속한 탭에 불이 켜지고, 누르면 그 탭 첫 화면으로 갑니다.
// 관리자판·회원판·브라우저에는 나오지 않습니다.
//
// 뒤로가기: 안드로이드 뒤로가기는 웹뷰 히스토리를 따릅니다(스토어 앱 네이티브).
//   · 홈에서 다른 탭으로 갈 때만 히스토리를 한 칸 쌓고(state.tabFromHome),
//   · 탭끼리 옮길 때는 그 칸을 바꿔치기(replace)합니다.
//   그래서 어느 탭에서든 뒤로가기 한 번이면 홈, 홈에서 뒤로가기는 앱을 뒤로 보냅니다(네이티브).
//
// 탭 막대는 화면 아래에 고정되므로, 같은 높이의 빈칸(spacer)을 화면 흐름 맨 끝에 함께 둡니다.
// 그러면 탭 화면의 마지막 내용이 막대에 가려지지 않습니다. 높이는 CSS 변수
// --kata-tabbar-h 로도 알려 줍니다(스크롤 없는 한 화면을 만들 때 씁니다).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isStoreApp } from "@/lib/platform";
import { getSession, onSessionChange, PublicSession } from "@/lib/account";
import { getMyMedaliId, isValidMedaliId } from "@/lib/medaliSync";
import { getCategories } from "@/lib/store";

export const TAB_HOME = "/";
export const TAB_WORDS = "/saved";
export const TAB_GAME = "/permainan";
export const TAB_ME = "/me";
const TAB_ROOTS = [TAB_HOME, TAB_WORDS, TAB_GAME, TAB_ME];

/** 탭 막대 높이(안전 영역 제외), px */
export const TABBAR_PX = 74;
/** 탭 막대가 차지하는 전체 높이 — 인라인 style 의 calc() 안에 씁니다 */
export const TABBAR_CSS = "calc(" + TABBAR_PX + "px + env(safe-area-inset-bottom))";

const DEEP = "#104B60";
const MUTED = "#646C72";

function trimSlash(pathname: string): string {
  return pathname.length > 1 && pathname.charAt(pathname.length - 1) === "/" ? pathname.slice(0, -1) : pathname;
}

/** 화면 전체를 쓰는 곳 — 카드·퀴즈·게임 진행·지도. 여기서만 탭 막대를 숨깁니다(2026-11-11 사용자 요청: 하위 화면에도 탭). */
function isImmersive(p: string): boolean {
  if (p.indexOf("/study/") === 0 || p.indexOf("/quiz/") === 0) return true;
  if (p === "/saved/study" || p === "/saved/quiz") return true;
  if (p.indexOf("/permainan/") === 0) return true;
  if (p === "/map") return true;
  return false;
}

/** 이 경로에서 탭 막대를 보이는가 (공개판에서 화면 전체를 쓰는 곳을 뺀 모든 화면) */
export function showsBottomTabs(pathname: string): boolean {
  if (!isStoreApp()) return false;
  return !isImmersive(trimSlash(pathname));
}

/** 하위 화면이 어느 탭 아래에 있는가 — 그 탭에 불을 켭니다 */
function sectionOf(p: string): string {
  if (TAB_ROOTS.indexOf(p) >= 0) return p;
  if (p.indexOf("/saved") === 0) return TAB_WORDS;
  if (p.indexOf("/permainan") === 0) return TAB_GAME;
  if (p === "/plus" || p.indexOf("/about") === 0) return TAB_ME;
  // 보관한 단어장(/category/<id>)은 내 단어장 탭에서 들어온 화면입니다. 기본(공용) 단어장만 홈 아래입니다(출시 전 점검 U-12).
  if (p.indexOf("/category/") === 0) {
    try {
      const id = decodeURIComponent(p.slice("/category/".length));
      const cat = getCategories().find((c) => c.id === id);
      if (cat && !cat.isShared) return TAB_WORDS;
    } catch (e) {}
  }
  return TAB_HOME;
}

/** 닉네임 — 훈장 비교에 쓰는 아이디(6자 이내)가 곧 닉네임입니다. 없으면 Google 이름의 첫 낱말. */
export function profileName(s: PublicSession | null): string {
  const id = getMyMedaliId();
  if (id && id !== "-" && isValidMedaliId(id)) return id.trim();
  const n = s && s.user && typeof s.user.name === "string" ? s.user.name.trim() : "";
  if (!n) return "";
  return n.split(" ")[0];
}

/** 동그라미 안에 넣을 첫 글자 */
export function profileInitial(name: string): string {
  const t = (name || "").trim();
  return t ? t.charAt(0).toUpperCase() : "K";
}

/** Google 사진 주소 (없으면 빈 문자열) */
export function profilePhoto(s: PublicSession | null): string {
  const p = s && s.user && typeof s.user.picture === "string" ? s.user.picture : "";
  return p.indexOf("https://") === 0 ? p : "";
}

/** 첫 글자 동그라미 또는 Google 사진. 사진을 못 불러오면 첫 글자로 돌아갑니다. */
export const ProfileAvatar = ({
  size,
  fontPx,
  session,
  name,
}: {
  size: number;
  fontPx: number;
  session: PublicSession | null;
  name: string;
}) => {
  const photo = profilePhoto(session);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photo]);
  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="shrink-0 rounded-full flex items-center justify-center font-gothic font-bold"
      style={{ width: size, height: size, background: "#E9E4F5", color: "#5B4A8A", fontSize: fontPx / 16 + "rem" }}
    >
      {profileInitial(name)}
    </span>
  );
};

const HomeIcon = ({ on }: { on: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor"
    strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

const StarIcon = ({ on }: { on: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor"
    strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z" />
  </svg>
);

const GameIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
    <path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4A2 2 0 0 1 9.8 16h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z" />
  </svg>
);

const BottomTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shown = showsBottomTabs(location.pathname);
  const [session, setSession] = useState<PublicSession | null>(getSession());
  // 글자를 입력하는 동안에는 키보드 위로 막대가 따라 올라오지 않게 숨깁니다
  const [typing, setTyping] = useState(false);

  useEffect(() => onSessionChange(setSession), []);

  useEffect(() => {
    if (!shown) return;
    const isField = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.tagName) return false;
      const tag = el.tagName.toUpperCase();
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable === true;
    };
    // 키보드만 내리고 포커스가 입력칸에 남으면 focusout 이 오지 않아 막대가 계속 안 보였습니다(출시 전 점검 U-14).
    // 창 높이가 줄었다가(키보드 올라옴) 다시 커지면(키보드 내려감) 막대를 다시 보이고,
    // 포커스가 남은 채 키보드가 다시 올라오면 다시 숨깁니다.
    const vv = window.visualViewport || null;
    const heightNow = () => (vv ? vv.height : window.innerHeight);
    let fullH = heightNow();
    let shrunk = false;
    const KEYBOARD_MIN = 120; // 이만큼 넘게 줄면 키보드로 봅니다(px)
    const onResize = () => {
      const h = heightNow();
      if (h > fullH) fullH = h;
      if (h < fullH - KEYBOARD_MIN) {
        shrunk = true;
        if (isField(document.activeElement)) setTyping(true);
      } else if (shrunk) {
        shrunk = false;
        setTyping(false);
      }
    };
    const onIn = (e: FocusEvent) => { if (isField(e.target)) setTyping(true); };
    const onOut = (e: FocusEvent) => { if (isField(e.target)) setTyping(false); };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    if (vv) vv.addEventListener("resize", onResize);
    else window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      if (vv) vv.removeEventListener("resize", onResize);
      else window.removeEventListener("resize", onResize);
    };
  }, [shown]);

  useEffect(() => {
    try {
      document.documentElement.style.setProperty("--kata-tabbar-h", shown ? TABBAR_CSS : "0px");
    } catch (e) {}
  }, [shown]);

  // 화면 아래에 붙는 고정 버튼(기도문 만들기 등)이 쓰는 값 — 입력 중에는 막대가 숨으므로 0 (2026-11-12)
  // --kata-tabbar-h 는 화면 높이 계산에 쓰여 입력 중에 바꾸면 화면이 출렁이므로 따로 둡니다.
  useEffect(() => {
    try {
      document.documentElement.style.setProperty("--kata-tabbar-float", shown && !typing ? TABBAR_CSS : "0px");
    } catch (e) {}
  }, [shown, typing]);

  if (!shown) return null;

  const path = trimSlash(location.pathname);
  const isRoot = TAB_ROOTS.indexOf(path) >= 0;
  const section = sectionOf(path);
  const st = (location.state || null) as { tabFromHome?: boolean } | null;
  const fromHomeFlag = !!(st && st.tabFromHome);

  const go = (to: string) => {
    // 하위 화면에서 누르면 그 탭 첫 화면으로 갑니다(히스토리를 한 칸 쌓으므로 뒤로가기로 하위 화면에 돌아옵니다)
    if (!isRoot) {
      navigate(to);
      return;
    }
    if (to === path) {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
      return;
    }
    if (to === TAB_HOME) {
      // 홈에서 온 탭이면 그 한 칸을 되돌려 홈으로(히스토리가 쌓이지 않게)
      if (fromHomeFlag) navigate(-1);
      else navigate(TAB_HOME, { replace: true });
      return;
    }
    if (path === TAB_HOME) navigate(to, { state: { tabFromHome: true } });
    else navigate(to, { replace: true, state: { tabFromHome: fromHomeFlag } });
  };

  const name = profileName(session);

  // 컴포넌트가 아니라 함수로 그립니다(렌더마다 새 컴포넌트가 되어 사진이 다시 불러와지지 않게)
  const tab = (to: string, label: string, icon: React.ReactNode) => {
    const on = section === to;
    return (
      <button
        key={to}
        type="button"
        onClick={() => go(to)}
        aria-current={on ? "page" : undefined}
        className="flex flex-col items-center justify-center gap-[3px] font-gothic active:opacity-70"
        style={{ fontSize: "0.6875rem", fontWeight: on ? 700 : 600, color: on ? DEEP : MUTED }}
      >
        <span
          className="flex items-center justify-center"
          style={{ width: 54, height: 30, borderRadius: 15, background: on ? "#DCEBEE" : "transparent" }}
        >
          {icon}
        </span>
        {label}
      </button>
    );
  };

  return (
    <>
      {/* 화면 흐름 맨 끝의 빈칸 — 마지막 내용이 막대에 가려지지 않게 */}
      <div aria-hidden="true" style={{ height: TABBAR_CSS }} />
      {typing ? null : (
        <nav
          aria-label="하단 메뉴"
          className="fixed inset-x-0 bottom-0 z-30 bg-white"
          style={{ borderTop: "1px solid #E3E8EB", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div
            className="mx-auto max-w-lg grid grid-cols-4"
            style={{ height: TABBAR_PX, paddingBottom: 6, boxSizing: "border-box" }}
          >
            {tab(TAB_HOME, "홈", <HomeIcon on={section === TAB_HOME} />)}
            {tab(TAB_WORDS, "내 단어장", <StarIcon on={section === TAB_WORDS} />)}
            {tab(TAB_GAME, "게임", <GameIcon />)}
            {tab(TAB_ME, "내 정보", <ProfileAvatar size={26} fontPx={12} session={session} name={name} />)}
          </div>
        </nav>
      )}
    </>
  );
};

export default BottomTabs;
