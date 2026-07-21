// src/components/PlayButton.tsx
// 인니어 글 전체를 읽어주는 공통 재생 컨트롤.
// - 대기: ▶ 듣기
// - 로딩: 스피너 (음성 생성 중)
// - 재생 중: ⏸ 일시정지 + ⏹ 정지
// - 일시정지: ▶ 이어듣기 + ⏹ 정지

import { useEffect, useState } from "react";
import { Play, Pause, Square, Loader2 } from "lucide-react";
import { ttsPlayer, TtsState } from "@/lib/tts";

interface PlayButtonProps {
  cacheKey: string; // 글을 구분하는 고유 키 (예: "story-<id>", "qt-<date>", "prayer-<id>-doa")
  text: string; // 읽을 인니어 전문
  label?: string; // 대기 상태 버튼 라벨 (기본 "듣기")
  className?: string;
}

const PlayButton = ({ cacheKey, text, label = "듣기", className = "" }: PlayButtonProps) => {
  const [state, setState] = useState<TtsState>("idle");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const unsub = ttsPlayer.subscribe((s) => {
      setActiveKey(s.key);
      setUsedFallback(s.usedFallback);
      // 이 버튼이 담당하는 글이 활성 대상일 때만 상태를 반영
      setState(s.key === cacheKey ? s.state : "idle");
    });
    return unsub;
  }, [cacheKey]);

  const mine = activeKey === cacheKey;
  const loading = mine && state === "loading";
  const playing = mine && state === "playing";
  const paused = mine && state === "paused";

  const onMain = () => {
    if (!text || !text.trim()) return;
    ttsPlayer.toggle(cacheKey, text);
  };
  const onStop = () => ttsPlayer.stop();

  if (loading) {
    return (
      <div className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary " + className}>
        <Loader2 size={14} className="animate-spin" /> 음성 준비 중...
      </div>
    );
  }

  if (playing || paused) {
    return (
      <div className={"inline-flex items-center gap-1.5 " + className}>
        <button
          onClick={onMain}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-primary text-white"
        >
          {playing ? <><Pause size={14} /> 일시정지</> : <><Play size={14} /> 이어듣기</>}
        </button>
        <button
          onClick={onStop}
          className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-black/5 text-gray-600"
          title="정지"
        >
          <Square size={13} />
        </button>
        {usedFallback && <span className="text-[10px] text-gray-400">기본 음성</span>}
      </div>
    );
  }

  return (
    <button
      onClick={onMain}
      className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary active:bg-primary/20 " + className}
    >
      <Play size={14} /> {label}
    </button>
  );
};

export default PlayButton;
