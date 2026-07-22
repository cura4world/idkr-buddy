// src/pages/InsightTips.tsx
// 인도네시아 정보: 버튼을 누르면 팁 하나를 생성해 위에 쌓습니다. IndexedDB 영구 보관.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, Sparkles, Loader2, Volume2, Trash2, BookOpen, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { generateTip, saveTip, listTips, deleteTip, TipRecord } from "@/lib/tips";
import { hasGeminiApiKey } from "@/lib/gemini";

const InsightTips = () => {
  const navigate = useNavigate();
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    listTips().then((all) => {
      setTips(all);
      setLoaded(true);
      if (all.length) setOpenId(all[0].id);
    });
  }, []);

  const speak = (text: string, lang: "id" | "ko") => {
    if ((window as any).AndroidTTS) {
      try {
        (window as any).AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID");
      } catch (e) {}
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "ko" ? "ko-KR" : "id-ID";
      u.rate = 0.9;
      speechSynthesis?.cancel?.();
      setTimeout(() => {
        try {
          speechSynthesis?.speak?.(u);
        } catch (e) {}
      }, 150);
    } catch (e) {}
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!hasGeminiApiKey()) {
      toast("설정에서 Gemini API 키를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const recent = tips.slice(0, 12).map((t) => t.title);
      const data = await generateTip(recent);
      const rec = await saveTip(data);
      setTips((prev) => [rec, ...prev]);
      setOpenId(rec.id);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "RATE_LIMIT") toast("잠시 후 다시 시도해주세요 (사용량 초과)");
      else if (msg === "INVALID_API_KEY") toast("API 키를 확인해주세요");
      else toast("생성에 실패했어요. 다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  const startPress = (id: string) => {
    pressTimer.current = setTimeout(() => {
      if (confirm("이 정보를 삭제할까요?")) {
        deleteTip(id);
        setTips((prev) => prev.filter((t) => t.id !== id));
      }
    }, 600);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-28 max-w-lg mx-auto">
      <header className="flex items-center gap-2 mb-3">
        <button
          onClick={() => navigate("/insight")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-white/10 active:bg-white/15 -ml-1"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-emerald-400 flex items-center justify-center shadow-lg shadow-black/30">
            <Lightbulb size={18} className="text-white" />
          </span>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 정보</h1>
        </div>
      </header>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 disabled:opacity-60 active:scale-[0.99] transition-transform mb-5"
      >
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" /> 새로운 정보를 찾는 중...
          </>
        ) : (
          <>
            <Sparkles size={17} /> 정보 하나 가져오기
          </>
        )}
      </button>

      {/* 카드 목록 */}
      {loaded && tips.length === 0 && !loading && (
        <div className="text-center py-16 px-6">
          <Lightbulb size={40} className="mx-auto text-white/20 mb-3" />
          <p className="text-sm font-gothic text-white/45 leading-relaxed">
            아직 정보가 없어요.
            <br />
            위 버튼을 눌러 첫 번째 정보를 열어보세요.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {tips.map((t) => {
          const isOpen = openId === t.id;
          return (
          <div
            key={t.id}
            onPointerDown={() => startPress(t.id)}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            className="bg-card rounded-2xl border border-emerald-300/50 overflow-hidden select-none"
          >
            {/* 제목 행 (항상 보임, 탭하면 토글) */}
            <button
              onClick={() => setOpenId(isOpen ? null : t.id)}
              className="w-full px-4 py-3.5 flex items-center gap-2.5 text-left"
            >
              <span className="text-2xl leading-none shrink-0">{t.emoji}</span>
              <h2 className="flex-1 text-sm font-semibold text-gray-900 leading-snug">{t.title}</h2>
              <ChevronDown
                size={17}
                className={"text-emerald-500 shrink-0 transition-transform " + (isOpen ? "rotate-180" : "")}
              />
            </button>

            {/* 내용 (열렸을 때만) */}
            {isOpen && (
              <div className="px-4 pb-4 -mt-0.5">
                <p className="text-sm font-gothic text-gray-700 leading-relaxed">{t.body}</p>

                {t.indo && (
                  <div className="mt-2.5 flex items-center gap-2 bg-emerald-500/[0.07] rounded-xl px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-word text-[15px] text-emerald-900 leading-snug">{t.indo}</p>
                      {t.indoKo && (
                        <p className="text-xs font-gothic text-gray-500 mt-0.5">{t.indoKo}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        navigate("/dictionary?q=" + encodeURIComponent(t.indo as string) + "&from=tips")
                      }
                      className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 active:bg-emerald-500/20"
                      title="사전에서 보기"
                    >
                      <BookOpen size={13} />
                    </button>
                    <button
                      onClick={() => speak(t.indo as string, "id")}
                      className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 active:bg-emerald-500/20"
                      title="발음 듣기"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {tips.length > 0 && (
        <p className="mt-5 text-[11px] font-gothic text-white/30 text-center flex items-center justify-center gap-1">
          <Trash2 size={11} /> 카드를 길게 누르면 삭제할 수 있어요
        </p>
      )}
    </div>
  );
};

export default InsightTips;
