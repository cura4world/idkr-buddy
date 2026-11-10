import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { getCategories, getWordsByCategory, Word, Category, reorderWords, deleteWord, deleteCategory, archiveMyWordbook, nextArchiveName, moveWordsToCategory } from "@/lib/store";
import { goBackOr, wordbookFallback } from "@/lib/nav";
import AddWordDialog from "@/components/AddWordDialog";
import EditWordDialog from "@/components/EditWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import EditCategoryDialog from "@/components/EditCategoryDialog";
import CategoryCard from "@/components/CategoryCard";
import WordIllust, { PencilDefs } from "@/components/WordIllust";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { isStoreApp } from "@/lib/platform";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { GROUP_STYLES, GroupKey, groupOf, bookTitle, bookNumberText, displayMeaning } from "@/lib/wordbookGroups";
import { loadIllustBook, hasIllustBook, IllustScene } from "@/lib/illust";

const MY_WORDBOOK_ID = "my-wordbook";
// 묶기 권유 배너를 닫은 시점의 단어 수. 이보다 50개 더 모이면 다시 띄웁니다.
const NUDGE_KEY = "my-archive-nudge-at";
const NUDGE_MIN = 30;
const NUDGE_STEP = 50;
// 내 단어장·보관한 단어장 맨 위 상자 (연보라)
const MINE_TINT = "#ECE8F6";
const MINE_INK = "#4E3F86";
// 보관한 단어장 줄 타일 색 (차례로 돌아감)
const ARCHIVE_TILES = ["#FCEFE3", "#E4EEF6", "#E2F1EC", "#ECE8F6", "#EAF2DF", "#FFF3D6"];

