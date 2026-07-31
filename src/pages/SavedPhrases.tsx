import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { goBackOr } from "@/lib/nav";
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
  const [list, setList] = useState<SavedPhrase[]>(() => loadSavedList());

  const unsave = (id: string) => {
    removeSavedPhrase(id);
    setList(loadSavedList());
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

      <div className="px-4 pt-5">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="font-gothic text-[13.5px] leading-relaxed text-muted-foreground">
              저장한 문장이 없어요.
              <br />
              마음에 드는 문장에서 리본을 눌러보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {list.map((p, i) => (
              <div
                key={p.id}
                className={
                  "flex items-start gap-2 px-4 py-3.5 " +
                  (i === list.length - 1 ? "" : "border-b border-border")
                }
              >
                <button
                  type="button"
                  onClick={() => navigate("/phrase?" + phraseToQuery(p))}
                  className="flex-1 min-w-0 text-left active:opacity-60 transition-opacity"
                >
                  <p className="font-word text-[15px] leading-[1.5] text-foreground">{p.id}</p>
                  {p.ko ? (
                    <p className="mt-1 text-[12.5px] leading-[1.5] text-muted-foreground line-clamp-2">
                      {p.ko}
                    </p>
                  ) : null}
                  <p className="mt-1 font-gothic text-[11px] text-muted-foreground/80">
                    {p.ref ? p.ref + " · " : ""}
                    {fmtDate(p.savedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => unsave(p.id)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center text-yellow-500"
                  title="저장 해제"
                  aria-label="저장 해제"
                >
                  <Bookmark size={18} fill="currentColor" />
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
