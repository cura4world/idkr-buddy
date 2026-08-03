import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getCategories, getWordsByCategory, Word, Category, reorderWords, deleteWord, archiveMyWordbook, nextArchiveName, moveWordsToCategory } from "@/lib/store";
import { goBackOr, wordbookFallback } from "@/lib/nav";
import AddWordDialog from "@/components/AddWordDialog";
import EditWordDialog from "@/components/EditWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import CategoryCard from "@/components/CategoryCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Volume2, BookOpen, Copy, Trash2, Download, X, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const MY_WORDBOOK_ID = "my-wordbook";
// 묶기 권유 배너를 닫은 시점의 단어 수. 이보다 50개 더 모이면 다시 띄웁니다.
const NUDGE_KEY = "my-archive-nudge-at";
const NUDGE_MIN = 100;
const NUDGE_STEP = 50;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedId = useRef<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
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
    goBackOr(navigate, location.key, wordbookFallback(id));
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
            // 읽기 전용 단어장은 왼쪽 스와이프(삭제)를 받지 않습니다. 오른쪽(복사)만 허용.
            if (dx < 0 && !editableRef.current) {
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
        const clampedX = swipeDir.current === 1
          ? Math.max(0, Math.min(dx, SWIPE_THRESHOLD + 30))
          : Math.min(0, Math.max(dx, -(SWIPE_THRESHOLD + 30)));
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

  // 화면을 떠날 때 남아 있는 타이머 정리 (뒤로가기 직후 콜백이 튀지 않도록)
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (infoTimer.current) clearTimeout(infoTimer.current);
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, []);

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
    swipeXRef.current = 0;
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
      } else if (editable && swipeDir.current === -1 && swipeXRef.current <= -SWIPE_THRESHOLD) {
        // 밀린 단어가 선택 집합에 있으면 선택 전체, 아니면 이 단어 하나만 삭제 대상
        const targetIds = selectedIds.includes(word.id) ? selectedIds : [word.id];
        setPendingDeleteIds(targetIds);
      }
      setSwipingIndex(null);
      setSwipeX(0);
      swipeXRef.current = 0;
      isSwipe.current = false;
      touchIntent.current = "none";
      cancelLongPress();
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
    if (w) toggleSelect(w.id);
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

  // 삭제 확정 실행
  const confirmDelete = () => {
    const ids = pendingDeleteIds;
    ids.forEach((wid) => deleteWord(wid));
    setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)));
    if (lastSelectedId.current && ids.includes(lastSelectedId.current)) {
      lastSelectedId.current = null;
    }
    setPendingDeleteIds([]);
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

  const draggingWord = draggingIndex !== null ? words[draggingIndex] : null;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={
          "flex-1 min-w-0 truncate font-semibold " +
          (isMine
            ? "font-gothic text-base uppercase tracking-[0.08em]"
            : "font-body text-[1.0625rem] tracking-tight")
        }>
          {isMine ? "KOSAKATAKU" : category.name}
        </h1>
      </header>

      <div className={selectedIds.length > 0 ? "px-4 pb-24" : "px-4 pb-6"}>
        {/* 표준 헤더 높이 61px(py-3 24 + 버튼 36 + 테두리 1) 바로 아래에 붙여둡니다. */}
        {editable && (
          <div className="sticky top-[61px] z-20 bg-background -mx-4 px-4 py-2.5 flex flex-wrap justify-end gap-x-3.5 gap-y-1">
            <button onClick={() => setCsvOpen(true)} className="group inline-flex items-center gap-1 text-xs text-foreground font-gothic">
              <Download size={13} className="shrink-0" />
              <span className="group-hover:underline underline-offset-4">CSV 가져오기</span>
            </button>
            <button onClick={() => setAddOpen(true)} className="text-xs text-foreground hover:underline underline-offset-4 font-gothic">
              + 단어 추가
            </button>
            {isMine && (
              <button onClick={() => setAddCatOpen(true)} className="text-xs text-foreground hover:underline underline-offset-4 font-gothic">
                + 단어장 추가
              </button>
            )}
          </div>
        )}
      {showNudge && (
        <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
          <p className="flex-1 min-w-0 text-[0.8125rem] font-body text-foreground">
            단어가 {words.length}개 모였어요.
          </p>
          <button
            type="button"
            onClick={openArchive}
            className="shrink-0 h-8 px-3 rounded-full bg-primary text-[0.75rem] font-gothic font-medium text-white active:opacity-90"
          >
            묶어서 보관하기
          </button>
          <button
            type="button"
            onClick={dismissNudge}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
            title="닫기"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {isMine && words.length > 0 && (
        <button
          type="button"
          onClick={toggleWordsCollapsed}
          className="mb-2.5 w-full flex items-center justify-between px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          <span>단어 {words.length}개</span>
          {wordsCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      )}
      {/* 버튼 줄이 없는 읽기 전용 단어장에서는 그 줄이 주던 여백을 목록이 대신 갖습니다. */}
      <div className={(isMine && wordsCollapsed) ? "hidden" : (editable ? "space-y-2" : "space-y-2 pt-2.5")}>
        {words.map((w, index) => {
          const isDraggingThis = draggingIndex === index;
          const isDropTarget = dragOverIndex === index && draggingIndex !== index;
          // 읽기 전용 단어장에서는 선택 자체가 막혀 있으므로 선택 배경도 뜨지 않습니다.
          const isSelected = editable && selectedIds.includes(w.id);
          const isSwiping = swipingIndex === index;
          const isPressed = pressedIndex === index;
          const currentSwipeX = isSwiping ? swipeX : 0;
          const swipingRight = isSwiping && swipeDirState === 1;
          const swipingLeft = isSwiping && swipeDirState === -1;
          const showCopyConfirm = swipingRight && currentSwipeX >= SWIPE_THRESHOLD;
          const showDeleteConfirm = swipingLeft && currentSwipeX <= -SWIPE_THRESHOLD;
          // 왼쪽 스와이프 시 몇 개가 지워질지 미리 표시
          const deleteCount = selectedIds.includes(w.id) ? selectedIds.length : 1;
          return (
            <div key={w.id} className="relative overflow-hidden rounded-lg">
              {/* 복사/삭제 배경은 실제로 스와이프하는 동안에만 렌더링합니다. */}
              {isSwiping && (
                swipingLeft ? (editable ? (
                  <div className={`absolute inset-0 flex items-center justify-end px-5 rounded-lg transition-colors duration-100 ${showDeleteConfirm ? "bg-red-600" : "bg-red-500/70"}`}>
                    <span className="text-white text-sm font-body mr-2">{showDeleteConfirm ? (deleteCount > 1 ? deleteCount + "개 삭제!" : "삭제!") : "삭제"}</span>
                    <Trash2 size={18} className="text-white" />
                  </div>
                ) : null) : (
                  <div className={`absolute inset-0 flex items-center px-5 rounded-lg transition-colors duration-100 ${showCopyConfirm ? "bg-sky-500" : "bg-sky-400/70"}`}>
                    <Copy size={18} className="text-white" />
                    <span className="text-white text-sm font-body ml-2">{showCopyConfirm ? "복사!" : "복사"}</span>
                  </div>
                )
              )}
              {isDropTarget && (
                <div className="h-0.5 bg-sky-400 rounded-full mx-1 mb-1 shadow-sm shadow-sky-400/50" />
              )}
              <div
                ref={(el) => { cardRefs.current[index] = el; }}
                data-word-index={index}
                className={[
                  "relative flex items-start gap-3 rounded-lg p-4 border border-border/50 select-none text-card-foreground",
                  isDraggingThis ? "opacity-20 cursor-grabbing bg-card" : "bg-card cursor-grab",
                ].join(" ")}
                style={{
                  ...(isSelected ? { backgroundColor: "hsl(30, 20%, 88%)" } : {}),
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
                <div className="flex-1 min-w-0 content-bump">
                  <p className="font-word text-base font-medium truncate">{w.word}</p>
                  <p className="text-xs font-bold text-muted-foreground font-gothic">{w.meaning}</p>
                  {w.example && (
                    <p className="text-xs text-muted-foreground/70 font-word mt-0.5">{w.example}</p>
                  )}
                  {w.exampleMeaning && (
                    <p className="text-[0.6875rem] leading-snug text-muted-foreground/50 font-body mt-0.5">{w.exampleMeaning}</p>
                  )}
                </div>
                <div className="flex flex-col items-center justify-between self-stretch gap-3 shrink-0 pt-0.5 pb-0.5">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); speak(w.word); }}
                    className="text-card-foreground hover:text-card-foreground/70 p-1"
                  >
                    <Volume2 size={16} />
                  </button>
                  {w.example && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); speak(w.example); }}
                      className="text-muted-foreground/70 hover:text-muted-foreground p-1"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); openInDictionary(w); }}
                    className="text-card-foreground/40 hover:text-primary p-1"
                    title="사전에서 보기"
                  >
                    <BookOpen size={16} />
                  </button>
                </div>
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
            className="mb-2.5 w-full flex items-center justify-between px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            <span>보관한 단어장 {archived.length}권</span>
            {archivedCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          {!archivedCollapsed && (
            <div className="rounded-2xl border border-border bg-card">
              {archived.map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  first={i === 0}
                  last={i === archived.length - 1}
                  editable
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </section>
      )}
      {draggingWord && floatPos && (
        <div
          className="fixed pointer-events-none z-50 flex items-start gap-3 bg-card rounded-lg p-4 border border-sky-400 shadow-lg shadow-sky-400/20"
          style={{ width: floatWidth, left: floatPos.x - floatWidth / 2, top: floatPos.y - floatOffsetY.current }}
        >
          <div className="flex-1 min-w-0 content-bump">
            <p className="font-word text-base font-medium truncate text-muted-foreground">{draggingWord.word}</p>
            <p className="text-xs font-bold text-muted-foreground font-gothic">{draggingWord.meaning}</p>
            {draggingWord.example && (
              <p className="text-xs text-muted-foreground font-word mt-0.5">{draggingWord.example}</p>
            )}
            {draggingWord.exampleMeaning && (
              <p className="text-[0.6875rem] leading-snug text-muted-foreground font-body mt-0.5">{draggingWord.exampleMeaning}</p>
            )}
          </div>
          <div className="flex flex-col items-center justify-between self-stretch gap-3 shrink-0 pt-0.5 pb-0.5">
            <Volume2 size={16} className="text-muted-foreground" />
            {draggingWord.example && <Volume2 size={16} className="text-sky-400/70" />}
            <BookOpen size={16} className="text-muted-foreground" />
          </div>
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
      <AlertDialog open={pendingDeleteIds.length > 0} onOpenChange={(o) => { if (!o) setPendingDeleteIds([]); }}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body text-gray-900">
              {pendingDeleteIds.length > 1 ? pendingDeleteIds.length + "개의 단어를 삭제할까요?" : "이 단어를 삭제할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              삭제한 단어는 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="font-body bg-red-600 hover:bg-red-700 text-white">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
