// src/pages/AppInfo.tsx
// 앱 정보 (/about) — 내 정보 > 설정 > 앱 정보에서 들어옵니다 (2026-11-18 사용자 요청).
//
// 예전에는 AI 가 만든 결과마다 "AI가 만든 내용입니다" 글자를 붙였는데, 화면이 어지럽다는 요청으로 모두 뺐습니다.
// 대신 이 화면 한곳에 AI 사용 안내를 건조하게 적어 둡니다.
//   - 인공지능 기본법(2026-01-22 시행)의 투명성 의무: 서비스 안에서만 보이는 결과물은 결과마다 표시하지 않고,
//     이용 전·이용 중 안내(약관·화면 안내)로 알려도 됩니다. 이용약관 제4조에도 같은 내용이 있습니다.
//   - Google Play AI 생성 콘텐츠 정책의 요건은 "앱 안에서 신고할 수 있게" — 결과 옆 신고 단추(AiReportButton)는 그대로 둡니다.
// 사진 출처(PhotoCredits)도 여기로 모았습니다.

import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { storeAppVersion, PRIVACY_URL, TERMS_URL, BUSINESS_INFO_URL } from "@/lib/platform";
import { PhotoCreditsLink } from "@/pages/PhotoCredits";

export const APP_INFO_PATH = "/about";

const SECTION = "mb-2 px-1 font-gothic text-[0.875rem] font-bold tracking-[0.02em] text-[#3B4245]";
const CARD = "bg-card rounded-[18px] overflow-hidden";
const CARD_STYLE = { boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };
const TEXT = "font-gothic text-[0.84375rem] leading-[1.7] text-[#4A5257] break-keep";

const LinkRow = ({ href, label, last }: { href: string; label: string; last?: boolean }) => (
  <a
    href={href}
    className={
      "flex items-center px-4 py-3.5 font-gothic text-[0.9375rem] text-foreground active:bg-muted/60 " +
      (last ? "" : "border-b border-[#EEF1F3]")
    }
  >
    {label}
  </a>
);

const AppInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const version = storeAppVersion() || "2.0";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/me")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">TENTANG APLIKASI</h1>
      </header>

      <div className="px-4 pt-4 flex flex-col gap-[18px]">
        <section>
          <p className={SECTION}>버전</p>
          <div className={CARD + " px-4 py-3.5"} style={CARD_STYLE}>
            <p className="font-gothic text-[0.9375rem] text-foreground">Kata kata {version}</p>
          </div>
        </section>

        <section>
          <p className={SECTION}>AI로 만든 내용</p>
          <div className={CARD + " px-4 py-3.5"} style={CARD_STYLE}>
            <p className={TEXT}>
              사전 풀이, 문장 해설, 이야기, 회화, 오늘의 카드의 글과 그림, 읽기 음성은 인공지능(Google Gemini)이 만듭니다.
            </p>
            <p className={TEXT + " mt-1.5"}>
              틀리거나 어색한 내용이 있을 수 있으므로 중요한 일에는 다른 자료로 확인하세요.
            </p>
            <p className={TEXT + " mt-1.5"}>
              이상한 내용은 각 화면 아래의 "피드백 보내기"로 알려 주세요.
            </p>
          </div>
        </section>

        <section>
          <p className={SECTION}>출처</p>
          <div className={CARD} style={CARD_STYLE}>
            <PhotoCreditsLink />
          </div>
        </section>

        <section>
          <p className={SECTION}>약관과 정책</p>
          <div className={CARD} style={CARD_STYLE}>
            <LinkRow href={TERMS_URL} label="이용약관" />
            <LinkRow href={PRIVACY_URL} label="개인정보처리방침" />
            <LinkRow href={BUSINESS_INFO_URL} label="사업자 정보" last />
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppInfo;
