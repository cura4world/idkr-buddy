import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { goBackOr } from "@/lib/nav";

// 없는 주소로 들어왔을 때. 다른 화면과 같은 바탕·헤더(뒤로가기 + 인니어 대문자 제목)를 씁니다 (QA Q15).
// 콘솔에는 따로 남기지 않습니다(react-router 가 남기는 경고만).
// 홈 링크는 react-router 의 Link 로 둡니다 — <a href="/"> 는 basename("/idkr-buddy")을 건너뛰어
// 웹·스토어 앱 모두에서 다시 빈 화면이 됩니다.
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          HALAMAN TIDAK DITEMUKAN
        </h1>
      </header>

      <div className="px-4 pt-16 pb-10 text-center">
        <p className="font-word text-[2.5rem] font-semibold leading-none" style={{ color: "#104B60" }}>404</p>
        <p className="mt-4 font-gothic text-[0.9375rem]" style={{ color: "#1D1F1E" }}>페이지를 찾을 수 없습니다</p>
        <p className="mt-1.5 font-gothic text-[0.8125rem]" style={{ color: "#646C72" }}>주소를 확인하거나 홈에서 다시 시작하세요.</p>
        <Link
          to="/"
          replace
          className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-full font-gothic text-[0.875rem] font-semibold active:opacity-80"
          style={{ background: "#E3EEEC", color: "#2C6D63" }}
        >
          홈으로
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