// 이번 주(월요일 0시부터)
function weekStartMs(): number {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 월=0 … 일=6
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

// ── 시안 아이콘 ────────────────────────────────────────────
function SpeakerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="2" width="11.5" height="15" rx="2.6" fill="currentColor" opacity="0.4" transform="rotate(14 14.75 9.5)" />
      <rect x="3" y="7" width="12" height="15" rx="2.6" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 12.5h5M6.5 16h3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.8 12.3l2.8 2.8 5.6-5.8" stroke="currentColor" strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DictIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// 맨 위 상자 오른쪽 위 옅은 무늬. 단어장별(동물=발자국) → 묶음별 순서로 고릅니다.
function Motif({ kind }: { kind: string }) {
  if (kind === "flower") {
    const petal = "M0 0 C8 -6 12 -18 5 -24 C-1 -22 -4 -10 0 0 Z";
    return (
      <svg viewBox="-55 -50 110 100" width="100%" height="100%" aria-hidden="true" fill="currentColor">
        <g transform="translate(4 6) scale(1.4) rotate(14)">
          {[0, 72, 144, 216, 288].map((r) => <path key={r} d={petal} transform={"rotate(" + r + ")"} />)}
        </g>
      </svg>
    );
  }
  if (kind === "paw") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor" aria-hidden="true">
        <ellipse cx="50" cy="66" rx="20" ry="16" /><ellipse cx="26" cy="44" rx="8" ry="11" />
        <ellipse cx="42" cy="30" rx="8" ry="11" /><ellipse cx="60" cy="30" rx="8" ry="11" /><ellipse cx="76" cy="44" rx="8" ry="11" />
      </svg>
    );
  }
  if (kind === "basic") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" aria-hidden="true">
        <path d="M44 58a14 14 0 0 0 20 0l14-14a14 14 0 0 0-20-20l-6 6" />
        <path d="M56 42a14 14 0 0 0-20 0L22 56a14 14 0 0 0 20 20l6-6" />
      </svg>
    );
  }
  if (kind === "verb") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 28l22 22-22 22M50 28l22 22-22 22" />
      </svg>
    );
  }
  if (kind === "people") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor" aria-hidden="true">
        <path d="M50 84C22 64 12 48 12 35a19 19 0 0 1 38-6 19 19 0 0 1 38 6c0 13-10 29-38 49z" />
      </svg>
    );
  }
  if (kind === "social") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <rect x="14" y="34" width="72" height="48" rx="10" fill="currentColor" />
        <path d="M38 34v-8a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v8" fill="none" stroke="currentColor" strokeWidth="8" />
      </svg>
    );
  }
  if (kind === "nature") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <path d="M18 82C18 42 44 18 86 16c-2 40-26 66-68 66z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "faith") {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor" aria-hidden="true">
        <rect x="42" y="12" width="16" height="76" rx="4" /><rect x="22" y="32" width="56" height="16" rx="4" />
      </svg>
    );
  }
  return null;
}
// 접힘 상태 (localStorage). "1" 일 때만 접힘, 기본은 펴짐.
const WORDS_COLLAPSED_KEY = "cat-words-collapsed:";
const ARCHIVED_COLLAPSED_KEY = "my-archived-collapsed";
const readFlag = (key: string) => {
  try { return localStorage.getItem(key) === "1"; } catch (e) { return false; }
};
const writeFlag = (key: string, on: boolean) => {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch (e) {}
};

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveName, setArchiveName] = useState("");
  const [nudgeAt, setNudgeAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(NUDGE_KEY) || "") || 0; } catch (e) { return 0; }
  });
  const [moveOpen, setMoveOpen] = useState(false);
  const [wordsCollapsed, setWordsCollapsed] = useState(() => readFlag(WORDS_COLLAPSED_KEY + (id || "")));
  const [archivedCollapsed, setArchivedCollapsed] = useState(() => readFlag(ARCHIVED_COLLAPSED_KEY));
  const [editWord, setEditWord] = useState<Word | null>(null);
  // 머리줄 ⋮ 메뉴와 보관한 단어장 이름 변경·삭제
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteCatOpen, setDeleteCatOpen] = useState(false);
  // 기본 단어장 색연필 그림 (그 권의 파일만, 열 때 받아 옴)
  const [scenes, setScenes] = useState<Record<string, IllustScene>>({});
  const plan = usePlan();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedId = useRef<string | null>(null);
  // 왼쪽으로 밀어 둔 단어 (한 번에 하나만). 여기서 휴지통을 누르면 바로 지웁니다 — 확인 팝업 없음.
  const [openId, setOpenId] = useState<string | null>(null);
  const startedOpenRef = useRef(false);
  const swipeDir = useRef<1 | -1>(1);
  const [swipeDirState, setSwipeDirState] = useState<1 | -1>(1);
  const [swipingIndex, setSwipingIndex] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [floatWidth, setFloatWidth] = useState<number>(300);
  const floatOffsetY = useRef<number>(0);
  const draggingIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const isSwipe = useRef(false);
  // touchmove 리스너는 마운트 시 한 번만 등록되므로 editable 을 ref 로도 들고 있습니다.
  const editableRef = useRef(true);
  const touchIntent = useRef<"none" | "swipe" | "drag" | "scroll">("none");
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const swipeIndexRef = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);
  const lastTapIndex = useRef<number | null>(null);
  // 롱프레스로 "끌 준비"만 된 카드. 실제로 움직이기 전까지는 화면에 아무 변화도 주지 않습니다.
  const armedIndex = useRef<number | null>(null);
  // 꾸욱 누른 뒤 실제로 끌었는지 (끌었으면 순서 이동, 그대로 떼면 단어정보 창)
  const dragMoved = useRef(false);
  // 카드 안의 아이콘 버튼에서 시작한 터치인지 (드래그/롱프레스 대상 아님)
  const touchOnControl = useRef(false);
  // 롱프레스로 단어정보를 열었을 때 뒤따르는 click(선택 토글) 무시
  const suppressClick = useRef(false);
  // 누르고 있는 동안 카드가 서서히 작아지는 진행 표시 (얼마나 더 눌러야 하는지 눈에 보이게)
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  // 손을 떼기 전에 단어정보가 이미 열렸는지
  const infoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoOpened = useRef(false);
  const SWIPE_THRESHOLD = 80;
  const OPEN_W = 64;        // 밀린 채로 고정되는 폭 (휴지통 한 칸)
  const CLOSE_BACK = 24;    // 밀린 것을 오른쪽으로 이만큼 되밀면 닫힙니다
  const DRAG_MOVE_THRESHOLD = 12;
  const ARM_MS = 500;  // 여기까지 누르면 끌어서 순서 이동 가능
  const INFO_MS = 800; // 움직이지 않고 여기까지 누르면 단어정보가 저절로 열림

  // Android WebView / 브라우저 공통 TTS
  const speak = (text: string) => {
    if ((window as any).AndroidTTS) {
      try { (window as any).AndroidTTS.speak(text, "id-ID"); } catch(e) {}
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      speechSynthesis?.cancel?.();
      setTimeout(() => { try { speechSynthesis?.speak?.(utterance); } catch(e) {} }, 150);
    } catch(e) {}
  };

  // 헤더 뒤로가기: 직전 화면으로 한 단계만. 상태 변경 없이 타이머만 정리하고 이동합니다.
  const handleBack = () => {
    cancelLongPress();
    stopAutoScroll();
    goBackOr(navigate, location.key, backFallback());
  };

  // 보관한 단어장은 내 단어장 안에서 들어오므로 내 단어장으로, 기본 단어장은 폴더로, 내 단어장은 홈으로.
  const backFallback = (): string => {
    const cat = getCategories().find((c) => c.id === id);
    if (cat && !cat.isShared && cat.id !== MY_WORDBOOK_ID) return "/category/" + MY_WORDBOOK_ID;
    return wordbookFallback(id);
  };

  // 단어카드의 사전 아이콘: 그 단어를 사전에서 바로 검색 (사전에는 "단어장으로" 버튼이 뜸)
  const openInDictionary = (word: Word) => {
    navigate(
      `/dictionary?q=${encodeURIComponent(word.word)}&from=wordbook&cat=${encodeURIComponent(id || "")}`
    );
  };

  const copyToClipboard = async (word: Word) => {
    try {
      await navigator.clipboard.writeText(word.word);
    } catch {
      // 복사 실패 시 무시
    }
  };

  const categories = getCategories();
  const category = categories.find((c) => c.id === id);
  const words = id ? getWordsByCategory(id) : [];
  // 공용 단어장(시드에서 온 것)은 읽기 전용 "책"이다.
  // 고쳐도 다음 배포 때 시드로 되돌아가므로 편집 기능을 아예 노출하지 않는다.
  const editable = !category?.isShared;
  editableRef.current = editable;
  // "내 단어장"은 다른 진입 화면과 같은 인니어 대문자 표제,
  // 사용자가 만든 폴더 이름은 한글이라 본문 폰트를 씁니다.
  const isMine = category?.id === MY_WORDBOOK_ID;
  // 내 단어장 안에 보관해 둔 단어장들. addCategory 가 앞에 넣으므로 최신이 위입니다.
  const archived: Category[] = isMine
    ? categories.filter((c) => !c.isShared && c.id !== MY_WORDBOOK_ID)
    : [];
  // 미분류 단어가 충분히 쌓였을 때만 묶기를 권합니다.
  const showNudge =
    isMine && words.length >= NUDGE_MIN && (nudgeAt === 0 || words.length >= nudgeAt + NUDGE_STEP);

  const dismissNudge = () => {
    try { localStorage.setItem(NUDGE_KEY, String(words.length)); } catch (e) {}
    setNudgeAt(words.length);
  };

  const openArchive = () => {
    setArchiveName(nextArchiveName());
    setArchiveOpen(true);
  };

  // 묶어서 보관 — 화면은 그대로 두고 목록만 갱신합니다 (navigate 하지 않습니다).
  const handleArchive = () => {
    const name = archiveName.trim();
    if (!name) return;
    const count = words.length;
    const cat = archiveMyWordbook(name);
    setArchiveOpen(false);
    if (!cat) return;
    try { localStorage.removeItem(NUDGE_KEY); } catch (e) {}
    setNudgeAt(0);
    setSelectedIds([]);
    lastSelectedId.current = null;
    refresh();
    toast(name + " 단어장으로 " + count + "개를 보관했습니다");
  };

  // 옮길 수 있는 곳 — 내 단어장과 보관 단어장들 (공용 단어장과 지금 화면은 뺍니다).
  const moveTargets: Category[] = editable
    ? categories.filter((c) => !c.isShared && c.id !== id)
    : [];

  const clearSelection = () => {
    setSelectedIds([]);
    lastSelectedId.current = null;
  };

  const handleMoveTo = (target: Category) => {
    const { moved, skipped } = moveWordsToCategory(selectedIds, target.id);
    setMoveOpen(false);
    clearSelection();
    refresh();
    if (moved === 0) {
      toast("모두 이미 대상 단어장에 있는 단어입니다");
    } else if (skipped > 0) {
      toast(target.name + "(으)로 " + moved + "개를 옮겼습니다 (이미 있는 단어 " + skipped + "개 제외)");
    } else {
      toast(target.name + "(으)로 " + moved + "개를 옮겼습니다");
    }
  };

  // 접을 때는 진행 중이던 선택·스와이프·드래그 상태를 정리합니다.
  const toggleWordsCollapsed = () => {
    const next = !wordsCollapsed;
    writeFlag(WORDS_COLLAPSED_KEY + (id || ""), next);
    if (next) {
      cancelLongPress();
      stopAutoScroll();
      clearSelection();
      setSwipingIndex(null);
      setSwipeX(0);
      swipeXRef.current = 0;
      isSwipe.current = false;
      touchIntent.current = "none";
      setDragging(null);
      setDragOver(null);
      setFloatPos(null);
      setPressedIndex(null);
      isDragging.current = false;
      armedIndex.current = null;
    }
    setWordsCollapsed(next);
  };

  const toggleArchivedCollapsed = () => {
    const next = !archivedCollapsed;
    writeFlag(ARCHIVED_COLLAPSED_KEY, next);
    setArchivedCollapsed(next);
  };

  const setDragging = (index: number | null) => {
    draggingIndexRef.current = index;
    setDraggingIndex(index);
  };

  const setDragOver = (index: number | null) => {
    dragOverIndexRef.current = index;
    setDragOverIndex(index);
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const startAutoScroll = (clientY: number) => {
    stopAutoScroll();
    const EDGE = 100;
    const MAX_SPEED = 18;
    autoScrollTimer.current = setInterval(() => {
      const vh = window.innerHeight;
      if (clientY < EDGE) {
        const speed = Math.round(MAX_SPEED * (1 - clientY / EDGE));
        window.scrollBy(0, -speed);
      } else if (clientY > vh - EDGE) {
        const speed = Math.round(MAX_SPEED * (1 - (vh - clientY) / EDGE));
        window.scrollBy(0, speed);
      }
    }, 16);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (infoTimer.current) {
      clearTimeout(infoTimer.current);
      infoTimer.current = null;
    }
  };

  // 움직이지 않고 계속 누르고 있으면 손을 떼기 전에 단어정보를 바로 띄웁니다.
  const openInfoFromPress = (index: number) => {
    const w = words[index];
    if (!w) return;
    infoOpened.current = true;
    isDragging.current = false;
    armedIndex.current = null;
    dragMoved.current = false;
    suppressClick.current = true;
    stopAutoScroll();
    setPressedIndex(null);
    setEditWord(w);
  };

  const getOverIndex = (clientX: number, clientY: number): number => {
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      const wordCard = el.closest("[data-word-index]");
      if (wordCard) {
        return parseInt(wordCard.getAttribute("data-word-index") || "-1");
      }
    }
    return -1;
  };

  // 실제로 끌기 시작한 순간에만 드래그 UI(복제 카드 + 원본 반투명 + 드롭선)를 켭니다.
  const beginDragVisuals = (clientX: number, clientY: number) => {
    const idx = armedIndex.current;
    if (idx === null) return;
    cancelLongPress(); // 끌기 시작했으면 단어정보 자동 열기는 취소
    setPressedIndex(null);
    setDragging(idx);
    setDragOver(idx);
    setFloatPos({ x: clientX, y: clientY });
    startAutoScroll(clientY);
  };

  const handleEnd = () => {
    cancelLongPress();
    stopAutoScroll();
    const from = draggingIndexRef.current;
    const to = dragOverIndexRef.current;
    // 끌지 않고 누르기만 한 경우에는 순서를 건드리지 않습니다.
    if (isDragging.current && dragMoved.current && from !== null && to !== null && from !== to) {
      reorderWords(id!, from, to);
      setTick((t) => t + 1);
    }
    setDragging(null);
    setDragOver(null);
    setFloatPos(null);
    setPressedIndex(null);
    isDragging.current = false;
    armedIndex.current = null;
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (touchOnControl.current) return;
      if (!touchStartPos.current) return;
      const dx = t.clientX - touchStartPos.current.x;
      const dy = t.clientY - touchStartPos.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (touchIntent.current === "none") {
        if (adx > 12 || ady > 12) {
          if (adx > ady * 1.5) {
            // 이미 밀려 있는 단어는 어느 쪽으로 움직여도 '밀기'의 연장입니다
            // (오른쪽으로 되밀면 닫힘). 복사 스와이프로 넘기지 않습니다.
            if (editableRef.current && startedOpenRef.current) {
              touchIntent.current = "swipe";
              isSwipe.current = true;
              swipeDir.current = -1;
              setSwipeDirState(-1);
              cancelLongPress();
              setSwipingIndex(swipeIndexRef.current);
            } else if (dx < 0 && !editableRef.current) {
              // 읽기 전용 단어장은 왼쪽 스와이프(삭제)를 받지 않습니다. 오른쪽(복사)만 허용.
              touchIntent.current = "scroll";
              cancelLongPress();
            } else {
              touchIntent.current = "swipe";
              isSwipe.current = true;
              swipeDir.current = dx >= 0 ? 1 : -1;
              setSwipeDirState(dx >= 0 ? 1 : -1);
              cancelLongPress();
              setSwipingIndex(swipeIndexRef.current);
            }
          } else if (ady > adx) {
            touchIntent.current = "scroll";
            cancelLongPress();
          } else {
            touchIntent.current = "drag";
          }
        }
        touchMoved.current = adx > 10 || ady > 10;
      }

      if (touchIntent.current === "swipe") {
        e.preventDefault();
        // 밀려 있던 단어는 그 위치(-OPEN_W)에서 이어서 움직입니다.
        const base = startedOpenRef.current ? -OPEN_W : 0;
        const clampedX = swipeDir.current === 1
          ? Math.max(0, Math.min(dx, SWIPE_THRESHOLD + 30))
          : Math.min(0, Math.max(base + dx, -(SWIPE_THRESHOLD + 30)));
        swipeXRef.current = clampedX;
        setSwipeX(clampedX);
        return;
      }

      if (isDragging.current) {
        e.preventDefault();
        if (!dragMoved.current) {
          // 손가락이 12px 넘게 움직인 순간부터가 진짜 드래그
          if (adx <= DRAG_MOVE_THRESHOLD && ady <= DRAG_MOVE_THRESHOLD) return;
          dragMoved.current = true;
          beginDragVisuals(t.clientX, t.clientY);
        }
        setFloatPos({ x: t.clientX, y: t.clientY });
        startAutoScroll(t.clientY);
        const over = getOverIndex(t.clientX, t.clientY);
        if (over >= 0) setDragOver(over);
      }
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", onTouchMove);
  }, []);

  // 밀린 단어 바깥을 누르면 닫습니다 (다른 단어를 밀기 시작하는 경우도 여기서 닫힙니다).
  // 밀린 단어 안쪽은 그 카드의 제스처 처리에 맡깁니다 (되밀어 닫기 / 휴지통 누르기).
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: any) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest && el.closest("[data-swipe-open]")) return;
      setOpenId(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openId]);

  // 화면을 떠날 때 남아 있는 타이머 정리 (뒤로가기 직후 콜백이 튀지 않도록)
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (infoTimer.current) clearTimeout(infoTimer.current);
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, []);

  // 기본 단어장이면 그 권의 그림 파일을 받아 옵니다(없으면 그림 없이).
  // 떠난 뒤 늦게 도착한 응답은 버립니다(언마운트 뒤 setState 방지).
  useEffect(() => {
    const cat = getCategories().find((c) => c.id === id);
    if (!cat || !cat.isShared || !hasIllustBook(cat.name)) {
      setScenes({});
      return;
    }
    let alive = true;
    loadIllustBook(cat.name).then((s) => { if (alive) setScenes(s); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    // 스피커·사전 아이콘에서 시작한 터치는 카드 드래그/롱프레스로 보지 않습니다.
    touchOnControl.current = !!(e.target as HTMLElement)?.closest?.("button");
    if (touchOnControl.current) return;
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchMoved.current = false;
    isDragging.current = false;
    isSwipe.current = false;
    dragMoved.current = false;
    armedIndex.current = null;
    infoOpened.current = false;
    suppressClick.current = false; // 이전 제스처의 잔여 플래그 정리
    touchIntent.current = "none";
    swipeIndexRef.current = index;
    // 이미 밀려 있는 단어에서 시작했으면 그 위치(-OPEN_W)에서 이어서 끕니다.
    const startWord = words[index];
    startedOpenRef.current = !!startWord && openId === startWord.id;
    swipeXRef.current = startedOpenRef.current ? -OPEN_W : 0;
    longPressTimer.current = setTimeout(() => {
      if (isSwipe.current || touchIntent.current === "swipe" || touchIntent.current === "scroll") return;
      // 읽기 전용 단어장은 순서를 바꿔도 다음 배포 때 시드 순서로 되돌아가므로 드래그를 걸지 않습니다.
      if (!editable) return;
      // 여기서는 "끌 준비"만 합니다. 화면 변화는 실제로 움직일 때(beginDragVisuals) 시작합니다.
      isDragging.current = true;
      touchIntent.current = "drag";
      armedIndex.current = index;
      try { (navigator as any).vibrate?.(15); } catch (e) {}
      setPressedIndex(index); // 카드가 서서히 작아지며 "조금만 더" 를 알려줌
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        setFloatWidth(rect.width);
        floatOffsetY.current = t.clientY - rect.top;
      }
    }, ARM_MS);
    infoTimer.current = setTimeout(() => {
      if (isSwipe.current || touchIntent.current === "swipe" || touchIntent.current === "scroll") return;
      if (dragMoved.current) return; // 끌고 있는 중이면 열지 않음
      openInfoFromPress(index);
    }, INFO_MS);
  };

  const handleTouchEnd = (index: number, word: Word) => {
    if (touchOnControl.current) { touchOnControl.current = false; return; }
    // 손을 떼기 전에 단어정보가 이미 열린 경우: 정리만 하고 끝
    if (infoOpened.current) {
      infoOpened.current = false;
      handleEnd();
      touchIntent.current = "none";
      return;
    }
    const wasDragging = isDragging.current;
    const wasMoved = dragMoved.current;
    const wasSwipe = touchIntent.current === "swipe";
    if (wasSwipe) {
      if (swipeDir.current === 1 && swipeXRef.current >= SWIPE_THRESHOLD) {
        copyToClipboard(word);
      } else if (editable && swipeDir.current === -1) {
        // 임계값을 넘겨 떼면 밀린 채로 고정되고, 오른쪽으로 되밀면 닫힙니다.
        // (여기서 지우지 않습니다 — 드러난 휴지통을 한 번 더 눌러야 지워집니다)
        const keepOpen = startedOpenRef.current
          ? swipeXRef.current <= -(OPEN_W - CLOSE_BACK)
          : swipeXRef.current <= -SWIPE_THRESHOLD;
        setOpenId(keepOpen ? word.id : null);
      }
      setSwipingIndex(null);
      setSwipeX(0);
      swipeXRef.current = 0;
      isSwipe.current = false;
      touchIntent.current = "none";
      cancelLongPress();
      return;
    }
    // 밀린 상태의 단어는 본래 탭(선택)이 발동하지 않습니다 — 누르면 닫히기만 합니다.
    if (openId === word.id && !wasDragging && !touchMoved.current) {
      handleEnd();
      touchIntent.current = "none";
      suppressClick.current = true; // 뒤따르는 click 의 선택 토글도 무시
      setOpenId(null);
      return;
    }
    handleEnd();
    touchIntent.current = "none";
    // 꾸욱 누르고 끌지 않고 그대로 떼면 단어정보 창 (뒤따르는 click의 선택 토글은 무시)
    if (wasDragging && !wasMoved) {
      suppressClick.current = true;
      setEditWord(word);
      return;
    }
    if (!wasDragging && !touchMoved.current) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;
      if (timeSinceLastTap < 300 && lastTapIndex.current === index) {
        toggleSelect(word.id);
        lastTapTime.current = 0;
        lastTapIndex.current = null;
      } else {
        lastTapTime.current = now;
        lastTapIndex.current = index;
      }
    }
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    dragMoved.current = false;
    armedIndex.current = null;
    infoOpened.current = false;
    suppressClick.current = false; // 이전 제스처의 잔여 플래그 정리
    const start = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      if (!editable) return;
      // 터치와 동일하게 "끌 준비"만 하고, 화면 변화는 실제로 움직일 때 시작합니다.
      isDragging.current = true;
      armedIndex.current = index;
      setPressedIndex(index);
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        setFloatWidth(rect.width);
        floatOffsetY.current = e.clientY - rect.top;
      }
    }, ARM_MS);
    infoTimer.current = setTimeout(() => {
      if (dragMoved.current) return;
      openInfoFromPress(index);
    }, INFO_MS);
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      if (!dragMoved.current) {
        if (
          Math.abs(ev.clientX - start.x) <= DRAG_MOVE_THRESHOLD &&
          Math.abs(ev.clientY - start.y) <= DRAG_MOVE_THRESHOLD
        ) {
          return;
        }
        dragMoved.current = true;
        beginDragVisuals(ev.clientX, ev.clientY);
      }
      setFloatPos({ x: ev.clientX, y: ev.clientY });
      startAutoScroll(ev.clientY);
      const over = getOverIndex(ev.clientX, ev.clientY);
      if (over >= 0) setDragOver(over);
    };
    const onMouseUp = () => {
      const wasDragging = isDragging.current;
      const wasMoved = dragMoved.current;
      const alreadyOpened = infoOpened.current;
      infoOpened.current = false;
      handleEnd();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (alreadyOpened) return; // 떼기 전에 이미 열렸음
      // 꾸욱 누르고 끌지 않고 그대로 떼면 단어정보 창 (뒤따르는 click은 무시)
      if (wasDragging && !wasMoved) {
        suppressClick.current = true;
        const w = words[index];
        if (w) setEditWord(w);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMouseClick = (index: number) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (isDragging.current) return;
    const w = words[index];
    if (!w) return;
    // 밀려 있는 단어를 누르면 선택이 아니라 닫기입니다.
    if (openId === w.id) { setOpenId(null); return; }
    toggleSelect(w.id);
  };

  // 단어 선택 토글 (복수 선택). 새로 선택하면 마지막 선택으로 기억 -> 단어 추가 위치
  // 읽기 전용 단어장에서는 선택이 할 일이 없으므로(삭제·추가 위치 지정용) 아예 막습니다.
  const toggleSelect = (wordId: string) => {
    if (!editable) return;
    setSelectedIds((prev) => {
      if (prev.includes(wordId)) {
        const next = prev.filter((x) => x !== wordId);
        if (lastSelectedId.current === wordId) {
          lastSelectedId.current = next.length > 0 ? next[next.length - 1] : null;
        }
        return next;
      }
      lastSelectedId.current = wordId;
      toast("새 단어가 이 단어 바로 아래에 추가됩니다");
      return [...prev, wordId];
    });
  };

  // 밀린 단어가 선택 집합에 있으면 선택 전체, 아니면 그 단어 하나가 대상입니다.
  const deleteTargetIds = (word: Word): string[] =>
    selectedIds.includes(word.id) ? selectedIds : [word.id];

  // 휴지통을 누르면 바로 지웁니다 (밀기 + 누르기 두 동작이 실수 방지 장치입니다).
  const deleteNow = (word: Word) => {
    if (!editable) return;
    const ids = deleteTargetIds(word);
    ids.forEach((wid) => deleteWord(wid));
    setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)));
    if (lastSelectedId.current && ids.includes(lastSelectedId.current)) {
      lastSelectedId.current = null;
    }
    setOpenId(null);
    toast(ids.length > 1 ? ids.length + "개의 단어를 삭제했습니다" : "단어를 삭제했습니다");
    refresh();
  };

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body">
        카테고리를 찾을 수 없습니다.
      </div>
    );
  }

  // 기본 단어장 잠금: 무료는 구독 화면으로, 성경과 신앙은 관리자·Special Member 만.
  // (스토어 앱 밖에서는 등급이 늘 관리자라 지금처럼 모두 열림)
  const sharedAll = categories.filter((c) => c.isShared);
  const group: GroupKey = category.isShared ? groupOf(category, sharedAll) : "other";
  if (category.isShared && !plan.plus) return <Navigate to={PAYWALL_PATH} replace />;
  if (category.isShared && group === "faith" && !plan.staff) return <Navigate to="/wordbooks" replace />;

  const draggingWord = draggingIndex !== null ? words[draggingIndex] : null;
  const isArchived = editable && !isMine;
  const gs = GROUP_STYLES[group];
  // 맨 위 상자 색: 내 단어장·보관한 단어장은 연보라, 기본 단어장은 묶음 색
  const tint = category.isShared ? gs.tint : MINE_TINT;
  const ink = category.isShared ? gs.ink : MINE_INK;
  const exBg = category.isShared ? gs.exBg : "#F6F7F5";
  const titleText = category.isShared ? bookTitle(category.name) : category.name;
  const numText = category.isShared ? bookNumberText(category.name) : "";
  const motif = isMine
    ? "flower"
    : category.isShared
      ? (titleText === "동물" ? "paw" : group)
      : "flower";
  // 공개판에서 내 단어장은 하단 탭 화면이라 뒤로가기 화살표가 없습니다.
  const showBack = !(isMine && isStoreApp());
  const newThisWeek = isMine ? words.filter((w) => (w.createdAt || 0) >= weekStartMs()).length : 0;
  const nudgeCount = Math.max(NUDGE_MIN, Math.floor(words.length / 10) * 10);
  const hasScenes = category.isShared && Object.keys(scenes).length > 0;
  // 카드·퀴즈로 갈 때 "이 단어장에서 왔다"를 남겨, 퀴즈 결과의 "단어장으로"가 한 단계 뒤로 가게 합니다.
  const goStudy = () => { cancelLongPress(); stopAutoScroll(); navigate("/study/" + category.id, { state: { fromBook: true } }); };
  const goQuiz = () => { cancelLongPress(); stopAutoScroll(); navigate("/quiz/" + category.id, { state: { fromBook: true } }); };

  // 보관한 단어장 삭제: 지운 뒤 상태를 바꾸지 않고 바로 나갑니다(setState + navigate 동시 호출 금지).
  const handleDeleteCategory = () => {
    cancelLongPress();
    stopAutoScroll();
    deleteCategory(category.id);
    toast("'" + category.name + "' 단어장을 삭제했습니다");
    goBackOr(navigate, location.key, "/category/" + MY_WORDBOOK_ID);
  };

  const menuItems: { label: string; onClick: () => void; danger?: boolean }[] = isMine
    ? [
        { label: "단어장 만들기", onClick: () => setAddCatOpen(true) },
        { label: "CSV 가져오기", onClick: () => setCsvOpen(true) },
      ]
    : isArchived
      ? [
          { label: "CSV 가져오기", onClick: () => setCsvOpen(true) },
          { label: "이름 변경", onClick: () => setRenameOpen(true) },
          { label: "단어장 삭제", onClick: () => setDeleteCatOpen(true), danger: true },
        ]
      : [];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {hasScenes ? <PencilDefs /> : null}
      <header className={"sticky top-0 z-30 h-14 bg-background text-foreground border-b border-[#E3E8EB] flex items-center gap-3 " + (editable ? "pl-4 pr-2" : "px-4")}>
        {showBack ? (
          <button
            onClick={handleBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center shrink-0 text-foreground"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        {isMine ? (
          <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
            KOSAKATAKU
          </h1>
        ) : (
          <span className="flex-1 min-w-0">
            <span className="block truncate font-body text-base font-semibold">{titleText}</span>
            <span className="mt-px block truncate font-gothic text-[0.75rem] text-[#646C72]">
              {category.isShared
                ? (
                  <>
                    {gs.label}
                    {numText ? <> · <span className="font-word">{numText}</span>번 단어장</> : null}
                  </>
                )
                : <>내 단어장 · 보관한 단어장</>}
            </span>
          </span>
        )}
        {editable ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="shrink-0 h-9 pl-[11px] pr-[13px] rounded-full bg-[#E3EEEC] text-[#2C6D63] font-gothic text-[0.8125rem] font-semibold flex items-center gap-[5px] active:opacity-80"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            단어 추가
          </button>
        ) : null}
        {menuItems.length > 0 ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="더 보기"
              className="w-10 h-10 rounded-full flex items-center justify-center text-foreground active:bg-muted"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" />
              </svg>
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 min-w-[10rem] rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                  {menuItems.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => { setMenuOpen(false); m.onClick(); }}
                      className={"flex w-full items-center px-4 py-3 text-left font-gothic text-[0.875rem] active:bg-muted " + (m.danger ? "text-destructive" : "text-popover-foreground")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className={(selectedIds.length > 0 ? "pb-24" : "pb-8") + " px-4 pt-4"}>
        {/* 맨 위 색 상자 — 단어 수 + 카드로 외우기·퀴즈 풀기 */}
        <section
          className={"relative overflow-hidden rounded-[20px] " + (category.isShared ? "pt-4 pr-4 pb-3.5 pl-[18px]" : "pt-[18px] px-[18px] pb-4")}
          style={{ background: tint }}
        >
          <div
            className="absolute pointer-events-none"
            style={isMine || !category.isShared
              ? { right: "-12px", top: "-14px", width: "110px", height: "100px", color: ink, opacity: 0.22 }
              : { right: "-6px", top: "-8px", width: "112px", height: "100px", color: ink, opacity: 0.22 }}
          >
            <Motif kind={motif} />
          </div>
          <p className="relative m-0 font-gothic text-[0.75rem] font-semibold" style={{ color: ink }}>
            {isMine ? "모은 단어" : category.isShared ? gs.label : "보관한 단어장"}
          </p>
          <p className={"relative mt-0.5 flex items-baseline " + (isMine ? "gap-2" : "gap-1.5")}>
            <span className={"font-word font-semibold " + (isMine ? "text-[1.875rem]" : "text-[1.75rem]")} style={{ color: ink }}>
              {words.length}
            </span>
            <span className={"font-body text-[0.84375rem] " + (isMine ? "text-[#4D4766]" : "text-[#4B5356]")}>
              {isMine ? "이번 주 새로 " + newThisWeek + "개" : "단어"}
            </span>
          </p>
          <div className={"relative grid grid-cols-2 gap-2 " + (isMine ? "mt-3.5" : "mt-3")}>
            <button
              type="button"
              onClick={goStudy}
              className="h-[46px] rounded-[14px] bg-white font-gothic text-[0.875rem] font-semibold flex items-center justify-center gap-2 active:opacity-80"
              style={{ color: ink }}
            >
              <span className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: tint }}>
                <CardIcon />
              </span>
              카드로 외우기
            </button>
            <button
              type="button"
              onClick={goQuiz}
              className="h-[46px] rounded-[14px] bg-white font-gothic text-[0.875rem] font-semibold flex items-center justify-center gap-2 active:opacity-80"
              style={{ color: ink }}
            >
              <span className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: tint }}>
                <QuizIcon />
              </span>
              퀴즈 풀기
            </button>
          </div>
        </section>

      {showNudge && (
        <div className="mt-3 flex items-center gap-2.5 rounded-[14px] bg-[#FFF6E5] py-2.5 pl-3.5 pr-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A6A12" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <path d="M3 7h18v13H3zM2 3h20v4H2zM10 12h4" />
          </svg>
          <p className="flex-1 min-w-0 m-0 font-gothic text-[0.78125rem] leading-snug text-[#5C4410]">
            단어가 {nudgeCount}개를 넘었습니다.<br />한 권으로 묶어 보관하기
          </p>
          <button
            type="button"
            onClick={openArchive}
            className="shrink-0 h-8 px-3 rounded-full bg-white font-gothic text-[0.75rem] font-semibold text-[#7A520C] active:opacity-80"
          >
            묶기
          </button>
          <button
            type="button"
            onClick={dismissNudge}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-[#B08A45]"
            aria-label="닫기"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}
      {isMine && words.length > 0 && (
        <button
          type="button"
          onClick={toggleWordsCollapsed}
          className="mt-[18px] mb-2.5 w-full flex items-center justify-between px-1 font-gothic text-[0.875rem] font-bold tracking-[0.02em] text-[#3B4245]"
        >
          <span>단어 {words.length}개</span>
          {wordsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      )}
      <div className={(isMine && wordsCollapsed) ? "hidden" : (isMine ? "space-y-3" : "mt-2.5 space-y-2.5")}>
        {words.map((w, index) => {
          const isDraggingThis = draggingIndex === index;
          const isDropTarget = dragOverIndex === index && draggingIndex !== index;
          // 읽기 전용 단어장에서는 선택 자체가 막혀 있으므로 선택 배경도 뜨지 않습니다.
          const isSelected = editable && selectedIds.includes(w.id);
          const isSwiping = swipingIndex === index;
          const isOpen = openId === w.id;
          const isPressed = pressedIndex === index;
          // 미는 중이면 손가락을 따라가고, 손을 뗀 뒤에는 밀린 자리(-OPEN_W)에 고정됩니다.
          const currentSwipeX = isSwiping ? swipeX : (isOpen ? -OPEN_W : 0);
          const swipingRight = isSwiping && swipeDirState === 1;
          const swipingLeft = isSwiping && swipeDirState === -1;
          const showCopyConfirm = swipingRight && currentSwipeX >= SWIPE_THRESHOLD;
          // 왼쪽 배경(휴지통)은 미는 중이거나 밀린 상태일 때만 렌더합니다.
          const showDeleteBg = editable && (swipingLeft || isOpen);
          // 선택 집합에 든 단어를 밀면 몇 개가 지워지는지 숫자만 붙입니다.
          const deleteCount = selectedIds.includes(w.id) ? selectedIds.length : 1;
          return (
            <div
              key={w.id}
              data-swipe-open={isOpen ? "1" : undefined}
              className={"relative rounded-2xl " + (isSwiping || isOpen ? "overflow-hidden" : "")}
            >
              {/* 복사/삭제 배경은 스와이프 중이거나 밀린 상태일 때만 렌더링합니다. */}
              {showDeleteBg ? (
                <div className="absolute inset-0 flex items-center justify-end rounded-2xl bg-red-500">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteNow(w); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex h-full items-center justify-center gap-1 text-white active:bg-red-600"
                    style={{ width: OPEN_W + "px" }}
                    aria-label="삭제"
                  >
                    <Trash2 size={18} />
                    {deleteCount > 1 ? (
                      <span className="text-[0.6875rem] font-body tabular-nums">{deleteCount}</span>
                    ) : null}
                  </button>
                </div>
              ) : null}
              {isSwiping && swipingRight ? (
                <div className={`absolute inset-0 flex items-center px-5 rounded-2xl transition-colors duration-100 ${showCopyConfirm ? "bg-sky-500" : "bg-sky-400/70"}`}>
                  <Copy size={18} className="text-white" />
                  <span className="text-white text-sm font-body ml-2">{showCopyConfirm ? "복사!" : "복사"}</span>
                </div>
              ) : null}
              {isDropTarget && (
                <div className="h-0.5 bg-sky-400 rounded-full mx-1 mb-1 shadow-sm shadow-sky-400/50" />
              )}
              <div
                ref={(el) => { cardRefs.current[index] = el; }}
                data-word-index={index}
                className={[
                  "relative rounded-2xl select-none text-card-foreground shadow-[0_1px_3px_rgba(16,40,50,0.06)]",
                  category.isShared ? "pt-3 pr-2.5 pb-3.5 pl-4" : "py-3.5 pr-2.5 pl-4",
                  isDraggingThis ? "opacity-20 cursor-grabbing bg-card" : (editable ? "bg-card cursor-grab" : "bg-card"),
                ].join(" ")}
                style={{
                  ...(isSelected ? { backgroundColor: "#E3EEEC" } : {}),
                  // 누르고 있는 동안 남은 시간만큼 서서히 작아집니다 (다 작아지면 단어정보가 열림)
                  transform: `translateX(${currentSwipeX}px)${isPressed ? " scale(0.96)" : ""}`,
                  transition: isSwiping
                    ? "none"
                    : isPressed
                      ? `transform ${INFO_MS - ARM_MS}ms ease-out`
                      : "transform 0.25s ease",
                }}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchEnd={() => handleTouchEnd(index, w)}
                onMouseDown={(e) => handleMouseDown(index, e)}
                onClick={() => handleMouseClick(index)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* 단어 줄: 단어·뜻 | (색연필 그림은 이 줄 빈칸에 깔림) | 사전(내 단어장만) · 스피커 */}
                <div className={"relative flex items-center " + (category.isShared ? "gap-2" : "gap-0.5")}>
                  {category.isShared ? <WordIllust scene={scenes[w.word]} /> : null}
                  <div className="relative z-[1] flex-1 min-w-0 content-bump">
                    <p className="m-0 font-word text-[1.1875rem] font-semibold leading-[1.35] text-[#104B60] break-words">{w.word}</p>
                    <p className="mt-px font-gothic text-[0.875rem] font-semibold text-[#34332F]">{displayMeaning(w.meaning)}</p>
                  </div>
                  {!category.isShared ? (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); openInDictionary(w); }}
                      className="relative z-[1] w-9 h-9 shrink-0 flex items-center justify-center text-[#9AA1A6]"
                      title="사전에서 보기"
                      aria-label="사전에서 보기"
                    >
                      <DictIcon />
                    </button>
                  ) : null}
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); speak(w.word); }}
                    className="relative z-[1] w-[38px] h-[38px] shrink-0 rounded-full bg-[#E2F1EC] text-[#2C6D63] flex items-center justify-center active:opacity-80"
                    aria-label="단어 듣기"
                  >
                    <SpeakerIcon size={18} />
                  </button>
                </div>
                {w.example ? (
                  <div
                    className={"flex items-start gap-1.5 rounded-xl pt-[9px] pr-1 pb-2.5 pl-3 " + (category.isShared ? "mt-2" : "mt-2.5 mr-1.5")}
                    style={{ background: exBg }}
                  >
                    <div className="flex-1 min-w-0 content-bump">
                      <p className="m-0 font-word text-[0.90625rem] leading-normal text-[#3C3B36]">{w.example}</p>
                      {w.exampleMeaning ? (
                        <p className="mt-0.5 font-body text-[0.8125rem] leading-normal text-[#6B6A63]">{w.exampleMeaning}</p>
                      ) : null}
                    </div>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); speak(w.example); }}
                      className="w-8 h-8 shrink-0 flex items-center justify-center text-[#2C6D63]"
                      aria-label="예문 듣기"
                    >
                      <SpeakerIcon size={15} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {words.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-body">
          <p>단어가 없습니다.</p>
        </div>
      )}
      {isMine && archived.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            onClick={toggleArchivedCollapsed}
            className="mb-2.5 w-full flex items-center justify-between px-1 font-gothic text-[0.875rem] font-bold tracking-[0.02em] text-[#3B4245]"
          >
            <span>보관한 단어장 {archived.length}권</span>
            {archivedCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!archivedCollapsed && (
            <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
              {archived.map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  variant="archived"
                  tile={ARCHIVE_TILES[i % ARCHIVE_TILES.length]}
                  last={i === archived.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      )}
      {draggingWord && floatPos && (
        <div
          className="fixed pointer-events-none z-50 bg-card rounded-2xl py-3.5 pr-2.5 pl-4 border border-sky-400 shadow-lg shadow-sky-400/20"
          style={{ width: floatWidth, left: floatPos.x - floatWidth / 2, top: floatPos.y - floatOffsetY.current }}
        >
          <div className="flex items-center gap-0.5">
            <div className="flex-1 min-w-0">
              <p className="m-0 font-word text-[1.1875rem] font-semibold leading-[1.35] text-[#104B60] truncate">{draggingWord.word}</p>
              <p className="mt-px font-gothic text-[0.875rem] font-semibold text-[#34332F]">{displayMeaning(draggingWord.meaning)}</p>
            </div>
            <span className="w-[38px] h-[38px] shrink-0 rounded-full bg-[#E2F1EC] text-[#2C6D63] flex items-center justify-center">
              <SpeakerIcon size={18} />
            </span>
          </div>
          {draggingWord.example ? (
            <div className="mt-2.5 mr-1.5 rounded-xl bg-[#F6F7F5] pt-[9px] pr-1 pb-2.5 pl-3">
              <p className="m-0 font-word text-[0.90625rem] leading-normal text-[#3C3B36]">{draggingWord.example}</p>
            </div>
          ) : null}
        </div>
      )}
      <AddWordDialog
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) { setSelectedIds([]); lastSelectedId.current = null; } }}
        defaultCategoryId={id}
        onAdded={(newWordId) => {
          refresh();
          const anchorId = lastSelectedId.current;
          if (anchorId && newWordId) {
            const currentWords = getWordsByCategory(id!);
            const anchorIdx = currentWords.findIndex((w) => w.id === anchorId);
            const newIdx = currentWords.findIndex((w) => w.id === newWordId);
            if (anchorIdx !== -1 && newIdx !== -1 && newIdx !== anchorIdx + 1) {
              reorderWords(id!, newIdx, anchorIdx + 1);
              refresh();
            }
          }
          setSelectedIds([]);
          lastSelectedId.current = null;
        }}
      />
      <EditWordDialog
        open={!!editWord}
        onOpenChange={(o) => { if (!o) setEditWord(null); }}
        word={editWord}
        onUpdated={refresh}
      />
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={refresh} categoryId={id} />
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
      {isArchived ? (
        <>
          <EditCategoryDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            categoryId={category.id}
            currentName={category.name}
            currentEmoji={category.emoji}
            onUpdated={refresh}
          />
          <AlertDialog open={deleteCatOpen} onOpenChange={setDeleteCatOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-body">단어장 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  '{category.name}' 단어장과 포함된 단어 {words.length}개가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDeleteCategory(); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-sm mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-body text-black">단어장으로 묶기</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleArchive(); }}
            className="space-y-4"
          >
            <div>
              <Label className="font-body text-sm text-black">단어장 이름</Label>
              <Input
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            <p className="font-body text-[0.8125rem] leading-relaxed text-muted-foreground">
              지금 내 단어장의 단어 {words.length}개를 새 단어장으로 옮깁니다. 내 단어장은 비워집니다.
            </p>
            <Button type="submit" className="w-full" disabled={!archiveName.trim()}>보관하기</Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* 고른 단어가 있을 때만 뜨는 아래 고정 바. 어두운 배경에서도 보이도록 불투명 bg-card 를 씁니다. */}
      {editable && selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto max-w-lg border-t border-border bg-card px-4 py-3 flex items-center gap-3">
            <span className="flex-1 min-w-0 text-[0.8125rem] font-body text-foreground">
              {selectedIds.length}개 선택
            </span>
            <button
              type="button"
              onClick={() => setMoveOpen(true)}
              className="shrink-0 h-9 px-4 rounded-full bg-primary text-[0.8125rem] font-gothic font-medium text-white active:opacity-90"
            >
              이동
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 h-9 px-3 rounded-full border border-border text-[0.8125rem] font-gothic text-foreground active:bg-muted"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-sm mx-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-body text-black">어느 단어장으로 옮길까요?</DialogTitle>
          </DialogHeader>
          {moveTargets.length === 0 ? (
            <p className="font-body text-[0.8125rem] leading-relaxed text-muted-foreground">
              보관한 단어장이 없습니다. 먼저 단어장을 만들어 주세요.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              {moveTargets.map((cat, i) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleMoveTo(cat)}
                  className={
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-muted " +
                    (i === moveTargets.length - 1 ? "" : "border-b border-border")
                  }
                >
                  <span className="w-8 h-8 shrink-0 rounded-full border border-border flex items-center justify-center text-[0.9375rem]">
                    {cat.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] text-foreground truncate">{cat.name}</span>
                    <span className="mt-0.5 block font-word text-[0.6875rem] text-muted-foreground">
                      {getWordsByCategory(cat.id).length}단어
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
