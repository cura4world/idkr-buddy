import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { usePlan } from "@/lib/plan";
import { isStoreApp } from "@/lib/platform";
import {
  SavedPhrase,
  loadSavedList,
  removeSavedPhrase,
  phraseToQuery,
} from "@/lib/peribahasa";

const fmtDate = (t: number) => {
  const d = new Date(t);
  return (
    d.getFullYear() +
    "." +
    String(d.getMonth() + 1).padStart(2, "0") +
    "." +
    String(d.getDate()).padStart(2, "0")
  );
};

const SavedPhrases = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 공개판(스토어 앱)의 무료·Plus 에게는 성경 말씀 문장을 보이지 않습니다(출시 전 점검 E-10).
  // 지우지는 않고 가리기만 합니다 — 관리자·Special Member 로 들어오면 다시 보입니다.
  const { staff } = usePlan();
  const hideAyat = isStoreApp() && !staff;
  const visible = (all: SavedPhrase[]) => (hideAyat ? all.filter((p) => p.kind !== "alkitab") : all);
  const [list, setList] = useState<SavedPhrase[]>(() => visible(loadSavedList()));

  const unsave = (id: string) => {
    removeSavedPhrase(id);
    setList(visible(loadSavedList()));
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-10">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          Kalimat Tersimpan
        </h1>
      </header>

      <div className="px-4 pt-4">
        {list.length === 0 ? (
          <div className="rounded-[20px] bg-card px-5 py-10 text-center shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
            <p className="m-0 font-gothic text-[0.84375rem] leading-[1.7] text-[#34332F]">
              저장한 문장이 없습니다.
              <br />
              마음에 드는 문장에서 리본을 눌러 보세요.
            </p>
          </div>
        ) : (
          // 오늘의 문장 상세(안 1 · 민트)와 같은 카드 모양 · 청록 리본
          <div className="overflow-hidden rounded-[20px] bg-card shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
            {list.map((p, i) => (
              <div
                key={p.id}
                className={
                  "flex items-start gap-2 py-3.5 pl-5 pr-3 " +
                  (i === list.length - 1 ? "" : "border-b border-[#E6EAE8]")
                }
              >
                <button
                  type="button"
                  onClick={() => navigate("/phrase?" + phraseToQuery(p))}
                  className="flex-1 min-w-0 text-left active:opacity-60 transition-opacity"
                >
                  <p className="m-0 font-word text-[1rem] font-semibold leading-[1.5] text-[#104B60]">{p.id}</p>
                  {p.ko ? (
                    <p className="m-0 mt-1 line-clamp-2 text-[0.8125rem] leading-[1.55] text-[#5E5D57]">
                      {p.ko}
                    </p>
                  ) : null}
                  <p className="m-0 mt-1 font-gothic text-[0.6875rem] text-muted-foreground">
                    {p.ref ? p.ref + " · " : ""}
                    {fmtDate(p.savedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => unsave(p.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3EEEC] text-[#2C6D63]"
                  title="저장 해제"
                  aria-label="저장 해제"
                >
                  <Bookmark size={17} strokeWidth={1.9} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPhrases;
