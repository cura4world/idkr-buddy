// src/components/BibleAudioSeekBar.tsx
// 성경 낭독 시크바. 한 장이 5~15분이라 중간 이동이 필요합니다.
// - 이 장이 활성(key 일치)이고 loading/playing/paused일 때만 렌더합니다.
//   재생 전에는 null을 반환하므로 기존 레이아웃이 그대로 유지됩니다.
// - 드래그 중에는 재생 위치 갱신(timeupdate)이 슬라이더 값을 덮어쓰지 않도록
//   로컬 값(dragValue)을 우선 표시합니다.
// - R2가 Range 요청(206)을 지원하므로 시크가 실제로 동작합니다.
// - 트랙은 배경 그라디언트로 그립니다. appearance-none 상태에서는 accent-color가
//   먹지 않아 색을 직접 칠해야 하고, 엘리먼트 높이는 터치 영역 확보를 위해
//   16px로 두고 바 자체만 4px로 보이게 합니다.

import { useEffect, useRef, useState } from "react";
import { bibleAudioPlayer, audioKey, BibleAudioState } from "@/lib/bibleAudio";

interface BibleAudioSeekBarProps {
  bookId: string;
  chapter: number;
}

const SKY = "rgb(14,165,233)"; // sky-500
const TRACK = "rgba(0,0,0,0.10)";

const BibleAudioSeekBar = ({ bookId, chapter }: BibleAudioSeekBarProps) => {
  const myKey = audioKey(bookId, chapter);
  const [mine, setMine] = useState(false);
  const [state, setState] = useState<BibleAudioState>("idle");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragValue, setDragValue] = useState(0);
  const [dragging, setDragging] = useState(false);
  // 구독 콜백에서 즉시 참조해야 하므로 ref로도 들고 있습니다(state는 다음 렌더까지 갱신 지연).
  const draggingRef = useRef(false);

  useEffect(() => {
    const unsub = bibleAudioPlayer.subscribe((s) => {
      const isMine = s.key === myKey;
      setMine(isMine);
      setState(isMine ? s.state : "idle");
      setDuration(isMine ? s.duration : 0);
      // 드래그 중에는 위치 갱신을 무시해서 thumb가 되돌아가지 않게 합니다.
      if (!isMine) {
        setPosition(0);
      } else if (!draggingRef.current) {
        setPosition(s.position);
      }
    });
    return unsub;
  }, [myKey]);

  // 다른 장으로 넘어가면 드래그 상태를 남기지 않습니다.
  useEffect(() => {
    if (!mine && draggingRef.current) {
      draggingRef.current = false;
      setDragging(false);
    }
  }, [mine]);

  if (!mine) return null;
  if (state !== "loading" && state !== "playing" && state !== "paused") return null;

  const max = duration > 0 ? duration : 0;
  const disabled = max <= 0;
  const value = dragging ? dragValue : position;
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const startDrag = () => {
    if (disabled) return;
    draggingRef.current = true;
    setDragValue(value);
    setDragging(true);
  };
  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  };

  return (
    <div className="mb-4">
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-label="낭독 재생 위치"
        onPointerDown={startDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={startDrag}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (draggingRef.current) setDragValue(v);
          bibleAudioPlayer.seek(v);
        }}
        style={{
          backgroundImage:
            "linear-gradient(to right, " +
            SKY +
            " 0%, " +
            SKY +
            " " +
            pct +
            "%, " +
            TRACK +
            " " +
            pct +
            "%, " +
            TRACK +
            " 100%)",
          backgroundSize: "100% 4px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        className={
          "w-full h-4 appearance-none bg-transparent cursor-pointer " +
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 " +
          "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full " +
          "[&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow " +
          "[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 " +
          "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 " +
          "[&::-moz-range-thumb]:bg-sky-500 " +
          (disabled ? "opacity-40" : "")
        }
      />
    </div>
  );
};

export default BibleAudioSeekBar;
