// src/components/BibleAudioButton.tsx
// 성경 읽기 전용 낭독 재생 컨트롤 (Alkitab Suara, R2 스트리밍).
// - 대기: ▶ 듣기
// - 로딩: 스피너 (음원 여는 중)
// - 재생/일시정지: ⏸/▶ + ⏹ + 경과/전체 시간 표시
// 모양은 PlayButton과 맞추되, 엔진은 TTS가 아니라 실제 낭독 mp3입니다.

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bibleAudioPlayer, audioKey, formatTime, BibleAudioState } from "@/lib/bibleAudio";

interface BibleAudioButtonProps {
  bookId: string;
  chapter: number;
  label?: string;
  className?: string;
}

const BibleAudioButton = ({ bookId, chapter, label = "듣기", className = "" }: BibleAudioButtonProps) => {
  const myKey = audioKey(bookId, chapter);
  const [state, setState] = useState<BibleAudioState>("idle");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastErrorAt = useRef(0);

  useEffect(() => {
    const unsub = bibleAudioPlayer.subscribe((s) => {
      setActiveKey(s.key);
      setState(s.key === myKey ? s.state : "idle");
      setPosition(s.key === myKey ? s.position : 0);
      setDuration(s.key === myKey ? s.duration : 0);
      if (s.errorAt && s.errorAt !== lastErrorAt.current) {
        lastErrorAt.current = s.errorAt;
        toast.error("음성을 불러오지 못했어요");
      }
    });
    return unsub;
  }, [myKey]);

  const mine = activeKey === myKey;
  const loading = mine && state === "loading";
  const playing = mine && state === "playing";
  const paused = mine && state === "paused";

  const onMain = () => bibleAudioPlayer.toggle(bookId, chapter);
  const onStop = () => bibleAudioPlayer.stop();

  if (loading) {
    return (
      <div
        className={
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-sky-500/10 text-sky-600 " +
          className
        }
      >
        <Loader2 size={14} className="animate-spin" /> 여는 중...
      </div>
    );
  }

  if (playing || paused) {
    return (
      <div className={"inline-flex items-center gap-1.5 " + className}>
        {duration > 0 && (
          <span className="text-[0.6875rem] font-gothic text-gray-500 tabular-nums">
            {formatTime(position)} / {formatTime(duration)}
          </span>
        )}
        <button
          onClick={onMain}
          className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-sky-500 text-white"
          title={playing ? "일시정지" : "이어듣기"}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={onStop}
          className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-black/5 text-gray-600"
          title="정지"
        >
          <Square size={13} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onMain}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-sky-500/10 text-sky-600 active:bg-sky-500/20 " +
        className
      }
    >
      <Play size={14} /> {label}
    </button>
  );
};

export default BibleAudioButton;
